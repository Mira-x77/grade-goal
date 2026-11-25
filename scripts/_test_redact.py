import pymupdf
from pathlib import Path

src = Path(r"C:\Users\Skydrake\Desktop\Creators_Guidebook_20_Page_A4.pdf")
doc = pymupdf.open(src)
page = doc[1]  # TOC
# redact title
r = pymupdf.Rect(45.35, 68.33, 324.87, 92.27)
print("before", page.get_text()[:80])
page.add_redact_annot(r, fill=(1, 1, 1))
ok = page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE, graphics=0, text=0)
print("ok", ok)
print("after", page.get_text()[:80])
out = Path(r"C:\Users\Skydrake\Documents\grade-goal\docs\_guidebook_preview_fr\redact_test.png")
page.get_pixmap(dpi=100).save(str(out))
print("saved")
