/**
 * Build MAX /messages payload PER STORE (PER chat_id)
 *
 * Input: items after Code in JavaScript4
 *   (там уже есть token для каждого media, и проброшен контекст store_id/chat_id/text/order_links/...)
 *
 * Output: MANY items — по одному на точку/чат.
 */

const rows = $input.all().map(x => x.json ?? {});

// --- helpers ---
function cleanLine(s) {
  return String(s ?? '').replace(/[\uFEFF\u200B\u200C\u200D\u2060\u00AD]/g, '').trim();
}

function stripGoodMorningNavigationMax(text) {
  // Убираем ТОЛЬКО конечную строку "!!Навигация" (с возможными пробелами)
  // и не трогаем текст, если "!!Навигация" где-то внутри.
  let t = String(text ?? '').replace(/\r\n/g, '\n');
  t = t.replace(/\n\s*!!Навигация\s*$/u, '');
  return t.trim();
}

function ensureGoodMorningOrderButton(orderLinks) {
  // Возвращаем новый массив order_links, где есть кнопка "ЗАКАЗАТЬ В КООПТОРГЕ" -> https://koptorg.ru
  const base = Array.isArray(orderLinks) ? orderLinks : [];
  const btnText = 'ЗАКАЗАТЬ В КООПТОРГЕ';
  const btnUrl = 'https://koptorg.ru';

  const exists = base.some(b => {
    const t = cleanLine(b?.text);
    const u = cleanLine(b?.url);
    return t.toLowerCase() === btnText.toLowerCase() && u === btnUrl;
  });

  if (exists) return base;

  return [...base, { text: btnText, url: btnUrl }];
}

function normButtons(orderLinks) {
  const arr = Array.isArray(orderLinks) ? orderLinks : [];
  const clean = arr
    .map(b => ({
      text: cleanLine(b?.text),
      url: cleanLine(b?.url),
    }))
    .filter(b => b.text && b.url && /^https?:\/\//i.test(b.url));

  if (!clean.length) return null;

  // MAX: безопасно по 1 кнопке в ряд
  return {
    type: "inline_keyboard",
    payload: {
      buttons: clean.map(b => ([{ type: "link", text: b.text, url: b.url }]))
    }
  };
}

function groupKey(p) {
  const postId = p.post_id ?? p.id ?? '';
  const storeId = p.store_id ?? '';
  const chatId = p.chat_id ?? p.max?.channel_id ?? p.max_channel_id ?? '';
  return `${postId}::${storeId}::${chatId}`;
}

// --- group by store/chat ---
const groups = new Map();
for (const p of rows) {
  const k = groupKey(p);
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(p);
}

// --- build one message per group ---
const out = [];

for (const [k, items] of groups.entries()) {
  // сортировка по idx чтобы медиа были в правильном порядке
  items.sort((a, b) => (a.idx ?? 0) - (b.idx ?? 0));

  const first = items[0] || {};
  const chatId =
    first.chat_id ??
    first.max?.channel_id ??
    first.max_channel_id ??
    null;

  if (!chatId) {
    // если вдруг нет chat_id — просто пропускаем, чтобы не падать
    continue;
  }

  // --- TEXT (MAX) ---
  let text = (first.max?.text ?? first.text ?? '').toString();

  // FIX #1: убрать "!!Навигация" ТОЛЬКО для GOODMORNING в ветке MAX
  if (first._goodmorning === true) {
    text = stripGoodMorningNavigationMax(text);
  }

  // --- media attachments (tokenized) ---
  const mediaAttachments = items
    .filter(x => x.token && x.mediaType)
    .map(x => ({
      type: x.mediaType, // "image" | "video"
      payload: { token: x.token }
    }));

  // --- buttons / inline keyboard ---
  // FIX #2: для GOODMORNING добавляем кнопку "ЗАКАЗАТЬ В КООПТОРГЕ" -> https://koptorg.ru
  const effectiveOrderLinks =
    (first._goodmorning === true)
      ? ensureGoodMorningOrderButton(first.order_links)
      : first.order_links;

  const keyboardAttachment = normButtons(effectiveOrderLinks);

  const attachments = [...mediaAttachments];
  if (keyboardAttachment) attachments.push(keyboardAttachment);

  out.push({
    json: {
      // ✅ сохраняем ВЕСЬ контекст (важно для Collect MAX results / финального мерджа)
      ...first,

      // ✅ поля отправки
      chat_id: chatId,
      text,
      format: "markdown",
      notify: true,
      attachments,

      // (опционально, но полезно для дебага) — что реально пошло в кнопки
      // _max_effective_order_links: effectiveOrderLinks,
    }
  });
}

return out;
