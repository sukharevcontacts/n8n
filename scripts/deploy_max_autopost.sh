#!/usr/bin/env bash
set -e

cd /home/pyuser/n8n-repo

echo "Pulling repo..."
git pull

echo "Applying code nodes..."
python3 scripts/apply_all_code_nodes.py

echo "Copying workflow to container..."
docker cp ./workflows/MAX_autopost_with_video.json \
n8n-n8n-1:/tmp/MAX_autopost_with_video.json

echo "Importing workflow into n8n..."
docker exec -i n8n-n8n-1 sh -lc \
'n8n import:workflow --input=/tmp/MAX_autopost_with_video.json'

echo "DONE ✅"
