#!/usr/bin/env python3
"""Publish the local EduSocial PDF library to Cloudflare R2.

What it produces, in one pass:

  --layout flat (default)
  <prefix>/papers/<id>-<slug>.pdf    original PDFs classified as exam papers
  <prefix>/books/<id>-<slug>.pdf     original PDFs classified as textbooks
  <prefix>/previews/<id>.jpg         page-1 thumbnail for every PDF
  <prefix>/catalog/papers.json       catalogue rows in the app's snake_case shape
  <prefix>/catalog/books.json        same, for library_books

  --layout supabase (mirror of the Supabase Storage `exam-papers` bucket)
  <prefix>/edusocial/papers/<class>/<subject>/<id>-<title>.pdf
  <prefix>/edusocial/books/<category>/<subject>/<id>-<title>.pdf
  <prefix>/previews/edusocial_<hash24>.jpg       paper thumbnails
  <prefix>/book-covers/edusocial_<hash24>.jpg    book covers

With --layout supabase the paths inside the bucket are identical to the ones
Supabase Storage already uses, so re-pointing the database is a plain prefix
replacement instead of a per-file mapping.

The catalogue rows reuse the exact classification rules from
scripts/upload-edusocial-library.py, so titles/subjects/classes match what is
already in Supabase.

Usage:
  # 1. see exactly what would be uploaded (no credentials required)
  python scripts/r2/publish.py --base-url https://pub-xxxx.r2.dev

  # 2. after creating the bucket + API token
  set R2_ACCOUNT_ID=...
  set R2_ACCESS_KEY_ID=...
  set R2_SECRET_ACCESS_KEY=...
  set R2_BUCKET=gostudy
  set R2_PUBLIC_URL=https://pub-xxxx.r2.dev
  python scripts/r2/publish.py --execute --cors --resume

Requires: pip install boto3 pymupdf
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

try:
    import pymupdf
except ImportError:  # pragma: no cover
    sys.exit("pymupdf is required: python -m pip install pymupdf")

sys.path.insert(0, str(Path(__file__).resolve().parent))
from classify import (  # noqa: E402
    detect_class,
    detect_kind,
    detect_session,
    detect_subject,
    detect_year,
    format_bytes,
    storage_slug,
)

ROOT = Path(__file__).resolve().parents[2]
LIB_DIR = ROOT / "downloads" / "edusocial-books"
CATALOG_SRC = LIB_DIR / "catalog.json"
OUT_DIR = Path(__file__).resolve().parent / "output"
PREVIEW_DIR = OUT_DIR / "previews"
CATALOG_OUT = OUT_DIR / "catalog"
MANIFEST = OUT_DIR / "manifest.json"

PDF_CONTENT_TYPE = "application/pdf"
JPG_CONTENT_TYPE = "image/jpeg"
JSON_CONTENT_TYPE = "application/json"

CACHE_PDF = "public, max-age=31536000, immutable"
CACHE_JSON = "public, max-age=300"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def load_env() -> None:
    """Read R2_* settings from scripts/r2/.env (kept out of git)."""
    for path in (Path(__file__).resolve().parent / ".env", ROOT / ".env"):
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            if key.startswith("R2_") and key not in os.environ:
                os.environ[key] = value.strip().strip('"').strip("'")


def human(n: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if abs(n) < 1024 or unit == "GB":
            return f"{n:.1f} {unit}" if unit != "B" else f"{int(n)} B"
        n /= 1024
    return f"{n:.1f} GB"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def load_source_catalog() -> dict[int, dict]:
    if not CATALOG_SRC.exists():
        return {}
    data = json.loads(CATALOG_SRC.read_text(encoding="utf-8"))
    out: dict[int, dict] = {}
    for entry in data.get("books", []):
        bid = entry.get("book_id")
        if bid:
            out[int(bid)] = entry
    return out


def local_files() -> dict[int, Path]:
    files: dict[int, Path] = {}
    for path in sorted(LIB_DIR.glob("*.pdf")):
        prefix, _, _ = path.name.partition(" - ")
        if prefix.isdigit():
            files[int(prefix)] = path
    return files


def pdf_object_key(bid: int, kind: str, title: str, slug: str, subject: str,
                   class_level: str, extra: str, layout: str) -> str:
    """R2 key for a PDF.

    layout="flat"      papers/0477-slug.pdf
    layout="supabase"  edusocial/papers/<class>/<subject>/0477-<title>.pdf
                       (byte-for-byte the path Supabase Storage already uses,
                        see scripts/upload-edusocial-library.py)
    """
    if layout == "supabase":
        group = "papers" if kind == "paper" else "books"
        folder = storage_slug(class_level) if kind == "paper" else storage_slug(extra)
        return "/".join([
            "edusocial", group, folder, storage_slug(subject),
            f"{bid:04d}-{storage_slug(title)[:80]}.pdf",
        ])
    return f"{'papers' if kind == 'paper' else 'books'}/{bid:04d}-{storage_slug(slug)[:80]}.pdf"


def preview_object_key(bid: int, kind: str, digest: str, layout: str) -> str:
    """R2 key for the page-1 thumbnail.

    layout="flat"      previews/0477.jpg
    layout="supabase"  previews/edusocial_<sha256[:24]>.jpg   (papers)
                       book-covers/edusocial_<sha256[:24]>.jpg (books)
    """
    if layout == "supabase":
        folder = "previews" if kind == "paper" else "book-covers"
        return f"{folder}/edusocial_{digest[:24]}.jpg"
    return f"previews/{bid:04d}.jpg"


def make_preview(pdf: Path, dest: Path, width: int = 1000, quality: int = 78) -> bool:
    if dest.exists() and dest.stat().st_size > 0 and dest.stat().st_mtime >= pdf.stat().st_mtime:
        return True
    try:
        doc = pymupdf.open(pdf)
        try:
            if doc.page_count == 0:
                return False
            page = doc.load_page(0)
            zoom = width / page.rect.width if page.rect.width else 1.5
            zoom = min(max(zoom, 0.8), 2.5)
            pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom),
                                  colorspace=pymupdf.csRGB, alpha=False)
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(pix.tobytes("jpeg", jpg_quality=quality))
            return True
        finally:
            doc.close()
    except Exception as exc:  # noqa: BLE001
        print(f"    ! preview failed for {pdf.name}: {exc}")
        return False


def build(base_url: str, generate_previews: bool, preview_width: int = 1000,
          layout: str = "flat"):
    """Return (papers, books, uploads, stats) with clean catalogue rows."""
    base = base_url.rstrip("/")
    source = load_source_catalog()
    files = local_files()
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    papers: list[dict] = []
    books: list[dict] = []
    uploads: list[dict] = []
    stats = {"pdfs": 0, "bytes": 0, "previews": 0, "preview_bytes": 0,
             "no_preview": 0, "missing_from_catalog": 0, "render_seconds": 0.0}

    for index, (bid, path) in enumerate(sorted(files.items()), 1):
        entry = source.get(bid, {})
        title = html.unescape(entry.get("title") or path.stem.partition(" - ")[2] or path.stem)
        title = title.replace("&#039;", "'")
        slug = entry.get("slug") or storage_slug(title)
        kind, extra = detect_kind(title, slug)
        subject = detect_subject(title)
        class_level = detect_class(title)
        year = detect_year(title)
        session = detect_session(title)
        if not entry:
            stats["missing_from_catalog"] += 1

        size = path.stat().st_size
        digest = sha256(path)
        is_paper = kind == "paper"
        # Supabase stored the raw catalogue title (entities and all), so the
        # mirrored key uses that rather than the cleaned display title.
        mirror_title = entry.get("title") or title
        key = pdf_object_key(bid, kind, mirror_title, slug, subject, class_level,
                             extra, layout)
        file_url = f"{base}/{key}"

        preview_key = preview_object_key(bid, kind, digest, layout)
        preview_path = PREVIEW_DIR / f"{bid:04d}.jpg"
        have_preview = False
        if generate_previews:
            t0 = time.time()
            have_preview = make_preview(path, preview_path, width=preview_width)
            stats["render_seconds"] += time.time() - t0
        else:
            have_preview = preview_path.exists() and preview_path.stat().st_size > 0
        if not have_preview:
            stats["no_preview"] += 1

        preview_url = f"{base}/{preview_key}" if have_preview else None

        if is_paper:
            papers.append({
                "id": f"edu-p-{bid}",
                "title": title[:200],
                "subject": subject,
                "class_level": class_level,
                "year": year,
                "exam_type": extra,
                "session": session,
                "system": "apc",
                "file_url": file_url,
                "file_name": path.name,
                "file_size": size,
                "file_size_formatted": format_bytes(size),
                "content_hash": digest,
                "preview_url": preview_url,
                "tags": ["edusocial", extra, class_level],
                "description": f"Source: EduSocialNews ({slug})",
                "downloads": 0,
                "created_at": now,
            })
        else:
            books.append({
                "id": f"edu-b-{bid}",
                "title": title[:200],
                "author": "EduSocialNews",
                "subject": subject,
                "category": extra,
                "system": "apc",
                "class_level": None if class_level == "All" else class_level,
                "description": f"Source: EduSocialNews ({slug})",
                "cover_url": preview_url,
                "file_url": file_url,
                "file_name": path.name,
                "file_size": size,
                "file_size_formatted": format_bytes(size),
                "content_hash": digest,
                "tags": ["edusocial", extra, class_level],
                "downloads": 0,
                "published_year": year,
                "created_at": now,
            })

        uploads.append({"key": key, "path": path, "type": PDF_CONTENT_TYPE, "cache": CACHE_PDF})
        if have_preview:
            uploads.append({"key": preview_key, "path": preview_path,
                            "type": JPG_CONTENT_TYPE, "cache": CACHE_PDF})

        stats["pdfs"] += 1
        stats["bytes"] += size
        if have_preview:
            stats["previews"] += 1
            stats["preview_bytes"] += preview_path.stat().st_size

        if index % 50 == 0:
            print(f"  ... {index}/{len(files)} scanned"
                  + (f" ({stats['render_seconds']:.0f}s rendering)" if generate_previews else ""),
                  flush=True)

    papers.sort(key=lambda r: (-r["year"], r["title"]))
    books.sort(key=lambda r: r["title"])
    return papers, books, uploads, stats


def write_catalogs(papers: list[dict], books: list[dict]) -> None:
    CATALOG_OUT.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    (CATALOG_OUT / "papers.json").write_text(
        json.dumps({"generated_at": stamp, "count": len(papers), "papers": papers},
                   ensure_ascii=False, indent=1),
        encoding="utf-8")
    (CATALOG_OUT / "books.json").write_text(
        json.dumps({"generated_at": stamp, "count": len(books), "books": books},
                   ensure_ascii=False, indent=1),
        encoding="utf-8")


def sql_literal(value: str | None) -> str:
    if not value:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def write_repoint_sql(papers: list[dict], books: list[dict]) -> None:
    """SQL to point the existing Supabase rows at R2, matched by content_hash.

    Run this in the Supabase SQL editor once the project is out of the quota
    restriction. It is optional: the app already works from the static
    catalogue, this just keeps the database as the source of truth.
    """
    mapping: dict[str, tuple[str, str | None]] = {}
    for row in papers + books:
        mapping.setdefault(row["content_hash"], (row["file_url"], row.get("preview_url")))
    values = ",\n".join(
        f"  ({sql_literal(h)}, {sql_literal(u)}, {sql_literal(p)})"
        for h, (u, p) in mapping.items()
    )
    sql = f"""-- Generated by scripts/r2/publish.py
-- Re-points existing exam_papers / library_books rows at Cloudflare R2.
-- Matching is by content_hash, so row ids and titles are untouched.
begin;

create temp table r2_map (
  content_hash text primary key,
  file_url     text not null,
  asset_url    text
) on commit drop;

insert into r2_map (content_hash, file_url, asset_url) values
{values};

update exam_papers p
   set file_url = m.file_url,
       preview_url = coalesce(m.asset_url, p.preview_url)
  from r2_map m
 where p.content_hash = m.content_hash;

update library_books b
   set file_url = m.file_url,
       cover_url = coalesce(m.asset_url, b.cover_url)
  from r2_map m
 where b.content_hash = m.content_hash;

commit;

-- verification
select 'papers on r2' as what, count(*) as rows
  from exam_papers where file_url like '%r2.dev%' or file_url like 'https://cdn.%'
union all
select 'books on r2', count(*)
  from library_books where file_url like '%r2.dev%' or file_url like 'https://cdn.%';
"""
    (CATALOG_OUT / "repoint.sql").write_text(sql, encoding="utf-8")
    write_prefix_sql(mapping)


def supabase_storage_prefix() -> str | None:
    """Public bucket prefix used by Supabase Storage, e.g.
    https://<ref>.supabase.co/storage/v1/object/public/exam-papers"""
    for path in (ROOT / ".env", Path(__file__).resolve().parent / ".env"):
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            if key.strip() in ("VITE_SUPABASE_URL", "SUPABASE_URL"):
                url = value.strip().strip('"').strip("'").rstrip("/")
                if url:
                    return f"{url}/storage/v1/object/public/exam-papers"
    return None


def write_prefix_sql(mapping: dict[str, tuple[str, str | None]]) -> None:
    """The one-line migration this whole mirrored layout exists for.

    Keeps the path that is already in the database and only swaps the domain,
    but restricted to the content hashes that really are on R2 — so the ~100
    rows without a local file are left pointing at Supabase instead of 404ing.
    """
    old = supabase_storage_prefix()
    r2 = (os.environ.get("R2_PUBLIC_URL") or "").rstrip("/")
    if not old or not r2:
        return
    hashes = ",\n".join(f"  ({sql_literal(h)})" for h in mapping)
    sql = f"""-- Generated by scripts/r2/publish.py
-- Pure domain swap: path stays identical, only the host changes.
-- Only touches rows whose PDF is known to exist on R2 (matched by content_hash).
begin;

create temp table r2_known (content_hash text primary key) on commit drop;
insert into r2_known (content_hash) values
{hashes};

update exam_papers p
   set file_url    = replace(p.file_url, {sql_literal(old)}, {sql_literal(r2)}),
       preview_url = replace(p.preview_url, {sql_literal(old)}, {sql_literal(r2)})
  from r2_known k
 where p.content_hash = k.content_hash
   and p.file_url like {sql_literal(old + '%')};

update library_books b
   set file_url = replace(b.file_url, {sql_literal(old)}, {sql_literal(r2)}),
       cover_url = replace(b.cover_url, {sql_literal(old)}, {sql_literal(r2)})
  from r2_known k
 where b.content_hash = k.content_hash
   and b.file_url like {sql_literal(old + '%')};

commit;

-- rows that still point at Supabase (no local copy, nothing deleted there)
select count(*) as still_on_supabase from exam_papers where file_url like '%supabase.co%';
select count(*) as still_on_supabase from library_books where file_url like '%supabase.co%';
"""
    (CATALOG_OUT / "repoint-prefix.sql").write_text(sql, encoding="utf-8")


# ---------------------------------------------------------------- uploads


def load_manifest() -> dict:
    if MANIFEST.exists():
        try:
            return json.loads(MANIFEST.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {"objects": {}}


def bucket_manifest(client, bucket: str) -> dict:
    """Objects already stored, in the same shape as the local manifest.

    The bucket is the source of truth for `--resume`: rekey.py moves objects to
    the mirrored keys, so a manifest written during the flat upload no longer
    describes what is there.
    """
    objects: dict[str, dict] = {}
    for page in client.get_paginator("list_objects_v2").paginate(Bucket=bucket):
        for obj in page.get("Contents", []):
            objects[obj["Key"]] = {"size": obj["Size"]}
    return {"objects": objects}


def save_manifest(m: dict) -> None:
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(m, indent=2), encoding="utf-8")


def make_client():
    try:
        import boto3
    except ImportError:  # pragma: no cover
        sys.exit("boto3 is required for uploads: python -m pip install boto3")
    account = os.environ.get("R2_ACCOUNT_ID")
    access = os.environ.get("R2_ACCESS_KEY_ID")
    secret = os.environ.get("R2_SECRET_ACCESS_KEY")
    if not all([account, access, secret]):
        sys.exit("missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY")
    from botocore.config import Config
    return boto3.client(
        "s3",
        endpoint_url=f"https://{account}.r2.cloudflarestorage.com",
        aws_access_key_id=access,
        aws_secret_access_key=secret,
        region_name="auto",
        config=Config(retries={"max_attempts": 5, "mode": "adaptive"},
                      max_pool_connections=16),
    )


def set_cors(client, bucket: str, origins: str) -> None:
    allowed = [o.strip() for o in origins.split(",") if o.strip()]
    try:
        client.put_bucket_cors(
            Bucket=bucket,
            CORSConfiguration={
                "CORSRules": [{
                    "AllowedOrigins": allowed,
                    "AllowedMethods": ["GET", "HEAD"],
                    "AllowedHeaders": ["*"],
                    "ExposeHeaders": ["Content-Length", "Content-Range",
                                      "Accept-Ranges", "ETag"],
                    "MaxAgeSeconds": 86400,
                }]
            },
        )
        print(f"  CORS set for origins: {', '.join(allowed)}")
    except Exception as exc:  # noqa: BLE001
        print(f"  ! could not set CORS automatically: {exc}")
        print("    Set it in the dashboard instead: bucket -> Settings -> CORS policy")
        print(f"    Allowed origins: {', '.join(allowed)}  methods: GET, HEAD")


def main() -> int:
    load_env()
    ap = argparse.ArgumentParser(description="Publish local PDFs to Cloudflare R2")
    ap.add_argument("--execute", action="store_true", help="upload (default: dry run)")
    ap.add_argument("--base-url", help="public R2 url, e.g. https://pub-xxxx.r2.dev")
    ap.add_argument("--bucket", help="bucket name (default R2_BUCKET)")
    ap.add_argument("--concurrency", type=int, default=8)
    ap.add_argument("--resume", action="store_true", help="skip objects already in the manifest")
    ap.add_argument("--cors", action="store_true", help="set bucket CORS before uploading")
    ap.add_argument("--cors-origins", default="*", help="comma separated allowed origins")
    ap.add_argument("--no-previews", action="store_true", help="do not render thumbnails")
    ap.add_argument("--preview-width", type=int, default=1000)
    ap.add_argument("--layout", choices=("flat", "supabase"), default="flat",
                    help="object key layout; 'supabase' mirrors the exam-papers bucket")
    args = ap.parse_args()

    base = (args.base_url or os.environ.get("R2_PUBLIC_URL") or "https://R2_PUBLIC_URL").rstrip("/")
    papers, books, uploads, stats = build(base, not args.no_previews, args.preview_width,
                                          args.layout)
    write_catalogs(papers, books)
    write_repoint_sql(papers, books)

    print(f"\npapers {len(papers)}   books {len(books)}")
    print(f"pdfs      {stats['pdfs']}  {human(stats['bytes'])}")
    print(f"previews  {stats['previews']}  {human(stats['preview_bytes'])}"
          f"  (missing {stats['no_preview']})")
    print(f"total R2  {human(stats['bytes'] + stats['preview_bytes'])}")
    print(f"catalog   {CATALOG_OUT}")

    if not args.execute:
        print("\ndry run only. Re-run with --execute once R2_* env vars are set.")
        return 0

    client = make_client()
    bucket = args.bucket or os.environ.get("R2_BUCKET")
    if not bucket:
        sys.exit("missing --bucket or R2_BUCKET")
    if args.cors:
        set_cors(client, bucket, args.cors_origins)

    if args.resume:
        try:
            manifest = bucket_manifest(client, bucket)
            print(f"  resume: {len(manifest['objects'])} objects already in {bucket}")
        except Exception as exc:  # noqa: BLE001
            print(f"  ! could not list the bucket ({exc}); using the local manifest")
            manifest = load_manifest()
    else:
        manifest = {"objects": {}}
    objects = [o for o in uploads
               if not (args.resume
                       and manifest["objects"].get(o["key"], {}).get("size") == o["path"].stat().st_size)]
    for name in ("papers.json", "books.json"):
        path = CATALOG_OUT / name
        objects.append({"key": f"catalog/{name}", "path": path,
                        "type": JSON_CONTENT_TYPE, "cache": CACHE_JSON})

    total = sum(o["path"].stat().st_size for o in objects)
    print(f"\nto upload: {len(objects)} objects, {human(total)}")

    done = {"n": 0, "bytes": 0}
    started = time.time()

    def push(item: dict) -> None:
        body = item["path"].read_bytes()
        client.put_object(Bucket=bucket, Key=item["key"], Body=body,
                          ContentType=item["type"], CacheControl=item["cache"])
        manifest["objects"][item["key"]] = {
            "size": len(body),
            "sha256": hashlib.sha256(body).hexdigest(),
            "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        done["n"] += 1
        done["bytes"] += len(body)
        if done["n"] % 25 == 0:
            elapsed = time.time() - started
            print(f"  {done['n']}/{len(objects)}  {human(done['bytes'])}  "
                  f"{done['n'] / elapsed:.1f} obj/s", flush=True)

    try:
        with ThreadPoolExecutor(max_workers=args.concurrency) as pool:
            list(pool.map(push, objects))
    except KeyboardInterrupt:
        print("\ninterrupted; progress saved in the manifest")
    finally:
        save_manifest(manifest)

    elapsed = time.time() - started
    print(f"\nuploaded {done['n']}/{len(objects)} objects ({human(done['bytes'])}) "
          f"in {elapsed / 60:.1f} min")
    print(f"manifest: {MANIFEST}")
    print(f"\ncatalogue: {base}/catalog/papers.json")
    print(f"           {base}/catalog/books.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
