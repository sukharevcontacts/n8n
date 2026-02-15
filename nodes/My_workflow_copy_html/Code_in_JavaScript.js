return items.map(item => {
  const d = item.json;

  const num = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const bool1 = (v) => num(v) === 1;

  const strOrNull = (v) => {
    const s = (v ?? '').toString().trim();
    return s ? s : null;
  };

  const titleStr = (d.title ?? '').toString();
  const titleNorm = titleStr.trim().toUpperCase();

  // marker for "GOODMORNING" posts (text will be taken from COOP_FACT later in Expand per store)
  const isGoodMorning = titleNorm === 'GOODMORNING';

  return {
    json: {
      id: num(d.id),
      status: num(d.status),
      region: num(d.region),
      post_type: num(d.post_type),

      send_tg: bool1(d.send_tg),
      send_max: bool1(d.send_max),
      send_vk: bool1(d.send_vk),
      send_site: bool1(d.send_site),

      // debug flag for telegram routing (1 = send to test channel)
      tg_debug: num(d.tg_debug),

      title: titleStr,

      // plain text (fallback)
      text: d.text ?? '',

      // ✅ formatted HTML from Google Sheets (after merge)
      text_html: strOrNull(d.text_html),

      // 1 = HTML, 2 = MarkdownV2, else = fallback safe HTML later
      parse_mode: num(d.parse_mode) ?? 0,

      media_raw: d.media_url ?? '',

      // NEW: raw order link (format "Button title|https://...")
      order_link: strOrNull(d.order_link),

      // NEW: TG invite experiment flag (if empty -> add invite footer later)
      tg_inv_expt: strOrNull(d.tg_inv_expt),

      // старая логика: ссылка на бота (формат "197_КУПИТЬ")
      old_post: strOrNull(d.old_post),

      all_region: bool1(d.all_region),
      points_note_mode:
        d.points_note_mode === '' || d.points_note_mode === null || d.points_note_mode === undefined
          ? null
          : (num(d.points_note_mode) ?? null),

      schedule: strOrNull(d.schedule),
      publish_at: strOrNull(d.publish_at),

      // service fields
      last_run_at_utc: strOrNull(d.last_run_at_utc),
      last_run_at: strOrNull(d.last_run_at),
      last_run_key: strOrNull(d.last_run_key),

      error: strOrNull(d.error),

      // flag for downstream logic
      _goodmorning: isGoodMorning,

      // исходная строка целиком (включая колонки точек)
      _raw: d,
    },
  };
});
