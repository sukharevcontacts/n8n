# n8n workflows
# n8n-repo — Git Workflow Guide

## Архитектура

- `main` — стабильная ветка (продакшн-истина)
- `n8n-ilya-*` — feature ветки для разработки
- GUI n8n — runtime (если правим в GUI → обязательно sync в Git)

---

# 🔹 БАЗОВЫЕ КОМАНДЫ GIT

## Где я сейчас?
git branch --show-current

## Состояние файлов
git status

## Посмотреть diff
git diff
git diff path/to/file

(выйти из diff: нажать q)

## Посмотреть последние коммиты
git log --oneline -n 20

## Обновить список веток
git fetch --all --prune

## Подтянуть изменения
git pull

---

# 🔹 РАБОТА С ВЕТКАМИ

## Показать все ветки
git branch -a

## Переключиться на ветку
git checkout n8n-ilya-3
git pull

## Если ветка есть только на origin
git fetch --all --prune
git checkout -b n8n-ilya-3 origin/n8n-ilya-3

## Создать новую ветку от main
git checkout main
git pull
git checkout -b n8n-ilya-new
git push -u origin n8n-ilya-new

---

# 🔹 КОММИТ И PUSH

git add path/to/file
git commit -m "Message"
git push

Добавить папки:
git add workflows nodes scripts
git commit -m "Update"
git push

---

# 🔹 ЕСЛИ GIT PULL РУГАЕТСЯ

Ошибка:
"local changes would be overwritten"

## Выкинуть изменения:
git restore path/to/file
git pull

## Или временно сохранить:
git stash push -m "temp"
git pull
git stash pop

---

# 🔹 ОСНОВНОЙ РАБОЧИЙ ЦИКЛ (правим Code-ноды)

## На Windows
1. Checkout ветки
2. Правим:
   nodes/<workflow>/<node>.js
3. Commit
4. Push

## На сервере деплой
cd /home/pyuser/n8n-repo
./scripts/deploy_one_workflow.sh n8n-ilya-3 MAX_autopost_with_video.json

---

# 🔹 ЕСЛИ ПРАВИЛИ В GUI N8N

ВАЖНО: sync попадёт в текущую ветку.

## Перед sync:
git branch --show-current
git checkout нужная_ветка
git pull

## Sync:
cd /home/pyuser/n8n-repo/scripts
./sync_from_ui.sh "Sync after GUI changes"

После этого на Windows → Pull.

---

# 🔹 APPLY / EXTRACT

## Extract (JSON → JS)
python3 scripts/extract_all_code_nodes.py

## Apply (JS → JSON)
python3 scripts/apply_all_code_nodes.py

---

# 🔹 EXPORT WORKFLOWS ВРУЧНУЮ

docker exec -i n8n-n8n-1 sh -lc 'rm -rf /tmp/wf && mkdir -p /tmp/wf'
docker exec -i n8n-n8n-1 sh -lc 'n8n export:workflow --all --separate --output=/tmp/wf'

rm -rf workflows/*
mkdir -p workflows
docker cp n8n-n8n-1:/tmp/wf/. ./workflows/

---

# 🔹 PATCH (сохранить diff в файл)

git diff nodes/My_workflow/Code.js > my_changes.patch

Применить:
git apply my_changes.patch

---

# 🔹 ОТКАТ

История файла:
git log --oneline -- path/to/file

Откат файла:
git checkout HASH -- path/to/file
git commit -m "Rollback"
git push

Правильный откат коммита:
git revert HASH
git push

---

# 🔹 ЗОЛОТЫЕ ПРАВИЛА

1. Правил в GUI → делай sync_from_ui
2. Перед sync проверяй текущую ветку
3. Скрипты менять через main
4. Деплоим конкретный workflow
5. Git — источник истины
