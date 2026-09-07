import os

project_dir = r"C:\Users\Skydrake\Documents\grade-goal\src"

found = []
for root, dirs, files in os.walk(project_dir):
    for f in files:
        if f.endswith((".ts", ".tsx")):
            path = os.path.join(root, f)
            with open(path, "r", encoding="utf-8", errors="ignore") as file:
                for line_idx, line in enumerate(file, 1):
                    if any(k in line for k in [".interros", ".devoirs", ".compos"]):
                        found.append((os.path.relpath(path, project_dir), line_idx, line.strip()))

print("Found occurrences:")
for rel, line_idx, text in found:
    print(f"  {rel}:{line_idx} -> {text}")
