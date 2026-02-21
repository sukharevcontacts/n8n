// ❗ Кнопки только для post_auth_type = 1
if (Number($json.post_auth_type) !== 1) {
  $json.tg_reply_markup = null;
  return $json;
}

// --- дальше строим кнопки ---
let links = $json.order_links;

// если пришла строка — парсим
if (typeof links === 'string') {
  try {
    links = JSON.parse(links);
  } catch (e) {
    links = [];
  }
}

if (!Array.isArray(links)) {
  links = [];
}

// строим inline_keyboard
const rows = links
  .filter(b => b && b.text && b.url)
  .map(b => ([{ text: String(b.text), url: String(b.url) }]));

$json.tg_reply_markup = rows.length
  ? JSON.stringify({ inline_keyboard: rows })
  : null;

return $json;
