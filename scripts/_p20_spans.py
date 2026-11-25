import pymupdf
from pathlib import Path

doc = pymupdf.open(r"C:\Users\Skydrake\Desktop\Creators_Guidebook_20_Page_A4.pdf")
page = doc[19]
d = page.get_text("dict")
lines = []
for b in d["blocks"]:
    if b.get("type") != 0:
        continue
    for line in b.get("lines", []):
        t = "".join(s["text"] for s in line["spans"])
        for s in line["spans"]:
            lines.append(f"{s['text'][:60]!r} size={round(s['size'],1)} col={s['color']} font={s['font']} bbox={[round(x,1) for x in s['bbox']]}")
        lines.append("---")
Path(r"docs/_guidebook_preview/p20_spans.txt").write_text("\n".join(lines), encoding="utf-8")
