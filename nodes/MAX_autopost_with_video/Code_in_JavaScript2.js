const items = $input.all().map(x => x.json);

// порядок как в исходной строке
items.sort((a, b) => (a.idx ?? 0) - (b.idx ?? 0));

// медиа-вложения
const mediaAttachments = items
  .filter(x => x.token && x.mediaType)
  .map(x => ({
    type: x.mediaType,          // "image" или "video"
    payload: { token: x.token }
  }));

return [{
  json: {
    text: "Отчёт за день 📦",
    format: "markdown",
    notify: true,
    attachments: [
      ...mediaAttachments,

      // кнопки как inline_keyboard (как у тебя раньше)
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
