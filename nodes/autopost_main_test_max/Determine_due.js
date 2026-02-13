function regionToTz(region) {
  if (region === 54) return 'Asia/Novosibirsk';
  if (region === 82) return 'Europe/Simferopol';
  return 'Europe/Moscow';
}

function cleanLine(s) {
  return String(s ?? '')
    .replace(/[\uFEFF\u200B\u200C\u200D\u2060\u00AD]/g, '')
    .trim();
}

function formatLocalHuman(utcDate, tz) {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = dtf.formatToParts(utcDate);
  const map = {};
  for (const p of parts) if (p.type !== 'literal') map[p.type] = p.value;

  // пробел вместо T — людям проще
  return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second} (${tz})`;
}

// FIX: принимаем 1-2 цифры для часа (и для minutes/seconds тоже позволим 1-2 на всякий случай)
function parseLocal(value) {
  const s = cleanLine(value);
  if (!s) return null;

  // 0) YYYYMMDDTHHMMSS или YYYYMMDDTHHMM
  let m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{1,2})(\d{1,2})(\d{1,2})?$/);
  if (m) {
    const [_, Y, M, D, h, min, sec] = m;
    const hh = Number(h);
    const mm = Number(min);
    const ss = sec ? Number(sec) : 0;
    if (!Number.isFinite(hh) || !Number.isFinite(mm) || !Number.isFinite(ss)) return null;
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59 || ss < 0 || ss > 59) return null;
    return { Y: +Y, M: +M, D: +D, h: hh, min: mm, s: ss };
  }

  // 1) YYYY-MM-DD HH:mm(:ss)
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (m) {
    const [_, Y, M, D, h, min, sec] = m;
    const hh = Number(h);
    const mm = Number(min);
    const ss = sec ? Number(sec) : 0;
    if (!Number.isFinite(hh) || !Number.isFinite(mm) || !Number.isFinite(ss)) return null;
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59 || ss < 0 || ss > 59) return null;
    return { Y: +Y, M: +M, D: +D, h: hh, min: mm, s: ss };
  }

  // 2) DD.MM.YYYY HH:mm(:ss)
  m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (m) {
    const [_, D, M, Y, h, min, sec] = m;
    const hh = Number(h);
    const mm = Number(min);
    const ss = sec ? Number(sec) : 0;
    if (!Number.isFinite(hh) || !Number.isFinite(mm) || !Number.isFinite(ss)) return null;
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59 || ss < 0 || ss > 59) return null;
    return { Y: +Y, M: +M, D: +D, h: hh, min: mm, s: ss };
  }

  return null;
}

function isIsoLike(value) {
  const s = cleanLine(value);
  return /T/.test(s) || /Z$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s);
}

function tzOffsetMinutesAt(utcDate, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = dtf.formatToParts(utcDate);
  const map = {};
  for (const p of parts) if (p.type !== 'literal') map[p.type] = p.value;

  const asIfUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );

  const offsetMs = asIfUtc - utcDate.getTime();
  return Math.round(offsetMs / 60000);
}

function dateFromLocalInTz(local, timeZone) {
  const approxUtc = new Date(Date.UTC(local.Y, local.M - 1, local.D, local.h, local.min, local.s, 0));

  const offsetMin1 = tzOffsetMinutesAt(approxUtc, timeZone);

  let utcMs = approxUtc.getTime() - offsetMin1 * 60000;
  let utcDate = new Date(utcMs);

  const offsetMin2 = tzOffsetMinutesAt(utcDate, timeZone);
  if (offsetMin2 !== offsetMin1) {
    utcMs = approxUtc.getTime() - offsetMin2 * 60000;
    utcDate = new Date(utcMs);
  }

  return utcDate;
}

function parseDateTimeByTz(value, timeZone) {
  const v = cleanLine(value);
  if (!v) return null;

  // ISO со смещением/UTC — парсим напрямую
  if (isIsoLike(v)) {
    const iso = Date.parse(v);
    return Number.isNaN(iso) ? null : new Date(iso);
  }

  // Иначе — локальное время TZ
  const local = parseLocal(v);
  if (!local) return null;

  return dateFromLocalInTz(local, timeZone);
}

function parseDateTimeByRegion(value, region) {
  const tz = regionToTz(region);
  return parseDateTimeByTz(value, tz);
}

// ---------------- schedule mini DSL ----------------

/**
 * IMPORTANT FIX:
 * Раньше мы "расщепляли" весь schedule по ';', из-за чего RRULE разваливался,
 * и BYDAY часто терялся (становился null).
 *
 * Теперь:
 * - НИКОГДА не делим весь текст по ';'
 * - Ищем строки DTSTART / RRULE / TZ / UNTIL по всему тексту
 * - ';' используем только внутри rruleRaw (rruleRaw.split(';'))
 */
function parseSchedule(scheduleText) {
  const raw0 = (scheduleText ?? '').toString();
  const raw = raw0.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!cleanLine(raw)) return { ok: false, error: 'schedule empty' };

  const findVal = (key) => {
    const re = new RegExp(`(?:^|\\n)\\s*${key}(?:;[^:=]*)?\\s*[:=]\\s*(.+?)\\s*(?=\\n|$)`, 'i');
    const m = raw.match(re);
    return m ? cleanLine(m[1]) : null;
  };

  const tz = findVal('TZ');
  const dtstartRaw = findVal('DTSTART');
  const rruleRaw = findVal('RRULE');
  const untilRaw = findVal('UNTIL');

  if (!dtstartRaw) return { ok: false, error: 'DTSTART missing' };
  if (!rruleRaw) return { ok: false, error: 'RRULE missing' };

  const props = {};
  for (const part0 of rruleRaw.split(';')) {
    const part = cleanLine(part0);
    if (!part) continue;

    const eq = part.indexOf('=');
    if (eq <= 0) continue;

    const k = cleanLine(part.slice(0, eq)).toUpperCase();
    const v = cleanLine(part.slice(eq + 1));
    if (!k || v == null) continue;

    props[k] = v;
  }

  const freq = (props.FREQ || '').toUpperCase();
  if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(freq)) {
    return { ok: false, error: `Unsupported FREQ=${props.FREQ || ''}` };
  }

  const interval = props.INTERVAL ? Math.max(1, Number(props.INTERVAL)) : 1;
  const count = props.COUNT ? Math.max(1, Number(props.COUNT)) : null;
  const untilStr = props.UNTIL || untilRaw || null;

  const byday = props.BYDAY
    ? props.BYDAY.split(',').map(s => cleanLine(s).toUpperCase()).filter(Boolean)
    : null;

  const byhour = props.BYHOUR != null
    ? props.BYHOUR.split(',').map(x => Number(cleanLine(x)))
    : null;

  const byminute = props.BYMINUTE != null
    ? props.BYMINUTE.split(',').map(x => Number(cleanLine(x)))
    : null;

  return { ok: true, tz, dtstartRaw, freq, interval, count, untilStr, byday, byhour, byminute, raw: { rruleRaw, scheduleRaw: raw } };
}

function formatPartsYMDInTz(utcDate, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(utcDate);

  const map = {};
  for (const p of parts) if (p.type !== 'literal') map[p.type] = p.value;

  return { y: Number(map.year), m: Number(map.month), d: Number(map.day) };
}

function localYmdHmsToUtc(y, m, d, hh, mm, ss, tz) {
  return dateFromLocalInTz({ Y: y, M: m, D: d, h: hh, min: mm, s: ss }, tz);
}

function addDaysUtc(date, days) {
  return new Date(date.getTime() + days * 86400000);
}

function addWeeksUtc(date, weeks) {
  return addDaysUtc(date, weeks * 7);
}

function addMonthsUtc(date, months) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const hh = date.getUTCHours();
  const mm = date.getUTCMinutes();
  const ss = date.getUTCSeconds();

  const targetMonthIndex = m + months;
  const targetY = y + Math.floor(targetMonthIndex / 12);
  const targetM = ((targetMonthIndex % 12) + 12) % 12;

  const lastDay = new Date(Date.UTC(targetY, targetM + 1, 0)).getUTCDate();
  const clampedD = Math.min(d, lastDay);

  return new Date(Date.UTC(targetY, targetM, clampedD, hh, mm, ss));
}

function makeRunKeyLocal(postId, tz, occurrenceUtc) {
  const id = (postId ?? 'unknown').toString();
  const local = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(occurrenceUtc).replace(', ', ' ');
  return `post:${id}|${tz}|${local}`;
}

/**
 * Stable weekday for a LOCAL date (y,m,d) in timezone tz.
 * We convert local noon to UTC and then format weekday in tz.
 * Noon avoids boundary issues around midnight and DST.
 * Returns two-letter codes: MO,TU,WE,TH,FR,SA,SU.
 */
function weekdayFromLocalYmd(y, m, d, tz) {
  const probeUtc = localYmdHmsToUtc(y, m, d, 12, 0, 0, tz);
  const w = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' })
    .format(probeUtc)
    .slice(0, 2)
    .toUpperCase();
  return w;
}

function findLastOccurrenceUtc({ tz, dtstartUtc, dtstartLocalParts, rule, untilUtc, nowUtc }) {
  let windowStartUtc;
  if (rule.freq === 'DAILY') windowStartUtc = new Date(nowUtc.getTime() - 40 * 86400000);
  else if (rule.freq === 'WEEKLY') windowStartUtc = new Date(nowUtc.getTime() - 26 * 7 * 86400000);
  else windowStartUtc = new Date(nowUtc.getTime() - 24 * 31 * 86400000);

  if (windowStartUtc < dtstartUtc) windowStartUtc = dtstartUtc;
  const windowEndUtc = nowUtc;

  const defaultH = dtstartLocalParts.h;
  const defaultM = dtstartLocalParts.min;
  const defaultS = dtstartLocalParts.s;

  const hours = rule.byhour && rule.byhour.length ? rule.byhour : [defaultH];
  const minutes = rule.byminute && rule.byminute.length ? rule.byminute : [defaultM];

  let last = null;
  let produced = 0;
  const maxProduced = 5000;

  if (rule.freq === 'DAILY') {
    let cursor = new Date(Date.UTC(
      windowStartUtc.getUTCFullYear(),
      windowStartUtc.getUTCMonth(),
      windowStartUtc.getUTCDate(),
      0, 0, 0
    ));

    const dt0 = new Date(Date.UTC(
      dtstartUtc.getUTCFullYear(),
      dtstartUtc.getUTCMonth(),
      dtstartUtc.getUTCDate(),
      0, 0, 0
    ));

    let diffDays = Math.floor((cursor.getTime() - dt0.getTime()) / 86400000);
    if (diffDays < 0) diffDays = 0;
    const mod = diffDays % rule.interval;
    if (mod !== 0) cursor = addDaysUtc(cursor, rule.interval - mod);

    while (cursor <= windowEndUtc && produced < maxProduced) {
      const ymd = formatPartsYMDInTz(cursor, tz);

      if (rule.byday && rule.byday.length) {
        const localWday = weekdayFromLocalYmd(ymd.y, ymd.m, ymd.d, tz);
        if (!rule.byday.includes(localWday)) {
          cursor = addDaysUtc(cursor, rule.interval);
          continue;
        }
      }

      for (const hh of hours) {
        for (const mm of minutes) {
          const occUtc = localYmdHmsToUtc(ymd.y, ymd.m, ymd.d, hh, mm, defaultS, tz);
          if (occUtc < dtstartUtc) continue;
          if (untilUtc && occUtc > untilUtc) continue;
          if (occUtc < windowStartUtc || occUtc > windowEndUtc) continue;

          produced++;
          if (rule.count && produced > rule.count) return last;

          if (!last || occUtc > last) last = occUtc;
          if (produced >= maxProduced) break;
        }
        if (produced >= maxProduced) break;
      }

      cursor = addDaysUtc(cursor, rule.interval);
    }
  }

  if (rule.freq === 'WEEKLY') {
    const dtLocalWday = weekdayFromLocalYmd(dtstartLocalParts.Y, dtstartLocalParts.M, dtstartLocalParts.D, tz);
    const days = (rule.byday && rule.byday.length) ? rule.byday : [dtLocalWday];

    let cursorWeekStart = new Date(Date.UTC(
      windowStartUtc.getUTCFullYear(),
      windowStartUtc.getUTCMonth(),
      windowStartUtc.getUTCDate(),
      0, 0, 0
    ));

    const dt0 = new Date(Date.UTC(
      dtstartUtc.getUTCFullYear(),
      dtstartUtc.getUTCMonth(),
      dtstartUtc.getUTCDate(),
      0, 0, 0
    ));

    let diffDays = Math.floor((cursorWeekStart.getTime() - dt0.getTime()) / 86400000);
    if (diffDays < 0) diffDays = 0;
    const diffWeeks = Math.floor(diffDays / 7);
    const mod = diffWeeks % rule.interval;
    if (mod !== 0) cursorWeekStart = addWeeksUtc(cursorWeekStart, rule.interval - mod);

    while (cursorWeekStart <= windowEndUtc && produced < maxProduced) {
      for (let i = 0; i < 7; i++) {
        const dayUtc = addDaysUtc(cursorWeekStart, i);
        const ymd = formatPartsYMDInTz(dayUtc, tz);
        const localWday = weekdayFromLocalYmd(ymd.y, ymd.m, ymd.d, tz);

        if (!days.includes(localWday)) continue;

        for (const hh of hours) {
          for (const mm of minutes) {
            const occUtc = localYmdHmsToUtc(ymd.y, ymd.m, ymd.d, hh, mm, defaultS, tz);
            if (occUtc < dtstartUtc) continue;
            if (untilUtc && occUtc > untilUtc) continue;
            if (occUtc < windowStartUtc || occUtc > windowEndUtc) continue;

            produced++;
            if (rule.count && produced > rule.count) return last;

            if (!last || occUtc > last) last = occUtc;
            if (produced >= maxProduced) break;
          }
          if (produced >= maxProduced) break;
        }
      }

      cursorWeekStart = addWeeksUtc(cursorWeekStart, rule.interval);
    }
  }

  if (rule.freq === 'MONTHLY') {
    let cursor = dtstartUtc;
    let iterations = 0;
    const maxIter = 300;

    while (cursor < windowStartUtc && iterations < maxIter) {
      cursor = addMonthsUtc(cursor, rule.interval);
      iterations++;
    }

    while (cursor <= windowEndUtc && iterations < maxIter && produced < maxProduced) {
      const ymd = formatPartsYMDInTz(cursor, tz);

      for (const hh of hours) {
        for (const mm of minutes) {
          const occUtc = localYmdHmsToUtc(ymd.y, ymd.m, ymd.d, hh, mm, defaultS, tz);
          if (occUtc < dtstartUtc) continue;
          if (untilUtc && occUtc > untilUtc) continue;
          if (occUtc < windowStartUtc || occUtc > windowEndUtc) continue;

          produced++;
          if (rule.count && produced > rule.count) return last;

          if (!last || occUtc > last) last = occUtc;
          if (produced >= maxProduced) break;
        }
        if (produced >= maxProduced) break;
      }

      cursor = addMonthsUtc(cursor, rule.interval);
      iterations++;
    }
  }

  return last;
}

// NEW: find next occurrence strictly after nowUtc
function findNextOccurrenceUtc({ tz, dtstartUtc, dtstartLocalParts, rule, untilUtc, nowUtc }) {
  const windowStartUtc = nowUtc;
  let windowEndUtc;
  if (rule.freq === 'DAILY') windowEndUtc = new Date(nowUtc.getTime() + 60 * 86400000);
  else if (rule.freq === 'WEEKLY') windowEndUtc = new Date(nowUtc.getTime() + 60 * 7 * 86400000);
  else windowEndUtc = new Date(nowUtc.getTime() + 24 * 31 * 86400000);

  if (untilUtc && untilUtc < windowEndUtc) windowEndUtc = untilUtc;

  const defaultH = dtstartLocalParts.h;
  const defaultM = dtstartLocalParts.min;
  const defaultS = dtstartLocalParts.s;

  const hours = rule.byhour && rule.byhour.length ? rule.byhour : [defaultH];
  const minutes = rule.byminute && rule.byminute.length ? rule.byminute : [defaultM];

  let best = null;
  let produced = 0;
  const maxProduced = 5000;

  if (rule.freq === 'DAILY') {
    let cursor = new Date(Date.UTC(
      windowStartUtc.getUTCFullYear(),
      windowStartUtc.getUTCMonth(),
      windowStartUtc.getUTCDate(),
      0, 0, 0
    ));

    const dt0 = new Date(Date.UTC(
      dtstartUtc.getUTCFullYear(),
      dtstartUtc.getUTCMonth(),
      dtstartUtc.getUTCDate(),
      0, 0, 0
    ));

    let diffDays = Math.floor((cursor.getTime() - dt0.getTime()) / 86400000);
    if (diffDays < 0) diffDays = 0;
    const mod = diffDays % rule.interval;
    if (mod !== 0) cursor = addDaysUtc(cursor, rule.interval - mod);

    while (cursor <= windowEndUtc && produced < maxProduced) {
      const ymd = formatPartsYMDInTz(cursor, tz);

      if (rule.byday && rule.byday.length) {
        const localWday = weekdayFromLocalYmd(ymd.y, ymd.m, ymd.d, tz);
        if (!rule.byday.includes(localWday)) {
          cursor = addDaysUtc(cursor, rule.interval);
          continue;
        }
      }

      for (const hh of hours) {
        for (const mm of minutes) {
          const occUtc = localYmdHmsToUtc(ymd.y, ymd.m, ymd.d, hh, mm, defaultS, tz);
          if (occUtc < dtstartUtc) continue;
          if (untilUtc && occUtc > untilUtc) continue;
          if (occUtc <= windowStartUtc) continue;
          if (occUtc > windowEndUtc) continue;

          produced++;
          if (rule.count && produced > rule.count) return best;

          if (!best || occUtc < best) best = occUtc;
          if (best) return best;
        }
      }

      cursor = addDaysUtc(cursor, rule.interval);
    }
  }

  if (rule.freq === 'WEEKLY') {
    const dtLocalWday = weekdayFromLocalYmd(dtstartLocalParts.Y, dtstartLocalParts.M, dtstartLocalParts.D, tz);
    const days = (rule.byday && rule.byday.length) ? rule.byday : [dtLocalWday];

    let cursorWeekStart = new Date(Date.UTC(
      windowStartUtc.getUTCFullYear(),
      windowStartUtc.getUTCMonth(),
      windowStartUtc.getUTCDate(),
      0, 0, 0
    ));

    const dt0 = new Date(Date.UTC(
      dtstartUtc.getUTCFullYear(),
      dtstartUtc.getUTCMonth(),
      dtstartUtc.getUTCDate(),
      0, 0, 0
    ));

    let diffDays = Math.floor((cursorWeekStart.getTime() - dt0.getTime()) / 86400000);
    if (diffDays < 0) diffDays = 0;
    const diffWeeks = Math.floor(diffDays / 7);
    const mod = diffWeeks % rule.interval;
    if (mod !== 0) cursorWeekStart = addWeeksUtc(cursorWeekStart, rule.interval - mod);

    while (cursorWeekStart <= windowEndUtc && produced < maxProduced) {
      for (let i = 0; i < 7; i++) {
        const dayUtc = addDaysUtc(cursorWeekStart, i);
        const ymd = formatPartsYMDInTz(dayUtc, tz);
        const localWday = weekdayFromLocalYmd(ymd.y, ymd.m, ymd.d, tz);

        if (!days.includes(localWday)) continue;

        for (const hh of hours) {
          for (const mm of minutes) {
            const occUtc = localYmdHmsToUtc(ymd.y, ymd.m, ymd.d, hh, mm, defaultS, tz);
            if (occUtc < dtstartUtc) continue;
            if (untilUtc && occUtc > untilUtc) continue;
            if (occUtc <= windowStartUtc) continue;
            if (occUtc > windowEndUtc) continue;

            produced++;
            if (rule.count && produced > rule.count) return best;

            if (!best || occUtc < best) best = occUtc;
            if (best) return best;
          }
        }
      }

      cursorWeekStart = addWeeksUtc(cursorWeekStart, rule.interval);
    }
  }

  if (rule.freq === 'MONTHLY') {
    let cursor = dtstartUtc;
    let iterations = 0;
    const maxIter = 300;

    while (cursor <= windowStartUtc && iterations < maxIter) {
      cursor = addMonthsUtc(cursor, rule.interval);
      iterations++;
    }

    while (cursor <= windowEndUtc && iterations < maxIter && produced < maxProduced) {
      const ymd = formatPartsYMDInTz(cursor, tz);

      for (const hh of hours) {
        for (const mm of minutes) {
          const occUtc = localYmdHmsToUtc(ymd.y, ymd.m, ymd.d, hh, mm, defaultS, tz);
          if (occUtc < dtstartUtc) continue;
          if (untilUtc && occUtc > untilUtc) continue;
          if (occUtc <= windowStartUtc) continue;
          if (occUtc > windowEndUtc) continue;

          produced++;
          if (rule.count && produced > rule.count) return best;

          if (!best || occUtc < best) best = occUtc;
          if (best) return best;
        }
      }

      cursor = addMonthsUtc(cursor, rule.interval);
      iterations++;
    }
  }

  return best;
}

// ---------------- main ----------------

const items = $input.all();
const nowUtc = new Date();

return items.map(item => {
  const p = item.json;

  const tzRegion = regionToTz(p.region);

  let due = false;
  let reason = null;

  // наружные поля
  const nowLocal = formatLocalHuman(nowUtc, tzRegion);

  let publishUtc = null;
  let publishLocal = null;

  let occurrenceUtc = null;
  let occurrenceLocal = null;

  let runKey = null;
  let scheduleParsed = null;

  // NEW plan
  let planRunUtc = null;
  let planRunLocal = null;

  if (p.post_type === 2) {
    publishUtc = parseDateTimeByRegion(p.publish_at, p.region);
    publishLocal = publishUtc ? formatLocalHuman(publishUtc, tzRegion) : null;

    if (!publishUtc) {
      reason = 'one-time post without valid publish_at';
    } else {
      // для разового поста occurrence = publish_at
      occurrenceUtc = publishUtc;
      occurrenceLocal = formatLocalHuman(occurrenceUtc, tzRegion);

      // формируем ключ заранее (антидубль как у регулярных)
      runKey = makeRunKeyLocal(p.id, tzRegion, occurrenceUtc);

      const alreadyKey = (p.last_run_key ?? '').toString().trim();
      if (alreadyKey === runKey) {
        due = false;
        reason = 'one-time: already executed (last_run_key match)';
      } else {
        // запасной стопор по last_run_at_utc (если ключ почему-то не писался)
        const lastRunAtUtc = p.last_run_at_utc ? new Date(p.last_run_at_utc) : null;
        if (lastRunAtUtc && !isNaN(lastRunAtUtc.getTime())) {
          if (lastRunAtUtc.getTime() >= occurrenceUtc.getTime() - 30 * 1000) {
            due = false;
            reason = 'one-time: already executed (last_run_at_utc >= publish_at)';
          } else if (publishUtc <= nowUtc) {
            due = true;
            reason = 'due now (publish_at <= now) in region tz';
          } else {
            due = false;
            reason = 'not yet (publish_at in future) in region tz';
          }
        } else {
          if (publishUtc <= nowUtc) {
            due = true;
            reason = 'due now (publish_at <= now) in region tz';
          } else {
            due = false;
            reason = 'not yet (publish_at in future) in region tz';
          }
        }
      }
    }
  } else if (p.post_type === 1) {
    if (!p.schedule) {
      reason = 'regular post without schedule';
    } else {
      const parsed = parseSchedule(p.schedule);
      if (!parsed.ok) {
        reason = `schedule parse error: ${parsed.error}`;
      } else {
        const tz = parsed.tz || tzRegion;

        const dtstartLocal = parseLocal(parsed.dtstartRaw);
        if (!dtstartLocal) {
          reason = 'DTSTART parse error';
        } else {
          const dtstartUtc = dateFromLocalInTz(dtstartLocal, tz);

          let untilUtc = null;
          if (parsed.untilStr) {
            const u = parseDateTimeByTz(parsed.untilStr, tz);
            if (!u) reason = 'UNTIL parse error';
            else untilUtc = u;
          }

          if (!reason) {
            const rule = {
              freq: parsed.freq,
              interval: parsed.interval,
              count: parsed.count,
              byday: parsed.byday,
              byhour: parsed.byhour,
              byminute: parsed.byminute,
            };

            scheduleParsed = {
              tz,
              dtstart_local: parsed.dtstartRaw,
              dtstart_utc: dtstartUtc.toISOString(),
              rule,
              until_utc: untilUtc ? untilUtc.toISOString() : null,
              raw: parsed.raw, // чтобы видеть rruleRaw/scheduleRaw в дебаге
            };

            const lastOcc = findLastOccurrenceUtc({
              tz,
              dtstartUtc,
              dtstartLocalParts: dtstartLocal,
              rule,
              untilUtc,
              nowUtc,
            });

            const nextOcc = findNextOccurrenceUtc({
              tz,
              dtstartUtc,
              dtstartLocalParts: dtstartLocal,
              rule,
              untilUtc,
              nowUtc,
            });

            if (nextOcc) {
              planRunUtc = nextOcc;
              planRunLocal = formatLocalHuman(nextOcc, tz);
            } else {
              planRunUtc = null;
              planRunLocal = null;
            }

            if (!lastOcc) {
              // FIX: корректная причина, когда DTSTART ещё не наступил (в будущем)
              if (dtstartUtc > nowUtc) {
                due = false;
                reason = 'recurring: not yet started (DTSTART in future)';
              } else {
                // если DTSTART уже был в прошлом, но в lookback ничего не нашли
                due = false;
                reason = 'recurring: no occurrence found in lookback window';
              }
            } else {
              occurrenceUtc = lastOcc;
              occurrenceLocal = formatLocalHuman(occurrenceUtc, tz);
              runKey = makeRunKeyLocal(p.id, tz, occurrenceUtc);

              const alreadyKey = (p.last_run_key ?? '').toString().trim();
              if (alreadyKey === runKey) {
                due = false;
                reason = 'recurring: already executed (last_run_key match)';
              } else {
                // secondary: last_run_at_utc (надежно парсится)
                const lastRunAtUtc = p.last_run_at_utc ? new Date(p.last_run_at_utc) : null;
                if (lastRunAtUtc && !isNaN(lastRunAtUtc.getTime())) {
                  if (lastRunAtUtc.getTime() >= occurrenceUtc.getTime() - 30 * 1000) {
                    due = false;
                    reason = 'recurring: already executed (last_run_at_utc >= occurrence)';
                  } else {
                    due = true;
                    reason = 'recurring: occurrence <= now and not executed';
                  }
                } else {
                  due = true;
                  reason = 'recurring: occurrence <= now and not executed';
                }
              }
            }
          }
        }
      }
    }
  } else {
    reason = 'unknown post_type';
  }

  return {
    json: {
      ...p,
      _due: due,
      _due_reason: reason,

      // локальное отображение
      _now: nowLocal,
      _publish_at_parsed: publishLocal,
      _occurrence_local: occurrenceLocal,

      // UTC техничка (для записи)
      _now_utc: nowUtc.toISOString(),
      _occurrence_utc: occurrenceUtc ? occurrenceUtc.toISOString() : null,

      _run_key: runKey,
      _schedule_parsed: scheduleParsed,

      // NEW: next planned run (for regular posts)
      _plan_run_at: planRunLocal,
      _plan_run_at_utc: planRunUtc ? planRunUtc.toISOString() : null,
    },
  };
});
