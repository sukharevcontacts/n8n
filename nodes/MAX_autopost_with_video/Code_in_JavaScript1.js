// 4 ответа из C1 (c1[i].json.data = строка)
const c1 = $items('Узел C1');

// 4 строки из Merge1 (idx, mediaType, ...)
const m1 = $items('Merge1');

// 4 ответа из A1 (там token для video)
const a1 = $items('Узел A1');

return c1.map((c, i) => {
  const resp = String(c.json?.data ?? '');
  const base = m1[i]?.json ?? {};
  const a1token = a1[i]?.json?.token ?? null;

  // VIDEO: токен берём из A1
  if (base.mediaType === 'video') {
    return {
      json: {
        idx: base.idx,
        mediaType: base.mediaType,
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
      idx: base.idx,
      mediaType: base.mediaType,
      token,
    }
  };
});
