import os
import glob

# Search for adb.exe on C: and D:
print("Searching for adb.exe...")
for root in [r"C:\Users\Skydrake", r"C:\Program Files", r"C:\Program Files (x86)", r"C:\Android", r"C:\platform-tools"]:
    if os.path.exists(root):
        for path in glob.glob(os.path.join(root, "**", "adb.exe"), recursive=True):
            print("Found ADB:", path)

