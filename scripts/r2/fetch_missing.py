#!/usr/bin/env python3
"""Download the EduSocial PDFs that are still missing from the local mirror.

downloads/edusocial-books/catalog.json lists 679 books; 551 are on disk. The
remaining ones exist in Supabase Storage but that project is restricted, so the
cleanest way to make the R2 library complete is to re-fetch them from the
source site (their download URLs are in the catalogue).

Usage:
  python scripts/r2/fetch_missing.py --dry-run     # list what is missing
  python scripts/r2/fetch_missing.py               # download
  python scripts/r2/fetch_missing.py --limit 20    # try a few first
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LIB_DIR = ROOT / "downloads" / "edusocial-books"
CATALOG_SRC = LIB_DIR / "catalog.json"
STATE = Path(__file__).resolve().parent / "output" / "fetch-missing.json"

USER_AGENT = "GoStudy/1.0 (+migration to R2; educational use)"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def human(n: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if abs(n) < 1024 or unit == "GB":
            return f"{n:.1f} {unit}" if unit != "B" else f"{int(n)} B"
        n /= 1024
    return f"{n:.1f} GB"


def sanitize_filename(title: str, book_id: int, slug: str) -> str:
    base = title or slug
    base = unicodedata.normalize("NFKD", base)
    base = base.encode("ascii", "ignore").decode("ascii")
    base = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "", base)
    base = re.sub(r"\s+", " ", base).strip(" .")
    if not base:
        base = slug
    if len(base) > 120:
        base = base[:120].rstrip(" .")
    return f"{book_id:04d} - {base}.pdf"


def local_ids() -> set[int]:
    ids: set[int] = set()
    for path in LIB_DIR.glob("*.pdf"):
        prefix, _, _ = path.name.partition(" - ")
        if prefix.isdigit():
            ids.add(int(prefix))
    return ids


def fetch(url: str, timeout: int = 120) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--delay", type=float, default=1.2)
    args = ap.parse_args()

    catalog = json.loads(CATALOG_SRC.read_text(encoding="utf-8"))
    have = local_ids()
    missing = [b for b in catalog.get("books", [])
               if b.get("book_id") and int(b["book_id"]) not in have]

    todo = []
    for entry in missing:
        url = entry.get("download_url")
        if not url:
            continue
        title = html.unescape(entry.get("title") or entry["slug"]).replace("&#039;", "'")
        todo.append({
            "id": int(entry["book_id"]),
            "title": title,
            "slug": entry["slug"],
            "url": url,
            "dest": LIB_DIR / sanitize_filename(title, int(entry["book_id"]), entry["slug"]),
        })

    no_url = len(missing) - len(todo)
    print(f"on disk: {len(have)}   catalogue: {len(catalog.get('books', []))}   "
          f"missing: {len(missing)}   downloadable: {len(todo)}   no url: {no_url}")

    if args.dry_run:
        for item in todo[:40]:
            print(f"  {item['id']:04d}  {item['title'][:70]}")
        if len(todo) > 40:
            print(f"  ... and {len(todo) - 40} more")
        return 0

    if args.limit:
        todo = todo[: args.limit]

    state = {"ok": [], "failed": []}
    if STATE.exists():
        try:
            state = json.loads(STATE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass

    ok = failed = skipped = 0
    total_bytes = 0
    started = time.time()

    for index, item in enumerate(todo, 1):
        dest: Path = item["dest"]
        if dest.exists() and dest.stat().st_size > 1024:
            skipped += 1
            continue
        print(f"[{index}/{len(todo)}] {item['id']:04d} {item['title'][:60]}", flush=True)
        last_error = None
        for attempt in range(3):
            try:
                data = fetch(item["url"])
                if not data.startswith(b"%PDF"):
                    raise RuntimeError(f"not a PDF ({len(data)} bytes, starts {data[:16]!r})")
                tmp = dest.with_suffix(".part")
                tmp.write_bytes(data)
                tmp.replace(dest)
                ok += 1
                total_bytes += len(data)
                state["ok"].append({"id": item["id"], "bytes": len(data)})
                print(f"    ok {human(len(data))}", flush=True)
                last_error = None
                break
            except (urllib.error.URLError, TimeoutError, RuntimeError) as exc:
                last_error = exc
                print(f"    retry {attempt + 1}/3: {exc}", flush=True)
                time.sleep(2 * (attempt + 1))
        if last_error is not None:
            failed += 1
            state["failed"].append({"id": item["id"], "error": str(last_error)})
        STATE.parent.mkdir(parents=True, exist_ok=True)
        STATE.write_text(json.dumps(state, indent=2), encoding="utf-8")
        time.sleep(args.delay)

    elapsed = time.time() - started
    print(f"\ndownloaded {ok} ({human(total_bytes)}), skipped {skipped}, failed {failed}, "
          f"{elapsed / 60:.1f} min")
    print(f"state: {STATE}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
