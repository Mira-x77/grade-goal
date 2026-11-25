#!/usr/bin/env python3
"""Download every document from epreuvesetcorriges.com.

The site is free but requires a (free) account before it serves a PDF: any
/download request from a guest is redirected to com_users login. This script
signs in once, keeps the session cookie, and then walks the inventory produced
by scripts/epreuves/inventory.py.

Setup
-----
Create scripts/epreuves/.env (git-ignored):

    EPREUVES_LOGIN=you@example.com
    EPREUVES_PASSWORD=your-password

Usage
-----
    python scripts/epreuves/inventory.py            # build the list first
    python scripts/epreuves/download.py --dry-run   # show what would be fetched
    python scripts/epreuves/download.py             # download (resumable)
    python scripts/epreuves/download.py --limit 20  # try a few first

Files are saved as:

    downloads/epreuves-et-corriges/<country>/<section>/<id>-<slug>.pdf

Nothing is overwritten: an existing file larger than 1 KB is skipped, so the
script can be stopped and restarted at any time.
"""

from __future__ import annotations

import argparse
import http.cookiejar
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE = "https://epreuvesetcorriges.com"
HERE = Path(__file__).resolve().parent
INVENTORY = HERE / "inventory.json"
ENV_FILE = HERE / ".env"
STATE = HERE / "output" / "download-state.json"
DEST = Path(__file__).resolve().parents[2] / "downloads" / "epreuves-et-corriges"
UA = "GoStudyBot/1.0 (+library import; educational use)"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def human(n: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if abs(n) < 1024 or unit == "GB":
            return f"{n:.1f} {unit}" if unit != "B" else f"{int(n)} B"
        n /= 1024
    return f"{n:.1f} GB"


def load_env() -> tuple[str, str]:
    if not ENV_FILE.exists():
        sys.exit(
            f"missing {ENV_FILE}\n"
            "create it with:\n  EPREUVES_LOGIN=you@example.com\n  EPREUVES_PASSWORD=...\n"
        )
    values: dict[str, str] = {}
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        values[key.strip()] = value.strip().strip('"').strip("'")
    login = values.get("EPREUVES_LOGIN", "")
    password = values.get("EPREUVES_PASSWORD", "")
    if not login or not password:
        sys.exit("EPREUVES_LOGIN and EPREUVES_PASSWORD must both be set in scripts/epreuves/.env")
    return login, password


def build_opener() -> urllib.request.OpenerDirector:
    jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    opener.addheaders = [("User-Agent", UA), ("Accept-Language", "fr-FR,fr;q=0.9")]
    return opener


def login(opener: urllib.request.OpenerDirector, user: str, password: str) -> None:
    form_url = f"{BASE}/index.php?option=com_users&view=login"
    page = opener.open(form_url, timeout=60).read().decode("utf-8", errors="replace")

    hidden = dict(re.findall(r'<input[^>]+type="hidden"[^>]+name="([^"]+)"[^>]+value="([^"]*)"', page))
    # Joomla's CSRF field has a random 32-char name and value "1"
    token_name = next(
        (name for name, value in hidden.items() if value == "1" and re.fullmatch(r"[a-f0-9]{32}", name)),
        None,
    )
    if not token_name:
        sys.exit("could not find the login form token; the site layout may have changed")

    hidden["username"] = user
    hidden["password"] = password
    hidden["option"] = "com_users"
    hidden["task"] = "user.login"
    hidden["return"] = "aHR0cHM6Ly9lcHJldXZlc2V0Y29ycmlnZXMuY29tLw=="  # base64 of the home page

    data = urllib.parse.urlencode(hidden).encode()
    req = urllib.request.Request(f"{BASE}/index.php", data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    req.add_header("Referer", form_url)
    body = opener.open(req, timeout=60).read().decode("utf-8", errors="replace")

    failed = re.search(r"(Nom d&#039;utilisateur et mot de passe incorrect|Username and password do not match|"
                       r"mot de passe incorrect|Login failed)", body, re.I)
    if failed:
        sys.exit("login rejected: wrong email or password")
    if "task=user.logout" not in body and "Se déconnecter" not in body and "logout" not in body.lower():
        sys.exit("login did not return a session; check the credentials or the site's captcha settings")
    print(f"signed in as {user}")


def targets() -> list[dict]:
    if not INVENTORY.exists():
        sys.exit(f"missing {INVENTORY}; run: python scripts/epreuves/inventory.py")
    rows = json.loads(INVENTORY.read_text(encoding="utf-8"))
    out = []
    for row in rows:
        url = row["url"]
        slug = url.rsplit("/", 1)[-1]
        if not re.match(r"^\d+-", slug):
            continue
        path = url.replace(BASE, "").strip("/").split("/")
        # /categories/<country>/<section>/<id>-<slug>
        parts = [p for p in path if p != "categories"][:-1]
        folder = Path(*[re.sub(r"[^a-z0-9-]+", "-", p.lower()) for p in parts]) if parts else Path("misc")
        out.append({
            "url": url,
            "title": row.get("title", slug),
            "dest": DEST / folder / f"{slug}.pdf",
        })
    return out


def download(opener, item: dict, state: dict, delay: float) -> tuple[bool, int]:
    dest: Path = item["dest"]
    if dest.exists() and dest.stat().st_size > 1024:
        state["skipped"] += 1
        return True, dest.stat().st_size

    req = urllib.request.Request(item["url"] + "/download", headers={"Referer": item["url"]})
    for attempt in range(3):
        try:
            with opener.open(req, timeout=180) as resp:
                data = resp.read()
                if resp.url.startswith(f"{BASE}/index.php?option=com_users"):
                    sys.exit("session expired (redirected to login again); re-run the script")
                if not data.startswith(b"%PDF"):
                    raise RuntimeError(f"not a PDF ({len(data)} bytes)")
                dest.parent.mkdir(parents=True, exist_ok=True)
                tmp = dest.with_suffix(".part")
                tmp.write_bytes(data)
                tmp.replace(dest)
                return True, len(data)
        except (urllib.error.URLError, TimeoutError, RuntimeError, OSError) as exc:
            if attempt == 2:
                print(f"    ! failed: {exc}")
                state["failed"].append({"url": item["url"], "error": str(exc)})
                return False, 0
            time.sleep(2 * (attempt + 1))
    return False, 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--delay", type=float, default=1.5)
    args = ap.parse_args()

    todo = targets()
    print(f"documents in inventory: {len(todo)}")
    todo = [t for t in todo if not (t["dest"].exists() and t["dest"].stat().st_size > 1024)]
    print(f"not downloaded yet:     {len(todo)}")
    if args.limit:
        todo = todo[: args.limit]

    if args.dry_run:
        for t in todo[:30]:
            print(f"  {t['url'].replace(BASE, '')}")
        if len(todo) > 30:
            print(f"  ... and {len(todo) - 30} more")
        return 0

    user, password = load_env()
    opener = build_opener()
    login(opener, user, password)

    state = {"skipped": 0, "failed": []}
    total_bytes = 0
    started = time.time()

    for index, item in enumerate(todo, 1):
        print(f"[{index}/{len(todo)}] {item['url'].replace(BASE, '')[:100]}", flush=True)
        ok, size = download(opener, item, state, args.delay)
        if ok:
            total_bytes += size
        if index % 20 == 0 or index == len(todo):
            STATE.parent.mkdir(parents=True, exist_ok=True)
            STATE.write_text(json.dumps(state, indent=2), encoding="utf-8")
        time.sleep(args.delay)

    elapsed = time.time() - started
    print(f"\ndownloaded {len(todo) - state['skipped'] - len(state['failed'])} files, "
          f"skipped {state['skipped']}, failed {len(state['failed'])}, "
          f"{human(total_bytes)} in {elapsed / 60:.1f} min")
    print(f"state: {STATE}")
    return 0 if not state["failed"] else 1


if __name__ == "__main__":
    sys.exit(main())
