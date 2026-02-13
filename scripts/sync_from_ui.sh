# /home/pyuser/n8n-repo/scripts/sync_from_ui.sh
#!/usr/bin/env bash
set -euo pipefail

cd /home/pyuser/n8n-repo

MSG="${1:-Sync from UI}"

echo "[1/6] Export workflows from n8n container → /tmp/wf"
docker exec -i n8n-n8n-1 sh -lc 'rm -rf /tmp/wf && mkdir -p /tmp/wf'
docker exec -i n8n-n8n-1 sh -lc 'n8n export:workflow --all --separate --output=/tmp/wf'

echo "[2/6] Copy exported JSONs into repo ./workflows/"
rm -rf workflows/*
mkdir -p workflows
docker cp n8n-n8n-1:/tmp/wf/. ./workflows/
python3 scripts/rename_workflows_by_name.py

echo "[3/6] Extract Code-node JS into ./nodes/"
python3 scripts/extract_all_code_nodes.py

echo "[4/6] Show changes"
git status --porcelain

echo "[5/6] Commit (only if there are changes)"
git add workflows nodes

if git diff --cached --quiet; then
  echo "No changes to commit. Done."
  exit 0
fi

git commit -m "$MSG"

echo "[6/6] Push"
git push

echo "OK: synced from UI and pushed (commit $(git rev-parse --short HEAD))"
