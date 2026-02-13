import json, os, re, glob

def safe(s: str) -> str:
    s = s.strip()
    s = re.sub(r'[\\/:*?"<>|]+', '_', s)
    s = re.sub(r'\s+', '_', s)
    s = re.sub(r'_+', '_', s)
    return s[:120] or "unnamed"

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def write_text(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text.rstrip() + "\n")

repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
wf_dir = os.path.join(repo_root, "workflows")
out_root = os.path.join(repo_root, "nodes")

total_nodes = 0
total_wf = 0

for wf_path in sorted(glob.glob(os.path.join(wf_dir, "*.json"))):
    wf = load_json(wf_path)

    wf_name = wf.get("name") or os.path.splitext(os.path.basename(wf_path))[0]
    wf_folder = os.path.join(out_root, safe(wf_name))

    wrote_any = False
    for n in wf.get("nodes", []):
        if n.get("type") == "n8n-nodes-base.code":
            node_name = n.get("name", "code")
            js = n.get("parameters", {}).get("jsCode", "")
            out_file = os.path.join(wf_folder, safe(node_name) + ".js")
            write_text(out_file, js)
            total_nodes += 1
            wrote_any = True

    if wrote_any:
        total_wf += 1

print(f"Extracted {total_nodes} code node(s) from {total_wf} workflow(s) into {out_root}")

