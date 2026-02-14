// === НАСТРОЙКИ ===
const TG_TEST_CHAT_ID = '-1003640743827';

// !!! Поставьте реальные имена узлов:
const FILTER_NODE_NAME = 'Filter1';
const POSTGRES_NODE_NAME = 'Postgre_store_extract';
const COOP_FACT_NODE_NAME = 'GS_CoopFact_GetRows'; // NEW

// Telegram deep-link base
const TG_OLD_BOT_BASE = 'https://t.me/kooptorg3_start_bot?start=';

function regionToStoreTz(region) {
  if (Number(region) === 54) return 7;
  if (Number(region) === 82) return 3;
  return null;
}

function regionToTzName(region) {
  if (Number(region) === 54) return 'Asia/Novosibirsk';
  if (Number(region) === 82) return 'Europe/Simferopol';
  return 'Europe/Moscow';
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// минимально достаточное экранирование MarkdownV2
function escapeMarkdownV2(s) {
  // Telegram MarkdownV2 special chars: _ * [ ] ( ) ~ ` > # + - = | { } . !
  return String(s ?? '').replace(/[_*\[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

function buildTgTextAndMode(post) {
  let text = (post.text ?? '').toString();
  let parseMode = 'HTML';

  if (Number(post.parse_mode) === 1) {
    parseMode = 'HTML';
  } else if (Number(post.parse_mode) === 2) {
    parseMode = 'MarkdownV2';
  } else {
    text = escapeHtml(text);
    parseMode = 'HTML';
  }

  return { text, parse_mode: parseMode };
}

// old_post format: "197_КУПИТЬ"
function parseOldPost(oldPostValue) {
  const raw = (oldPostValue ?? '').toString().trim();
  if (!raw) return null;

  const m = raw.match(/^(\d{3})_(.+)$/);
  if (!m) return null;

  const oldId = m[1];
  const label = (m[2] ?? '').toString().trim();
  if (!label) return null;

  return { old_id: oldId, label: label.toUpperCase() };
}

function formatDDMMYYYYInTz(dateUtc, tzName) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tzName,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(dateUtc);

  const map = {};
  for (const p of parts) if (p.type !== 'literal') map[p.type] = p.value;

  return `${map.day}${map.month}${map.year}`;
}

// YYYY-MM-DD in TZ from UTC date
function formatYYYYMMDDInTz(dateUtc, tzName) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tzName,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(dateUtc);

  const map = {};
  for (const p of parts) if (p.type !== 'literal') map[p.type] = p.value;

  return `${map.year}-${map.month}-${map.day}`;
}

function buildOldLink({ old_id, label }, storeId, datePart, parseMode) {
  const sid = String(storeId ?? '').trim();
  if (!sid) return null;

  // шаблон как в твоём примере: webapp_<oldId><DDMMYYYY><storeId>_<storeId>
  const startParam = `webapp_${old_id}${datePart}${sid}_${sid}`;
  const url = `${TG_OLD_BOT_BASE}${startParam}`;

  if (parseMode === 'MarkdownV2') {
    const textMd = escapeMarkdownV2(label);
    // URL в MarkdownV2 лучше тоже экранировать минимум (скобки и т.п.)
    const urlMd = url.replace(/\)/g, '\\)').replace(/\(/g, '\\(');
    return `[${textMd}](${urlMd})`;
  }

  // HTML
  const textHtml = escapeHtml(label);
  const urlHtml = escapeHtml(url);
  return `<a href="${urlHtml}">${textHtml}</a>`;
}

function appendOldLinkToText(text, oldLink) {
  const base = (text ?? '').toString();
  if (!oldLink) return base;
  if (!base.trim()) return oldLink;
  return `${base}\n\n${oldLink}`;
}

// Ваш формат: store_195_Большевистская
function pickStoreIdsFromRaw(raw) {
  const ids = [];
  for (const [k, v] of Object.entries(raw || {})) {
    const key = String(k ?? '').trim();
    const m = key.match(/^store_(\d+)_/); // строго ваш формат
    if (!m) continue;

    const storeId = Number(m[1]);
    if (!Number.isFinite(storeId)) continue;

    const vv = (v ?? '').toString().trim();
    if (vv === '1') ids.push(storeId);
  }
  return ids;
}

function cleanLine(s) {
  return String(s ?? '')
    .replace(/[\uFEFF\u200B\u200C\u200D\u2060\u00AD]/g, '')
    .trim();
}

/**
 * media_raw format (each line):
 *   ф|https://...
 *   в|https://...
 * returns [{type:'photo'|'video', media:'url'}]
 */
function parseMediaLines(mediaRaw) {
  const raw = (mediaRaw ?? '').toString();
  const lines = raw.split(/\r\n|\n|\r/g).map(cleanLine).filter(Boolean);

  const out = [];
  for (const line of lines) {
    const m = line.match(/^([фв])\|(.*)$/i);
    if (!m) continue;

    const kind = m[1].toLowerCase();
    const url = cleanLine(m[2] || '');
    if (!url) continue;

    out.push({
      type: kind === 'ф' ? 'photo' : 'video',
      media: url,
    });
  }
  return out;
}

function isCaptionOk(text) {
  const t = (text ?? '').toString();
  // caption limit ~1024; keep margin
  return t.length > 0 && t.length <= 950;
}

// NEW: normalize COOP_FACT date to YYYY-MM-DD (supports 04/01/2026)
function normalizeFactDate(v) {
  const s = cleanLine(v);
  if (!s) return null;

  // YYYY-MM-DD
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  // DD.MM.YYYY
  m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  // DD/MM/YYYY  (your format: 04/01/2026)
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
      const dds = String(dd).padStart(2, '0');
      const mms = String(mm).padStart(2, '0');
      return `${yyyy}-${mms}-${dds}`;
    }
  }

  // Try Date.parse for ISO-ish values (not reliable for 04/01/2026, but ok for other strings)
  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
    const da = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${mo}-${da}`;
  }

  return null;
}

// get publish date (YYYY-MM-DD) in region TZ for GOODMORNING
function getGoodMorningDateKey(post, tzName) {
  // Prefer _occurrence_utc (for recurring). For one-time it will also be present in your Determine due.
  const occIso = cleanLine(post._occurrence_utc);
  if (occIso) {
    const d = new Date(occIso);
    if (!Number.isNaN(d.getTime())) return formatYYYYMMDDInTz(d, tzName);
  }

  // Fallback: parse from _occurrence_local / _publish_at_parsed (strings like "YYYY-MM-DD ... (TZ)")
  const s1 = cleanLine(post._occurrence_local);
  if (s1) {
    const m = s1.match(/^(\d{4}-\d{2}-\d{2})\b/);
    if (m) return m[1];
  }

  const s2 = cleanLine(post._publish_at_parsed);
  if (s2) {
    const m = s2.match(/^(\d{4}-\d{2}-\d{2})\b/);
    if (m) return m[1];
  }

  // Last resort: if publish_at exists as "YYYY-MM-DD ..." without TZ
  const s3 = cleanLine(post.publish_at);
  if (s3) {
    const m = s3.match(/^(\d{4}-\d{2}-\d{2})\b/);
    if (m) return m[1];
  }

  return null;
}

// --- Забираем данные по имени узлов ---
const postsInput = $items(FILTER_NODE_NAME).map(x => x.json);
const storesInput = $items(POSTGRES_NODE_NAME).map(x => x.json);
const factsInput = $items(COOP_FACT_NODE_NAME).map(x => x.json);

// Build facts map: YYYY-MM-DD -> fact
const factMap = new Map();
for (const row of factsInput) {
  const dk = normalizeFactDate(row?.date);
  const fact = cleanLine(row?.fact);
  if (!dk || !fact) continue;
  factMap.set(dk, row.fact); // keep last
}

// Диагностика stores
const tzSet = new Set();
for (const s of storesInput) {
  if (s && s.time_zone !== undefined && s.time_zone !== null && s.time_zone !== '') {
    tzSet.add(String(s.time_zone));
  }
}
const storesDebug = {
  stores_count: storesInput.length,
  stores_time_zones: Array.from(tzSet).sort(),
  stores_first_keys: storesInput[0] ? Object.keys(storesInput[0]) : [],
  facts_count: factsInput.length,
  facts_keys_sample: Array.from(factMap.keys()).slice(0, 10),
};

// Если stores не пришли — вернём ошибку на каждый пост
if (storesInput.length === 0) {
  return postsInput.map(post => ({
    json: {
      ...post,
      _tg_targets_empty: true,
      _tg_targets_reason: `stores input is empty: $items("${POSTGRES_NODE_NAME}") returned 0 rows`,
      _stores_debug: storesDebug,

      // важные служебные поля для дальнейшего апдейта Sheets
      row_number: post?._raw?.row_number ?? null,
      _now: post._now ?? null,
      _now_utc: post._now_utc ?? null,
      _run_key: post._run_key ?? null,
    },
  }));
}

// Map store_id -> storeRow
const storeMap = new Map();
for (const s of storesInput) {
  const storeId = Number(s.store_id);
  if (!Number.isFinite(storeId)) continue;
  if (!storeMap.has(storeId)) storeMap.set(storeId, s);
}

const out = [];

for (const post of postsInput) {
  // Теперь учитываем MAX тоже
  const hasAnyChannel = Boolean(post.send_tg || post.send_vk || post.send_site || post.send_max);
  if (!hasAnyChannel) continue;

  // --- протаскиваем row_number (для Update в Sheets) ---
  const rowNumber = post?._raw?.row_number ?? null;

  // --- протаскиваем служебные поля запуска (для last_run_*) ---
  const nowLocal = post._now ?? null;      // локальное время региона (строка)
  const nowUtcIso = post._now_utc ?? null; // ISO UTC
  const runKey = post._run_key ?? null;

  // --- GOODMORNING text override from COOP_FACT (общий, меняем post.text) ---
  const tzName = regionToTzName(post.region);
  let postForText = post;

  if (post._goodmorning === true) {
    const dateKey = getGoodMorningDateKey(post, tzName);
    const fact = dateKey ? factMap.get(dateKey) : null;

    if (!dateKey) {
      out.push({
        json: {
          ...post,
          row_number: rowNumber,
          _now: nowLocal,
          _now_utc: nowUtcIso,
          _run_key: runKey,

          _prepare_error: `GOODMORNING: cannot determine date key from occurrence/publish fields`,
          _goodmorning_date_key: null,
          _stores_debug: storesDebug,
        },
      });
      continue;
    }

    if (!fact || !cleanLine(fact)) {
      out.push({
        json: {
          ...post,
          row_number: rowNumber,
          _now: nowLocal,
          _now_utc: nowUtcIso,
          _run_key: runKey,

          _prepare_error: `GOODMORNING: no fact found for date=${dateKey} in COOP_FACT`,
          _goodmorning_date_key: dateKey,
          _stores_debug: storesDebug,
        },
      });
      continue;
    }

    postForText = {
      ...post,
      text: `${fact}\n!!Навигация`,
      _goodmorning_date_key: dateKey,
    };
  }
  // --- /GOODMORNING ---

  // === Если не нужен per-store (TG/MAX), просто пробрасываем item дальше (для VK/SITE) ===
  const needStoreExpansion = Boolean(postForText.send_tg || postForText.send_max);
  if (!needStoreExpansion) {
    out.push({
      json: {
        ...postForText,
        row_number: rowNumber,
        _now: nowLocal,
        _now_utc: nowUtcIso,
        _run_key: runKey,
        _stores_debug: storesDebug,
      },
    });
    continue;
  }

  // === Часть целей по stores (общая для TG и MAX) ===
  const tzNeed = regionToStoreTz(postForText.region);
  if (tzNeed === null) {
    out.push({
      json: {
        ...postForText,
        row_number: rowNumber,
        _now: nowLocal,
        _now_utc: nowUtcIso,
        _run_key: runKey,

        _tg_targets_empty: Boolean(postForText.send_tg),
        _tg_targets_reason: postForText.send_tg ? `unknown region=${postForText.region}` : null,

        _max_targets_empty: Boolean(postForText.send_max),
        _max_targets_reason: postForText.send_max ? `unknown region=${postForText.region}` : null,

        _stores_debug: storesDebug,
      },
    });
    continue;
  }

  // store_id цели
  let targetStoreIds = [];
  if (postForText.all_region) {
    for (const s of storesInput) {
      if (Number(s.time_zone) === tzNeed) {
        const id = Number(s.store_id);
        if (Number.isFinite(id)) targetStoreIds.push(id);
      }
    }
  } else {
    targetStoreIds = pickStoreIdsFromRaw(postForText._raw);
  }

  targetStoreIds = Array.from(new Set(targetStoreIds));

  if (targetStoreIds.length === 0) {
    out.push({
      json: {
        ...postForText,
        row_number: rowNumber,
        _now: nowLocal,
        _now_utc: nowUtcIso,
        _run_key: runKey,

        _tg_targets_empty: Boolean(postForText.send_tg),
        _tg_targets_reason: postForText.send_tg
          ? (postForText.all_region
              ? `no stores found for time_zone=${tzNeed} (stores_count=${storesInput.length}, tzs=${storesDebug.stores_time_zones.join(',')})`
              : 'no store columns selected in sheet row (no store_* = 1)')
          : null,

        _max_targets_empty: Boolean(postForText.send_max),
        _max_targets_reason: postForText.send_max
          ? (postForText.all_region
              ? `no stores found for time_zone=${tzNeed} (stores_count=${storesInput.length}, tzs=${storesDebug.stores_time_zones.join(',')})`
              : 'no store columns selected in sheet row (no store_* = 1)')
          : null,

        _stores_debug: storesDebug,
      },
    });
    continue;
  }

  // ---- общие данные медиа (для TG и MAX) ----
  const mediaRaw = (postForText.media_raw ?? postForText.media_url ?? postForText._raw?.media_raw ?? postForText._raw?.media_url ?? '').toString();
  const mediaArr = parseMediaLines(mediaRaw);

  // === TG часть (как было), но только если send_tg ===
  const tgBase = postForText.send_tg ? buildTgTextAndMode(postForText) : null;
  const debugMode = postForText.send_tg ? (Number(postForText.tg_debug) === 1) : false;

  // old_post parsing (only if present)
  const oldParsed = postForText.send_tg ? parseOldPost(postForText.old_post ?? postForText._raw?.old_post) : null;

  // date part for old_link in region tz
  const nowUtcObj = nowUtcIso ? new Date(nowUtcIso) : new Date();
  const datePart = formatDDMMYYYYInTz(nowUtcObj, tzName);

  // базовое решение по типу отправки (для TG)
  let baseOp = 'message'; // message | photo | video | media_group
  let baseMedia = null;

  if (postForText.send_tg) {
    if (mediaArr.length === 0) {
      baseOp = 'message';
    } else if (mediaArr.length === 1) {
      baseOp = mediaArr[0].type === 'photo' ? 'photo' : 'video';
      baseMedia = mediaArr[0].media;
    } else {
      baseOp = 'media_group';
    }
  }

  const seenTgChat = new Set();
  const seenMaxChat = new Set();
  let producedTg = 0;
  let producedMax = 0;

  for (const storeId of targetStoreIds) {
    const s = storeMap.get(storeId);
    if (!s) continue;
    if (Number(s.time_zone) !== tzNeed) continue;

    // ====== MAX item per store ======
    if (postForText.send_max) {
      const maxChatIdRaw = s.max_channel_id ?? s.max_chat_id ?? null;
      const maxChatId = (maxChatIdRaw ?? '').toString().trim();

      if (!maxChatId) {
        out.push({
          json: {
            ...postForText,
            row_number: rowNumber,
            _now: nowLocal,
            _now_utc: nowUtcIso,
            _run_key: runKey,

            store_id: storeId,
            store_description: s.store_description ?? null,

            max_op: 'skip',
            _max_skip: true,
            _max_skip_reason: 'no max_channel_id for this store',
            max_chat_id: null,

            max: {
              chat_id: null,
              text: (postForText.text ?? '').toString(),
              media_raw: mediaRaw,
            },

            _stores_debug: storesDebug,
          },
        });
      } else {
        const maxKey = String(maxChatId);
        if (!seenMaxChat.has(maxKey)) {
          seenMaxChat.add(maxKey);

          out.push({
            json: {
              ...postForText,
              row_number: rowNumber,
              _now: nowLocal,
              _now_utc: nowUtcIso,
              _run_key: runKey,

              store_id: storeId,
              store_description: s.store_description ?? null,

              // routing for MAX
              max_op: 'send',
              max_chat_id: maxChatId,

              max: {
                chat_id: maxChatId,
                text: (postForText.text ?? '').toString(),
                media_raw: mediaRaw, // ВАЖНО: строка с "ф|" и "в|"
              },

              _run_key_channel: runKey ? `${runKey}|store:${storeId}|max` : null,
              _stores_debug: storesDebug,
            },
          });

          producedMax++;
        }
      }
    }

    // ====== TG items per store (как было) ======
    if (postForText.send_tg) {
      const chatId = debugMode ? TG_TEST_CHAT_ID : s.channel_chat_id;
      const chatKey = String(chatId);
      if (seenTgChat.has(chatKey)) continue;
      seenTgChat.add(chatKey);

      // --- old link for this store (depends on storeId) ---
      const oldLink = oldParsed ? buildOldLink(oldParsed, storeId, datePart, tgBase.parse_mode) : null;
      const tgTextFinal = appendOldLinkToText(tgBase.text, oldLink);

      // --- per-store media decision for albums: caption may be too long ---
      let tgOp = baseOp;
      let tgMedia = baseMedia;
      let tgMediaGroup = null;
      let needExtraTextMessage = false;

      if (baseOp === 'media_group') {
        tgMediaGroup = mediaArr;

        if (isCaptionOk(tgTextFinal)) {
          tgMediaGroup = tgMediaGroup.map((m, idx) => {
            if (idx === 0) {
              return {
                ...m,
                caption: tgTextFinal,
                parse_mode: tgBase.parse_mode,
              };
            }
            return m;
          });
        } else if (tgTextFinal.trim()) {
          // caption слишком длинный — альбом без caption, а текст отдельным сообщением
          needExtraTextMessage = true;
        }
      }

      // 1) основной item
      out.push({
        json: {
          ...postForText,

          // служебные поля для апдейта Sheets
          row_number: rowNumber,
          _now: nowLocal,
          _now_utc: nowUtcIso,
          _run_key: runKey,

          // данные цели
          store_id: storeId,
          store_description: s.store_description ?? null,

          // routing for telegram
          tg_op: tgOp,
          tg_media: tgMedia,
          tg_media_group: tgMediaGroup,

          // old link debug
          _old_post_parsed: oldParsed,
          _old_post_date_ddmmyyyy: datePart,
          _old_post_link: oldLink,

          tg: {
            chat_id: chatId,
            text: tgTextFinal,
            parse_mode: tgBase.parse_mode,
            debug: debugMode,
          },

          _run_key_channel: runKey ? `${runKey}|store:${storeId}` : null,
          _stores_debug: storesDebug,
        },
      });

      producedTg++;

      // 2) если альбом и текст длинный — отдельное сообщение текстом после альбома
      if (tgOp === 'media_group' && needExtraTextMessage) {
        out.push({
          json: {
            ...postForText,

            row_number: rowNumber,
            _now: nowLocal,
            _now_utc: nowUtcIso,
            _run_key: runKey,

            store_id: storeId,
            store_description: s.store_description ?? null,

            tg_op: 'message',
            tg_media: null,
            tg_media_group: null,

            // old link debug
            _old_post_parsed: oldParsed,
            _old_post_date_ddmmyyyy: datePart,
            _old_post_link: oldLink,

            tg: {
              chat_id: chatId,
              text: tgTextFinal,
              parse_mode: tgBase.parse_mode,
              debug: debugMode,
            },

            _run_key_channel: runKey ? `${runKey}|store:${storeId}|text_after_album` : null,
            _stores_debug: storesDebug,
          },
        });
      }
    }
  }

  if (postForText.send_tg && producedTg === 0) {
    out.push({
      json: {
        ...postForText,
        row_number: rowNumber,
        _now: nowLocal,
        _now_utc: nowUtcIso,
        _run_key: runKey,

        _tg_targets_empty: true,
        _tg_targets_reason: `stores selected but none matched mapping for time_zone=${tzNeed} (stores_count=${storesInput.length}, tzs=${storesDebug.stores_time_zones.join(',')})`,
        _stores_debug: storesDebug,
      },
    });
  }

  if (postForText.send_max && producedMax === 0) {
    out.push({
      json: {
        ...postForText,
        row_number: rowNumber,
        _now: nowLocal,
        _now_utc: nowUtcIso,
        _run_key: runKey,

        _max_targets_empty: true,
        _max_targets_reason: `stores selected but no MAX targets produced (check max_channel_id mapping)`,
        _stores_debug: storesDebug,
      },
    });
  }
}

return out;
