#!/usr/bin/env bash
set -euo pipefail

WF="${1:-}"
if [[ -z "$WF" ]]; then
  echo "Usage: $0 <workflow_json_filename>"
  echo "Example: $0 MAX_autopost_with_video.json"
  exit 1
fi

cd /home/pyuser/n8n-repo

echo "== git =="
git status --porcelain && { echo "ERROR: working tree is dirty. Commit/stash first."; exit 1; } || true
git pull

echo "== apply code nodes (.js -> workflow json) =="
python3 scripts/apply_all_code_nodes.py

WF_PATH="workflows/$WF"
if [[ ! -f "$WF_PATH" ]]; then
  echo "ERROR: file not found: $WF_PATH"
  exit 1
fi

echo "== copy & import into n8n =="
docker cp "$WF_PATH" n8n-n8n-1:/tmp/"$WF"
docker exec -i n8n-n8n-1 sh -lc "n8n import:workflow --input=/tmp/$WF"

echo "DONE: deployed $WF from branch $(git branch --show-current) @ $(git rev-parse --short HEAD)"
