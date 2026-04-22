import os, hashlib

mods_dir = "./mods"  # dossier mods de ton repo cloné

for f in sorted(os.listdir(mods_dir)):
    if f.endswith(".jar"):
        path = os.path.join(mods_dir, f)
        size = os.path.getsize(path)
        md5 = hashlib.md5(open(path, "rb").read()).hexdigest()
        print(f"{f}|{size}|{md5}")
