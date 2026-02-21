// ❗ Кнопки только для post_auth_type = 1
if (Number($json.post_auth_type) !== 1) {
  $json.tg_reply_markup = "";
  return $json;
}

// --- дальше строим кнопки ---
let links = $json.order_links;

// если пришла строка — аккуратно парсим
if (typeof links === 'string') {
  try {
    links = JSON.parse(links);
  } catch (e) {
    links = [];
  }
}

// страховка
if (!Array.isArray(links)) {
  links = [];
}

// строим inline_keyboard
const rows = links
  .filter(b => b && b.text && b.url)
  .map(b => ([{ text: String(b.text), url: String(b.url) }]));

// если кнопок нет — не отправляем клавиатуру
$json.tg_reply_markup = rows.length
  ? JSON.stringify({ inline_keyboard: rows })
  : "";

return $json;
