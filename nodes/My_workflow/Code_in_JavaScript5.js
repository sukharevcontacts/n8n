const items = $input.all().map(x => x.json);

// порядок как в исходной строке
items.sort((a, b) => (a.idx ?? 0) - (b.idx ?? 0));

// возьмём "шапку" (chat_id/text) из первого item
const first = items[0] || {};
const chatId = first.chat_id ?? first.max?.channel_id ?? first.max_channel_id ?? null;

// твой текст поста
const text =
  (first.max?.text ?? first.text ?? '').toString();

// медиа-вложения
const mediaAttachments = items
  .filter(x => x.token && x.mediaType)
  .map(x => ({
    type: x.mediaType,          // "image" или "video"
    payload: { token: x.token }
  }));

return [{
  json: {
    // КУДА отправлять (если твоя Send Message нода берёт chat_id из item)
    chat_id: chatId,

    // ЧТО отправлять
    text,
    format: "markdown",
    notify: true,
    attachments: [
      ...mediaAttachments,

      // кнопки как inline_keyboard
      {
        type: "inline_keyboard",
        payload: {
          buttons: [
            [{ type: "link", text: "Открыть каталог", url: "https://koptorg.ru:7026" }],
            [{ type: "link", text: "Сделать заказ", url: "https://koptorg.ru:7026" }],
          ]
        }
      }
    ]
  }
}];
