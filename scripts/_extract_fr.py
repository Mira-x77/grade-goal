import pymupdf
from pathlib import Path
d = pymupdf.open(r"C:\Users\Skydrake\Desktop\Creators_Guidebook_20_Page_A4_FR.pdf")
out = []
for i in (0, 1, 2, 19):
    out.append(f"===== {i+1} =====")
    t = d[i].get_text().replace("\x00", "")
    out.append(t)
Path(r"docs/_guidebook_preview_fr/extract.txt").write_text("\n".join(out), encoding="utf-8")
print("ok", [len(d[i].get_text()) for i in (0,1,2,19)])
