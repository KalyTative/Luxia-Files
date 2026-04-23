
import json
import re
import sys
from pathlib import Path

def split_stem(stem: str):
    # Split at the first digit that starts a version-like suffix and is
    # preceded by -, _, + or a letter cluster (ex: mc1.20.1).
    m = re.search(r'(?<!^)(?=[0-9])', stem)
    if not m:
        return stem, "1.0.0"
    idx = m.start()
    # prefer splitting on the separator just before the version block
    while idx > 0 and stem[idx-1] in "-_+":
        idx -= 1
    artifact = stem[:idx].rstrip("-_+.")
    version = stem[idx:].lstrip("-_+.")
    if not artifact or not version:
        return stem, "1.0.0"
    return artifact, version

def fix_module(mod):
    if isinstance(mod, dict):
        if mod.get("type") == "ForgeMod":
            url = mod.get("artifact", {}).get("url", "")
            basename = Path(url).name or mod.get("name", "mod")
            stem = basename[:-4] if basename.lower().endswith(".jar") else basename
            artifact, version = split_stem(stem)
            # Keep a simple, stable generated namespace so Helios writes to a sane path:
            mod["id"] = f"generated.forgemod:{artifact}:{version}@jar"
        for key in ("modules", "subModules"):
            if key in mod and isinstance(mod[key], list):
                for child in mod[key]:
                    fix_module(child)
    elif isinstance(mod, list):
        for item in mod:
            fix_module(item)

def main():
    if len(sys.argv) < 3:
        print("Usage: python fix_luxia_distribution.py <input.json> <output.json>")
        sys.exit(1)
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        data = json.load(f)
    fix_module(data)
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\\n")
    print(f"Wrote corrected distribution to {sys.argv[2]}")

if __name__ == "__main__":
    main()
