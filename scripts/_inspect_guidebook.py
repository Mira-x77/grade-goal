import pymupdf
from pathlib import Path

src = Path(r"C:\Users\Skydrake\Desktop\Creators_Guidebook_20_Page_A4.pdf")
out = Path(r"C:\Users\Skydrake\Documents\grade-goal\docs\_guidebook_preview")
out.mkdir(parents=True, exist_ok=True)
doc = pymupdf.open(src)
print("pages", doc.page_count)
print("page0 size", doc[0].rect)
for i, page in enumerate(doc):
    imgs = page.get_images(full=True)
    drawings = page.get_drawings()
    blocks = page.get_text("dict")["blocks"]
    ntext = sum(1 for b in blocks if b.get("type") == 0)
    nimg = sum(1 for b in blocks if b.get("type") == 1)
    print(f"p{i+1:02d} images={len(imgs)} imgblocks={nimg} textblocks={ntext} drawings={len(drawings)}")
    pix = page.get_pixmap(dpi=90)
    pix.save(str(out / f"p{i+1:02d}.png"))
print("saved previews")
