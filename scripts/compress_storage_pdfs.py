#!/usr/bin/env python3
"""Compress PDFs in Supabase Storage to cut bucket size below the plan quota.

Two modes:

  Local (no network, safe to run any time):
    python scripts/compress_storage_pdfs.py --local docs/ --out tmp/compressed

  Remote (Supabase Storage, dry-run unless --execute):
    python scripts/compress_storage_pdfs.py --remote --prefix edusocial/ --sample 5
    python scripts/compress_storage_pdfs.py --remote --prefix edusocial/ --execute

What it does to a PDF:
  * downsamples embedded images above --dpi-threshold to --dpi-target
  * re-encodes them as JPEG at --quality
  * keeps text, vectors, links and page geometry untouched
  * writes with garbage collection + deflate

Safety:
  * never uploads a file that did not shrink by at least --min-saving (default 5%)
  * uploads with x-upsert only when --execute is given
  * keeps every original locally until it has been verified on the server
  * writes a resumable manifest to scripts/output/pdf-compress-manifest.json

Requires: pip install pymupdf
Credentials: exam-library-admin/.env (VITE_SUPABASE_URL + VITE_SUPABASE_SERVICE_ROLE_KEY)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

try:
    import pymupdf
except ImportError:  # pragma: no cover
    sys.exit("pymupdf is required: python -m pip install pymupdf")

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "scripts" / "output"
MANIFEST = OUT_DIR / "pdf-compress-manifest.json"
REPORT = OUT_DIR / "pdf-compress-report.json"

BUCKET_DEFAULT = os.environ.get("VITE_SUPABASE_BUCKET", "exam-papers")

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


# ---------------------------------------------------------------- helpers


def load_env(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def human(n: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if abs(n) < 1024 or unit == "GB":
            return f"{n:.1f} {unit}" if unit != "B" else f"{int(n)} B"
        n /= 1024
    return f"{n:.1f} GB"


def db_size(n: int) -> str:
    """Match the app's file_size_formatted style (e.g. '9.7 MB')."""
    if n >= 1024 * 1024:
        return f"{n / (1024 * 1024):.1f} MB"
    if n >= 1024:
        return f"{n / 1024:.0f} KB"
    return f"{n} B"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class Api:
    def __init__(self, url: str, key: str):
        self.url = url.rstrip("/")
        self.key = key

    def _req(self, method: str, path: str, *, body: bytes | None = None,
             headers: dict | None = None, retries: int = 3) -> tuple[int, bytes]:
        hdrs = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
        }
        if headers:
            hdrs.update(headers)
        last: Exception | None = None
        for attempt in range(retries):
            try:
                req = urllib.request.Request(self.url + path, data=body, headers=hdrs, method=method)
                with urllib.request.urlopen(req, timeout=120) as resp:
                    return resp.status, resp.read()
            except urllib.error.HTTPError as exc:
                payload = exc.read()
                if exc.code == 402:
                    raise SystemExit(
                        "\nSupabase returned 402 Payment Required.\n"
                        "The project is still restricted (exceed_storage_size_quota).\n"
                        "Lift the restriction first: upgrade to Pro, disable the spend cap,\n"
                        "or wait for the billing cycle reset.\n"
                    )
                if exc.code in (429, 500, 502, 503, 504) and attempt + 1 < retries:
                    last = exc
                    time.sleep(2 * (attempt + 1))
                    continue
                return exc.code, payload
            except (urllib.error.URLError, TimeoutError) as exc:
                last = exc
                if attempt + 1 < retries:
                    time.sleep(2 * (attempt + 1))
                    continue
                raise
        raise RuntimeError(f"request failed: {last}")

    def list_prefix(self, bucket: str, prefix: str) -> list[dict]:
        found: list[dict] = []
        offset = 0
        while True:
            payload = json.dumps({
                "prefix": prefix,
                "limit": 1000,
                "offset": offset,
                "sortBy": {"column": "name", "order": "asc"},
            }).encode()
            status, data = self._req(
                "POST",
                f"/storage/v1/object/list/{bucket}",
                body=payload,
                headers={"Content-Type": "application/json"},
            )
            if status >= 400:
                raise RuntimeError(f"list failed ({status}): {data[:300]!r}")
            items = json.loads(data or b"[]")
            if not items:
                break
            for item in items:
                name = prefix + item["name"]
                if item.get("id") is None:  # folder
                    found.extend(self.list_prefix(bucket, name.rstrip("/") + "/"))
                else:
                    size = (item.get("metadata") or {}).get("size") or 0
                    found.append({"name": name, "size": int(size)})
            if len(items) < 1000:
                break
            offset += 1000
        return found

    def download(self, bucket: str, name: str) -> bytes:
        quoted = urllib.parse.quote(name, safe="/")
        status, data = self._req("GET", f"/storage/v1/object/{bucket}/{quoted}")
        if status >= 400:
            raise RuntimeError(f"download failed ({status}) for {name}")
        return data

    def upload(self, bucket: str, name: str, data: bytes) -> None:
        quoted = urllib.parse.quote(name, safe="/")
        status, body = self._req(
            "PUT",
            f"/storage/v1/object/{bucket}/{quoted}",
            body=data,
            headers={"Content-Type": "application/pdf", "x-upsert": "true"},
        )
        if status >= 400:
            raise RuntimeError(f"upload failed ({status}) for {name}: {body[:300]!r}")

    def patch_rows(self, table: str, name: str, size: int, digest: str) -> int:
        pattern = urllib.parse.quote(f"*{name}*", safe="")
        status, body = self._req(
            "PATCH",
            f"/rest/v1/{table}?file_url=like.{pattern}",
            body=json.dumps({
                "file_size": size,
                "file_size_formatted": db_size(size),
                "content_hash": digest,
            }).encode(),
            headers={"Content-Type": "application/json", "Prefer": "return=representation"},
        )
        if status >= 400:
            print(f"      ! {table} update failed ({status}): {body[:200]!r}")
            return 0
        try:
            return len(json.loads(body or b"[]"))
        except json.JSONDecodeError:
            return 0


# ---------------------------------------------------------------- compression


def compress_bytes(data: bytes, dpi_threshold: int, dpi_target: int,
                    quality: int, grayscale: bool) -> bytes | None:
    """Return compressed PDF bytes, or None when compression is not worthwhile."""
    doc = pymupdf.open(stream=data, filetype="pdf")
    try:
        if doc.needs_pass:
            return None
        doc.rewrite_images(
            dpi_threshold=dpi_threshold,
            dpi_target=dpi_target,
            quality=quality,
            lossy=True,
            lossless=True,
            bitonal=True,
            color=True,
            gray=True,
            set_to_gray=grayscale,
        )
        out = doc.tobytes(garbage=4, deflate=True, clean=True, deflate_images=True)
        return out
    finally:
        doc.close()


# ---------------------------------------------------------------- local mode


def run_local(args) -> int:
    src = Path(args.local)
    files = [src] if src.is_file() else sorted(src.rglob("*.pdf"))
    if not files:
        print("no PDFs found")
        return 1
    out_dir = Path(args.out) if args.out else src.parent / "compressed"
    out_dir.mkdir(parents=True, exist_ok=True)

    before = after = 0
    rows = []
    for path in files:
        data = path.read_bytes()
        result = compress_bytes(data, args.dpi_threshold, args.dpi_target, args.quality, args.set_to_gray)
        if result is None:
            print(f"  skip (encrypted): {path.name}")
            continue
        dest = out_dir / path.name
        dest.write_bytes(result)
        before += len(data)
        after += len(result)
        ratio = len(result) / len(data) * 100 if data else 100
        rows.append((path.name, len(data), len(result), ratio))
        print(f"  {path.name}: {human(len(data))} -> {human(len(result))} ({ratio:.0f}%)")

    if before:
        print(f"\ntotal: {human(before)} -> {human(after)} "
              f"({after / before * 100:.0f}%, saved {human(before - after)})")
        print(f"written to {out_dir}")
    return 0


# ---------------------------------------------------------------- remote mode


def load_manifest() -> dict:
    if MANIFEST.exists():
        try:
            return json.loads(MANIFEST.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {"done": {}}


def save_manifest(manifest: dict) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def run_remote(args) -> int:
    url = os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY "
              "(expected in exam-library-admin/.env)")
        return 2

    api = Api(url, key)
    bucket = args.bucket
    prefix = args.prefix
    print(f"listing {bucket}/{prefix} ...")
    objects = api.list_prefix(bucket, prefix)
    objects = [o for o in objects if o["name"].lower().endswith(".pdf")]
    objects = [o for o in objects if o["size"] >= args.min_bytes]
    objects.sort(key=lambda o: o["size"], reverse=True)
    if args.only:
        objects = [o for o in objects if args.only.lower() in o["name"].lower()]
    if args.limit:
        objects = objects[: args.limit]

    total = sum(o["size"] for o in objects)
    print(f"{len(objects)} PDFs, {human(total)}")
    if not objects:
        return 0

    manifest = load_manifest() if args.resume else {"done": {}}
    todo = [o for o in objects if o["name"] not in manifest["done"]]
    if args.resume and len(todo) != len(objects):
        print(f"resume: {len(objects) - len(todo)} already done")

    if not args.execute:
        todo = todo[: args.sample]
        print(f"dry run: sampling {len(todo)} file(s); nothing will be uploaded\n")

    before = after = uploaded = 0
    results = []
    tmp_dir = Path(tempfile.mkdtemp(prefix="gostudy-pdf-"))
    started = time.time()

    for index, obj in enumerate(todo, 1):
        name, original_size = obj["name"], obj["size"]
        print(f"[{index}/{len(todo)}] {name}  ({human(original_size)})")
        try:
            data = api.download(bucket, name)
        except Exception as exc:  # noqa: BLE001
            print(f"    ! download failed: {exc}")
            results.append({"name": name, "status": "download_failed", "error": str(exc)})
            continue

        if len(data) != original_size and original_size:
            print(f"    ! size mismatch (listed {human(original_size)}, got {human(len(data))})")

        try:
            compressed = compress_bytes(
                data, args.dpi_threshold, args.dpi_target, args.quality, args.set_to_gray
            )
        except Exception as exc:  # noqa: BLE001
            print(f"    ! compression failed: {exc}")
            results.append({"name": name, "status": "compress_failed", "error": str(exc)})
            continue

        if compressed is None:
            print("    skip: encrypted PDF")
            results.append({"name": name, "status": "encrypted"})
            continue

        saved = len(data) - len(compressed)
        pct = saved / len(data) * 100 if data else 0
        before += len(data)
        after += len(compressed)

        if pct < args.min_saving:
            print(f"    skip: only {pct:.1f}% smaller")
            results.append({"name": name, "status": "no_gain", "saving_pct": round(pct, 1)})
            continue

        print(f"    {human(len(data))} -> {human(len(compressed))}  (-{pct:.0f}%)")
        results.append({
            "name": name,
            "status": "compressed",
            "before": len(data),
            "after": len(compressed),
            "saving_pct": round(pct, 1),
        })

        if not args.execute:
            continue

        # keep the original next to the work dir until verified
        if args.keep_originals:
            backup = OUT_DIR / "pdf-originals" / name
            backup.parent.mkdir(parents=True, exist_ok=True)
            if not backup.exists():
                backup.write_bytes(data)

        try:
            api.upload(bucket, name, compressed)
            verified = api.download(bucket, name)
            if len(verified) != len(compressed):
                raise RuntimeError("post-upload size mismatch")
            digest = sha256(compressed)
            touched = (api.patch_rows("exam_papers", name, len(compressed), digest)
                       + api.patch_rows("library_books", name, len(compressed), digest))
            uploaded += 1
            manifest["done"][name] = {
                "before": len(data),
                "after": len(compressed),
                "sha256": digest,
                "db_rows": touched,
                "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
            if index % 10 == 0:
                save_manifest(manifest)
        except Exception as exc:  # noqa: BLE001
            print(f"    ! upload failed: {exc}")
            results.append({"name": name, "status": "upload_failed", "error": str(exc)})

    save_manifest(manifest)
    elapsed = time.time() - started

    print("\n--- summary ---")
    print(f"processed: {len(results)}  uploaded: {uploaded}  elapsed: {elapsed / 60:.1f} min")
    if before:
        print(f"local sizing: {human(before)} -> {human(after)} "
              f"({after / before * 100:.0f}%, saved {human(before - after)})")
    if not args.execute:
        print("\ndry run only. Re-run with --execute to upload.")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    existing = []
    if REPORT.exists():
        try:
            existing = json.loads(REPORT.read_text(encoding="utf-8")).get("runs", [])
        except json.JSONDecodeError:
            existing = []
    existing.append({
        "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "bucket": bucket,
        "prefix": prefix,
        "execute": bool(args.execute),
        "dpi_threshold": args.dpi_threshold,
        "dpi_target": args.dpi_target,
        "quality": args.quality,
        "files": results,
    })
    REPORT.write_text(json.dumps({"runs": existing}, indent=2), encoding="utf-8")
    print(f"report: {REPORT}")
    shutil_note = f"backups: {OUT_DIR / 'pdf-originals'}" if args.keep_originals else None
    if shutil_note:
        print(shutil_note)
    return 0


# ---------------------------------------------------------------- cli


def main() -> int:
    parser = argparse.ArgumentParser(description="Compress PDFs locally or in Supabase Storage")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--local", help="PDF file or folder to compress on disk")
    mode.add_argument("--remote", action="store_true", help="compress objects in Supabase Storage")

    parser.add_argument("--out", help="output folder for --local")
    parser.add_argument("--bucket", default=BUCKET_DEFAULT)
    parser.add_argument("--prefix", default="edusocial/", help="storage prefix to scan")
    parser.add_argument("--only", help="only names containing this substring")
    parser.add_argument("--limit", type=int, help="max files to process")
    parser.add_argument("--sample", type=int, default=3, help="files to test in a dry run")
    parser.add_argument("--min-bytes", type=int, default=1024 * 1024, help="skip smaller files")
    parser.add_argument("--min-saving", type=float, default=5.0, help="min %% saving to upload")
    # note: pymupdf only downsamples when dpi_target is strictly below the
    # image's own dpi in its internal quantisation; 140 reliably rewrites
    # 300 dpi scans (verified: 6.66 MB -> 2.12 MB), 150 is a no-op.
    parser.add_argument("--dpi-threshold", type=int, default=200)
    parser.add_argument("--dpi-target", type=int, default=140)
    parser.add_argument("--quality", type=int, default=78)
    parser.add_argument("--set-to-gray", action="store_true")
    parser.add_argument("--execute", action="store_true", help="actually upload (default: dry run)")
    parser.add_argument("--resume", action="store_true", help="skip files already in the manifest")
    parser.add_argument("--keep-originals", action="store_true")

    args = parser.parse_args()
    load_env(ROOT / "exam-library-admin" / ".env")
    load_env(ROOT / ".env")

    return run_local(args) if args.local else run_remote(args)


if __name__ == "__main__":
    sys.exit(main())
