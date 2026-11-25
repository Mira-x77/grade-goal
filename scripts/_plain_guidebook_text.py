import json
from pathlib import Path

d = json.loads(Path(r"docs/_guidebook_preview/text_dump.json").read_text(encoding="utf-8"))
out = Path(r"docs/_guidebook_preview/text_plain.txt")
fonts = set()
lines = []
for p in d:
    lines.append(f"===== PAGE {p['page']} =====")
    for ln in p["blocks"]:
        s = ln["spans"][0]
        fonts.add(s["font"])
        lines.append(ln["text"])
    lines.append("")
lines.append("FONTS: " + ", ".join(sorted(fonts)))
out.write_text("\n".join(lines), encoding="utf-8")
print("wrote", out)
