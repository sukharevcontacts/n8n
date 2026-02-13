#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
WF_DIR = REPO_ROOT / "workflows"

def slugify(name: str) -> str:
    name = name.strip()
    # replace spaces and forbidden filename chars
    name = re.sub(r"[\\/:*?\"<>|]+", "_", name)
    name = re.sub(r"\s+", "_", name)
    # keep it readable
    name = re.sub(r"_+", "_", name)
    return name[:180] if len(name) > 180 else name

def main():
    if not WF_DIR.exists():
        raise SystemExit(f"workflows dir not found: {WF_DIR}")

    json_files = sorted(WF_DIR.glob("*.json"))
    if not json_files:
        print("No workflow json files found.")
        return

    # map target filename -> source file (handle collisions)
    used = set()
    rename_plan = []

    for fp in json_files:
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"SKIP (invalid json): {fp.name}: {e}")
            continue

        wf_name = data.get("name") or fp.stem
        base = slugify(wf_name) or fp.stem
        target = f"{base}.json"

        # ensure unique filename
        if target in used or (WF_DIR / target).exists() and (WF_DIR / target).resolve() != fp.resolve():
            i = 2
            while True:
                candidate = f"{base}__{i}.json"
                if candidate not in used and (WF_DIR / candidate).exists() is False:
                    target = candidate
                    break
                i += 1

        used.add(target)
        if fp.name != target:
            rename_plan.append((fp, WF_DIR / target))

    if not rename_plan:
        print("Nothing to rename (already human-readable).")
        return

    for src, dst in rename_plan:
        src.rename(dst)
        print(f"RENAMED: {src.name} -> {dst.name}")

if __name__ == "__main__":
    main()
