/**
 * Collect TG results per post_id (after Merge Combine/Position)
 * Supports:
 *  - Telegram nodes (they often return { ok:true, result:... } or set p.error on continueRegularOutput)
 *  - HTTP Request node (sendMediaGroup) which may return:
 *      - { statusCode: 200, body: { ok:true, result:[...] } }  (when JSON)
 *      - { statusCode: 200, body: "..." }                      (when string)
 *      - errors in p.error / p.message / p.response / p.body
 *
 * Output: one item per post_id with aggregation + Sheets update fields
 */

const items = $input.all();

function safeStr(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

function toNumOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function appendLog(existing, line) {
  const base = (existing ?? '').toString().trim();
  if (!base) return line;
  return base + '\n' + line;
}

function tryJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
}

// --- Detect ok for both Telegram node and HTTP Request node ---
function detectOk(p) {
  if (!p) return false;

  // Telegram node common
  if (p.ok === true || p.success === true) return true;

  // HTTP Request node common shapes
  // 1) response object
  if (p.response && (p.response.ok === true || p.response.success === true)) return true;

  // 2) body may be object or stringified json
  const body = p.body ?? p.response?.body ?? null;
  if (body && typeof body === 'object') {
    if (body.ok === true) return true;
    // sometimes nested
    if (body.data?.ok === true) return true;
  }
  if (typeof body === 'string') {
    const j = tryJsonParse(body);
    if (j && j.ok === true) return true;
  }

  // 3) n8n httpRequest often exposes statusCode
  const sc = p.statusCode ?? p.status ?? p.response?.statusCode ?? null;
  if (typeof sc === 'number' && sc >= 200 && sc < 300) {
    // If Telegram returns non-ok with 200, we'd have body.ok=false.
    // But if we can't see body, treat 2xx as ok to avoid false FAIL logs.
    return true;
  }

  return false;
}

function extractErrorText(p) {
  if (!p) return 'unknown error';

  // Telegram node error object
  if (typeof p.error === 'string') return p.error;
  if (p.error?.message) return safeStr(p.error.message);

  // httpRequest node sometimes exposes errorMessage / message
  if (p.errorMessage) return safeStr(p.errorMessage);
  if (p.message) return safeStr(p.message);
  if (p.description) return safeStr(p.description);
  if (p.cause) return safeStr(p.cause);

  // response/body shapes
  const body = p.body ?? p.response?.body ?? p.responseBody ?? null;

  if (body && typeof body === 'object') {
    if (body.description) return safeStr(body.description);
    if (body.error) return safeStr(body.error);
    if (body.message) return safeStr(body.message);
    if (body.ok === false && body.description) return safeStr(body.description);
    try {
      return JSON.stringify(body);
    } catch (e) {
      return 'unstringifiable body';
    }
  }

  if (typeof body === 'string') {
    const j = tryJsonParse(body);
    if (j) {
      if (j.description) return safeStr(j.description);
      if (j.error) return safeStr(j.error);
      if (j.message) return safeStr(j.message);
      if (j.ok === false && j.description) return safeStr(j.description);
      try {
        return JSON.stringify(j);
      } catch (e) {}
    }
    // raw string body
    const s = body.trim();
    if (s) return s.slice(0, 500);
  }

  // fallback stringify whole p.error if exists
  if (p.error) {
    try {
      return JSON.stringify(p.error);
    } catch (e) {
      return 'unstringifiable error';
    }
  }

  return 'unknown error';
}

// group per post_id
const byPost = new Map();

for (const item of items) {
  const p = item.json || {};

  const postId = p.post_id ?? p.id ?? null;
  if (!postId) continue;

  if (!byPost.has(postId)) {
    byPost.set(postId, {
      post_id: postId,
      row_number: toNumOrNull(p.row_number),

      last_run_key: p._run_key ?? null,
      now_utc: p._now_utc ?? new Date().toISOString(),
      now_local: p._now ?? null,

      plan_run_at: p._plan_run_at ?? null,
      prev_error: p.error_prev ?? null,

      total: 0,
      ok: 0,
      fail: 0,
      fails: [],
    });
  }

  const agg = byPost.get(postId);

  if (!agg.plan_run_at && p._plan_run_at) agg.plan_run_at = p._plan_run_at;

  agg.total += 1;

  const ok = detectOk(p);

  const storeId = p.store_id ?? null;
  const chatId = p.tg_chat_id ?? p.chat_id ?? null;

  if (ok) {
    agg.ok += 1;
  } else {
    agg.fail += 1;
    const desc = extractErrorText(p);
    agg.fails.push({
      store_id: storeId,
      chat_id: chatId,
      desc: safeStr(desc),
    });
  }
}

const out = [];

for (const agg of byPost.values()) {
  // success only if at least one ok and no fails
  const allOk = agg.fail === 0 && agg.ok > 0;

  let newError = agg.prev_error;

  if (allOk) {
    newError = appendLog(
      newError,
      `[OK TG] ${agg.now_utc} key=${safeStr(agg.last_run_key)} sent=${agg.ok}/${agg.total}`
    );
  } else {
    const failLines = agg.fails
      .slice(0, 20)
      .map(f => `store=${safeStr(f.store_id)} chat=${safeStr(f.chat_id)} err=${safeStr(f.desc)}`)
      .join(' | ');

    newError = appendLog(
      newError,
      `[FAIL TG] ${agg.now_utc} key=${safeStr(agg.last_run_key)} ok=${agg.ok}/${agg.total} fails=${agg.fail}` +
        (failLines ? ` :: ${failLines}` : '')
    );
  }

  out.push({
    json: {
      post_id: agg.post_id,
      row_number: agg.row_number,

      _all_ok: allOk,
      _sent_ok: agg.ok,
      _sent_fail: agg.fail,
      _sent_total: agg.total,

      update_last_run_at_utc: allOk ? agg.now_utc : null,
      update_last_run_at: allOk ? agg.now_local : null,
      update_last_run_key: allOk ? agg.last_run_key : null,

      // write plan_run_at only on success
      update_plan_run_at: allOk ? (agg.plan_run_at ?? null) : null,

      update_error: newError,
    },
  });
}

return out;
