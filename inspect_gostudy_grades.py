import os

project_dir = r"C:\Users\Skydrake\Documents\grade-goal\src"

found = []
for root, dirs, files in os.walk(project_dir):
    for f in files:
        if f.endswith((".ts", ".tsx", ".json")):
            path = os.path.join(root, f)
            with open(path, "r", encoding="utf-8", errors="ignore") as file:
                content = file.read()
                if any(k in content.lower() for k in ["grade", "score", "target", "gpa", "exam"]):
                    found.append((os.path.relpath(path, project_dir), f))

for rel, f in found[:30]:
    print(f"  - {rel}")
