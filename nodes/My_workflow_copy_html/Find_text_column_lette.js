const header = $json.values?.[0] ?? [];
const idx = header.findIndex(x => String(x).trim().toLowerCase() === 'text');
if (idx < 0) {
  throw new Error(`Column 'text' not found in header: ${header.join(', ')}`);
}

function colToA1(n) {
  // 0 -> A, 1 -> B ...
  let s = '';
  let x = n + 1;
  while (x > 0) {
    const m = (x - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

return [{ json: { text_col_letter: colToA1(idx) } }];
