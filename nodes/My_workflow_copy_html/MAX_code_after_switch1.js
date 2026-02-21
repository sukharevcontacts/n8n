// MAX code after switch (UPDATED)
// Вход: items из ветки channel=max после Expand per store (т.е. по одному item на магазин)
// Приоритет источников медиа:
// 1) max_media_group / max_media + max_op (из Expand per store) ✅
// 2) fallback: media_raw строка "ф|url ... в|url ..."          (если вдруг прилетает)
//
// Выход: items для A1/B1/C1 (idx, mediaType, url) + проброс chat_id/text
//
// FIX: раньше было $input.first() → терялись остальные магазины.
// Теперь обрабатываем ВСЕ входные items.

const inputs = $input.all().map(i => i.json ?? {});

// Нормализуем медиа из “нового” формата
const normMediaObj = (m) => {
  if (!m) return null;

  // допускаем форматы:
  // { type:'image'|'video', media:'url' }
  // { type:'image'|'video', url:'url' }
  // { mediaType:'image'|'video', url:'url' }
  const type = (m.type ?? m.mediaType ?? '').toString().trim().toLowerCase();
  const url  = (m.media ?? m.url ?? '').toString().trim();

  if (!url) return null;

  const mediaType = (type === 'video') ? 'video' : 'image'; // default to image
  return { mediaType, url };
};

function buildForOne(src) {
  const chatId =
    src.chat_id ??
    src.max?.channel_id ??
    src.max_channel_id ??
    null;

  const text = (src.max?.text ?? src.text ?? '').toString();

  // max_op: message | image | video | media_group
  const maxOp = (src.max_op ?? '').toString().trim().toLowerCase();

  // 1) Новый путь: max_media_group
  let mediaList = [];
  if (Array.isArray(src.max_media_group) && src.max_media_group.length > 0) {
    for (const m of src.max_media_group) {
      const nm = normMediaObj(m);
      if (nm) mediaList.push(nm);
    }
  }

  // 2) Новый путь: одиночное медиа
  if (mediaList.length === 0 && src.max_media) {
    const singleType = (maxOp === 'video') ? 'video' : 'image';
    const url = (src.max_media ?? '').toString().trim();
    if (url) mediaList.push({ mediaType: singleType, url });
  }

  // 3) Fallback: парсинг media_raw "в|url / ф|url"
  if (mediaList.length === 0) {
    const mediaRaw =
      (src.media_raw ?? src.max_media_raw ?? src._raw?.media_url ?? src._raw?.media_raw ?? '').toString();

    const re = /(^|[\s\r\n]+)\+?\s*([вфvf])\|(\S+)/gi;
    let m;
    while ((m = re.exec(mediaRaw)) !== null) {
      const prefix = (m[2] || '').toLowerCase();
      const url = (m[3] || '').toString().trim();
      if (!url) continue;

      const mediaType = (prefix === 'в' || prefix === 'v') ? 'video' : 'image';
      mediaList.push({ mediaType, url });
    }
  }

  // Если медиа по смыслу не нужно (message) или реально отсутствует — отдаём 1 item
  if (maxOp === 'message' || mediaList.length === 0) {
    return [{
      json: {
        ...src,
        chat_id: chatId,
        text,
        idx: 0,
        mediaType: null,
        url: null,
        _max_no_media: true,
        _max_media_count: 0,
        _max_media_source:
          (Array.isArray(src.max_media_group) && src.max_media_group.length > 0) ? 'max_media_group' :
          (src.max_media ? 'max_media' :
          ((src.media_raw || src._raw?.media_url || src._raw?.media_raw) ? 'media_raw_fallback' : 'none')),
      },
    }];
  }

  // Дедуп URL + сборка items
  const seen = new Set();
  const out = [];
  let idx = 0;

  for (const it of mediaList) {
    const key = `${it.mediaType}|${it.url}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      json: {
        ...src,

        // пробрасываем нужное для Send Message
        chat_id: chatId,
        text,

        // то, что нужно твоим Узлам A1/B1/C1
        idx,
        mediaType: it.mediaType,
        url: it.url,

        _max_no_media: false,
      },
    });

    idx++;
  }

  if (out.length === 0) {
    return [{
      json: {
        ...src,
        chat_id: chatId,
        text,
        idx: 0,
        mediaType: null,
        url: null,
        _max_no_media: true,
        _max_media_count: 0,
        _max_media_source:
          (Array.isArray(src.max_media_group) && src.max_media_group.length > 0) ? 'max_media_group' :
          (src.max_media ? 'max_media' :
          ((src.media_raw || src._raw?.media_url || src._raw?.media_raw) ? 'media_raw_fallback' : 'none')),
      },
    }];
  }

  // Полезный дебаг
  const source =
    (Array.isArray(src.max_media_group) && src.max_media_group.length > 0) ? 'max_media_group' :
    (src.max_media ? 'max_media' :
    ((src.media_raw || src._raw?.media_url || src._raw?.media_raw) ? 'media_raw_fallback' : 'none'));

  for (const o of out) {
    o.json._max_media_count = out.length;
    o.json._max_media_source = source;
  }

  return out;
}

// flatten results for all stores
return inputs.flatMap(buildForOne);
