const items = $input.all().map(x => x.json);

// порядок как в исходной строке
items.sort((a, b) => (a.idx ?? 0) - (b.idx ?? 0));

// "шапка" — ВАЖНО: здесь лежит контекст (post_id/row_number/_run_key/send_max/...)
const first = items[0] || {};

// куда отправлять
const chatId = first.chat_id ?? first.max?.channel_id ?? first.max_channel_id ?? null;

// текст поста
const text = (first.max?.text ?? first.text ?? '').toString();

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
const orderLinks = Array.isArray(first.order_links) ? first.order_links : null;

let keyboardAttachment = null;

if (orderLinks && orderLinks.length) {
  // очищаем мусор + минимальная валидация
  const clean = orderLinks
    .map(b => ({
      text: (b?.text ?? '').toString().trim(),
      url: (b?.url ?? '').toString().trim(),
    }))
    .filter(b => b.text && b.url && /^https?:\/\//i.test(b.url));

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
if (keyboardAttachment) attachments.push(keyboardAttachment);

// ВАЖНО: возвращаем ВЕСЬ контекст из first, чтобы после Send Message1 можно было merge'ить и собирать результаты
return [{
  json: {
    // ✅ сохраняем контекст (post_id/row_number/_run_key/send_max/order_links/и т.д.)
    ...first,

    // ✅ перезаписываем/добавляем поля отправки
    chat_id: chatId,
    text,
    format: "markdown",
    notify: true,
    attachments,
  }
}];
