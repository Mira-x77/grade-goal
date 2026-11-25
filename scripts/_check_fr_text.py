import pymupdf
from pathlib import Path
doc = pymupdf.open(r"C:\Users\Skydrake\Desktop\Creators_Guidebook_20_Page_A4_FR.pdf")
Path(r"docs/_guidebook_preview_fr/p02_text.txt").write_text(doc[1].get_text(), encoding="utf-8")
Path(r"docs/_guidebook_preview_fr/p01_text.txt").write_text(doc[0].get_text(), encoding="utf-8")
print("p2 annots", [a.type for a in doc[1].annots() or []])
print("n annots", len(list(doc[1].annots() or [])))
