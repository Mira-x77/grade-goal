#!/usr/bin/env python3
"""Ingest the exam PDFs that live outside the normal library folders.

These are the files the first uploads came from (raw HP scans on the Desktop,
the "organized exams" tree, Telegram/Downloads batches, ...). They are missing
from R2 today, so the app cannot show them.

What this does, per PDF:

1. sha256 + skip when the hash (or the file name) is already in the catalogue,
   so re-running never duplicates a row or an upload;
2. derive a display title from the file name or the first page of text;
3. classify class/séries, subject(s), exam type, year and session with
   ``classify.py`` (the same rules the catalogue uses). The folder path is used
   as a hint for the class and subject, because folders such as
   ``1ere_A4/Mathematiques/2024-2025`` are more reliable than a scan name;
4. skip administrative or non-academic files (contracts, circulars, logos...);
5. upload the PDF to the same Supabase-compatible key layout
   ``edusocial/{papers,books}/<class>/<subject>/<id>-<slug>.pdf`` and the
   page-1 thumbnail to ``previews|book-covers/edusocial_<hash24>.jpg``;
6. append the rows to ``catalog/papers.json`` / ``catalog/books.json`` and
   upload the two JSON documents. Existing rows and URLs are never touched.

Usage:
  python scripts/r2/ingest_missing.py                 # dry run, report only
  python scripts/r2/ingest_missing.py --execute       # upload + publish
  python scripts/r2/ingest_missing.py --include-books # also add course books
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
from pathlib import Path

import pymupdf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from classify import (  # noqa: E402
    classify_document,
    format_bytes,
    storage_slug,
)
from publish import make_preview  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
OUT_DIR = Path(__file__).resolve().parent / "output"
CATALOG = OUT_DIR / "catalog"
PREVIEW_TMP = OUT_DIR / "ingest-previews"
REPORT = OUT_DIR / "ingest-report.json"

BUCKET = "gostudy"
BASE_URL = "https://pub-91f336347bd944c48d724d28d0d3b647.r2.dev"
PDF_CONTENT_TYPE = "application/pdf"
JPG_CONTENT_TYPE = "image/jpeg"
CACHE_PDF = "public, max-age=31536000, immutable"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOME = Path.home()

# Folders the user pointed at ("not in the normal spots"). Rows without
# ``recurse`` only take the PDFs sitting directly in that folder.
ROOTS: list[tuple[Path, bool]] = [
    (HOME / "Desktop" / "Raw_Exam_PDFs", True),
    (HOME / "Desktop" / "APC_Togo_Papers_1ere_CD", True),
    (HOME / "Desktop" / "GoStudy_Organized_Exams", True),
    (HOME / "Desktop", False),
    (HOME / "Documents", False),
    (HOME / "Documents" / "1c", True),
    (HOME / "Downloads", False),
    (HOME / "Downloads" / "Documents", True),
    (HOME / "Downloads" / "Telegram Desktop", True),
    (HOME / "Downloads" / "club tech st jo-2026", True),
    (HOME / "Pictures", False),
]

# Never ingest anything from the repository itself (APK copies, flyers, docs).
SKIP_FRAGMENTS = (
    "node_modules", ".android-sdk", "\\.git\\", "\\App\\App\\public",
    "\\app\\build\\", "\\.gradle", "\\dist\\", "\\presentations\\",
)

_CLASS_TOKEN = re.compile(
    r"(?i)(?<![a-z0-9])(6|5|4|3)\s*(?:e|eme|ieme)\b"
    r"|(?<![a-z0-9])(2ndes?|1eres?|1res?|tles?|terminales?)(?![a-z0-9])"
    r"|(?<![a-z0-9])(cp1|cp2|ce1|ce2|cm1|cm2)(?![a-z0-9])"
    r"|(?<![a-z0-9])(cepd|cap|primaire)(?![a-z0-9])"
)

_SUBJECT_FOLDER_HINTS = (
    r"math|physique|pct|chimie|svt|biolog|francais|anglais|allemand|philo|"
    r"histoire|geo|ecm|econom|droit|compta|informatique|musique|eps|"
    r"catech|analyse.financiere"
)

_GENERIC_STEM = re.compile(
    r"(?i)^(new document(?: from)?(?: hp)?(?: deskjet)?[\w .,\-]*|"
    r"document|scan|camscanner[\w .\-]*|img[\w .\-]*|page[\w .\-]*|"
    r"[\w]{1,6}|[\d .\-_]+)$"
)

_NON_ACADEMIC = [
    r"\bcontrat\b", r"\bcontract\b", r"\bsponsoring\b", r"\bbrochure\b",
    r"\bpitch\b", r"\bmarketing\b", r"\bbusiness card\b", r"\blogo\b",
    r"\btravel guide\b", r"\bremerciements\b", r"\bfacture\b", r"\bdevis\b",
    r"\bcurriculum vitae\b", r"\bcv\b", r"\bclea?r\w*ance\b", r"\bvinyl\b",
    r"\bphoto vivant\b", r"\brepositionnement\b", r"\bkit de presse\b",
    r"\bcommunique\b", r"\bsemi id\b", r"\bprinter test page\b",
    r"\btest[ _-]?edge\b", r"\bjeweltasks\b", r"\bskydrake\b", r"\bfu.?ya\b",
    r"\bgeneration[_-]?1?\b", r"\bmadame\b", r"\bmadam\b", r"\bmaman\b",
    r"\bobjet\s*[_:]?\s*demande\b", r"\bguidebook\b", r"\bccna\b",
    r"\bcodelab\b", r"\bbitcoin\b", r"\bsecret\s*doctrines?",
    # Off-topic books that share the Downloads folder (image-only, so the
    # "off-curriculum" gate cannot read their pages either).
    r"\boffers\b", r"\bplumbing\b", r"\batomic habits\b", r"\bself.?help\b",
    r"\bspirited away\b", r"\bsecurity network\b", r"\bjapanese\b",
    r"\bscreenshot\b",
]


def is_non_academic(*texts: str) -> bool:
    blob = " ".join(t for t in texts if t).lower()
    return any(re.search(pattern, blob) for pattern in _NON_ACADEMIC)


_SCHOOL_BOOK_WORDS = re.compile(
    r"(?i)cours|le[cç]on|manuel|livre|support|fiche|programme|progression|"
    r"recueil|fascicule|annale|exercice|r[eé]vision|devoir|composition|"
    r"examen|[eé]preuve|td\b|bac|bepc|cepd|math|physique|chimie|pct|svt|"
    r"biolog|fran[cç]ais|anglais|allemand|philo|histoire|g[eé]o|ecm|"
    r"[eé]conom|droit|compta|informatique|musique|eps|scientifique|"
    r"kursbuch|1i?eres?|premi[eè]re|terminale|\btles?\b|\b2nde\b|[3456]\s*[eè]me"
)


def looks_like_school_book(*texts: str) -> bool:
    """Keep school material, drop personal/off-curriculum PDFs (robotics,
    self-help, security forms) that share the same folders."""
    blob = " ".join(t for t in texts if t)
    return bool(_SCHOOL_BOOK_WORDS.search(blob))


_SCAN_SUBJECTS = (
    (r"math", "Mathématiques"),
    (r"svt", "SVT"),
    (r"ecm", "ECM"),
    (r"pct|physic|chimie", "PCT"),
    (r"eng|angl", "Anglais"),
    (r"music", "Musique"),
    (r"philo", "Philosophie"),
    (r"franc", "Français"),
    (r"hist|hg", "Histoire"),
    (r"info|tic", "Informatique"),
    (r"allem", "Allemand"),
    (r"arabe", "Langues"),
)

_SCAN_EXAMS = {
    "bepc": "BEPC", "bac": "BAC", "bac1": "BAC 1", "cepd": "CEPD",
    "cap": "CAP", "compo": "Composition", "devoir": "Devoir", "dst": "Devoir",
}

# Fragments of the default scanner file name, plus bare words that say nothing
# about the document. They must never become part of a title.
_NOISE_SCAN_TAGS = {
    "scan", "pdf", "semestre", "semestrepdf", "semestre1", "semestre2",
    "trimestre", "trimestrepdf", "form", "document", "page", "img",
    "screenshot", "manual", "offers", "away", "com", "new", "from", "hp",
    "deskjet", "desk", "series", "library", "printer", "the", "and", "for",
}

# "acd" / "cd" in a scanner name are the séries the paper covers.
_SERIES_TAGS = {
    "abcd": "séries A, B, C, D",
    "acd": "séries A, C, D",
    "bcd": "séries B, C, D",
    "ac": "séries A, C",
    "ad": "séries A, D",
    "cd": "séries C, D",
    "sm": "série S",
    "c4": "série C4",
}

# A batch scanner produces "2025-05-24 08-55 page 1".
_BATCH_SCAN = re.compile(
    r"^(?P<date>\d{4}-\d{2}-\d{2})[ _]+\d{2}-\d{2}[ _]+page[ _]*(?P<page>\d+)$",
    re.IGNORECASE,
)


def scan_tag(path: Path) -> str:
    """The meaningful part of a camera/HP scan file name ("" when none)."""
    text = path.stem.lower()
    text = re.sub(
        r"(?i)new document|from|hp|deskjet|library|printer|series?|j61\d*|3050a?|"
        r"camscanner|scan|img|page|document",
        " ", text,
    )
    text = re.sub(r"[^a-z]+", " ", text)
    words = [w for w in text.split() if len(w) > 1]
    for word in reversed(words):
        if word not in _NOISE_SCAN_TAGS:
            return word
    return ""


def synthetic_scan_title(path: Path) -> str:
    batch = _BATCH_SCAN.match(path.stem.strip())
    if batch:
        year, month, day = batch.group("date").split("-")
        return f"Épreuve scannée — {day}/{month}/{year} p.{batch.group('page')}"

    tag = scan_tag(path)
    if tag in _SCAN_EXAMS:
        return f"{_SCAN_EXAMS[tag]} — épreuve scannée"
    subject = next((s for pattern, s in _SCAN_SUBJECTS if re.search(pattern, tag)), None)
    if subject:
        return f"{subject} — épreuve scannée"
    if tag in _SERIES_TAGS:
        return f"Épreuve scannée — {_SERIES_TAGS[tag]}"
    if tag:
        return f"Épreuve scannée ({tag})"
    return "Épreuve scannée"


def scan_class(stem: str) -> list[str] | None:
    match = re.match(r"\s*([3-6])", stem)
    if not match:
        # "New Document from HP Deskjet 3math.pdf" -> 3ème
        match = re.search(r"(?<!\d)([3-6])\s*(?:math|pct|svt|pc|tic|hg|fr|ang|ecm|philo)", stem, re.IGNORECASE)
    if not match:
        return None
    return [{"3": "3ème", "4": "4ème", "5": "5ème", "6": "6ème"}[match.group(1)]]


def scan_subject(path: Path) -> str | None:
    tag = scan_tag(path)
    return next((s for pattern, s in _SCAN_SUBJECTS if re.search(pattern, tag)), None)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def pdf_text(path: Path, max_pages: int = 2, max_chars: int = 4000) -> str:
    try:
        doc = pymupdf.open(path)
    except Exception as exc:  # noqa: BLE001
        print("    ! cannot open %s: %s" % (path.name, exc))
        return ""
    try:
        chunks: list[str] = []
        for index in range(min(max_pages, doc.page_count)):
            chunks.append(doc.load_page(index).get_text("text"))
            if sum(len(c) for c in chunks) >= max_chars:
                break
        return "\n".join(chunks)[:max_chars]
    finally:
        doc.close()


def clean_stem(path: Path) -> str:
    stem = re.sub(r"(?i)\.pdf$", "", path.stem)
    stem = stem.replace("&#039;", "'").replace("&amp;", "&")
    stem = re.sub(r"[_\s]+", " ", stem).strip()
    return stem[:200]


def title_from_text(text: str) -> str | None:
    for raw in text.splitlines():
        line = re.sub(r"\s+", " ", raw).strip()
        if len(line) < 12 or len(line) > 160:
            continue
        if not re.search(r"[A-Za-zÀ-ÿ]{4,}", line):
            continue
        if re.search(r"(?i)^(page|republique|ministere|direction|inspection)\b", line):
            continue
        return line
    return None


def derive_title(path: Path, text: str) -> str:
    stem = clean_stem(path)
    if stem and not _GENERIC_STEM.match(stem):
        return stem
    return title_from_text(text) or stem or path.name


def class_hint_from_path(path: Path) -> str | None:
    """Nearest path component that names a class, e.g. ``1ere_A4_C_D``."""
    for part in reversed(path.parts[:-1]):
        if part.lower() in {"desktop", "documents", "downloads", "pictures", "users", "admin"}:
            continue
        if _CLASS_TOKEN.search(part):
            return part.replace("_", " ").replace("-", " ")
    return None


def folder_context(path: Path) -> str:
    """Subject/type/year words from the folders above the file."""
    words: list[str] = []
    for part in reversed(path.parts[:-1]):
        low = part.lower()
        if re.search(_SUBJECT_FOLDER_HINTS, low) or re.search(
            r"(?i)devoir|composition|examen|epreuve|td|trimestre|semestre|\d{4}",
            part,
        ):
            words.append(part.replace("_", " ").replace("-", " "))
        if len(words) >= 4:
            break
    return " ".join(reversed(words))


def collect_files() -> list[Path]:
    seen: set[Path] = set()
    files: list[Path] = []
    for root, recurse in ROOTS:
        if not root.is_dir():
            continue
        iterator = root.rglob("*.pdf") if recurse else root.glob("*.pdf")
        for path in sorted(iterator):
            resolved = path.resolve()
            if resolved in seen:
                continue
            if any(fragment in str(path) for fragment in SKIP_FRAGMENTS):
                continue
            seen.add(resolved)
            files.append(path)
    return files


def load_live(client) -> tuple[dict, dict]:
    papers = json.loads(client.get_object(Bucket=BUCKET, Key="catalog/papers.json")["Body"].read().decode("utf-8"))
    books = json.loads(client.get_object(Bucket=BUCKET, Key="catalog/books.json")["Body"].read().decode("utf-8"))
    return papers, books


def existing_state(client, papers_doc: dict, books_doc: dict) -> tuple[set[str], set[str], int]:
    hashes = {r.get("content_hash") for r in papers_doc["papers"] + books_doc["books"] if r.get("content_hash")}
    names = {(r.get("file_name") or "").lower() for r in papers_doc["papers"] + books_doc["books"]}
    numbers = []
    for row in papers_doc["papers"] + books_doc["books"]:
        match = re.search(r"-(\d+)$", row.get("id") or "")
        if match:
            numbers.append(int(match.group(1)))
    return hashes, names, (max(numbers) if numbers else 0)


def object_keys(client, prefixes: tuple[str, ...]) -> set[str]:
    keys: set[str] = set()
    for prefix in prefixes:
        for page in client.get_paginator("list_objects_v2").paginate(Bucket=BUCKET, Prefix=prefix):
            for obj in page.get("Contents", []):
                keys.add(obj["Key"])
    return keys


def existing_previews(client) -> set[str]:
    return object_keys(client, ("previews/", "book-covers/"))


def build_row(
    *, kind: str, number: int, path: Path, title: str, meta: dict,
    digest: str, size: int, preview_url: str | None, now: str,
) -> dict:
    classes = meta["classes"]
    subjects = meta["subjects"]
    primary_class = classes[0] if classes else "All"
    primary_subject = subjects[0] if subjects else "Général"
    class_scalar = ", ".join(classes) if classes else "All"
    subject_scalar = ", ".join(subjects) if subjects else "Général"

    folder = storage_slug(primary_class)
    group = "papers" if kind == "paper" else "books"
    if kind == "book":
        folder = storage_slug(meta["category"] or "Reference")
    key = "/".join([
        "edusocial", group, folder, storage_slug(primary_subject),
        f"{number:04d}-{storage_slug(title)[:80]}.pdf",
    ])

    tags = ["edusocial"]
    if kind == "paper":
        tags.append(meta["exam_type"])
    else:
        tags.append(meta["category"])
    tags.append(primary_class)
    for level in classes:
        if level != "All" and f"cls:{level}" not in tags:
            tags.append(f"cls:{level}")
    for subject in subjects:
        if f"subj:{subject}" not in tags:
            tags.append(f"subj:{subject}")

    common = {
        "title": title[:200],
        "subject": subject_scalar,
        "subjects": subjects,
        "class_level": class_scalar,
        "class_levels": classes,
        "system": "apc",
        "file_url": f"{BASE_URL}/{key}",
        "file_name": path.name,
        "file_size": size,
        "file_size_formatted": format_bytes(size),
        "content_hash": digest,
        "tags": tags,
        "description": "Source: EduSocialNews (ingested)",
        "downloads": 0,
        "created_at": now,
    }

    if kind == "paper":
        return {
            "id": f"edu-p-{number}",
            **common,
            "year": meta["year"],
            "exam_type": meta["exam_type"],
            "session": meta["session"],
            "preview_url": preview_url,
        }

    return {
        "id": f"edu-b-{number}",
        **common,
        "author": "EduSocialNews",
        "category": meta["category"],
        "class_level": None if classes == ["All"] else class_scalar,
        "cover_url": preview_url,
        "published_year": meta["year"],
        "_key": key,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--include-books", action="store_true",
                        help="also add course/lesson PDFs (default: papers only)")
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    from publish import load_env, make_client  # noqa: E402

    load_env()
    client = make_client()

    papers_doc, books_doc = load_live(client)
    known_hashes, known_names, next_number = existing_state(client, papers_doc, books_doc)
    preview_keys = existing_previews(client)

    files = collect_files()
    if args.limit:
        files = files[: args.limit]
    print("scanning %d PDFs (catalogue: %d papers, %d books) ..." %
          (len(files), len(papers_doc["papers"]), len(books_doc["books"])))

    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    new_papers: list[dict] = []
    new_books: list[dict] = []
    uploads: list[tuple[str, Path, str]] = []
    skipped: list[dict] = []
    seen_hashes: set[str] = set()

    for index, path in enumerate(files, 1):
        try:
            digest = sha256(path)
        except OSError as exc:
            skipped.append({"path": str(path), "reason": f"unreadable: {exc}"})
            continue

        if digest in known_hashes or digest in seen_hashes:
            skipped.append({"path": str(path), "reason": "already in catalogue"})
            continue
        if path.name.lower() in known_names:
            skipped.append({"path": str(path), "reason": "same file name already published"})
            continue

        text = pdf_text(path)
        title = derive_title(path, text)
        hint = class_hint_from_path(path)
        context = folder_context(path)

        if is_non_academic(title, path.name):
            skipped.append({"path": str(path), "reason": "non-academic document", "title": title})
            continue

        # Layout decisions read the name only: a maths lesson can quote
        # "liste des admis" without being an administrative circular.
        meta = classify_document(f"{title} {context}".strip(), path.name, hint=hint)
        if meta["non_exam"]:
            skipped.append({"path": str(path), "reason": "non-exam circular", "title": title})
            continue

        # Camera/HP scans have no text layer. A descriptive file name
        # ("Francais_1ere_A4_Composition_1er_Semestre") is already a good title
        # and tells us whether it is a paper or a course book; only nameless
        # scans ("New Document from HP Deskjet ...") get a synthetic title.
        image_only = len(re.sub(r"\s+", "", text)) < 20
        if image_only:
            stem = clean_stem(path)
            nameless = bool(_GENERIC_STEM.match(stem)) or bool(_BATCH_SCAN.match(stem.strip()))
            if nameless:
                title = synthetic_scan_title(path)
                meta = classify_document(title, path.name, hint=hint)
                meta["kind"] = "paper"
                meta["non_exam"] = False
                fallback_class = scan_class(path.stem)
                if fallback_class and meta["classes"] == ["All"]:
                    meta["classes"] = fallback_class
                fallback_subject = scan_subject(path)
                if fallback_subject and meta["subjects"] == ["Général"]:
                    meta["subjects"] = [fallback_subject]
        else:
            # The page text refines subject/year, but never the paper/book
            # decision (a lesson quoting "liste des admis" is still a lesson).
            rich = classify_document(
                f"{title} {context} {text[:1200]}".strip(), path.name, hint=hint,
            )
            if meta["subjects"] == ["Général"] and rich["subjects"] != ["Général"]:
                meta["subjects"] = rich["subjects"]
            if meta["classes"] == ["All"] and rich["classes"] != ["All"]:
                meta["classes"] = rich["classes"]
            meta["year"] = rich["year"]
            meta["session"] = rich["session"]
            if meta["exam_type"] == "Revision" and rich["exam_type"] != "Revision":
                meta["exam_type"] = rich["exam_type"]
            # A "Devoir/Composition" header on page 1 is exam material even
            # when the file name says nothing ("1èreC4_NDT-D1 Décembre 2024").
            head = text[:400]
            if (
                meta["kind"] != "paper"
                and not re.search(r"(?i)cours|support|manuel|livre|chapitre|programme", title + " " + path.name)
                and re.search(r"(?i)\b(devoir|composition|examen|épreuve|epreuve|sujet)\b", head)
            ):
                meta["kind"] = "paper"
                meta["exam_type"] = rich["exam_type"]

        if meta["kind"] != "paper":
            if not args.include_books:
                skipped.append({"path": str(path), "reason": f"not an exam paper ({meta['kind']})", "title": title})
                continue
            if not looks_like_school_book(title, path.name, context, text):
                skipped.append({"path": str(path), "reason": "off-curriculum book", "title": title})
                continue

        seen_hashes.add(digest)
        number = next_number + 1
        next_number = number
        size = path.stat().st_size

        preview_key = (
            f"previews/edusocial_{digest[:24]}.jpg"
            if meta["kind"] == "paper"
            else f"book-covers/edusocial_{digest[:24]}.jpg"
        )
        preview_url = None
        tmp_preview = PREVIEW_TMP / f"{number:04d}.jpg"
        have_preview = make_preview(path, tmp_preview)
        if have_preview:
            preview_url = f"{BASE_URL}/{preview_key}"

        row = build_row(
            kind=meta["kind"], number=number, path=path, title=title, meta=meta,
            digest=digest, size=size, preview_url=preview_url, now=now,
        )
        key = row.pop("_key", None)
        if key is None:
            key = row["file_url"].split(BASE_URL + "/", 1)[1]

        (new_papers if meta["kind"] == "paper" else new_books).append(row)
        uploads.append((key, path, PDF_CONTENT_TYPE))
        if have_preview:
            uploads.append((preview_key, tmp_preview, JPG_CONTENT_TYPE))

        if index % 25 == 0:
            print("  ... %d/%d scanned" % (index, len(files)), flush=True)

    print("\nnew papers: %d | new books: %d | skipped: %d" %
          (len(new_papers), len(new_books), len(skipped)))
    for row in new_papers:
        print("  P  %-14s %-22s %s" % (row["class_level"], row["subject"], row["title"][:70]))
    for row in new_books:
        print("  B  %-14s %-22s %s" % (row["class_level"] or "-", row["subject"], row["title"][:70]))
    for item in skipped:
        print("  .  %-38s %s" % (item["reason"][:38], Path(item["path"]).name[:80]))

    report = {
        "generated_at": now,
        "scanned": len(files),
        "new_papers": len(new_papers),
        "new_books": len(new_books),
        "skipped": skipped,
        "papers": [{k: r[k] for k in ("id", "title", "class_level", "subject", "exam_type", "file_url")} for r in new_papers],
        "books": [{k: r[k] for k in ("id", "title", "class_level", "subject", "category", "file_url")} for r in new_books],
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    print("\nreport: %s" % REPORT)

    if not args.execute:
        print("dry run: pass --execute to upload the PDFs and publish the catalogue")
        return 0

    if not new_papers and not new_books:
        print("nothing new to upload")
        return 0

    for index, (key, path, content_type) in enumerate(uploads, 1):
        if key in preview_keys and key.startswith(("previews/", "book-covers/")):
            continue
        client.upload_file(
            str(path), BUCKET, key,
            ExtraArgs={"ContentType": content_type, "CacheControl": CACHE_PDF},
        )
        if index % 25 == 0:
            print("  ... %d/%d uploaded" % (index, len(uploads)), flush=True)
    print("uploaded %d objects" % len(uploads))

    merged_papers = papers_doc["papers"] + new_papers
    merged_books = books_doc["books"] + new_books
    merged_papers.sort(key=lambda r: (-(r.get("year") or 0), r.get("title") or ""))
    merged_books.sort(key=lambda r: r.get("title") or "")

    stamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    CATALOG.mkdir(parents=True, exist_ok=True)
    for name, rows, field in (
        ("papers.json", merged_papers, "papers"),
        ("books.json", merged_books, "books"),
    ):
        payload = json.dumps(
            {"generated_at": stamp, "count": len(rows), field: rows},
            ensure_ascii=False, indent=1,
        ).encode("utf-8")
        client.put_object(
            Bucket=BUCKET, Key=f"catalog/{name}", Body=payload,
            ContentType="application/json", CacheControl="public, max-age=300",
        )
        print("published catalog/%s (%d rows)" % (name, len(rows)))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
