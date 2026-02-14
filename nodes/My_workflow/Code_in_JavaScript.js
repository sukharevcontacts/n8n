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

  // NEW: marker for "GOODMORNING" posts (text will be taken from COOP_FACT later in Expand per store)
  const isGoodMorning = titleNorm === 'GOODMORNING';

  return {
    json: {
      id: num(d.id),
      status: num(d.status),
      region: num(d.region),
      post_type: num(d.post_type),

      send_tg: bool1(d.send_tg),
      send_max: bool1(d.send_max), // NEW
      send_vk: bool1(d.send_vk),
      send_site: bool1(d.send_site),

      // debug flag for telegram routing (1 = send to test channel)
      tg_debug: num(d.tg_debug),

      title: titleStr,
      text: d.text ?? '',
      parse_mode: num(d.parse_mode) ?? 0,

      media_raw: d.media_url ?? '',

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

      // NEW: flag for downstream logic
      _goodmorning: isGoodMorning,

      // исходная строка целиком (включая колонки точек)
      _raw: d,
    },
  };
});
