// ===== ВАРИАНТ B =====
// если используется old_post_link (старый пост) — кнопки НЕ делаем
if ($json.old_post_link) {
  $json.tg_reply_markup = null;
  return $json;
}

// --- берём order_links (может прийти строкой) ---
let links = $json.order_links;

// если строка — парсим JSON
if (typeof links === 'string') {
  try {
    links = JSON.parse(links);
  } catch (e) {
    links = [];
  }
}

// защита
if (!Array.isArray(links)) {
  links = [];
}

// --- собираем inline keyboard (по 1 кнопке в строке) ---
const rows = links
  .filter(b => b && b.text && b.url)
  .map(b => ([{ text: String(b.text), url: String(b.url) }]));

$json.tg_reply_markup = rows.length
  ? JSON.stringify({ inline_keyboard: rows })
  : null;

return $json;
