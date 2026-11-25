#!/usr/bin/env python3
"""Normalize existing exam_papers class_level, exam_type, and year.

Does not upload files. Run:
  python scripts/normalize-exam-papers.py           # dry-run
  python scripts/normalize-exam-papers.py --execute
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import ssl
import unicodedata
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

VALID_CLASS = {
    "6ème", "5ème", "4ème", "3ème",
    "2nde", "2nde A4", "2nde CD", "2nde E", "2nde F", "2nde G",
    "1ère", "1ère A4", "1ère C", "1ère D", "1ère E", "1ère F", "1ère G",
    "Tle", "Tle A4", "Tle C", "Tle D", "Tle E", "Tle F", "Tle G",
    "CEPD", "CAP", "Primaire", "CP1", "CP2", "CE1", "CE2", "CM1", "CM2", "Autre",
}

KEEP_EXAM = {
    "Baccalauréat", "Probatoire", "BEPC", "CEPD", "CAP",
    "Concours", "Annales", "Composition", "Devoir", "Interro", "Exercices",
}


def load_env() -> None:
    for env_path in (ROOT / "exam-library-admin" / ".env", ROOT / ".env"):
        if not env_path.exists():
            continue
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))


def strip_accents(s: str) -> str:
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")


def norm(s: str) -> str:
    s = html.unescape(s or "")
    s = strip_accents(s).lower()
    s = re.sub(r"g[\s\-]?lome|grand lome|\bg[\s\-]?l\b|dre kara|plateaux|maritime|savanes|tokoin", " ", s)
    s = re.sub(r"\b\d+\s*(er|e|eme|nd)?\s*(semestre|trimestre)\b", " ", s)
    s = re.sub(r"\b2nd\s+(semestre|trimestre)\b", " ", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def detect_year(title: str, current: int | None) -> int:
    years = [int(y) for y in re.findall(r"(20[0-2]\d)", title or "")]
    years = [y for y in years if 2000 <= y <= 2030]
    if years:
        return max(years)
    if current and 2000 <= int(current) <= 2030:
        return int(current)
    return current or 2026


def detect_exam_type(title: str, current: str | None) -> str:
    n = norm(title)
    if "cepd" in n:
        return "CEPD"
    if "bepc" in n:
        return "BEPC"
    if re.search(r"\bcap\b", n):
        return "CAP"
    if "concours" in n:
        return "Concours"
    if "annale" in n:
        return "Annales"
    if "probatoire" in n or re.search(r"\bbac ?1\b|bac1", n):
        return "Probatoire"
    if re.search(r"bacii|bac ii|bac 2|baccalaureat", n) or re.search(r"\bbac\b", n):
        return "Baccalauréat"
    if "interro" in n:
        return "Interro"
    if "compo" in n or "composition" in n or "blanc" in n:
        return "Composition"
    if "devoir" in n:
        return "Devoir"
    if current in KEEP_EXAM:
        return current
    return "Exercices"


def detect_series(n: str, base: str) -> str | None:
    if re.search(r"\bacd\b|series generales|series generales et techniques|a c d|serie a c d", n):
        return None
    if re.search(r"\ba4\b|serie a4|tlea4|tle a4|1ere a4", n):
        return "A4"
    if base == "2nde":
        if re.search(r"\bcd\b|2nde cd", n):
            return "CD"
        if re.search(r"\b2nde e\b|serie e\b", n):
            return "E"
        if re.search(r"\b2nde f\b|serie f\b", n):
            return "F"
        if re.search(r"\b2nde g\b|serie g\b", n):
            return "G"
        return None
    if re.search(r"g2|g3|serie g\b|1ere g\b|tle g\b", n):
        return "G"
    if re.search(r"tled|tle d\b|terminale d\b|1ere d\b|1ered\b|premiere d\b|serie d\b", n):
        return "D"
    if re.search(r"tlec|tle c\b|terminale c\b|1ere c\b|1erec\b|premiere c\b|serie c\b", n):
        return "C"
    if re.search(r"tle e\b|1ere e\b|serie e\b", n):
        return "E"
    if re.search(r"tle f\b|1ere f\b|serie f\b", n):
        return "F"
    return None


def detect_class(title: str, current: str | None, exam_type: str) -> str:
    n = norm(title)
    cur = (current or "").strip()
    cur_map = {"Première D": "1ère D", "Premiere D": "1ère D", "Terminale": "Tle"}
    cur = cur_map.get(cur, cur)

    if "cepd" in n or exam_type == "CEPD":
        return "CEPD"
    if re.search(r"\bcp1\b", n):
        return "CP1"
    if re.search(r"\bcp2\b", n):
        return "CP2"
    if re.search(r"\bce1\b", n):
        return "CE1"
    if re.search(r"\bce2\b", n):
        return "CE2"
    if re.search(r"\bcm1\b", n):
        return "CM1"
    if re.search(r"\bcm2\b", n):
        return "CM2"
    if "primaire" in n:
        return "Primaire"
    if exam_type == "CAP" or re.search(r"\bcap\b", n):
        return "CAP"
    if exam_type == "BEPC" or "bepc" in n:
        return "3ème"

    if re.search(r"sixieme|6eme|\b6e\b", n):
        return "6ème"
    if re.search(r"cinquieme|5eme|\b5e\b", n):
        return "5ème"
    if re.search(r"quatrieme|4eme|\b4e\b", n):
        return "4ème"
    if re.search(r"troisieme|3eme|\b3e\b", n):
        return "3ème"

    has_2nde = bool(re.search(r"seconde|\b2nde\b", n))
    has_1ere = bool(re.search(r"premiere|1ere|\b1re\b|bac ?1|bac1|probatoire", n))
    has_tle = bool(re.search(r"terminale|\btle\b|tled|tlec|\btle[acdefg]\b|bacii|bac ii|bac 2", n))

    if exam_type == "Probatoire":
        has_1ere = True
        has_tle = False
    elif exam_type == "Baccalauréat" and not has_1ere:
        has_tle = True

    if has_1ere and has_tle:
        if exam_type == "Baccalauréat":
            has_1ere = False
        elif exam_type == "Probatoire":
            has_tle = False
        else:
            # Multi-class pack: keep level without a series so 1ère C is not mixed with Tle C
            idx_1 = n.find("1ere") if "1ere" in n else n.find("premiere")
            idx_t = n.find("tle") if "tle" in n else n.find("terminal")
            if idx_1 >= 0 and (idx_t < 0 or idx_1 < idx_t):
                has_tle = False
            else:
                has_1ere = False

    base = None
    if has_2nde and not has_1ere and not has_tle:
        base = "2nde"
    elif has_1ere and not has_tle:
        base = "1ère"
    elif has_tle and not has_1ere:
        base = "Tle"

    if not base:
        if exam_type == "Concours":
            return "Autre"
        if cur in VALID_CLASS:
            return cur
        if cur.startswith("1ère") or cur.startswith("1ere"):
            return "1ère"
        if cur.startswith("Tle") or cur.startswith("Term"):
            return "Tle"
        if cur.startswith("2nde"):
            return "2nde"
        return "Autre"

    series = detect_series(n, base)
    if series:
        if base == "2nde" and series == "C":
            series = "CD"
        if base == "2nde" and series in {"C", "D"}:
            series = "CD"
        return f"{base} {series}"
    return base


class Supabase:
    def __init__(self, url: str, key: str) -> None:
        self.url = url.rstrip("/")
        self.key = key
        self.ctx = ssl.create_default_context()

    def get(self, path: str) -> list:
        req = urllib.request.Request(
            self.url + path,
            headers={"apikey": self.key, "Authorization": f"Bearer {self.key}"},
        )
        with urllib.request.urlopen(req, context=self.ctx, timeout=60) as resp:
            return json.loads(resp.read().decode())

    def patch(self, paper_id: str, row: dict) -> None:
        data = json.dumps(row).encode("utf-8")
        req = urllib.request.Request(
            self.url + f"/rest/v1/exam_papers?id=eq.{paper_id}",
            data=data,
            method="PATCH",
            headers={
                "apikey": self.key,
                "Authorization": f"Bearer {self.key}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
        )
        with urllib.request.urlopen(req, context=self.ctx, timeout=60) as resp:
            resp.read()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    load_env()
    url = os.environ["VITE_SUPABASE_URL"]
    key = os.environ["VITE_SUPABASE_SERVICE_ROLE_KEY"]
    sb = Supabase(url, key)
    papers = sb.get("/rest/v1/exam_papers?select=id,title,class_level,exam_type,year&limit=10000")
    changes = []
    for p in papers:
        title = p.get("title") or ""
        exam = detect_exam_type(title, p.get("exam_type"))
        klass = detect_class(title, p.get("class_level"), exam)
        if klass not in VALID_CLASS:
            prev = p.get("class_level")
            klass = prev if prev in VALID_CLASS else "Autre"
        year = detect_year(title, p.get("year"))
        if (klass, exam, year) != (p.get("class_level"), p.get("exam_type"), p.get("year")):
            changes.append((p, klass, exam, year))

    print(f"Papers: {len(papers)} | to update: {len(changes)}")
    print("class after:", dict(Counter(detect_class(p.get("title") or "", p.get("class_level"), detect_exam_type(p.get("title") or "", p.get("exam_type"))) for p in papers)))
    print("type after:", dict(Counter(detect_exam_type(p.get("title") or "", p.get("exam_type")) for p in papers)))
    for p, klass, exam, year in changes[:40]:
        print(f"  {p.get('class_level')} / {p.get('exam_type')} / {p.get('year')}  ->  {klass} / {exam} / {year}")
        print(f"    {p['title'][:90]}")
    if len(changes) > 40:
        print(f"  ... {len(changes) - 40} more")

    if not args.execute:
        print("Dry-run. Re-run with --execute to apply.")
        return 0

    ok = err = 0
    for p, klass, exam, year in changes:
        try:
            sb.patch(p["id"], {"class_level": klass, "exam_type": exam, "year": year})
            ok += 1
        except Exception as exc:
            err += 1
            print(f"ERR {p['title'][:50]}: {exc}")
    print(json.dumps({"updated": ok, "errors": err}, indent=2))
    return 0 if err == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
