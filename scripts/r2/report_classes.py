#!/usr/bin/env python3
"""Report the local EduSocial library grouped by classe and série.

Reads downloads/edusocial-books/*.pdf, classifies each file with the same
rules as scripts/r2/publish.py, and writes:

  scripts/r2/output/by-class.csv   one row per PDF (class, série, subject, ...)

Usage:
  python scripts/r2/report_classes.py            # print the breakdown
  python scripts/r2/report_classes.py --class "Tle D"   # list one class
"""

from __future__ import annotations

import argparse
import collections
import csv
import html
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from classify import detect_class, detect_kind, detect_subject, detect_year  # noqa: E402

LIB = ROOT / "downloads" / "edusocial-books"
OUT = ROOT / "scripts" / "r2" / "output" / "by-class.csv"


def load_titles() -> dict[int, dict]:
    path = LIB / "catalog.json"
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    return {int(b["book_id"]): b for b in data.get("books", []) if b.get("book_id")}


def collect() -> list[dict]:
    titles = load_titles()
    rows: list[dict] = []
    for pdf in sorted(LIB.glob("*.pdf")):
        prefix = pdf.name.split(" - ")[0]
        if not prefix.isdigit():
            continue
        bid = int(prefix)
        entry = titles.get(bid, {})
        title = html.unescape(entry.get("title") or pdf.stem)
        kind, extra = detect_kind(title, entry.get("slug", ""))
        rows.append({
            "id": bid,
            "class": detect_class(title),
            "subject": detect_subject(title),
            "kind": kind,
            "detail": extra,
            "year": detect_year(title),
            "mb": round(pdf.stat().st_size / 1048576, 2),
            "file": pdf.name,
        })
    rows.sort(key=lambda r: (r["class"], r["subject"], r["file"]))
    return rows


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--class", dest="klass", help="only show this class, e.g. 'Tle D'")
    ap.add_argument("--no-csv", action="store_true")
    args = ap.parse_args()

    rows = collect()
    if not args.no_csv:
        OUT.parent.mkdir(parents=True, exist_ok=True)
        with OUT.open("w", newline="", encoding="utf-8-sig") as fh:
            writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)

    if args.klass:
        wanted = args.klass.lower()
        picked = [r for r in rows if r["class"].lower() == wanted]
        print(f"{args.klass}: {len(picked)} documents")
        for r in picked:
            print(f"  {r['id']:04d}  {r['subject']:14} {r['kind']:5} {r['mb']:7.2f} MB  {r['file'][:70]}")
        return 0

    by_class = collections.Counter(r["class"] for r in rows)
    by_kind = collections.Counter(r["kind"] for r in rows)
    print(f"total {len(rows)} PDFs\n")
    print("by classe / série")
    for name, count in sorted(by_class.items(), key=lambda kv: (-kv[1], kv[0])):
        papers = sum(1 for r in rows if r["class"] == name and r["kind"] == "paper")
        print(f"  {name:12} {count:4}   papers {papers:3}  books {count - papers:3}")
    print("\nby type")
    for name, count in by_kind.most_common():
        print(f"  {name:6} {count}")
    if not args.no_csv:
        print(f"\ncsv: {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
