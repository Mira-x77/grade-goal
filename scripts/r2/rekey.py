#!/usr/bin/env python3
"""Re-key the R2 bucket so its paths mirror the Supabase `exam-papers` bucket.

Supabase Storage already holds the library at

    exam-papers/edusocial/papers/<class>/<subject>/<id>-<title>.pdf
    exam-papers/edusocial/books/<category>/<subject>/<id>-<title>.pdf
    exam-papers/previews/edusocial_<sha256[:24]>.jpg
    exam-papers/book-covers/edusocial_<sha256[:24]>.jpg

This script rewrites the objects uploaded by publish.py (flat layout
`papers/`, `books/`, `previews/`) into exactly those paths. The copy happens
inside R2 (CopyObject), so no PDF bytes travel over the network — only object
metadata is touched.

Afterwards the database needs nothing but a domain swap:
    https://<ref>.supabase.co/storage/v1/object/public/exam-papers
 -> https://pub-xxxx.r2.dev

Usage:
    python scripts/r2/rekey.py            # dry run, shows what would move
    python scripts/r2/rekey.py --execute  # copy to the mirrored keys, delete the flat ones

The operation is idempotent: objects already at the mirrored key are skipped,
so an interrupted run can simply be repeated.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import publish  # noqa: E402

from publish import (  # noqa: E402
    CATALOG_OUT,
    JSON_CONTENT_TYPE,
    MANIFEST,
    human,
    load_env,
    make_client,
)


def existing_keys(client, bucket: str) -> set[str]:
    keys: set[str] = set()
    for page in client.get_paginator("list_objects_v2").paginate(Bucket=bucket):
        for obj in page.get("Contents", []):
            keys.add(obj["Key"])
    return keys


def main() -> int:
    load_env()
    ap = argparse.ArgumentParser(description="Mirror the Supabase Storage layout in R2")
    ap.add_argument("--execute", action="store_true", help="copy + delete (default: dry run)")
    ap.add_argument("--concurrency", type=int, default=8)
    ap.add_argument("--keep-old", action="store_true",
                    help="leave the flat keys in place (costs double storage)")
    args = ap.parse_args()

    base = (os.environ.get("R2_PUBLIC_URL") or "").rstrip("/")
    bucket = os.environ.get("R2_BUCKET") or ""
    if not base or not bucket:
        sys.exit("R2_PUBLIC_URL and R2_BUCKET must be set in scripts/r2/.env")

    print("computing both layouts ...", flush=True)
    _, _, old_uploads, _ = publish.build(base, False, layout="flat")
    papers, books, new_uploads, stats = publish.build(base, False, layout="supabase")

    old_by_path = {str(o["path"]): o["key"] for o in old_uploads}
    pairs = [(old_by_path.get(str(o["path"])), o) for o in new_uploads]

    print(f"\npdfs {stats['pdfs']}  previews {stats['previews']}  "
          f"objects {len(pairs)}  {human(stats['bytes'] + stats['preview_bytes'])}")
    print("\nexamples:")
    for src, item in pairs[:2]:
        print(f"  {src}\n    -> {item['key']}")
    cover = next((p for p in pairs if p[1]["key"].startswith("book-covers/")), None)
    if cover:
        print(f"  {cover[0]}\n    -> {cover[1]['key']}")

    # catalogue + SQL always regenerated against the mirrored layout
    publish.write_catalogs(papers, books)
    publish.write_repoint_sql(papers, books)

    if not args.execute:
        print("\ndry run only. Re-run with --execute to move the objects.")
        return 0

    client = make_client()
    have = existing_keys(client, bucket)
    print(f"\nbucket currently holds {len(have)} objects")

    stats_run = {"copied": 0, "skipped": 0, "deleted": 0, "missing": []}

    def move(pair: tuple[str | None, dict]) -> None:
        src, item = pair
        dest = item["key"]
        try:
            if dest in have:
                stats_run["skipped"] += 1
            elif src and src in have:
                client.copy_object(
                    Bucket=bucket,
                    Key=dest,
                    CopySource={"Bucket": bucket, "Key": src},
                    ContentType=item["type"],
                    CacheControl=item["cache"],
                    MetadataDirective="REPLACE",
                )
                have.add(dest)
                stats_run["copied"] += 1
                print(f"  copy {src} -> {dest}", flush=True)
            else:
                stats_run["missing"].append(src or dest)
                print(f"  ! neither {src} nor {dest} exists", flush=True)
                return
            if not args.keep_old and src and src in have and src != dest:
                client.delete_object(Bucket=bucket, Key=src)
                have.discard(src)
                stats_run["deleted"] += 1
        except Exception as exc:  # noqa: BLE001
            stats_run["missing"].append(f"{src}: {exc}")

    with ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        list(pool.map(move, pairs))

    # catalogue has to be public too — its content changed with the layout
    for name in ("papers.json", "books.json"):
        path = CATALOG_OUT / name
        client.put_object(Bucket=bucket, Key=f"catalog/{name}",
                          Body=path.read_bytes(), ContentType=JSON_CONTENT_TYPE,
                          CacheControl="public, max-age=300")
        have.add(f"catalog/{name}")

    manifest = {"objects": {}}
    stamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    for _, item in pairs:
        path: Path = item["path"]
        manifest["objects"][item["key"]] = {
            "size": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "at": stamp,
        }
    for name in ("papers.json", "books.json"):
        path = CATALOG_OUT / name
        manifest["objects"][f"catalog/{name}"] = {
            "size": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "at": stamp,
        }
    MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    # what to delete in the Supabase dashboard, one path per line
    delete_list = CATALOG_OUT / "supabase-delete-list.txt"
    delete_list.write_text(
        "# Paths inside the Supabase Storage bucket `exam-papers`.\n"
        "# Every one of them now exists at the same path on R2.\n"
        + "\n".join(sorted(item["key"] for _, item in pairs)) + "\n",
        encoding="utf-8",
    )

    print(f"\ncopied {stats_run['copied']}  already there {stats_run['skipped']}  "
          f"deleted {stats_run['deleted']}  problems {len(stats_run['missing'])}")
    if stats_run["missing"]:
        for line in stats_run["missing"][:10]:
            print(f"  ! {line}")
    print(f"\nobjects now: {len(have)}")
    print(f"catalogue:   {base}/catalog/papers.json")
    print(f"repoint:     {CATALOG_OUT / 'repoint.sql'}")
    print(f"domain swap: {CATALOG_OUT / 'repoint-prefix.sql'}")
    print(f"delete list: {delete_list}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
