/**
 * Collect VK results per post_id (after Merge Combine/Position)
 *
 * Supports VK API responses from HTTP Request node (wall.post), which typically return:
 *  - Success: { response: { post_id: 123, ... } }
 *  - Error:   { error: { error_code: 214, error_msg: "...", error_text: "...", request_params: [...] } }
 *
 * But n8n can wrap HTTP responses as:
 *  - { statusCode: 200, body: { response:{...} } }  (when Response Format = JSON)
 *  - { statusCode: 200, body: "..." }              (string)
 *  - errors in p.error / p.message / p.response / p.body
 *
 * Output: one item per post_id with aggregation + Sheets update-like fields
 * (Note: do NOT write last_run_* here if you plan to require TG+VK together;
 *        you can still output vk_ok/vk_fail counts and update_error here.)
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

function unwrapBody(p) {
  // n8n HTTP Request may expose body at top-level or nested
  const body = p?.body ?? p?.response?.body ?? p?.responseBody ?? null;

  if (body && typeof body === 'object') return body;

  if (typeof body === 'string') {
    const j = tryJsonParse(body);
    if (j && typeof j === 'object') return j;
  }

  // Sometimes response itself is the VK json
  if (p && typeof p === 'object') {
    if (p.response && typeof p.response === 'object') return p.response;
    // if p has response/error at top-level, return p itself
    if (p.response || p.error) return p;
  }

  return null;
}

function detectOk(p) {
  if (!p) return false;

  // Direct VK shape
  if (p.response && typeof p.response === 'object' && (p.response.post_id || p.response.post_id === 0)) {
    return true;
  }

  const b = unwrapBody(p);
  if (b) {
    if (b.response && typeof b.response === 'object' && (b.response.post_id || b.response.post_id === 0)) {
      return true;
    }
    // VK sometimes returns "response": 1 for some methods, but wall.post should return object
    if (typeof b.response === 'number' && b.response > 0) return true;
  }

  // Fallback: if statusCode is 2xx but VK error not visible, treat as ok (avoid false FAIL)
  const sc = p.statusCode ?? p.status ?? p.response?.statusCode ?? null;
  if (typeof sc === 'number' && sc >= 200 && sc < 300) {
    const bb = b;
    if (bb && bb.error) return false;
    return true;
  }

  return false;
}

function extractErrorText(p) {
  if (!p) return 'unknown error';

  // n8n error object
  if (typeof p.error === 'string') return p.error;
  if (p.error?.message) return safeStr(p.error.message);
  if (p.errorMessage) return safeStr(p.errorMessage);
  if (p.message) return safeStr(p.message);
  if (p.description) return safeStr(p.description);
  if (p.cause) return safeStr(p.cause);

  // VK error shape
  const b = unwrapBody(p);
  const errObj = b?.error ?? p?.error ?? null;

  if (errObj && typeof errObj === 'object') {
    const code = errObj.error_code ?? errObj.code ?? null;
    const msg = errObj.error_msg ?? errObj.message ?? errObj.error_text ?? null;
    if (code !== null || msg) {
      return `vk_error${code !== null ? `#${safeStr(code)}` : ''}: ${safeStr(msg || 'unknown')}`.trim();
    }
    try {
      return JSON.stringify(errObj);
    } catch (e) {
      return 'unstringifiable vk error';
    }
  }

  // Raw body as string
  const rawBody = p.body ?? p.response?.body ?? p.responseBody ?? null;
  if (typeof rawBody === 'string') {
    const s = rawBody.trim();
    if (s) return s.slice(0, 500);
  }

  // Last resort
  try {
    return JSON.stringify(p).slice(0, 500);
  } catch (e) {
    return 'unknown error';
  }
}

function extractVkPostId(p) {
  const b = unwrapBody(p);
  const direct = p?.response?.post_id ?? null;
  if (direct !== null && direct !== undefined) return direct;

  const pid = b?.response?.post_id ?? null;
  if (pid !== null && pid !== undefined) return pid;

  return null;
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
      vk_post_ids: [],
    });
  }

  const agg = byPost.get(postId);

  if (!agg.plan_run_at && p._plan_run_at) agg.plan_run_at = p._plan_run_at;

  agg.total += 1;

  const ok = detectOk(p);

  if (ok) {
    agg.ok += 1;
    const vkPid = extractVkPostId(p);
    if (vkPid !== null && vkPid !== undefined) agg.vk_post_ids.push(vkPid);
  } else {
    agg.fail += 1;
    const desc = extractErrorText(p);
    agg.fails.push({ desc: safeStr(desc) });
  }
}

const out = [];

for (const agg of byPost.values()) {
  // success only if at least one ok and no fails
  const allOk = agg.fail === 0 && agg.ok > 0;

  let newError = agg.prev_error;

  if (allOk) {
    const vkInfo = agg.vk_post_ids.length ? ` vk_post_id=${safeStr(agg.vk_post_ids[0])}` : '';
    newError = appendLog(
      newError,
      `[OK VK] ${agg.now_utc} key=${safeStr(agg.last_run_key)} sent=${agg.ok}/${agg.total}${vkInfo}`
    );
  } else {
    const failLines = agg.fails
      .slice(0, 20)
      .map(f => `err=${safeStr(f.desc)}`)
      .join(' | ');

    newError = appendLog(
      newError,
      `[FAIL VK] ${agg.now_utc} key=${safeStr(agg.last_run_key)} ok=${agg.ok}/${agg.total} fails=${agg.fail}` +
        (failLines ? ` :: ${failLines}` : '')
    );
  }

  out.push({
    json: {
      post_id: agg.post_id,
      row_number: agg.row_number,

      _vk_all_ok: allOk,
      _vk_sent_ok: agg.ok,
      _vk_sent_fail: agg.fail,
      _vk_sent_total: agg.total,

      // Keep these in case you want final aggregator to decide.
      update_last_run_at_utc: allOk ? agg.now_utc : null,
      update_last_run_at: allOk ? agg.now_local : null,
      update_last_run_key: allOk ? agg.last_run_key : null,

      // write plan_run_at only on success
      update_plan_run_at: allOk ? (agg.plan_run_at ?? null) : null,

      update_error: newError,

      // optional: useful for debugging
      vk_post_ids: agg.vk_post_ids,
    },
  });
}

return out;
