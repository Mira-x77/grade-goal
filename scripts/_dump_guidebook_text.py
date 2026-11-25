import json
from pathlib import Path
import pymupdf

src = Path(r"C:\Users\Skydrake\Desktop\Creators_Guidebook_20_Page_A4.pdf")
out = Path(r"C:\Users\Skydrake\Documents\grade-goal\docs\_guidebook_preview\text_dump.json")
doc = pymupdf.open(src)
pages = []
for i, page in enumerate(doc):
    page_data = {"page": i + 1, "blocks": []}
    d = page.get_text("dict", flags=pymupdf.TEXT_PRESERVE_WHITESPACE)
    for b in d["blocks"]:
        if b.get("type") != 0:
            continue
        for line in b.get("lines", []):
            spans = []
            texts = []
            for s in line.get("spans", []):
                t = s["text"]
                if not t.strip():
                    continue
                spans.append({
                    "text": t,
                    "bbox": [round(x, 2) for x in s["bbox"]],
                    "size": round(s["size"], 2),
                    "font": s["font"],
                    "color": s["color"],
                    "flags": s["flags"],
                    "origin": [round(x, 2) for x in s["origin"]],
                })
                texts.append(t)
            if spans:
                page_data["blocks"].append({
                    "line_bbox": [round(x, 2) for x in line["bbox"]],
                    "text": "".join(texts),
                    "spans": spans,
                })
    pages.append(page_data)

out.write_text(json.dumps(pages, ensure_ascii=False, indent=2), encoding="utf-8")
print("wrote", out, "lines", sum(len(p["blocks"]) for p in pages))
