/**
 * Collect MAX results per post_id (Function node version) — FIXED
 *
 * Fixes:
 *  1) reason no longer shows "[object Object]" (safeJson)
 *  2) success detector recognizes MAX success by presence of message.body.mid (or body.mid)
 */

const inItems = items;

function safeStr(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

function safeJson(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  try {
    const s = JSON.stringify(v);
    return s.length > 500 ? s.slice(0, 500) + '…' : s;
  } catch {
    return String(v);
  }
}

function toNumOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toBoolOrNull(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  const s = String(v).trim().toLowerCase();
  if (s === '') return null;
  if (s === '1' || s === 'true' || s === 'yes' || s === 'y') return true;
  if (s === '0' || s === 'false' || s === 'no' || s === 'n') return false;
  return null;
}

function appendLog(existing, line) {
  const base = (existing ?? '').toString().trim();
  if (!base) return line;
  return base + '\n' + line;
}

function pickFirstNonEmpty(...vals) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    return v;
  }
  return null;
}

function nowIso() {
  return new Date().toISOString();
}

// Heuristic success detector (MAX-aware)
function isOk(p) {
  // MAX success usually includes message.body.mid (or body.mid)
  const mid = p?.message?.body?.mid ?? p?.body?.mid ?? null;
  if (mid) return true;

  const sc =
    p.statusCode ??
    p.status_code ??
    p.httpStatus ??
    p.http_status ??
    null;

  if (typeof sc === 'number') return sc >= 200 && sc < 300;

  if (p.ok === true || p.success === true) return true;

  if (p.error || p.err) return false;

  const data = p.data ?? p.body ?? p.response ?? null;
  if (data && typeof data === 'object') {
    if (data.error || data.errors) return false;
    if (data.ok === true || data.success === true) return true;
  }

  return false;
}

function extractErr(p) {
  const candidates = [
    p.error?.message,
    p.error?.description,
    p.err?.message,
    p.message,
    p.data?.error?.message,
    p.data?.error_description,
    p.body?.error?.message,
    p.statusMessage,
  ].filter(Boolean);

  if (candidates.length) return candidates[0]; // may be string/object

  // If MAX returned error-ish structure in message/body, keep it
  if (p?.message) return p.message;
  if (p?.body) return p.body;

  return p; // last-resort, will be stringified by safeJson
}

// Group per post_id
const byPost = new Map();

for (const item of inItems) {
  const p = item.json || {};
  const postId = p.post_id ?? p.id ?? null;
  if (!postId) continue;

  if (!byPost.has(postId)) {
    byPost.set(postId, {
      post_id: postId,

      row_number: toNumOrNull(p.row_number),
      now_utc: p.update_last_run_at_utc ?? p._now_utc ?? null,
      now_local: p.update_last_run_at ?? p._now ?? null,
      last_run_key: p.update_last_run_key ?? p._run_key ?? null,
      plan_run_at: p.update_plan_run_at ?? p._plan_run_at ?? null,

      send_max: toBoolOrNull(p.send_max),

      prev_error: p.error_prev ?? p.update_error ?? null,

      total: 0,
      ok: 0,
      fail: 0,
      first_fail_reason: null,
    });
  }

  const agg = byPost.get(postId);

  if (agg.row_number === null || agg.row_number === undefined) {
    agg.row_number = toNumOrNull(p.row_number);
  }

  agg.now_utc = pickFirstNonEmpty(agg.now_utc, p.update_last_run_at_utc, p._now_utc);
  agg.now_local = pickFirstNonEmpty(agg.now_local, p.update_last_run_at, p._now);
  agg.last_run_key = pickFirstNonEmpty(agg.last_run_key, p.update_last_run_key, p._run_key);
  agg.plan_run_at = pickFirstNonEmpty(agg.plan_run_at, p.update_plan_run_at, p._plan_run_at);

  const sm = toBoolOrNull(p.send_max);
  if (sm !== null) agg.send_max = sm;

  agg.total += 1;

  const ok = isOk(p);
  if (ok) agg.ok += 1;
  else {
    agg.fail += 1;
    if (!agg.first_fail_reason) agg.first_fail_reason = extractErr(p);
  }
}

const out = [];

for (const agg of byPost.values()) {
  const reqMax = (agg.send_max === null || agg.send_max === undefined) ? true : agg.send_max;
  const allOk = reqMax ? (agg.fail === 0) : true;

  const ts = safeStr(agg.now_utc || nowIso());
  const line = allOk
    ? `[MAX] ${ts} ok ${agg.ok}/${agg.total}`
    : `[MAX] ${ts} FAIL ok ${agg.ok}/${agg.total} reason: ${safeJson(agg.first_fail_reason || 'unknown')}`;

  const newError = appendLog(agg.prev_error, line);

  out.push({
    json: {
      post_id: agg.post_id,
      row_number: agg.row_number,

      send_max: reqMax,

      _max_sent_total: agg.total,
      _max_sent_ok: agg.ok,
      _max_sent_fail: agg.fail,
      _max_all_ok: allOk,

      update_last_run_at_utc: agg.now_utc ?? null,
      update_last_run_at: agg.now_local ?? null,
      update_last_run_key: agg.last_run_key ?? null,
      update_plan_run_at: agg.plan_run_at ?? null,

      update_error: newError,
    }
  });
}

return out;
