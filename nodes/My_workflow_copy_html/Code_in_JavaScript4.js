// ответы из C1 (c1[i].json.data = строка)
const c1 = $items('Узел C1');

// строки из Merge7 (idx, mediaType, url, + контекст: chat_id/text/max/_run_key_channel/...)
const m1 = $items('Merge7');

// ответы из A1 (там token для video)
const a1 = $items('Узел A1');

return c1.map((c, i) => {
  const resp = String(c.json?.data ?? '');
  const base = m1[i]?.json ?? {};
  const a1token = a1[i]?.json?.token ?? null;

  // VIDEO: токен берём из A1
  if (base.mediaType === 'video') {
    return {
      json: {
        // ВАЖНО: сохраняем контекст
        ...base,

        // и перезаписываем token корректным
        token: a1token,
      }
    };
  }

  // IMAGE: токен вытаскиваем из строки ответа C1
  let token = null;
  const m = resp.match(/"token"\s*:\s*"([^"]+)"/);
  if (m) token = m[1];

  return {
    json: {
      // ВАЖНО: сохраняем контекст
      ...base,

      // и перезаписываем token
      token,
    }
  };
});
