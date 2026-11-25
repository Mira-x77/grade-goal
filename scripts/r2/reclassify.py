#!/usr/bin/env python3
"""Recompute class / subject / exam-type metadata for the published catalogue.

The PDFs already live in R2 under the same keys Supabase used, so this script
**never moves, renames or re-uploads a PDF**. It only rewrites the two JSON
documents:

  catalog/papers.json   -> multi-class, multi-subject rows, no circulars
  catalog/books.json    -> multi-subject rows

What changes:

* ``class_levels`` / ``subjects`` arrays are added next to the existing scalar
  ``class_level`` / ``subject`` (which become comma-separated when a document
  belongs to several). The app reads both.
* ``tags`` gains ``cls:<level>`` and ``subj:<subject>`` entries, matching the
  convention already used by ``src/lib/library-filters.ts``.
* Administrative circulars (school-authorisation lists for 2026-2027,
  marker/supervisor commissions, result lists, calendars, "affichage
  obligatoire") are removed from ``papers.json``.

Usage:
  python scripts/r2/reclassify.py                 # dry run, writes output/
  python scripts/r2/reclassify.py --execute       # upload the two JSON files
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from classify import classify_document, detect_subjects  # noqa: E402
from publish import load_env, make_client  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
CATALOG = Path(__file__).resolve().parent / "output" / "catalog"
BUCKET = "gostudy"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def read_json(client, key: str) -> dict:
    return json.loads(client.get_object(Bucket=BUCKET, Key=key)["Body"].read().decode("utf-8"))


def merged_tags(existing: list[str] | None, classes: list[str], subjects: list[str]) -> list[str]:
    base = [t for t in (existing or []) if not t.startswith(("cls:", "subj:"))]
    tags = list(base)
    for level in classes:
        if level != "All" and f"cls:{level}" not in tags:
            tags.append(f"cls:{level}")
    for subject in subjects:
        if f"subj:{subject}" not in tags:
            tags.append(f"subj:{subject}")
    return tags


PAPER_TYPES = {
    "Practice", "Composition", "BEPC", "Baccalauréat", "CEPD", "Devoir",
    "Probatoire", "Concours", "Revision", "Annales", "CAP", "Interro",
}


def scalar(values: list[str], fallback: str | None) -> str | None:
    if not values:
        return fallback
    if len(values) == 1:
        return values[0]
    return ", ".join(values)


def reclassify_paper(row: dict) -> tuple[dict | None, str | None]:
    title = row.get("title") or ""
    meta = classify_document(title, row.get("file_name") or "")
    if meta["non_exam"]:
        return None, title

    # Keep refinements that only the folder/scan knew about (e.g. "3math.pdf"
    # is 3ème, "Revision_1ereS" is 1ère). A fresh non-All answer still wins.
    classes = meta["classes"]
    existing_classes = row.get("class_levels") or []
    if classes == ["All"] and existing_classes and existing_classes != ["All"]:
        classes = existing_classes
    subjects = meta["subjects"]
    existing_subjects = row.get("subjects") or []
    if subjects == ["Général"] and existing_subjects and existing_subjects != ["Général"]:
        subjects = existing_subjects

    # Titles often lack the folder context ("Devoirs/", "Compositions/") that
    # gave the original exam type. Do not downgrade a specific type to the
    # generic fallback when the title alone cannot tell.
    exam_type = meta["exam_type"]
    existing_type = row.get("exam_type")
    if exam_type in ("Revision", "Reference") and existing_type in (
            "Devoir", "Composition", "Practice", "Interro"):
        exam_type = existing_type
    # A course-looking file that sits in papers.json must still carry a paper
    # type, not a book category ("Reference").
    if exam_type not in PAPER_TYPES:
        exam_type = existing_type if existing_type in PAPER_TYPES else "Practice"

    # Same for the year/session: they used to be read from the PDF text.
    year = meta["year"]
    existing_year = row.get("year")
    current_year = time.localtime().tm_year
    if year == current_year and existing_year and existing_year != current_year:
        year = existing_year
    session = meta["session"]
    existing_session = row.get("session")
    if session == "Annuel" and existing_session and existing_session != "Annuel":
        session = existing_session

    row["class_level"] = scalar(classes, row.get("class_level"))
    row["class_levels"] = classes
    row["subject"] = scalar(subjects, row.get("subject"))
    row["subjects"] = subjects
    row["exam_type"] = exam_type
    row["year"] = year
    row["session"] = session
    row["tags"] = merged_tags(row.get("tags"), classes, subjects)
    return row, None


def reclassify_book(row: dict) -> dict | None:
    title = row.get("title") or ""
    meta = classify_document(title, row.get("file_name") or "")
    if meta["non_exam"]:
        return None
    subjects = meta["subjects"] or detect_subjects(title)
    classes = meta["classes"]
    existing_classes = row.get("class_levels") or []
    if classes == ["All"] and existing_classes and existing_classes != ["All"]:
        classes = existing_classes
    existing_subjects = row.get("subjects") or []
    if subjects == ["Général"] and existing_subjects and existing_subjects != ["Général"]:
        subjects = existing_subjects

    row["subject"] = scalar(subjects, row.get("subject"))
    row["subjects"] = subjects
    row["class_level"] = None if classes == ["All"] else scalar(classes, row.get("class_level"))
    row["class_levels"] = classes
    row["tags"] = merged_tags(row.get("tags"), classes, subjects)
    return row


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true", help="upload the JSON files to R2")
    parser.add_argument("--local", action="store_true", help="read output/catalog instead of R2")
    args = parser.parse_args()

    load_env()
    client = make_client()

    if args.local:
        papers_doc = json.loads((CATALOG / "papers.json").read_text(encoding="utf-8"))
        books_doc = json.loads((CATALOG / "books.json").read_text(encoding="utf-8"))
    else:
        papers_doc = read_json(client, "catalog/papers.json")
        books_doc = read_json(client, "catalog/books.json")

    papers_in = papers_doc.get("papers", [])
    books_in = books_doc.get("books", [])

    papers: list[dict] = []
    books: list[dict] = []
    excluded: list[str] = []
    multi_class = 0
    multi_subject = 0

    for row in papers_in:
        updated, skipped = reclassify_paper(dict(row))
        if skipped:
            excluded.append(skipped)
            continue
        papers.append(updated)
        multi_class += len(updated["class_levels"]) > 1
        multi_subject += len(updated["subjects"]) > 1

    excluded_books: list[str] = []
    for row in books_in:
        updated = reclassify_book(dict(row))
        if updated is None:
            excluded_books.append(row.get("title") or "")
            continue
        books.append(updated)
        multi_subject += len(updated["subjects"]) > 1

    papers.sort(key=lambda r: (-(r.get("year") or 0), r.get("title") or ""))
    books.sort(key=lambda r: r.get("title") or "")

    stamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    CATALOG.mkdir(parents=True, exist_ok=True)
    (CATALOG / "papers.json").write_text(
        json.dumps({"generated_at": stamp, "count": len(papers), "papers": papers},
                   ensure_ascii=False, indent=1), encoding="utf-8")
    (CATALOG / "books.json").write_text(
        json.dumps({"generated_at": stamp, "count": len(books), "books": books},
                   ensure_ascii=False, indent=1), encoding="utf-8")

    print("papers: %d -> %d (%d excluded as non-exam)" %
          (len(papers_in), len(papers), len(excluded)))
    print("books:  %d -> %d (%d excluded as non-exam)" %
          (len(books_in), len(books), len(excluded_books)))
    print("multi-class papers: %d | multi-subject documents: %d" % (multi_class, multi_subject))
    print("catalogue written to %s" % CATALOG)
    for title in excluded + excluded_books:
        print("  excluded:", title[:110])

    if args.execute:
        for name in ("papers.json", "books.json"):
            key = "catalog/" + name
            client.put_object(
                Bucket=BUCKET,
                Key=key,
                Body=(CATALOG / name).read_bytes(),
                ContentType="application/json",
                CacheControl="public, max-age=300",
            )
            print("uploaded", key)
    else:
        print("dry run: pass --execute to upload")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
