#!/usr/bin/env python3
"""Publish the Actus/feed posts to Cloudflare R2.

The app used to read the feed from Supabase (`course_posts`). While the project
is restricted (HTTP 402) that table cannot be read, so the Actus page now falls
back to `catalog/feed.json`, published next to `papers.json` / `books.json`.

The source material is the set of GoStudy promo images that lived on the
operator's Desktop (`gostudy img/`). Each one is uploaded unchanged to
`feed/<slug>.<ext>` and described by a row with the same shape as
`course_posts`, so the app and the admin can consume it without changes.

Usage:
  python scripts/r2/seed_feed.py            # dry run, no credentials needed
  python scripts/r2/seed_feed.py --execute  # upload images + feed.json
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from publish import load_env, make_client  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = Path(__file__).resolve().parent / "output" / "catalog"
BUCKET = "gostudy"
JSON_CONTENT_TYPE = "application/json"
CACHE_JSON = "public, max-age=300"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# `source` is the original file name inside the Desktop image folder. The image
# itself is copied byte for byte; only the R2 key changes.
POSTS = [
    {
        "slug": "track-practice-pass",
        "source": "Go Study! \u2014 Track. Practice. Pass..png",
        "title": "Go Study! \u2014 Track. Practice. Pass.",
        "description": (
            "Suivez vos notes, entra\u00eenez-vous sur les anciens sujets et "
            "passez vos examens avec GoStudy !"
        ),
        "featured": True,
    },
    {
        "slug": "all-your-marks",
        "source": "All your marks. Always in sight.png",
        "title": "All your marks. Always in sight.",
        "description": (
            "Toutes vos notes au m\u00eame endroit : moyennes, mati\u00e8res et "
            "objectifs, toujours \u00e0 port\u00e9e de main."
        ),
        "featured": False,
    },
    {
        "slug": "bac-probatoire-waec-neco",
        "source": "Bac. Probatoire. WAEC. NECO. All in your pocket.png",
        "title": "Bac. Probatoire. WAEC. NECO. All in your pocket.",
        "description": (
            "Anciens sujets et corrig\u00e9s du Bac, du Probatoire, du WAEC et du "
            "NECO dans votre poche."
        ),
        "featured": False,
    },
    {
        "slug": "learn-beyond-the-classroom",
        "source": "Learn beyond the classroom.png",
        "title": "Learn beyond the classroom.",
        "description": (
            "D\u00e9couvrez des cours et des formations pour aller plus loin que "
            "la salle de classe."
        ),
        "featured": False,
    },
    {
        "slug": "one-goal-in-mind",
        "source": "One goal in mind.png",
        "title": "One goal in mind. One subject at a time.",
        "description": (
            "Fixez votre objectif de moyenne et progressez mati\u00e8re par "
            "mati\u00e8re."
        ),
        "featured": False,
    },
]


def default_source_dir() -> Path:
    return Path(os.path.expanduser("~")) / "Desktop" / "gostudy img"


def public_base() -> str:
    base = os.environ.get("R2_PUBLIC_URL", "").strip().rstrip("/")
    if not base:
        sys.exit("missing R2_PUBLIC_URL (scripts/r2/.env)")
    return base


def find_source(source_dir: Path, name: str) -> Path:
    exact = source_dir / name
    if exact.exists():
        return exact
    # Some files were renamed with an ASCII hyphen; match on the stem.
    wanted = name.lower().replace("\u2014", "-")
    for candidate in source_dir.iterdir():
        if candidate.is_file() and candidate.name.lower().replace("\u2014", "-") == wanted:
            return candidate
    raise FileNotFoundError(f"{name!r} not found in {source_dir}")


def build_rows(source_dir: Path, base: str) -> tuple[list[dict], list[tuple[Path, str]]]:
    rows: list[dict] = []
    uploads: list[tuple[Path, str]] = []

    for post in POSTS:
        path = find_source(source_dir, post["source"])
        ext = path.suffix.lower() or ".png"
        key = f"feed/{post['slug']}{ext}"
        stat = path.stat()
        created = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat().replace(
            "+00:00", "Z"
        )
        rows.append(
            {
                "id": f"feed-{post['slug']}",
                "title": post["title"],
                "description": post["description"],
                "instructor": None,
                "price": None,
                "duration": None,
                "level": "Beginner",
                "category": "News",
                "image_url": f"{base}/{key}",
                "image_urls": [f"{base}/{key}"],
                "post_type": "news",
                "link_url": None,
                "is_featured": post["featured"],
                "is_active": True,
                "created_at": created,
                "expires_at": None,
            }
        )
        uploads.append((path, key))

    # Featured first, then newest first (same order the app's query uses).
    rows.sort(key=lambda r: (r["is_featured"], r["created_at"]), reverse=True)
    return rows, uploads


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true", help="upload the images and feed.json")
    parser.add_argument(
        "--source",
        type=Path,
        default=default_source_dir(),
        help="folder holding the original GoStudy promo images",
    )
    args = parser.parse_args()

    load_env()
    base = public_base()
    posts, uploads = build_rows(args.source, base)
    generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    document = {"generated_at": generated_at, "count": len(posts), "posts": posts}

    print(f"source : {args.source}")
    print(f"posts  : {len(posts)}")
    sources = {key: path for path, key in uploads}
    for post in posts:
        key = post["image_url"].split("/", 3)[-1]
        path = sources.get(key)
        origin = f"{path.name} ({path.stat().st_size} bytes)" if path else key
        print(f"  {key}  <-  {origin}")
        print(f"     {post['title']}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(document, ensure_ascii=False, indent=2) + "\n"
    (OUT_DIR / "feed.json").write_text(payload, encoding="utf-8")
    print(f"feed.json written to {OUT_DIR / 'feed.json'}")

    if not args.execute:
        print("dry run: pass --execute to upload")
        return 0

    client = make_client()
    for path, key in uploads:
        content_type = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
        client.put_object(
            Bucket=BUCKET,
            Key=key,
            Body=path.read_bytes(),
            ContentType=content_type,
            CacheControl="public, max-age=31536000, immutable",
        )
        print(f"uploaded {key}")

    client.put_object(
        Bucket=BUCKET,
        Key="catalog/feed.json",
        Body=payload.encode("utf-8"),
        ContentType=JSON_CONTENT_TYPE,
        CacheControl=CACHE_JSON,
    )
    print("uploaded catalog/feed.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
