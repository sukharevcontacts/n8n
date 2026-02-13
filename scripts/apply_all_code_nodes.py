import json, os, re, glob

def safe(s: str) -> str:
    s = s.strip()
    s = re.sub(r'[\\/:*?"<>|]+', '_', s)
    s = re.sub(r'\s+', '_', s)
    s = re.sub(r'_+', '_', s)
    return s[:120] or "unnamed"

def read_text(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read().rstrip()

repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
wf_dir = os.path.join(repo_root, "workflows")
nodes_root = os.path.join(repo_root, "nodes")

updated_nodes = 0
updated_wf = 0

for wf_path in sorted(glob.glob(os.path.join(wf_dir, "*.json"))):
    with open(wf_path, "r", encoding="utf-8") as f:
        wf = json.load(f)

    wf_name = wf.get("name") or os.path.splitext(os.path.basename(wf_path))[0]
    wf_folder = os.path.join(nodes_root, safe(wf_name))
    if not os.path.isdir(wf_folder):
        continue

    changed = False
    for n in wf.get("nodes", []):
        if n.get("type") == "n8n-nodes-base.code":
            node_name = n.get("name", "code")
            js_path = os.path.join(wf_folder, safe(node_name) + ".js")
            if os.path.exists(js_path):
                n.setdefault("parameters", {})["jsCode"] = read_text(js_path)
                updated_nodes += 1
                changed = True

    if changed:
        with open(wf_path, "w", encoding="utf-8") as f:
            json.dump(wf, f, ensure_ascii=False, indent=2)
            f.write("\n")
        updated_wf += 1

print(f"Applied {updated_nodes} code node(s) into {updated_wf} workflow file(s)")
