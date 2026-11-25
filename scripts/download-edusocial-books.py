#!/usr/bin/env python3
"""Bulk download free PDF books from edusocialnews.com/books.

Flow:
  listing pages -> book detail slug -> numeric id from /books/{id}/telecharger
  -> PDF at /books/download/{id}

Usage:
  python scripts/download-edusocial-books.py --crawl-only
  python scripts/download-edusocial-books.py --batch-size 100 --batch-number 1
  python scripts/download-edusocial-books.py --batch-size 100 --batch-number 2
"""

from __future__ import annotations

import argparse
import json
import re
import ssl
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

BASE_URL = "https://edusocialnews.com"
LISTING_URL = f"{BASE_URL}/books"
USER_AGENT = "GoStudy/1.0 (+local bulk download; educational use)"
DEFAULT_DELAY = 1.5

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "downloads" / "edusocial-books"
CATALOG_PATH = OUT_DIR / "catalog.json"
PROGRESS_PATH = OUT_DIR / "progress.json"

SLUG_RE = re.compile(r"https://edusocialnews\.com/books/([a-z][a-z0-9-]+)")
TELECHARGER_ID_RE = re.compile(r"/books/(\d+)/telecharger")
TITLE_RE = re.compile(r"<title>([^<]+)</title>", re.I)
H1_RE = re.compile(r"<h1[^>]*>(.*?)</h1>", re.I | re.S)
NUMBER_OF_ITEMS_RE = re.compile(r'"numberOfItems"\s*:\s*(\d+)')
PDF_MAGIC = b"%PDF"


@dataclass
class BookEntry:
    slug: str
    book_id: int | None = None
    title: str | None = None
    detail_url: str | None = None
    download_url: str | None = None


class EduSocialClient:
    def __init__(self, delay: float = DEFAULT_DELAY) -> None:
        self.delay = delay
        self._last_request = 0.0
        ctx = ssl.create_default_context()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPSHandler(context=ctx),
        )

    def _sleep(self) -> None:
        elapsed = time.monotonic() - self._last_request
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)

    def fetch(
        self,
        url: str,
        *,
        method: str = "GET",
        data: bytes | None = None,
        headers: dict[str, str] | None = None,
        binary: bool = False,
    ) -> tuple[int, dict[str, str], bytes | str]:
        self._sleep()
        req_headers = {"User-Agent": USER_AGENT}
        if headers:
            req_headers.update(headers)
        req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
        try:
            with self.opener.open(req, timeout=120) as resp:
                body = resp.read()
                self._last_request = time.monotonic()
                hdrs = dict(resp.headers.items())
                if binary:
                    return resp.status, hdrs, body
                return resp.status, hdrs, body.decode("utf-8", errors="replace")
        except urllib.error.HTTPError as exc:
            body = exc.read()
            self._last_request = time.monotonic()
            hdrs = dict(exc.headers.items()) if exc.headers else {}
            if binary:
                return exc.code, hdrs, body
            return exc.code, hdrs, body.decode("utf-8", errors="replace")

    def fetch_text(self, url: str) -> tuple[int, str]:
        status, _, body = self.fetch(url)
        return status, body  # type: ignore[return-value]

    def fetch_bytes(self, url: str) -> tuple[int, dict[str, str], bytes]:
        status, hdrs, body = self.fetch(url, binary=True)
        return status, hdrs, body  # type: ignore[return-value]


def strip_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


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


def extract_title(html: str) -> str | None:
    h1 = H1_RE.search(html)
    if h1:
        title = strip_html(h1.group(1))
        if title:
            return title
    m = TITLE_RE.search(html)
    if not m:
        return None
    title = m.group(1).strip()
    title = re.sub(r"\s*[|\-–—]\s*EduSocialNews.*$", "", title, flags=re.I)
    return title.strip() or None


def extract_slugs_from_listing(html: str) -> set[str]:
    return set(SLUG_RE.findall(html))


def crawl_catalog(client: EduSocialClient, max_pages: int | None = None) -> list[BookEntry]:
    print("Crawling book listing pages...")
    status, first_html = client.fetch_text(LISTING_URL)
    if status != 200:
        raise RuntimeError(f"Failed to load listing page: HTTP {status}")

    expected = None
    m = NUMBER_OF_ITEMS_RE.search(first_html)
    if m:
        expected = int(m.group(1))
        print(f"Site reports {expected} books in JSON-LD")

    slugs: set[str] = extract_slugs_from_listing(first_html)
    page_nums = {int(x) for x in re.findall(r"[?&]page=(\d+)", first_html)}
    last_page = max(page_nums) if page_nums else 1

    if max_pages is not None:
        last_page = min(last_page, max_pages)

    for page in range(2, last_page + 1):
        url = f"{LISTING_URL}?page={page}"
        status, html = client.fetch_text(url)
        if status != 200:
            print(f"  Warning: page {page} returned HTTP {status}, stopping crawl")
            break
        found = extract_slugs_from_listing(html)
        before = len(slugs)
        slugs.update(found)
        print(f"  page {page}/{last_page}: +{len(slugs) - before} slugs (total {len(slugs)})")
        if not found:
            break

    entries = [BookEntry(slug=s, detail_url=f"{BASE_URL}/books/{s}") for s in sorted(slugs)]
    print(f"Collected {len(entries)} unique slugs")
    if expected and len(entries) < expected * 0.9:
        print(f"  Warning: found fewer slugs ({len(entries)}) than expected ({expected})")

    print("Fetching book ids and titles from detail pages...")
    for i, entry in enumerate(entries, 1):
        status, html = client.fetch_text(entry.detail_url)  # type: ignore[arg-type]
        if status != 200:
            print(f"  [{i}/{len(entries)}] {entry.slug}: detail HTTP {status}")
            continue
        ids = TELECHARGER_ID_RE.findall(html)
        if not ids:
            print(f"  [{i}/{len(entries)}] {entry.slug}: no telecharger id found")
            continue
        entry.book_id = int(ids[0])
        entry.title = extract_title(html)
        entry.download_url = f"{BASE_URL}/books/download/{entry.book_id}"
        if i % 25 == 0 or i == len(entries):
            print(f"  resolved {i}/{len(entries)}")

    resolved = [e for e in entries if e.book_id is not None]
    print(f"Resolved {len(resolved)}/{len(entries)} books with download ids")
    return entries


def load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    tmp.replace(path)


def save_catalog(entries: list[BookEntry]) -> None:
    payload = {
        "source": LISTING_URL,
        "crawled_at": datetime.now(timezone.utc).isoformat(),
        "count": len(entries),
        "resolved_count": sum(1 for e in entries if e.book_id),
        "books": [asdict(e) for e in entries],
    }
    save_json(CATALOG_PATH, payload)
    print(f"Catalog saved to {CATALOG_PATH}")


def load_catalog_entries() -> list[BookEntry]:
    data = load_json(CATALOG_PATH, None)
    if not data:
        raise FileNotFoundError(
            f"No catalog at {CATALOG_PATH}. Run with --crawl-only first."
        )
    return [BookEntry(**b) for b in data["books"]]


def is_valid_pdf(path: Path) -> bool:
    if not path.exists() or path.stat().st_size < 1024:
        return False
    with path.open("rb") as f:
        return f.read(4) == PDF_MAGIC


def download_pdf(
    client: EduSocialClient,
    entry: BookEntry,
    dest: Path,
) -> tuple[bool, str]:
    if not entry.book_id or not entry.download_url:
        return False, "missing book id"

    if is_valid_pdf(dest):
        return True, "skipped (already exists)"

    status, hdrs, body = client.fetch_bytes(entry.download_url)
    if status != 200:
        return False, f"HTTP {status}"

    content_type = (hdrs.get("Content-Type") or "").lower()
    if body[:4] != PDF_MAGIC and "pdf" not in content_type:
        return False, f"not a PDF (content-type={content_type})"

    dest.parent.mkdir(parents=True, exist_ok=True)
    part = dest.with_suffix(".pdf.part")
    with part.open("wb") as f:
        f.write(body)
    part.replace(dest)
    return True, f"ok ({len(body)} bytes)"


def run_batch(
    client: EduSocialClient,
    entries: list[BookEntry],
    batch_size: int,
    batch_number: int,
) -> dict[str, Any]:
    resolved = [e for e in entries if e.book_id is not None]
    start = (batch_number - 1) * batch_size
    end = start + batch_size
    batch = resolved[start:end]

    if not batch:
        raise ValueError(
            f"Batch {batch_number} is empty (resolved books={len(resolved)}, "
            f"batch_size={batch_size})"
        )

    progress = load_json(
        PROGRESS_PATH,
        {"downloads": {}, "failures": {}, "updated_at": None},
    )

    ok = 0
    skipped = 0
    failed = 0
    results: list[dict[str, Any]] = []

    print(
        f"Batch {batch_number}: books {start + 1}-{start + len(batch)} "
        f"of {len(resolved)} resolved ({len(batch)} in batch)"
    )

    for i, entry in enumerate(batch, start + 1):
        filename = sanitize_filename(entry.title or entry.slug, entry.book_id, entry.slug)
        dest = OUT_DIR / filename
        success, message = download_pdf(client, entry, dest)

        record = {
            "index": i,
            "slug": entry.slug,
            "book_id": entry.book_id,
            "title": entry.title,
            "file": str(dest.relative_to(ROOT)).replace("\\", "/"),
            "status": "ok" if success else "failed",
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        results.append(record)

        key = str(entry.book_id)
        if success:
            if "skipped" in message:
                skipped += 1
            else:
                ok += 1
            progress["downloads"][key] = record
            progress["failures"].pop(key, None)
            mark = "SKIP" if "skipped" in message else "OK"
        else:
            failed += 1
            progress["failures"][key] = record
            mark = "FAIL"

        print(f"  [{i:4d}] {mark} id={entry.book_id} {entry.slug}: {message}")

    progress["updated_at"] = datetime.now(timezone.utc).isoformat()
    progress["last_batch"] = {
        "batch_number": batch_number,
        "batch_size": batch_size,
        "ok": ok,
        "skipped": skipped,
        "failed": failed,
    }
    save_json(PROGRESS_PATH, progress)

    summary = {
        "batch_number": batch_number,
        "batch_size": batch_size,
        "range": [start + 1, start + len(batch)],
        "attempted": len(batch),
        "downloaded": ok,
        "skipped": skipped,
        "failed": failed,
        "total_resolved": len(resolved),
        "total_slugs": len(entries),
    }
    return summary


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Download EduSocialNews book PDFs")
    p.add_argument("--crawl-only", action="store_true", help="Crawl catalog and exit")
    p.add_argument("--batch-size", type=int, default=100)
    p.add_argument("--batch-number", type=int, default=1)
    p.add_argument("--delay", type=float, default=DEFAULT_DELAY, help="Seconds between requests")
    p.add_argument("--max-pages", type=int, default=None, help="Limit listing pages (debug)")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    client = EduSocialClient(delay=args.delay)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    if not CATALOG_PATH.exists() or args.crawl_only:
        entries = crawl_catalog(client, max_pages=args.max_pages)
        save_catalog(entries)
        if args.crawl_only:
            resolved = sum(1 for e in entries if e.book_id)
            print(f"Crawl complete: {len(entries)} slugs, {resolved} resolved")
            return 0
    else:
        entries = load_catalog_entries()
        print(f"Loaded catalog: {len(entries)} slugs")

    summary = run_batch(client, entries, args.batch_size, args.batch_number)
    print("\n=== Batch summary ===")
    for k, v in summary.items():
        print(f"  {k}: {v}")
    print(f"\nPDFs saved under: {OUT_DIR}")
    print(f"Progress log: {PROGRESS_PATH}")
    return 0 if summary["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
