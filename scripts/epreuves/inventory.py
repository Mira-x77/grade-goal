#!/usr/bin/env python3
"""Inventory epreuvesetcorriges.com: how many documents, which categories.

The site is Joomla + EDocman. Listing pages live under /index.php/categories/...
and paginate 10 documents at a time (?start=0,10,20...). Each card links to
/<category>/<id>-<slug>; the PDF itself is at that URL + /download and is gated
behind a (free) account, so this script only counts and lists, never downloads.

It is resumable: progress per category is stored in
scripts/epreuves/output/inventory-state.json, so a timeout or a stop just
continues where it left off on the next run.

Usage:
  python scripts/epreuves/inventory.py              # crawl / continue
  python scripts/epreuves/inventory.py --workers 1  # gentler
  python scripts/epreuves/inventory.py --max 100    # cap pages per category
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
import urllib.error
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

BASE = "https://epreuvesetcorriges.com"
SITEMAP = f"{BASE}/sitemap.xml"
UA = "GoStudyBot/1.0 (+library import; educational use)"
HERE = Path(__file__).resolve().parent
OUT = HERE / "inventory.json"
STATE = HERE / "output" / "inventory-state.json"

CARD_RE = re.compile(
    r'<a href="([^"]+)"[^>]*class="edocman-document-title-link"[^>]*>([\s\S]*?)</a>',
    re.I,
)
CAT_RE = re.compile(r"<loc>([^<]+)</loc>", re.I)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def fetch(url: str, timeout: int = 90, attempts: int = 3) -> str:
    last: Exception | None = None
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            last = exc
            time.sleep(3 * (attempt + 1))
    raise RuntimeError(str(last))


def text_of(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip()


def load_state() -> dict:
    if STATE.exists():
        try:
            return json.loads(STATE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {"done": [], "next_start": {}}


def save_state(state: dict) -> None:
    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(state, indent=1), encoding="utf-8")


def crawl_category(page_url: str, seen: dict[str, dict], state: dict,
                   max_pages: int, delay: float) -> tuple[int, bool]:
    """Walk the category's pages from the saved offset. Returns (added, finished)."""
    key = page_url.replace(BASE, "")
    start = int(state["next_start"].get(key, 0))
    added = 0
    for _ in range(max_pages):
        url = page_url if start == 0 else f"{page_url}?start={start}"
        try:
            body = fetch(url)
        except RuntimeError as exc:
            print(f"    ! {url}: {exc}", flush=True)
            state["next_start"][key] = start
            return added, False
        cards = CARD_RE.findall(body)
        if not cards:
            # Joomla returns an empty document list past the last page.
            state["done"].append(key)
            state["next_start"].pop(key, None)
            return added, True
        for href, label in cards:
            link = href if href.startswith("http") else BASE + href
            if link in seen:
                continue
            seen[link] = {"url": link, "title": text_of(label), "category": key}
            added += 1
        start += 10
        state["next_start"][key] = start
        save_state(state)
        time.sleep(delay)
    return added, False


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max", type=int, default=400, help="pages per category per run")
    ap.add_argument("--workers", type=int, default=2)
    ap.add_argument("--delay", type=float, default=0.8)
    args = ap.parse_args()

    pages = [u for u in CAT_RE.findall(fetch(SITEMAP)) if "/categories/" in u]
    state = load_state()

    seen: dict[str, dict] = {}
    if OUT.exists():
        try:
            for row in json.loads(OUT.read_text(encoding="utf-8")):
                seen[row["url"]] = row
        except json.JSONDecodeError:
            pass
    print(f"categories: {len(pages)}   already listed: {len(seen)}   done: {len(state['done'])}")

    todo = [p for p in pages if p.replace(BASE, "") not in state["done"]]
    per_cat: dict[str, int] = defaultdict(int)

    def work(page: str) -> tuple[str, int, bool]:
        n, finished = crawl_category(page, seen, state, args.max, args.delay)
        return page, n, finished

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        for page, n, finished in pool.map(work, todo):
            key = page.replace(BASE, "")
            per_cat[key] = n
            flag = "done" if finished else "continues"
            print(f"  {n:5}  {key}  ({flag})", flush=True)

    OUT.write_text(json.dumps(list(seen.values()), ensure_ascii=False, indent=1), encoding="utf-8")
    save_state(state)
    remaining = sum(1 for p in pages if p.replace(BASE, "") not in state["done"])
    print(f"\ndocuments listed: {len(seen)}   categories unfinished: {remaining}")
    print(f"saved: {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
