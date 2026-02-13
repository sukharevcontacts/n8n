#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <git-branch> <workflow-json-filename>"
  echo "Example: $0 n8n-ilya-text MAX_autopost_with_video.json"
  exit 1
fi

BRANCH="$1"
WF="$2"

cd /home/pyuser/n8n-repo

# на всякий случай очистить хвосты от прошлых запусков
git restore workflows || true

git fetch
git checkout "$BRANCH"
git pull


python3 scripts/apply_all_code_nodes.py

if [[ ! -f "workflows/$WF" ]]; then
  echo "ERROR: workflows/$WF not found"
  exit 2
fi

docker cp "workflows/$WF" n8n-n8n-1:/tmp/"$WF"
docker exec -i n8n-n8n-1 sh -lc "n8n import:workflow --input=/tmp/$WF"

echo "Deployed $WF from branch $BRANCH (commit $(git rev-parse --short HEAD))"

git restore workflows
