const items = $input.all().map(x => x.json);

// порядок как в исходной строке
items.sort((a, b) => (a.idx ?? 0) - (b.idx ?? 0));

// "шапка"
const first = items[0] || {};
const chatId = first.chat_id ?? first.max?.channel_id ?? first.max_channel_id ?? null;

// текст поста
const text =
  (first.max?.text ?? first.text ?? '').toString();

// медиа-вложения
const mediaAttachments = items
  .filter(x => x.token && x.mediaType)
  .map(x => ({
    type: x.mediaType,          // "image" или "video"
    payload: { token: x.token }
  }));

// ===============================
// 🔹 ДИНАМИЧЕСКИЕ КНОПКИ ИЗ order_links
// ===============================

const orderLinks = Array.isArray(first.order_links)
  ? first.order_links
  : null;

let keyboardAttachment = null;

if (orderLinks && orderLinks.length) {

  // очищаем мусор
  const clean = orderLinks
    .map(b => ({
      text: (b?.text ?? '').toString().trim(),
      url: (b?.url ?? '').toString().trim(),
    }))
    .filter(b => b.text && b.url);

  if (clean.length) {

    // В MAX максимум 3 кнопки в ряд.
    // Самый безопасный вариант — по 1 кнопке в ряд.
    const buttons = clean.map(b => ([
      { type: "link", text: b.text, url: b.url }
    ]));

    keyboardAttachment = {
      type: "inline_keyboard",
      payload: { buttons }
    };
  }
}

// собираем итоговые attachments
const attachments = [...mediaAttachments];

if (keyboardAttachment) {
  attachments.push(keyboardAttachment);
}

return [{
  json: {
    chat_id: chatId,
    text,
    format: "markdown",
    notify: true,
    attachments
  }
}];
