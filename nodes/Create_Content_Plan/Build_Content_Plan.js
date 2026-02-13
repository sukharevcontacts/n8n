// n8n Code node: Build Content Plan
// Сформировать /smmcontent/content-plan.json (items + stores_catalog + posts_catalog)
// Поддерживает:
//  - регулярные посты через schedule (DTSTART + RRULE)
//  - разовые посты через publish_at (локальное время региона), если schedule пустой
//  - показывает события начиная с 00:00 сегодняшнего дня (не от текущего времени)


// ===== НАСТРОЙКИ =====
const DAYS_AHEAD = 14; // максимум 14
const REGION_TZ = {
  54: "Asia/Novosibirsk",
  82: "Europe/Simferopol",
};
const REGION_FROM_TZ = {
  7: 54, // Novosibirsk
  3: 82, // Crimea
};
// =====================


// --- parse schedule ---
function parseSchedule(schedule) {
  if (!schedule) return null;

  const dt = schedule.match(/DTSTART:(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})/);
  if (!dt) return null;

  const rrule = schedule.match(/RRULE:([^\n\r]+)/);
  const rule = rrule ? rrule[1].trim() : "";

  const freq = (rule.match(/FREQ=([A-Z]+)/)?.[1] || "").toUpperCase();
  const bydayRaw = rule.match(/BYDAY=([A-Z,]+)/)?.[1];
  const byday = bydayRaw ? bydayRaw.split(",").map((s) => s.trim()) : null;

  const dtstartDate = dt[1]; // YYYY-MM-DD
  const dtstartTime = dt[2]; // HH:MM:SS

  return { freq, byday, dtstartDate, dtstartTime };
}


// --- parse publish_at (локальный datetime) ---
// Ожидаем: "YYYY-MM-DD HH:MM:SS" или "YYYY-MM-DD HH:MM"
function parsePublishAtLocal(publish_at) {
  const s = String(publish_at ?? "").trim();
  if (!s) return null;

  // 2026-01-18 09:00:00
  let m = s.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})$/);
  if (m) return { ymd: m[1], time: m[2] };

  // 2026-01-18 09:00
  m = s.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})$/);
  if (m) return { ymd: m[1], time: m[2] + ":00" };

  return null;
}


// --- TZ helpers (local-in-tz -> UTC ISO) ---
function tzOffsetMinutesForUtc(utcDate, tz) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(utcDate);

  const map = {};
  for (const p of parts) if (p.type !== "literal") map[p.type] = p.value;

  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );

  return Math.round((asUtc - utcDate.getTime()) / 60000);
}

function localInTzToUtcIso(localY, localM, localD, hh, mm, ss, tz) {
  const guessUtcMs = Date.UTC(localY, localM - 1, localD, hh, mm, ss);
  const guessUtc = new Date(guessUtcMs);
  const offMin = tzOffsetMinutesForUtc(guessUtc, tz);
  const realUtcMs = guessUtcMs - offMin * 60000;
  return new Date(realUtcMs).toISOString();
}

function ymdInTz(dateUtc, tz) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dateUtc); // YYYY-MM-DD
}

function addDaysYmd(ymd, add) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + add);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function splitTime(dtstartTime) {
  const [hh, mm, ss] = dtstartTime.split(":").map(Number);
  return { hh, mm, ss };
}

function timeHHMM(dtstartTime) {
  return dtstartTime.slice(0, 5);
}


// --- parse store_* columns from row ---
// ожидаем колонки: store_195_Большевистская (значение 1 = включено)
function extractSelectedStoreIdsFromRow(post) {
  const ids = [];
  for (const k of Object.keys(post)) {
    const m = k.match(/^store_(\d+)_/);
    if (!m) continue;
    const store_id = Number(m[1]);
    const v = post[k];
    const isOn = String(v).trim() === "1" || v === 1 || v === true;
    if (isOn) ids.push(store_id);
  }
  ids.sort((a, b) => a - b);
  return ids;
}

function boolOn(v) {
  return String(v ?? "").trim() === "1" || v === 1 || v === true;
}

function safeString(v) {
  return String(v ?? "").trim();
}

function toIntOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}


// -------------------- MAIN --------------------
const nowUtc = new Date();

// posts берём из Filter (чтобы не путать с Append-барьером)
const posts = $items("Filter").map((x) => x.json);

// stores берём из Postgres-ноды
const storesRaw = $items("PG Stores").map((x) => x.json);

// Нормализуем stores
const storeById = new Map();
const storesByRegion = new Map(); // region -> stores[]
for (const s of storesRaw) {
  const store_id = Number(s.store_id);
  const name = safeString(s.store_description) || ("#" + store_id);
  const time_zone = Number(s.time_zone);

  const region = REGION_FROM_TZ[time_zone] ?? null;
  const norm = { store_id, name, time_zone, region };

  storeById.set(store_id, norm);

  if (region !== null) {
    if (!storesByRegion.has(region)) storesByRegion.set(region, []);
    storesByRegion.get(region).push(norm);
  }
}

// сортируем списки
for (const [r, arr] of storesByRegion.entries()) {
  arr.sort((a, b) => a.store_id - b.store_id);
}

// stores_catalog только из Postgres (это “истина”)
const stores_catalog = Array.from(storeById.values())
  .filter((s) => s.region !== null)
  .sort((a, b) => a.store_id - b.store_id)
  .map((s) => ({
    store_id: s.store_id,
    name: s.name,
    region: s.region,
    time_zone: s.time_zone,
  }));

// --- posts_catalog: контент постов для Telegram preview ---
const posts_catalog = {};
for (const p of posts) {
  const pid = String(p.id ?? p.post_id ?? "").trim();
  if (!pid) continue;
  if (Number(p.status) !== 1) continue;

  const title = safeString(p.title);
  const text = String(p.text ?? "");
  const parse_mode = toIntOrNull(p.parse_mode) ?? 0; // 0/plain, 1/HTML, 2/MarkdownV2
  const media_url = String(p.media_url ?? "");

  posts_catalog[pid] = {
    title,
    text,
    parse_mode,
    media_url,
  };
}

const outItems = [];

for (const p of posts) {
  if (Number(p.status) !== 1) continue;

  const region = Number(p.region);
  const tz = REGION_TZ[region] || "Europe/Moscow";

  // Определяем target store_ids для поста
  let targetStoreIds = [];
  const allRegionOn = boolOn(p.all_region);

  if (allRegionOn) {
    const allStores = storesByRegion.get(region) || [];
    targetStoreIds = allStores.map((s) => s.store_id);
  } else {
    const selectedIds = extractSelectedStoreIdsFromRow(p);
    targetStoreIds = selectedIds.filter((id) => storeById.has(Number(id)));
  }

  // today in region tz (YYYY-MM-DD) — стартуем от 00:00 сегодняшнего дня
  const todayYmd = ymdInTz(nowUtc, tz);
  const endYmd = addDaysYmd(todayYmd, DAYS_AHEAD - 1);

  // --- 1) Регулярные посты по schedule ---
  if (p.schedule) {
    const sch = parseSchedule(p.schedule);
    if (!sch) continue;

    const { freq, byday, dtstartDate, dtstartTime } = sch;
    const dtStartYmd = dtstartDate;
    const { hh, mm, ss } = splitTime(dtstartTime);

    for (let i = 0; i < DAYS_AHEAD; i++) {
      const dayYmd = addDaysYmd(todayYmd, i);

      // Skip days before DTSTART date
      if (dayYmd < dtStartYmd) continue;

      // Weekly filter
      if (freq === "WEEKLY" && byday && byday.length) {
        const noonUtc = new Date(
          Date.UTC(
            Number(dayYmd.slice(0, 4)),
            Number(dayYmd.slice(5, 7)) - 1,
            Number(dayYmd.slice(8, 10)),
            12,
            0,
            0
          )
        );
        const wd = new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          weekday: "short",
        })
          .format(noonUtc)
          .toUpperCase()
          .slice(0, 2);
        if (!byday.includes(wd)) continue;
      } else if (freq === "DAILY") {
        // ok
      } else {
        continue;
      }

      const [Y, M, D] = dayYmd.split("-").map(Number);
      const utcIso = localInTzToUtcIso(Y, M, D, hh, mm, ss, tz);

      outItems.push({
        kind: "rrule", // NEW
        region,
        tz,
        post_id: p.id,
        title: p.title,
        local_dt: `${dayYmd} ${dtstartTime}`,
        hhmm: timeHHMM(dtstartTime),
        utc_iso: utcIso,
        store_ids: targetStoreIds,
      });
    }

    continue;
  }

  // --- 2) Разовые посты по publish_at (локальный datetime) ---
  const pa = parsePublishAtLocal(p.publish_at);
  if (!pa) continue;

  // фильтр периода: только сегодня..+DAYS_AHEAD-1
  if (pa.ymd < todayYmd || pa.ymd > endYmd) continue;

  const { hh, mm, ss } = splitTime(pa.time);
  const [Y, M, D] = pa.ymd.split("-").map(Number);
  const utcIso = localInTzToUtcIso(Y, M, D, hh, mm, ss, tz);

  outItems.push({
    kind: "once", // NEW
    region,
    tz,
    post_id: p.id,
    title: p.title,
    local_dt: `${pa.ymd} ${pa.time}`,
    hhmm: timeHHMM(pa.time),
    utc_iso: utcIso,
    store_ids: targetStoreIds,
  });
}

// Sort by utc time
outItems.sort((a, b) => new Date(a.utc_iso) - new Date(b.utc_iso));

return [
  {
    json: {
      generated_at_utc: new Date().toISOString(),
      days_ahead: DAYS_AHEAD,
      items: outItems,
      stores_catalog,
      posts_catalog,
    },
  },
];
