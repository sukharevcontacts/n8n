// Вход: один item (Execute Once), в котором есть sheets[0].data[0].rowData[]
// Надо: вернуть много items вида { row_number, text_html }

function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function wrap(segHtml, fmt) {
  let t = segHtml;

  const link = fmt?.link?.uri || null;
  const bold = !!fmt?.bold;
  const italic = !!fmt?.italic;
  const underline = !!fmt?.underline;
  const strike = !!fmt?.strikethrough;

  if (bold) t = `<b>${t}</b>`;
  if (italic) t = `<i>${t}</i>`;
  if (underline) t = `<u>${t}</u>`;
  if (strike) t = `<s>${t}</s>`;
  if (link) t = `<a href="${esc(link)}">${t}</a>`;

  return t;
}

function buildHtml(formattedValue, runs) {
  const raw = String(formattedValue ?? '');
  if (!raw) return '';

  // Если runs нет — просто escape + переносы строк
  if (!Array.isArray(runs) || runs.length === 0) {
    return esc(raw).replace(/\n/g, '<br>');
  }

  const rs = runs
    .map(r => ({
      start: Number(r.startIndex ?? 0),
      format: r.format ?? null,
    }))
    .filter(r => Number.isFinite(r.start))
    .sort((a, b) => a.start - b.start);

  if (!rs.length || rs[0].start !== 0) rs.unshift({ start: 0, format: null });

  let out = '';
  for (let i = 0; i < rs.length; i++) {
    const from = rs[i].start;
    const to = (i + 1 < rs.length) ? rs[i + 1].start : raw.length;
    const segRaw = raw.slice(from, to);

    const segHtml = esc(segRaw).replace(/\n/g, '<br>');
    out += wrap(segHtml, rs[i].format);
  }
  return out;
}

// --- достаём rowData ---
const sheet = $json.sheets?.[0];
const rowData = sheet?.data?.[0]?.rowData ?? [];

// Мы запрашивали диапазон начиная с Q2 => первая rowData соответствует row_number=2
const startRow = 2;

const out = [];
for (let i = 0; i < rowData.length; i++) {
  const cell = rowData[i]?.values?.[0] ?? null;
  const formattedValue = cell?.formattedValue ?? '';
  const runs = cell?.textFormatRuns ?? null;

  const text_html = buildHtml(formattedValue, runs);

  out.push({
    json: {
      row_number: startRow + i,
      text_html,
    }
  });
}

return out;
