#!/usr/bin/env python3
"""Classify and upload EduSocial PDFs into exam_papers vs library_books.

Usage:
  python scripts/upload-edusocial-library.py              # dry-run
  python scripts/upload-edusocial-library.py --execute    # upload
  python scripts/upload-edusocial-library.py --limit 20 --execute
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import re
import ssl
import subprocess
import sys
import tempfile
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "downloads" / "edusocial-books"
CATALOG_PATH = OUT_DIR / "catalog.json"
PROGRESS_PATH = OUT_DIR / "progress.json"
UPLOAD_LOG = OUT_DIR / "upload-log.json"

BUCKET = "exam-papers"


def load_env() -> None:
    for env_path in (ROOT / "exam-library-admin" / ".env", ROOT / ".env"):
        if not env_path.exists():
            continue
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            os.environ.setdefault(key, val)


def strip_accents(s: str) -> str:
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")


def norm(s: str) -> str:
    s = html.unescape(s or "")
    return re.sub(r"\s+", " ", strip_accents(s).lower()).strip()


def format_bytes(n: int) -> str:
    if n <= 0:
        return "0 Bytes"
    k = 1024.0
    units = ["Bytes", "KB", "MB", "GB"]
    i = 0
    size = float(n)
    while size >= k and i < len(units) - 1:
        size /= k
        i += 1
    return f"{round(size, 2)} {units[i]}"


def storage_slug(s: str) -> str:
    s = strip_accents(s)
    s = re.sub(r"[^a-zA-Z0-9._-]+", "-", s)
    return s.strip("-") or "file"


def detect_year(text: str) -> int:
    years = [int(y) for y in re.findall(r"(20[0-2]\d)", text)]
    return max(years) if years else time.localtime().tm_year


def detect_subject(text: str) -> str:
    n = norm(text)
    pairs = [
        (r"math", "Mathématiques"),
        (r"svt|sciences de la vie|biologie", "SVT"),
        (r"\bpct\b|physique|chimie", "PCT"),
        (r"francais|litterature|orthographe|grammaire|lecture", "Français"),
        (r"anglais|\beng\b|\bang\b", "Anglais"),
        (r"allemand", "Allemand"),
        (r"philo", "Philosophie"),
        (r"histoire", "Histoire"),
        (r"geo", "Géographie"),
        (r"ecm|civique|morale|edhc", "ECM"),
        (r"economie|compta|droit", "Économie"),
        (r"info", "Informatique"),
        (r"ewe|kabye|arabe", "Langues"),
        (r"eps|sport", "EPS"),
        (r"musique", "Musique"),
    ]
    for pat, subj in pairs:
        if re.search(pat, n):
            return subj
    return "Général"


def detect_class(text: str) -> str:
    n = norm(text)
    if re.search(r"\bcepd\b", n):
        return "CEPD"
    if re.search(r"\bcp1\b", n):
        return "CP1"
    if re.search(r"\bcp2\b", n):
        return "CP2"
    if re.search(r"\bcm1\b", n):
        return "CM1"
    if re.search(r"\bcm2\b", n):
        return "CM2"
    if re.search(r"\bce1\b", n):
        return "CE1"
    if re.search(r"\bce2\b", n):
        return "CE2"
    if re.search(r"primaire", n):
        return "Primaire"
    if re.search(r"\bcap\b", n):
        return "CAP"

    base = None
    if re.search(r"sixieme|6eme|\b6e\b", n):
        base = "6ème"
    elif re.search(r"cinquieme|5eme|\b5e\b", n):
        base = "5ème"
    elif re.search(r"quatrieme|4eme|\b4e\b", n):
        base = "4ème"
    elif re.search(r"troisieme|3eme|\b3e\b|bepc", n):
        base = "3ème"
    elif re.search(r"seconde|2nde", n):
        base = "2nde"
    elif re.search(r"premiere|1ere", n):
        base = "1ère"
    elif re.search(r"terminale|\btle\b|\bbac\b|bacii|bac 1|bac1", n):
        base = "Tle"

    if not base:
        return "All"

    series = None
    if re.search(r"\ba4\b", n):
        series = "A4"
    elif re.search(r"\bcd\b|\bc4\b", n) and base in {"2nde", "Tle", "1ère"}:
        series = "CD" if base == "2nde" else "C"
    elif re.search(r"\bg2\b|\bg3\b|\b g\b", n) and base in {"2nde", "1ère", "Tle"}:
        series = "G"
    elif re.search(r"\bserie d\b|\b tled\b|\b d\b", n) and base in {"1ère", "Tle"}:
        series = "D"
    elif re.search(r"\bserie c\b|\b c\b", n) and base in {"1ère", "Tle"}:
        series = "C"
    if series:
        if base == "2nde" and series == "C":
            series = "CD"
        return f"{base} {series}"
    return base


def detect_exam_type(text: str) -> str:
    n = norm(text)
    if "cepd" in n:
        return "CEPD"
    if "bepc" in n:
        return "BEPC"
    if re.search(r"\bcap\b", n):
        return "CAP"
    if "concours" in n or "admissib" in n or "admission" in n:
        return "Concours"
    if "annale" in n:
        return "Annales"
    if "probatoire" in n or "bac 1" in n or "bac1" in n:
        return "Probatoire"
    if re.search(r"\bbac\b|baccalaureat|bacii|bac ii", n):
        return "Baccalauréat"
    if "blanc" in n:
        return "Composition"
    if "compo" in n or "composition" in n:
        return "Composition"
    if "interro" in n:
        return "Interro"
    if "devoir" in n:
        return "Devoir"
    if "epreuve" in n or "sujet" in n:
        return "Practice"
    return "Revision"


def detect_session(text: str) -> str:
    n = norm(text)
    if "1er trim" in n or "trimestre 1" in n:
        return "1er Trimestre"
    if "2eme trim" in n or "2e trim" in n or "trimestre 2" in n:
        return "2ème Trimestre"
    if "3eme trim" in n or "3e trim" in n or "trimestre 3" in n:
        return "3ème Trimestre"
    return "Annuel"


def detect_kind(title: str, slug: str) -> tuple[str, str]:
    n = norm(f"{title} {slug}")
    paper_hit = bool(re.search(
        r"bepc|\bbac\b|bac1|bacii|cepd|\bcap\b|annale|sujet|epreuve|corrig|blanc|"
        r"concours|admissib|admission|liste|calendrier|centre de correction|examen|"
        r"\bcompo\b|trimestre|semestre|qcm|compilation",
        n,
    ))
    book_hit = bool(re.search(
        r"programme|manuel|livre|support de cours|fiche de cours|progression|"
        r"recueil|fascicule|livre du maitre|collection",
        n,
    ))
    if paper_hit and not book_hit:
        return "paper", detect_exam_type(n)
    if book_hit and not paper_hit:
        category = "Textbook"
        if "programme" in n or "progression" in n:
            category = "Programme"
        elif "fiche" in n or "support" in n:
            category = "Study Guide"
        elif "annale" in n:
            category = "Practice Book"
        elif "livre" in n or "manuel" in n or "recueil" in n:
            category = "Textbook"
        else:
            category = "Reference"
        return "book", category
    if paper_hit:
        return "paper", detect_exam_type(n)
    if "affichage" in n or "liste" in n:
        return "paper", "Concours"
    return "book", "Reference"


class Supabase:
    def __init__(self, url: str, key: str) -> None:
        self.url = url.rstrip("/")
        self.key = key
        self.ctx = ssl.create_default_context()

    def _headers(self, extra: dict[str, str] | None = None, json_body: bool = True) -> dict[str, str]:
        h = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
        }
        if json_body:
            h["Content-Type"] = "application/json"
            h["Prefer"] = "return=minimal"
        if extra:
            h.update(extra)
        return h

    def request(self, method: str, path: str, *, data: bytes | None = None, headers: dict[str, str] | None = None) -> tuple[int, bytes]:
        req = urllib.request.Request(self.url + path, data=data, headers=headers or {}, method=method)
        try:
            with urllib.request.urlopen(req, context=self.ctx, timeout=180) as resp:
                return resp.status, resp.read()
        except urllib.error.HTTPError as exc:
            return exc.code, exc.read()

    def get_json(self, path: str) -> list | dict:
        print(f"  GET {path}", flush=True)
        code, body = self.request("GET", path, headers=self._headers({"Prefer": "return=representation"}))
        if code >= 400:
            raise RuntimeError(f"GET {path} failed {code}: {body[:400]!r}")
        return json.loads(body.decode("utf-8") or "[]")

    def insert(self, table: str, row: dict) -> None:
        payload = json.dumps(row).encode("utf-8")
        code, body = self.request("POST", f"/rest/v1/{table}", data=payload, headers=self._headers())
        if code >= 400:
            raise RuntimeError(f"insert {table} failed {code}: {body[:500].decode('utf-8', 'replace')}")

    def delete(self, table: str, row_id: str) -> None:
        code, body = self.request(
            "DELETE",
            f"/rest/v1/{table}?id=eq.{row_id}",
            headers=self._headers(),
        )
        if code >= 400:
            raise RuntimeError(f"delete {table} failed {code}: {body[:400].decode('utf-8', 'replace')}")

    def upload(self, storage_path: str, content: bytes, content_type: str) -> str:
        encoded = urllib.parse.quote(storage_path)
        headers = self._headers(
            {
                "Content-Type": content_type,
                "x-upsert": "true",
            },
            json_body=False,
        )
        code, body = self.request(
            "POST",
            f"/storage/v1/object/{BUCKET}/{encoded}",
            data=content,
            headers=headers,
        )
        if code >= 400:
            raise RuntimeError(f"storage upload failed {code}: {body[:400].decode('utf-8', 'replace')}")
        public = f"{self.url}/storage/v1/object/public/{BUCKET}/{encoded}"
        return public


def find_local_pdf(book_id: int, title: str, slug: str) -> Path | None:
    prefix = f"{book_id:04d} - "
    matches = list(OUT_DIR.glob(f"{prefix}*.pdf"))
    if matches:
        return matches[0]
    slug_guess = OUT_DIR / f"{storage_slug(slug)}.pdf"
    if slug_guess.exists():
        return slug_guess
    return None


def generate_preview_jpeg(pdf_path: Path) -> bytes | None:
    """Render page 1 of a PDF to JPEG via the Node preview helper."""
    cli = ROOT / "scripts" / "lib" / "pdf-preview-cli.mjs"
    if not cli.exists():
        return None
    out = Path(tempfile.gettempdir()) / f"gostudy-preview-{os.getpid()}.jpg"
    try:
        proc = subprocess.run(
            ["node", str(cli), str(pdf_path), str(out)],
            capture_output=True,
            text=True,
            timeout=60,
            cwd=str(ROOT),
        )
        if proc.returncode != 0 or not out.exists():
            print(f"  preview warn: {proc.stderr.strip()[:200]}", flush=True)
            return None
        return out.read_bytes()
    except Exception as exc:
        print(f"  preview warn: {exc}", flush=True)
        return None
    finally:
        try:
            out.unlink(missing_ok=True)
        except OSError:
            pass


def load_catalog() -> list[dict]:
    if CATALOG_PATH.exists():
        data = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
        return [b for b in data.get("books", []) if b.get("book_id")]
    return []


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--reclassify", action="store_true", help="Move misfiled EduSocial books into exam papers")
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    load_env()
    url = os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("VITE_SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in exam-library-admin/.env")
        return 1

    catalog = load_catalog()
    if not catalog:
        print(f"No catalog at {CATALOG_PATH}")
        return 1

    print("Connecting to Supabase...", flush=True)
    sb = Supabase(url, key)

    if args.reclassify:
        books = sb.get_json("/rest/v1/library_books?select=*&limit=10000")
        paper_titles = {norm(r.get("title", "")) for r in sb.get_json("/rest/v1/exam_papers?select=title&limit=10000")}
        moved = 0
        kept = 0
        skipped = 0
        for row in books:
            title = row.get("title") or ""
            kind, extra = detect_kind(title, " ".join(row.get("tags") or []))
            if kind != "paper":
                kept += 1
                continue
            extra = detect_exam_type(title)
            if norm(title) in paper_titles:
                if args.execute:
                    try:
                        sb.delete("library_books", row["id"])
                    except Exception as exc:
                        print(f"ERR delete dup {title[:50]}: {exc}", flush=True)
                skipped += 1
                print(f"DUP paper exists, drop book: {title[:70]}", flush=True)
                continue
            paper_row = {
                "title": title[:200],
                "subject": row.get("subject") or detect_subject(title),
                "class_level": row.get("class_level") or detect_class(title),
                "year": row.get("published_year") or detect_year(title),
                "exam_type": extra,
                "session": detect_session(title),
                "system": row.get("system") or "apc",
                "file_url": row["file_url"],
                "file_name": row.get("file_name") or "file.pdf",
                "file_size": row.get("file_size") or 0,
                "file_size_formatted": row.get("file_size_formatted") or format_bytes(row.get("file_size") or 0),
                "content_hash": row.get("content_hash") or "",
                "tags": list({*(row.get("tags") or []), "edusocial", extra}),
                "description": row.get("description"),
                "downloads": row.get("downloads") or 0,
            }
            if paper_row["class_level"] in (None, ""):
                paper_row["class_level"] = "All"
            if not args.execute:
                print(f"WOULD MOVE {title[:70]} -> paper/{extra}", flush=True)
                moved += 1
                continue
            try:
                sb.insert("exam_papers", paper_row)
                sb.delete("library_books", row["id"])
                moved += 1
                print(f"MOVED {title[:70]}", flush=True)
            except Exception as exc:
                print(f"ERR move {title[:50]}: {exc}", flush=True)
        print(json.dumps({"moved": moved, "kept_as_books": kept, "dup_dropped": skipped, "execute": args.execute}, indent=2), flush=True)
        return 0

    print("Loading existing paper hashes...", flush=True)
    existing_paper_hashes = {r.get("content_hash") for r in sb.get_json("/rest/v1/exam_papers?select=content_hash&limit=10000") if r.get("content_hash")}
    print("Loading existing book hashes...", flush=True)
    existing_book_hashes = {r.get("content_hash") for r in sb.get_json("/rest/v1/library_books?select=content_hash&limit=10000") if r.get("content_hash")}
    print("Loading existing titles...", flush=True)
    existing_paper_titles = {norm(r.get("title", "")) for r in sb.get_json("/rest/v1/exam_papers?select=title&limit=10000")}
    existing_book_titles = {norm(r.get("title", "")) for r in sb.get_json("/rest/v1/library_books?select=title&limit=10000")}
    print(f"Existing papers={len(existing_paper_titles)} books={len(existing_book_titles)}", flush=True)

    stats = {
        "paper": 0,
        "book": 0,
        "missing_file": 0,
        "skip": 0,
        "uploaded_papers": 0,
        "uploaded_books": 0,
        "errors": 0,
    }
    preview: list[str] = []
    log: list[dict] = []

    items = catalog
    if args.limit:
        items = items[: args.limit]

    for entry in items:
        book_id = int(entry["book_id"])
        title = html.unescape(entry.get("title") or entry["slug"]).replace("&#039;", "'")
        slug = entry["slug"]
        kind, extra = detect_kind(title, slug)
        subject = detect_subject(title)
        class_level = detect_class(title)
        year = detect_year(title)
        pdf = find_local_pdf(book_id, title, slug)
        if not pdf:
            stats["missing_file"] += 1
            log.append({"id": book_id, "title": title, "status": "missing_file", "kind": kind})
            continue

        stats[kind] += 1
        line = f"{kind:5} | {extra:12} | {class_level:10} | {subject:14} | {pdf.name}"
        if len(preview) < 25:
            preview.append(line)

        if not args.execute:
            continue

        data = pdf.read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        title_key = norm(title)
        if kind == "paper":
            if digest in existing_paper_hashes or title_key in existing_paper_titles:
                stats["skip"] += 1
                continue
            storage_path = "/".join([
                "edusocial",
                "papers",
                storage_slug(class_level),
                storage_slug(subject),
                f"{book_id:04d}-{storage_slug(title)[:80]}.pdf",
            ])
            try:
                file_url = sb.upload(storage_path, data, "application/pdf")
                preview_url = None
                jpeg = generate_preview_jpeg(pdf)
                if jpeg:
                    preview_url = sb.upload(
                        f"previews/edusocial_{digest[:24]}.jpg",
                        jpeg,
                        "image/jpeg",
                    )
                sb.insert("exam_papers", {
                    "title": title[:200],
                    "subject": subject,
                    "class_level": class_level,
                    "year": year,
                    "exam_type": extra,
                    "session": detect_session(title),
                    "system": "apc",
                    "file_url": file_url,
                    "file_name": pdf.name,
                    "file_size": len(data),
                    "file_size_formatted": format_bytes(len(data)),
                    "content_hash": digest,
                    "preview_url": preview_url,
                    "tags": ["edusocial", extra, class_level],
                    "description": f"Source: EduSocialNews ({slug})",
                    "downloads": 0,
                })
                existing_paper_hashes.add(digest)
                existing_paper_titles.add(title_key)
                stats["uploaded_papers"] += 1
                print(f"OK paper {book_id} {title[:60]}", flush=True)
            except Exception as exc:
                stats["errors"] += 1
                print(f"ERR paper {book_id}: {exc}")
                log.append({"id": book_id, "title": title, "status": "error", "error": str(exc)})
        else:
            if digest in existing_book_hashes or title_key in existing_book_titles:
                stats["skip"] += 1
                continue
            storage_path = "/".join([
                "edusocial",
                "books",
                storage_slug(extra),
                storage_slug(subject),
                f"{book_id:04d}-{storage_slug(title)[:80]}.pdf",
            ])
            try:
                file_url = sb.upload(storage_path, data, "application/pdf")
                cover_url = None
                jpeg = generate_preview_jpeg(pdf)
                if jpeg:
                    cover_url = sb.upload(
                        f"book-covers/edusocial_{digest[:24]}.jpg",
                        jpeg,
                        "image/jpeg",
                    )
                sb.insert("library_books", {
                    "title": title[:200],
                    "author": "EduSocialNews",
                    "subject": subject,
                    "category": extra,
                    "system": "apc",
                    "class_level": None if class_level == "All" else class_level,
                    "description": f"Source: EduSocialNews ({slug})",
                    "cover_url": cover_url,
                    "file_url": file_url,
                    "file_name": pdf.name,
                    "file_size": len(data),
                    "file_size_formatted": format_bytes(len(data)),
                    "content_hash": digest,
                    "tags": ["edusocial", extra, class_level],
                    "downloads": 0,
                    "published_year": year,
                })
                existing_book_hashes.add(digest)
                existing_book_titles.add(title_key)
                stats["uploaded_books"] += 1
                print(f"OK book  {book_id} {title[:60]}", flush=True)
            except Exception as exc:
                stats["errors"] += 1
                print(f"ERR book {book_id}: {exc}")
                log.append({"id": book_id, "title": title, "status": "error", "error": str(exc)})

    print("\n--- Preview ---")
    for line in preview:
        print(line)
    print("\n--- Summary ---")
    print(json.dumps(stats, indent=2))
    if args.execute:
        UPLOAD_LOG.write_text(json.dumps({"stats": stats, "log": log[-50:]}, indent=2), encoding="utf-8")
        print(f"Wrote {UPLOAD_LOG}")
    else:
        print("Dry-run only. Re-run with --execute to upload.")
    return 0 if stats["errors"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
