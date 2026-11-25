#!/usr/bin/env python3
"""Delete the Supabase Storage originals whose copies are on R2.

Why a script and not SQL: the bytes live in the Storage backend, not in
`storage.objects`. Deleting rows from that table removes the metadata and leaves
the files behind, so the quota does not drop — and Supabase does not support it.
The supported path is the Storage API, which this script calls with the service
role key.

Safety rule: an object is only deleted when **the same path exists on R2**. If a
database row was stored under a path we could not reconstruct, its file stays in
Supabase and is printed as a leftover instead of being destroyed.

Usage:
    python scripts/r2/delete_supabase_originals.py            # report only
    python scripts/r2/delete_supabase_originals.py --execute  # delete
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ENV_FILES = (ROOT / "exam-library-admin" / ".env", ROOT / ".env")
BUCKET = "exam-papers"
BATCH = 100

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def read_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for path in ENV_FILES:
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            env.setdefault(key.strip(), value.strip().strip('"').strip("'"))
    return env


def human(n: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if abs(n) < 1024 or unit == "GB":
            return f"{n:.1f} {unit}" if unit != "B" else f"{int(n)} B"
        n /= 1024
    return f"{n:.1f} GB"


def api(url: str, key: str, path: str, payload: dict) -> tuple[int, bytes]:
    req = urllib.request.Request(
        url + path,
        data=json.dumps(payload).encode(),
        method="POST",
        headers={"apikey": key, "Authorization": f"Bearer {key}",
                 "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read()
    except Exception as exc:  # noqa: BLE001
        return 0, str(exc).encode()


def list_supabase(url: str, key: str) -> list[dict]:
    """Recursively list every file in the bucket (folders come back with no id)."""
    files: list[dict] = []
    queue = [""]
    while queue:
        prefix = queue.pop(0)
        offset = 0
        while True:
            code, body = api(url, key, f"/storage/v1/object/list/{BUCKET}",
                             {"prefix": prefix, "limit": 100, "offset": offset})
            if code != 200:
                raise RuntimeError(f"list {prefix or '/'} -> {code} {body[:200].decode('utf-8', 'replace')}")
            rows = json.loads(body)
            if not rows:
                break
            for row in rows:
                full = f"{prefix}/{row['name']}" if prefix else row["name"]
                if row.get("id") is None:
                    queue.append(full)
                else:
                    size = (row.get("metadata") or {}).get("size") or 0
                    files.append({"path": full, "size": int(size)})
            if len(rows) < 100:
                break
            offset += 100
    return files


def r2_keys() -> set[str]:
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import publish  # noqa: E402

    publish.load_env()
    client = publish.make_client()
    bucket = os.environ["R2_BUCKET"]
    keys: set[str] = set()
    for page in client.get_paginator("list_objects_v2").paginate(Bucket=bucket):
        for obj in page.get("Contents", []):
            keys.add(obj["Key"])
    return keys


def main() -> int:
    ap = argparse.ArgumentParser(description="Delete Supabase originals that exist on R2")
    ap.add_argument("--execute", action="store_true")
    ap.add_argument("--all", action="store_true",
                    help="also delete Supabase objects that have no R2 twin (dangerous)")
    args = ap.parse_args()

    env = read_env()
    url = (env.get("VITE_SUPABASE_URL") or "").rstrip("/")
    key = env.get("VITE_SUPABASE_SERVICE_ROLE_KEY") or ""
    if not url or not key:
        sys.exit("need VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY "
                 "in exam-library-admin/.env")

    print("listing R2 ...", flush=True)
    mirrored = r2_keys()
    print(f"  {len(mirrored)} keys on R2")

    print("listing Supabase Storage ...", flush=True)
    try:
        files = list_supabase(url, key)
    except RuntimeError as exc:
        msg = str(exc)
        print(f"\n! {msg}")
        if "402" in msg:
            print("\nThe project is still under the storage-quota restriction, so the")
            print("Storage API refuses every request, deletes included. Options:")
            print("  1. delete files in the dashboard (Storage UI) instead,")
            print("  2. ask Supabase support to lift the restriction for cleanup,")
            print("  3. upgrade for one month, delete, downgrade again.")
            print("\nRe-run this script once the 402 is gone; it then deletes only")
            print("objects whose path already exists on R2.")
        return 1

    total = sum(f["size"] for f in files)
    print(f"  {len(files)} objects, {human(total)}")

    matched = [f for f in files if f["path"] in mirrored]
    leftovers = [f for f in files if f["path"] not in mirrored]
    matched_bytes = sum(f["size"] for f in matched)
    leftover_bytes = sum(f["size"] for f in leftovers)

    print(f"\n  on R2 as well : {len(matched):5}  {human(matched_bytes)}   <- deletable")
    print(f"  only Supabase : {len(leftovers):5}  {human(leftover_bytes)}   <- kept")
    for f in leftovers[:15]:
        print(f"      keep {f['path']}")
    if len(leftovers) > 15:
        print(f"      ... and {len(leftovers) - 15} more")

    targets = matched + (leftovers if args.all else [])
    if not args.execute:
        print(f"\ndry run. --execute would delete {len(targets)} objects "
              f"({human(sum(f['size'] for f in targets))}).")
        return 0

    deleted = 0
    for start in range(0, len(targets), BATCH):
        chunk = targets[start:start + BATCH]
        paths = [f["path"] for f in chunk]
        code, body = api(url, key, f"/storage/v1/object/{BUCKET}", {"prefixes": paths})
        if code not in (200, 204):
            print(f"  ! batch {start}-{start + len(chunk)} -> {code} "
                  f"{body[:200].decode('utf-8', 'replace')}")
            break
        deleted += len(chunk)
        print(f"  deleted {deleted}/{len(targets)}", flush=True)
        time.sleep(0.2)

    print(f"\ndeleted {deleted} objects")
    print("re-check usage in the dashboard; the restriction lifts once it is under 1 GB.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
