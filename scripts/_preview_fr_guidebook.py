from pathlib import Path
import pymupdf

src = Path(r"C:\Users\Skydrake\Desktop\Creators_Guidebook_20_Page_A4_FR.pdf")
out = Path(r"C:\Users\Skydrake\Documents\grade-goal\docs\_guidebook_preview_fr")
out.mkdir(parents=True, exist_ok=True)
doc = pymupdf.open(src)
print("pages", doc.page_count)
for i, page in enumerate(doc):
    pix = page.get_pixmap(dpi=110)
    pix.save(str(out / f"p{i+1:02d}.png"))
print("ok")
