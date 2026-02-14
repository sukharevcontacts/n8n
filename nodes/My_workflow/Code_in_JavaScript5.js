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
function normButtons(orderLinks) {
  const arr = Array.isArray(orderLinks) ? orderLinks : [];
  const clean = arr
    .map(b => ({
      text: (b?.text ?? '').toString().trim(),
      url: (b?.url ?? '').toString().trim(),
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

  const text = (first.max?.text ?? first.text ?? '').toString();

  // медиа-вложения (только там где есть token+mediaType)
  const mediaAttachments = items
    .filter(x => x.token && x.mediaType)
    .map(x => ({
      type: x.mediaType, // "image" | "video"
      payload: { token: x.token }
    }));

  // кнопки из order_links
  const keyboardAttachment = normButtons(first.order_links);

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
    }
  });
}

return out;
