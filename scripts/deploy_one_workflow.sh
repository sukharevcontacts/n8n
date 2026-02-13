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

ORIG_BRANCH="$(git branch --show-current || true)"

cleanup() {
  # откатить изменения JSON'ов, которые делает apply
  git restore workflows >/dev/null 2>&1 || true
  # вернуться на исходную ветку
  if [[ -n "${ORIG_BRANCH:-}" ]]; then
    git checkout "$ORIG_BRANCH" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

# на всякий случай очистить хвосты от прошлых запусков
git restore workflows >/dev/null 2>&1 || true

# подтянуть ссылки на удалённые ветки
git fetch --all --prune

# если локальной ветки нет, но есть origin/BRANCH — создаём локальную
if ! git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  if git show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
    git checkout -b "$BRANCH" "origin/$BRANCH"
  else
    echo "ERROR: branch '$BRANCH' not found (neither local nor origin/$BRANCH)"
    exit 3
  fi
else
  git checkout "$BRANCH"
fi

# без мердж-коммитов (если не fast-forward — упадёт)
git pull --ff-only

python3 scripts/apply_all_code_nodes.py

if [[ ! -f "workflows/$WF" ]]; then
  echo "ERROR: workflows/$WF not found"
  exit 2
fi

docker cp "workflows/$WF" n8n-n8n-1:/tmp/"$WF"
docker exec -i n8n-n8n-1 sh -lc "n8n import:workflow --input=/tmp/$WF"

echo "Deployed $WF from branch $BRANCH (commit $(git rev-parse --short HEAD))"
echo "Back to: ${ORIG_BRANCH:-unknown}"
