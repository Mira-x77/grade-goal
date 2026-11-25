from pathlib import Path
p = Path("scripts/convert_creators_guidebook_fr.py")
lines = p.read_text(encoding="utf-8").splitlines(True)
keep = "".join(lines[:629])
p.write_text(keep + "\n\nif __name__ == \"__main__\":\n    process()\n", encoding="utf-8")
print("lines", len(keep.splitlines()))
