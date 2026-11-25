import json
from pathlib import Path
import pymupdf

src = Path(r"C:\Users\Skydrake\Desktop\Creators_Guidebook_20_Page_A4.pdf")
doc = pymupdf.open(src)
pages = []
for i, page in enumerate(doc):
    blocks = []
    for b in page.get_text("dict")["blocks"]:
        if b.get("type") != 0:
            continue
        parts = []
        sizes = []
        fonts = []
        colors = []
        flags = []
        for line in b.get("lines", []):
            lt = "".join(s["text"] for s in line.get("spans", []))
            parts.append(lt)
            for s in line.get("spans", []):
                if s["text"].strip():
                    sizes.append(s["size"])
                    fonts.append(s["font"])
                    colors.append(s["color"])
                    flags.append(s["flags"])
        text = "\n".join(parts).strip()
        if not text:
            continue
        blocks.append({
            "bbox": [round(x, 2) for x in b["bbox"]],
            "text": text,
            "size": round(sum(sizes) / len(sizes), 2) if sizes else 10,
            "max_size": round(max(sizes), 2) if sizes else 10,
            "font": fonts[0] if fonts else "SegoeUI",
            "color": colors[0] if colors else 0,
            "flags": flags[0] if flags else 0,
            "nlines": len(parts),
        })
    pages.append({"page": i + 1, "blocks": blocks})

Path(r"docs/_guidebook_preview/blocks.json").write_text(
    json.dumps(pages, ensure_ascii=False, indent=2), encoding="utf-8"
)
n = sum(len(p["blocks"]) for p in pages)
print("blocks", n)
