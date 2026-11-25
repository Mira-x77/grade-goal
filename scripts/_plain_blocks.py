import json
from pathlib import Path

pages = json.loads(Path(r"docs/_guidebook_preview/blocks.json").read_text(encoding="utf-8"))
lines = []
for p in pages:
    lines.append(f"\n########## PAGE {p['page']} ##########")
    for i, b in enumerate(p["blocks"]):
        t = b["text"].replace("\n", " | ")
        lines.append(f"[{i}] size={b['size']} font={b['font']} flags={b['flags']} {t}")
Path(r"docs/_guidebook_preview/blocks_plain.txt").write_text("\n".join(lines), encoding="utf-8")
print("ok", len(lines))
