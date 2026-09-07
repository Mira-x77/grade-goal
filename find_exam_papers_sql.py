import glob
import os

files = glob.glob(r"C:\Users\Skydrake\Documents\grade-goal\**\*.sql", recursive=True)
for f in files:
    try:
        with open(f, 'r', encoding='utf-8', errors='ignore') as fp:
            text = fp.read()
            if "exam_papers" in text:
                print(f"=== File: {f} ===")
                for line in text.splitlines():
                    if "CREATE TABLE" in line or "exam_papers" in line:
                        print("  ", line[:120])
    except:
        pass
