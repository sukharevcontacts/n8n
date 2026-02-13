const items = $input.all();

// собрали токены картинок из it.json.photos
const tokens = [];

for (const it of items) {
  const photos = it.json.photos;
  if (!photos) continue;

  for (const v of Object.values(photos)) {
    if (v?.token) tokens.push(v.token);
  }
}

return [{
  json: {
    text: "Отчёт за день 📦",
    format: "markdown",
    notify: true,
    attachments: [
      ...tokens.map(t => ({
        type: "image",
        payload: { token: t }
      })),

      // ✅ кнопки как inline_keyboard
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
