import json
from pathlib import Path
import pymupdf

src = Path(r"C:\Users\Skydrake\Desktop\Creators_Guidebook_20_Page_A4.pdf")
doc = pymupdf.open(src)
out = []
for i, page in enumerate(doc):
    imgs = []
    for b in page.get_text("dict")["blocks"]:
        if b.get("type") == 1:
            imgs.append([round(x, 1) for x in b["bbox"]])
    ph = []
    for ln in page.get_text("dict")["blocks"]:
        if ln.get("type") != 0:
            continue
        t = "".join(s["text"] for line in ln.get("lines", []) for s in line.get("spans", []))
        if "PLACEHOLDER" in t.upper() or "Suggested Image" in t or "COVER ARTWORK" in t:
            ph.append({"t": t[:80], "bbox": [round(x, 1) for x in ln["bbox"]]})
    out.append({"page": i + 1, "img_bboxes": imgs, "placeholders": ph})

Path(r"docs/_guidebook_preview/overlap.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
print(json.dumps(out, indent=2)[:8000])
