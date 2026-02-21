/**
 * Final Collect (TG + VK + MAX) per post_id
 *
 * Input: mixed items from:
 *  - Collect TG results
 *  - Collect VK results
 *  - Collect MAX results
 *
 * Goal:
 *  - decide final _all_ok ONLY when all enabled channels succeeded
 *  - build one aggregated update_error log per post
 *  - output ONE item per post_id with fields for Google Sheets update:
 *      - update_last_run_at_utc / update_last_run_at / update_last_run_key / update_plan_run_at (ONLY if _all_ok)
 *      - update_error (always)
 */

const items = $input.all();

function safeStr(v) {
  if (v === null || v === undefined) return '';
  return String(v);
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

function isTgCollectorItem(p) {
  // TG collector outputs: _sent_ok/_sent_fail/_sent_total and _all_ok
  return p && (p._sent_total !== undefined || p._sent_ok !== undefined || p._sent_fail !== undefined);
}

function isVkCollectorItem(p) {
  // VK collector outputs: _vk_sent_total/_vk_sent_ok/_vk_sent_fail and _vk_all_ok
  return p && (p._vk_sent_total !== undefined || p._vk_sent_ok !== undefined || p._vk_sent_fail !== undefined);
}

function isMaxCollectorItem(p) {
  // MAX collector outputs: _max_sent_total/_max_sent_ok/_max_sent_fail and _max_all_ok
  return p && (p._max_sent_total !== undefined || p._max_sent_ok !== undefined || p._max_sent_fail !== undefined);
}

function pickFirstNonEmpty(...vals) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    return v;
  }
  return null;
}

// Group per post_id
const byPost = new Map();

for (const item of items) {
  const p = item.json || {};
  const postId = p.post_id ?? p.id ?? null;
  if (!postId) continue;

  if (!byPost.has(postId)) {
    byPost.set(postId, {
      post_id: postId,

      // common context
      row_number: toNumOrNull(p.row_number),
      now_utc: p.update_last_run_at_utc ?? p._now_utc ?? null,
      now_local: p.update_last_run_at ?? p._now ?? null,
      last_run_key: p.update_last_run_key ?? p._run_key ?? null,
      plan_run_at: p.update_plan_run_at ?? p._plan_run_at ?? null,

      // flags
      send_tg: toBoolOrNull(p.send_tg),
      send_vk: toBoolOrNull(p.send_vk),
      send_max: toBoolOrNull(p.send_max),

      // collector results
      tg_seen: false,
      tg_ok: null,
      tg_ok_count: null,
      tg_fail_count: null,
      tg_total: null,

      vk_seen: false,
      vk_ok: null,
      vk_ok_count: null,
      vk_fail_count: null,
      vk_total: null,

      max_seen: false,
      max_ok: null,
      max_ok_count: null,
      max_fail_count: null,
      max_total: null,

      // logs
      prev_error: p.error_prev ?? null,
      tg_update_error: null,
      vk_update_error: null,
      max_update_error: null,
    });
  }

  const agg = byPost.get(postId);

  // keep row_number if missing
  if (agg.row_number === null || agg.row_number === undefined) {
    agg.row_number = toNumOrNull(p.row_number);
  }

  // keep best timestamps/keys/plan
  agg.now_utc = pickFirstNonEmpty(agg.now_utc, p.update_last_run_at_utc, p._now_utc);
  agg.now_local = pickFirstNonEmpty(agg.now_local, p.update_last_run_at, p._now);
  agg.last_run_key = pickFirstNonEmpty(agg.last_run_key, p.update_last_run_key, p._run_key);
  agg.plan_run_at = pickFirstNonEmpty(agg.plan_run_at, p.update_plan_run_at, p._plan_run_at);

  // capture send flags if present anywhere
  const st = toBoolOrNull(p.send_tg);
  const sv = toBoolOrNull(p.send_vk);
  const sm = toBoolOrNull(p.send_max);
  if (st !== null) agg.send_tg = st;
  if (sv !== null) agg.send_vk = sv;
  if (sm !== null) agg.send_max = sm;

  // capture prev_error if present
  if (p.error_prev !== undefined && p.error_prev !== null) agg.prev_error = p.error_prev;

  // Determine if this is TG/VK/MAX collector item
  if (isTgCollectorItem(p) || p._all_ok !== undefined) {
    agg.tg_seen = true;
    if (typeof p._all_ok === 'boolean') agg.tg_ok = p._all_ok;
    agg.tg_ok_count = toNumOrNull(p._sent_ok);
    agg.tg_fail_count = toNumOrNull(p._sent_fail);
    agg.tg_total = toNumOrNull(p._sent_total);
    if (p.update_error) agg.tg_update_error = safeStr(p.update_error);
  }

  if (isVkCollectorItem(p) || p._vk_all_ok !== undefined) {
    agg.vk_seen = true;
    if (typeof p._vk_all_ok === 'boolean') agg.vk_ok = p._vk_all_ok;
    agg.vk_ok_count = toNumOrNull(p._vk_sent_ok);
    agg.vk_fail_count = toNumOrNull(p._vk_sent_fail);
    agg.vk_total = toNumOrNull(p._vk_sent_total);
    if (p.update_error) agg.vk_update_error = safeStr(p.update_error);
  }

  if (isMaxCollectorItem(p) || p._max_all_ok !== undefined) {
    agg.max_seen = true;
    if (typeof p._max_all_ok === 'boolean') agg.max_ok = p._max_all_ok;
    agg.max_ok_count = toNumOrNull(p._max_sent_ok);
    agg.max_fail_count = toNumOrNull(p._max_sent_fail);
    agg.max_total = toNumOrNull(p._max_sent_total);
    if (p.update_error) agg.max_update_error = safeStr(p.update_error);
  }

  // If item isn't clearly a collector, but has update_error, keep as prev_error fallback
  if (!agg.tg_update_error && !agg.vk_update_error && !agg.max_update_error && p.update_error) {
    agg.prev_error = p.update_error;
  }
}

// Helper: last line of a log string
function lastLine(s) {
  if (!s) return '';
  const lines = String(s).split('\n').map(x => x.trim()).filter(Boolean);
  return lines.length ? lines[lines.length - 1] : '';
}

const out = [];

for (const agg of byPost.values()) {
  // Decide requirements:
  // If send_* unknown, infer from presence of collector items.
  const reqTg = (agg.send_tg === null || agg.send_tg === undefined) ? agg.tg_seen : agg.send_tg;
  const reqVk = (agg.send_vk === null || agg.send_vk === undefined) ? agg.vk_seen : agg.send_vk;
  const reqMax = (agg.send_max === null || agg.send_max === undefined) ? agg.max_seen : agg.send_max;

  // Determine per-channel ok:
  const tgOk = reqTg ? (agg.tg_ok === true) : true;
  const vkOk = reqVk ? (agg.vk_ok === true) : true;
  const maxOk = reqMax ? (agg.max_ok === true) : true;

  const allOk = tgOk && vkOk && maxOk;

  // Build final error:
  let newError = null;

  const tgLine = lastLine(agg.tg_update_error);
  const vkLine = lastLine(agg.vk_update_error);
  const maxLine = lastLine(agg.max_update_error);

  if (tgLine) newError = appendLog(newError, tgLine);
  if (vkLine) newError = appendLog(newError, vkLine);
  if (maxLine) newError = appendLog(newError, maxLine);

  if (!newError) {
    newError = `[INFO] ${safeStr(agg.now_utc || new Date().toISOString())} no logs from collectors`;
  }

  out.push({
    json: {
      post_id: agg.post_id,
      row_number: agg.row_number,

      _all_ok: allOk,

      // expose requirements/statuses
      _req_tg: reqTg,
      _req_vk: reqVk,
      _req_max: reqMax,

      _tg_ok: agg.tg_ok,
      _vk_ok: agg.vk_ok,
      _max_ok: agg.max_ok,

      // counts
      _tg_sent_ok: agg.tg_ok_count,
      _tg_sent_fail: agg.tg_fail_count,
      _tg_sent_total: agg.tg_total,

      _vk_sent_ok: agg.vk_ok_count,
      _vk_sent_fail: agg.vk_fail_count,
      _vk_sent_total: agg.vk_total,

      _max_sent_ok: agg.max_ok_count,
      _max_sent_fail: agg.max_fail_count,
      _max_sent_total: agg.max_total,

      // Sheets update fields (write only on final success)
      update_last_run_at_utc: allOk ? (agg.now_utc ?? null) : null,
      update_last_run_at: allOk ? (agg.now_local ?? null) : null,
      update_last_run_key: allOk ? (agg.last_run_key ?? null) : null,
      update_plan_run_at: allOk ? (agg.plan_run_at ?? null) : null,

      update_error: newError,
    },
  });
}

return out;
