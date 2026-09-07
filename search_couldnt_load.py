import glob
import os

files = glob.glob(r"C:\Users\Skydrake\Documents\grade-goal\src\**\*.*", recursive=True)
for f in files:
    try:
        with open(f, 'r', encoding='utf-8', errors='ignore') as fp:
            text = fp.read()
            if "Couldn't load" in text or "couldn't load" in text or "Could not load" in text:
                print(f"=== File: {f} ===")
                for line in text.splitlines():
                    if "load" in line.lower():
                        print("  ", line.strip())
    except:
        pass
