return $input.all().map(item => {
  const json = item.json;

  // Кнопки только для post_auth_type = 1
  if (Number(json.post_auth_type) !== 1) {
    json.tg_reply_markup = "";
    return item;
  }

  // --- парсим order_links ---
  let links = json.order_links;

  if (typeof links === "string") {
    try {
      links = JSON.parse(links);
    } catch (e) {
      links = [];
    }
  }

  if (!Array.isArray(links)) {
    links = [];
  }

  // Оставляем только валидные кнопки заказа
  links = links.filter(b => b && b.text && b.url);

  // Если order_links пустой — вообще не добавляем никаких кнопок
  if (links.length === 0) {
    json.tg_reply_markup = "";
    return item;
  }

  // --- верхний фиксированный ряд ---
  const topRow = [
    {
      text: "🔥 Регистрация",
      url: "https://t.me/assist_koop_bot?start=blog_channelbutton_chbuttcatalog",
    },
    {
      text: "💬 Задать вопрос",
      url: "https://t.me/assist_koop_bot?start=post/",
    },
  ];

  // --- нижние кнопки из order_links ---
  const orderRows = links.map(b => ([
    {
      text: String(b.text),
      url: String(b.url),
    }
  ]));

  // --- итоговая клавиатура ---
  const rows = [topRow, ...orderRows];

  json.tg_reply_markup = JSON.stringify({
    inline_keyboard: rows,
  });

  return item;
});
