import os

project_dir = r"C:\Users\Skydrake\Documents\grade-goal\src"

found = []
for root, dirs, files in os.walk(project_dir):
    for f in files:
        if "supabase" in f.lower() or "auth" in f.lower():
            found.append(os.path.relpath(os.path.join(root, f), project_dir))

print("Found files:")
for f in found:
    print(" ", f)
