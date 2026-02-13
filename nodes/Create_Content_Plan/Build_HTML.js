return [
  {
    json: {
      html: `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Контент-план</title>
  <style>
    :root{
      --border:#e6e6e6;
      --head:#f6f6f6;
      --muted:#666;
      --bg:#fff;
      --card:#ffffff;
      --cardBorder:#efefef;
      --errorBg:#fff0f0;
      --errorBorder:#f2bcbc;
      --errorText:#b00;
      --chipBg:#f3f3f3;
      --chipBorder:#e2e2e2;
      --shadow: 0 10px 24px rgba(0,0,0,0.08);
      --hoverRing: 0 0 0 3px rgba(0,0,0,0.14);

      --overlay: rgba(0,0,0,0.46);
      --tgBg: #0b141b;
      --tgCard: #17212b;
      --tgCard2: #1f2c3a;
      --tgText: #e9eef5;
      --tgMuted: rgba(233,238,245,0.68);
      --tgBorder: rgba(255,255,255,0.08);
    }

    *{box-sizing:border-box;}
    body{
      font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
      margin:16px;
      background:var(--bg);
      color:#111;
    }
    h2{margin:0 0 12px 0}

    .row{
      display:flex;
      gap:12px;
      flex-wrap:wrap;
      align-items:center;
      margin-bottom:12px;
    }
    .muted{color:var(--muted); font-size:12px;}

    select,input[type="date"],button{
      padding:6px 10px;
      font-size:14px;
      border:1px solid var(--border);
      border-radius:10px;
      background:#fff;
    }
    button{cursor:pointer;}
    button:active{transform:translateY(1px);}

    /* Верхняя панель */
    .topBar{
      position:sticky;
      top:0;
      z-index:100;
      background:rgba(255,255,255,0.92);
      backdrop-filter:saturate(180%) blur(10px);
      border:1px solid var(--border);
      border-radius:14px;
      padding:10px 12px;
      box-shadow:0 6px 18px rgba(0,0,0,0.04);
      margin-bottom:12px;
    }
    .topBar .row{margin-bottom:0}

    .storesPanel{
      border:1px solid var(--border);
      border-radius:14px;
      padding:10px 12px;
      margin:8px 0 12px 0;
      background:#fff;
    }
    .storesTop{
      display:flex;
      gap:10px;
      align-items:center;
      flex-wrap:wrap;
      margin-bottom:8px;
    }
    .storesTitle{font-weight:700;margin-right:6px;}
    .storesActions{display:flex;gap:8px;flex-wrap:wrap;}
    .storesList{
      display:flex;
      flex-wrap:wrap;
      gap:10px 14px;
      max-height:160px;
      overflow:auto;
      padding-right:6px;
    }
    .storeItem{
      display:flex;
      align-items:center;
      gap:8px;
      white-space:nowrap;
      font-size:13px;
    }
    .storeItem input{transform:translateY(1px);}

    .tableWrap{
      overflow-x:auto;
      border:1px solid var(--border);
      border-radius:14px;
      background:#fff;
      position:relative;
      z-index:1;
    }
    table{
      border-collapse:separate;
      border-spacing:0;
      width:max-content;
      min-width:100%;
      table-layout:fixed;
      background:#fff;
    }
    th,td{
      border-right:1px solid var(--border);
      border-bottom:1px solid var(--border);
      vertical-align:top;
      padding:6px;
      font-size:13px;
      min-width:220px;
    }

    /* ✅ Заголовки дней НЕ липкие */
    th{
      background:var(--head);
      text-align:center;
      position:static;
      z-index:auto;
    }

    /* левый столбец времени остаётся липким */
    th:first-child, td:first-child{
      position:sticky;
      left:0;
      z-index:6;
      background:#fff;
      min-width:72px;
      width:72px;
      text-align:center;
      font-weight:600;
    }
    thead th:first-child{
      background:var(--head);
      z-index:7;
      left:0;
    }

    .colHead{display:flex;flex-direction:column;gap:2px;align-items:center;line-height:1.1;}
    .colDow{font-weight:800;letter-spacing:0.2px;}
    .colDate{font-size:12px;color:var(--muted);font-weight:600;}

    .item{
      margin:0 0 6px 0;
      padding:8px;
      border:1px solid var(--cardBorder);
      border-radius:12px;
      background:var(--card);
      position:relative;
      transition: box-shadow 120ms ease, transform 120ms ease, border-color 120ms ease;
      cursor:pointer;
      z-index:1;
    }
    .item:last-child{margin-bottom:0}
    .itemTitle{font-weight:800; line-height:1.2;}
    .itemMeta{color:var(--muted); font-size:12px; margin-top:2px}
    .itemChip{
      display:inline-block;
      margin-top:8px;
      padding:3px 9px;
      font-size:12px;
      border-radius:999px;
      background:var(--chipBg);
      border:1px solid var(--chipBorder);
      color:#222;
    }
    /* Разовые посты: другой вид овала */
    .itemChip.once{
      background:transparent;
      border:1px dashed rgba(0,0,0,0.35);
      color:#111;
    }

    .item.pid-colored{
      background: hsla(var(--pid-h), 85%, 94%, 1);
      border-color: hsla(var(--pid-h), 50%, 45%, 0.28);
    }

    .item:hover{
      z-index:20;
      box-shadow: var(--hoverRing), 0 10px 24px rgba(0,0,0,0.10);
      transform: translateY(-1px);
      border-color: hsla(var(--pid-h), 55%, 35%, 0.55);
    }
    .item.pid-hover{
      z-index:20;
      box-shadow: var(--hoverRing), 0 10px 24px rgba(0,0,0,0.10);
      transform: translateY(-1px);
      border-color: hsla(var(--pid-h), 55%, 35%, 0.55);
    }

    .error{
      white-space:pre-wrap;
      color:var(--errorText);
      background:var(--errorBg);
      padding:12px;
      border:1px solid var(--errorBorder);
      border-radius:10px;
    }

    /* === Telegram preview modal === */
    .modal{
      position:fixed;
      inset:0;
      background:var(--overlay);
      display:none;
      align-items:center;
      justify-content:center;
      padding:16px;
      z-index:100000;
    }
    .modal.open{display:flex;}
    .modalCard{
      width:min(720px, 100%);
      max-height:min(92vh, 900px);
      background:var(--tgBg);
      border:1px solid rgba(255,255,255,0.10);
      border-radius:18px;
      box-shadow:0 24px 80px rgba(0,0,0,0.55);
      overflow:hidden;
      display:flex;
      flex-direction:column;
    }
    .modalTop{
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding:10px 12px;
      background:rgba(255,255,255,0.04);
      border-bottom:1px solid rgba(255,255,255,0.08);
    }
    .modalTitle{
      color:var(--tgText);
      font-weight:800;
      font-size:14px;
      display:flex;
      gap:10px;
      align-items:center;
      min-width:0;
    }
    .modalTitle .sub{
      color:var(--tgMuted);
      font-weight:700;
      font-size:12px;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }
    .modalClose{
      border:1px solid rgba(255,255,255,0.12);
      background:rgba(255,255,255,0.06);
      color:var(--tgText);
      border-radius:10px;
      padding:6px 10px;
      cursor:pointer;
      font-weight:800;
    }
    .modalBody{
      padding:14px;
      overflow:auto;
    }
    .tgMessage{
      background:var(--tgCard);
      border:1px solid var(--tgBorder);
      border-radius:18px;
      padding:12px;
      color:var(--tgText);
      max-width:560px;
    }
    .tgMetaRow{
      display:flex;
      align-items:center;
      justify-content:space-between;
      margin-bottom:8px;
      gap:10px;
    }
    .tgChannel{
      font-weight:900;
      font-size:13px;
      color:#8bd1ff;
    }
    .tgTime{
      font-size:12px;
      color:var(--tgMuted);
      font-weight:700;
      white-space:nowrap;
    }
    .tgText{
      white-space:pre-wrap;
      word-break:break-word;
      font-size:14px;
      line-height:1.35;
    }
    .tgMedia{
      margin-top:10px;
      display:grid;
      gap:8px;
    }
    .tgMedia.one{grid-template-columns:1fr;}
    .tgMedia.grid{grid-template-columns:1fr 1fr;}
    .tgMediaItem{
      background:var(--tgCard2);
      border:1px solid var(--tgBorder);
      border-radius:14px;
      overflow:hidden;
      position:relative;
    }
    .tgMediaItem img, .tgMediaItem video{
      display:block;
      width:100%;
      height:auto;
      max-height:360px;
      object-fit:cover;
      background:#000;
    }
    .tgBadge{
      position:absolute;
      left:10px;
      top:10px;
      padding:4px 8px;
      font-size:12px;
      border-radius:999px;
      background:rgba(0,0,0,0.55);
      border:1px solid rgba(255,255,255,0.18);
      color:var(--tgText);
      font-weight:900;
    }
    .tgErr{
      margin-top:10px;
      padding:10px;
      border-radius:12px;
      background:rgba(255,0,0,0.12);
      border:1px solid rgba(255,0,0,0.22);
      color:var(--tgText);
      font-size:13px;
      white-space:pre-wrap;
    }

    /* Tooltip портальный, без полосы прокрутки */
    .portalTip{
      position:fixed;
      width:min(520px, 86vw);
      background:#fff;
      border:1px solid rgba(0,0,0,0.10);
      border-radius:14px;
      box-shadow: 0 18px 50px rgba(0,0,0,0.14);
      padding:12px 12px 10px 12px;
      z-index:200000;
      display:none;
    }
    .portalTip.show{display:block;}
    .portalTip::before{
      content:"";
      position:absolute;
      top:-7px;
      left:20px;
      width:14px;
      height:14px;
      background:#fff;
      border-left:1px solid rgba(0,0,0,0.10);
      border-top:1px solid rgba(0,0,0,0.10);
      transform:rotate(45deg);
    }
    .portalTipTitle{
      font-weight:900;
      margin-bottom:8px;
      font-size:13px;
      display:flex;
      justify-content:space-between;
      gap:10px;
      align-items:center;
    }
    .portalTipCount{
      font-size:12px;
      color:var(--muted);
      font-weight:700;
    }
    .portalTipList{
      margin:0;
      padding:0;
      list-style:none;
      display:flex;
      flex-direction:column;
      gap:6px;
      /* ✅ без скролла */
      max-height:none;
      overflow:visible;
    }
    .portalTipList li{
      font-size:12px;
      color:#111;
      line-height:1.35;
      padding:6px 8px;
      border:1px solid rgba(0,0,0,0.06);
      border-radius:10px;
      background:rgba(0,0,0,0.02);
    }
    .portalTipHint{font-size:12px;color:var(--muted);margin-top:10px;}

    @media (max-width: 520px){
      .topBar{ border-radius:12px; }
      .tgMessage{ max-width:100%; }
      .tgMedia.grid{ grid-template-columns:1fr; }
    }
  
    /* === Mobile accordion (days) === */
    .mobileAcc{display:none;}
    .accDay{border:1px solid var(--border); border-radius:14px; background:#fff; overflow:hidden; margin:0 0 10px 0;}
    .accHead{
      display:flex; align-items:center; justify-content:space-between; gap:10px;
      padding:12px 12px;
      cursor:pointer;
      user-select:none;
    }
    .accHeadLeft{display:flex; flex-direction:column; gap:2px; line-height:1.1;}
    .accDow{font-weight:900; letter-spacing:0.2px;}
    .accDate{font-size:12px; color:var(--muted); font-weight:700;}
    .accChevron{
      width:28px; height:28px;
      display:flex; align-items:center; justify-content:center;
      border:1px solid rgba(0,0,0,0.10);
      border-radius:10px;
      background:rgba(0,0,0,0.02);
      transition: transform 160ms ease;
      flex:0 0 auto;
    }
    .accDay.open .accChevron{ transform: rotate(180deg); }
    .accBody{display:none; padding:10px 10px 12px 10px;}
    .accDay.open .accBody{display:block;}
    .accTime{margin:0 0 10px 0;}
    .accTime:last-child{margin-bottom:0;}
    .accTimeHead{
      font-weight:900;
      font-size:13px;
      color:#111;
      padding:4px 6px;
      border-radius:10px;
      display:inline-block;
      background:rgba(0,0,0,0.03);
      border:1px solid rgba(0,0,0,0.06);
      margin:2px 0 8px 0;
    }
    .accItems{display:flex; flex-direction:column; gap:8px;}
    .accItems .item{ margin:0; } /* keep existing item style, just remove table spacing */

    @media (max-width: 900px){
      body{ margin:12px; }
      .storesList{ max-height: 240px; }
      .tableWrap{ display:none; }
      .mobileAcc{ display:block; }
    }

  </style>
</head>
<body>

<div class="topBar">
  <h2>Контент-план</h2>

  <div class="row">
    <div class="muted">
      Обновлено: <span id="gen">—</span>, горизонт файла: <span id="daysFile">—</span> дн.
    </div>

    <label>
      Регион:
      <select id="region"></select>
    </label>

    <label>
      Старт:
      <input id="startDate" type="date" />
    </label>

    <label>
      Период:
      <select id="period"></select>
    </label>

    <button id="btnToday" type="button">Сегодня</button>
  </div>
</div>

<div class="storesPanel">
  <div class="storesTop">
    <span class="storesTitle">Пункты выдачи</span>
    <span class="muted" id="storesHint">—</span>
    <div class="storesActions">
      <button type="button" id="btnAll">Выбрать все</button>
      <button type="button" id="btnNone">Снять все</button>
    </div>
  </div>
  <div class="storesList" id="storesList"></div>
</div>

<div id="wrap"></div>

<!-- Portal Tooltip -->
<div class="portalTip" id="portalTip">
  <div class="portalTipTitle">
    <span>Пункты выдачи</span>
    <span class="portalTipCount" id="ptCount">—</span>
  </div>
  <ul class="portalTipList" id="ptList"></ul>
  <div class="portalTipHint">Наведи — подсветятся все такие же посты · клик — откроется превью Telegram</div>
</div>

<!-- Telegram preview modal -->
<div class="modal" id="modal">
  <div class="modalCard" role="dialog" aria-modal="true">
    <div class="modalTop">
      <div class="modalTitle">
        <span id="mTitle">Превью Telegram</span>
        <span class="sub" id="mSub">—</span>
      </div>
      <button class="modalClose" id="mClose" type="button">Закрыть</button>
    </div>
    <div class="modalBody">
      <div class="tgMessage">
        <div class="tgMetaRow">
          <div class="tgChannel">Коопторгъ</div>
          <div class="tgTime" id="mTime">—</div>
        </div>

        <div class="tgText" id="mText">—</div>

        <div class="tgMedia one" id="mMedia" style="display:none;"></div>

        <div class="tgErr" id="mErr" style="display:none;"></div>
      </div>
    </div>
  </div>
</div>

<script>
(async () => {
  const DAY_TITLES = ['ВС','ПН','ВТ','СР','ЧТ','ПТ','СБ']; // JS: 0=Sun
  const pad2 = (n) => String(n).padStart(2,'0');

  function escapeHtml(s){
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])
    );
  }

  function ymdFromDateLocal(d){
    return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
  }

  function parseYmdToDateLocal(ymd){
    const [y,m,d] = ymd.split('-').map(Number);
    return new Date(y, m-1, d, 0, 0, 0, 0);
  }

  function addDaysLocal(ymd, add){
    const dt = parseYmdToDateLocal(ymd);
    dt.setDate(dt.getDate() + add);
    return ymdFromDateLocal(dt);
  }

  function ddmmyyyy(ymd){
    return ymd.slice(8,10) + '.' + ymd.slice(5,7) + '.' + ymd.slice(0,4);
  }

  function ddmm(ymd){
    return ymd.slice(8,10) + '.' + ymd.slice(5,7);
  }

  function dowRuFromYmd(ymd){
    const dt = parseYmdToDateLocal(ymd);
    return DAY_TITLES[dt.getDay()];
  }

  function getItemDateYmd(it){
    if (it && typeof it.local_dt === 'string' && it.local_dt.length >= 10) {
      return it.local_dt.slice(0,10);
    }
    const iso = it.utc_iso || it.datetime;
    if (iso) {
      const dt = new Date(iso);
      if (!isNaN(dt)) return ymdFromDateLocal(dt);
    }
    return null;
  }

  function getItemTimeHHMM(it){
    if (it && typeof it.hhmm === 'string' && it.hhmm.length === 5) return it.hhmm;
    if (it && typeof it.local_time === 'string' && it.local_time.length >= 5) return it.local_time.slice(0,5);
    if (it && typeof it.local_dt === 'string' && it.local_dt.length >= 16) return it.local_dt.slice(11,16);
    const iso = it.utc_iso || it.datetime;
    if (iso) {
      const dt = new Date(iso);
      if (!isNaN(dt)) return pad2(dt.getHours()) + ':' + pad2(dt.getMinutes());
    }
    return null;
  }

  function intersectStoreIds(itemStoreIds, selectedIdsSet){
    if (!Array.isArray(itemStoreIds) || itemStoreIds.length === 0) return false;
    for (const id of itemStoreIds) {
      if (selectedIdsSet.has(Number(id))) return true;
    }
    return false;
  }

  function hueFromPostId(postId){
    const str = String(postId ?? '');
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h % 360;
  }

  function parseMediaLines(mediaUrl){
    const lines = String(mediaUrl ?? '')
      .split(/\\r?\\n/)
      .map(s => s.trim())
      .filter(Boolean);

    const out = [];
    for (const ln of lines) {
      if (ln.includes('|')) {
        const [k, ...rest] = ln.split('|');
        const url = rest.join('|').trim();
        const key = (k || '').trim().toLowerCase();
        if (!url) continue;
        if (key === 'в' || key === 'video') out.push({ type:'video', url });
        else out.push({ type:'photo', url });
      } else {
        out.push({ type:'photo', url: ln });
      }
    }
    return out;
  }

  function formatTextByParseMode(text, parseMode){
    return String(text ?? '');
  }

  // ---- load json
  let raw;
  try {
    raw = await fetch('/smmcontent/content-plan.json?_=' + Date.now(), { cache: 'no-store' }).then(r => r.json());
  } catch (e) {
    document.getElementById('wrap').innerHTML =
      '<div class="error">Не удалось загрузить /smmcontent/content-plan.json\\n' + escapeHtml(e) + '</div>';
    return;
  }

  const data =
    Array.isArray(raw) ? (raw[0]?.data ?? raw[0]) : (raw?.data ?? raw);

  if (!data || !data.generated_at_utc || !Array.isArray(data.items)) {
    document.getElementById('wrap').innerHTML =
      '<div class="error">' +
      'Ошибка формата content-plan.json.\\n\\n' +
      'Нужно: { generated_at_utc, days_ahead, items[] }\\n\\n' +
      'Фактически:\\n' +
      escapeHtml(JSON.stringify(raw, null, 2).slice(0, 1500)) +
      '</div>';
    return;
  }

  document.getElementById('gen').textContent =
    String(data.generated_at_utc).replace('T',' ').slice(0,19) + ' UTC';
  document.getElementById('daysFile').textContent = data.days_ahead;

  const itemsAll = data.items;
  const storesCatalogAll = Array.isArray(data.stores_catalog) ? data.stores_catalog : [];
  const postsCatalog = (data.posts_catalog && typeof data.posts_catalog === 'object') ? data.posts_catalog : {};

  const storeById = new Map();
  for (const s of storesCatalogAll) {
    storeById.set(Number(s.store_id), {
      store_id: Number(s.store_id),
      name: String(s.name ?? '').trim() || ('#' + s.store_id),
      region: Number(s.region),
    });
  }

  const regionSel = document.getElementById('region');
  const startInput = document.getElementById('startDate');
  const periodSel = document.getElementById('period');
  const btnToday = document.getElementById('btnToday');

  const storesListEl = document.getElementById('storesList');
  const storesHintEl = document.getElementById('storesHint');
  const btnAll = document.getElementById('btnAll');
  const btnNone = document.getElementById('btnNone');

  // portal tip
  const portalTip = document.getElementById('portalTip');
  const ptCount = document.getElementById('ptCount');
  const ptList = document.getElementById('ptList');
  let tipHideTimer = null;

  function hidePortalTip(){
    portalTip.classList.remove('show');
  }
  function scheduleHideTip(){
    clearTimeout(tipHideTimer);
    tipHideTimer = setTimeout(() => hidePortalTip(), 80);
  }
  function cancelHideTip(){
    clearTimeout(tipHideTimer);
  }
  portalTip.addEventListener('mouseenter', cancelHideTip);
  portalTip.addEventListener('mouseleave', scheduleHideTip);

  // modal
  const modal = document.getElementById('modal');
  const mClose = document.getElementById('mClose');
  const mSub = document.getElementById('mSub');
  const mTime = document.getElementById('mTime');
  const mText = document.getElementById('mText');
  const mMedia = document.getElementById('mMedia');
  const mErr = document.getElementById('mErr');

  function openModal(){ modal.classList.add('open'); }
  function closeModal(){ modal.classList.remove('open'); }
  mClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  periodSel.innerHTML = Array.from({length:14}, (_,i)=>i+1)
    .map(n => '<option value="'+n+'">'+n+' дн.</option>')
    .join('');
  periodSel.value = '14';

  const regions = Array.from(new Set(itemsAll.map(x => x.region))).sort((a,b)=>a-b);
  regionSel.innerHTML = regions.map(r => '<option value="'+r+'">'+r+'</option>').join('');
  regionSel.value = String(regions[0] ?? '');

  const todayYmd = ymdFromDateLocal(new Date());
  startInput.value = todayYmd;

  btnToday.addEventListener('click', () => {
    startInput.value = ymdFromDateLocal(new Date());
    render();
  });

  regionSel.addEventListener('change', () => {
    rebuildStoresUI();
    render();
  });

  startInput.addEventListener('change', render);
  periodSel.addEventListener('change', render);

  btnAll.addEventListener('click', () => {
    for (const cb of storesListEl.querySelectorAll('input[type="checkbox"]')) cb.checked = true;
    render();
  });

  btnNone.addEventListener('click', () => {
    for (const cb of storesListEl.querySelectorAll('input[type="checkbox"]')) cb.checked = false;
    render();
  });

  storesListEl.addEventListener('change', render);

  function getSelectedStoreIds(){
    const ids = [];
    for (const cb of storesListEl.querySelectorAll('input[type="checkbox"]')) {
      if (cb.checked) ids.push(Number(cb.value));
    }
    return ids;
  }

  function rebuildStoresUI(){
    const region = Number(regionSel.value);

    const stores = storesCatalogAll
      .filter(s => Number(s.region) === region)
      .map(s => ({ store_id: Number(s.store_id), name: String(s.name ?? '').trim() || ('#' + s.store_id) }))
      .sort((a,b)=>a.store_id-b.store_id);

    storesListEl.innerHTML = stores.map(s => {
      const id = Number(s.store_id);
      const name = escapeHtml(s.name);
      return '<label class="storeItem">' +
        '<input type="checkbox" value="'+id+'" checked />' +
        '<span>'+name+'</span>' +
      '</label>';
    }).join('');

    storesHintEl.textContent = stores.length ? ('в регионе: ' + stores.length) : 'в регионе: 0';
  }

  function showPortalTipForItem(itemEl, storeNamesArr){
    const rect = itemEl.getBoundingClientRect();

    ptCount.textContent = String(storeNamesArr.length);

    ptList.innerHTML = (storeNamesArr.length ? storeNamesArr : ['—'])
      .map(n => '<li>' + escapeHtml(n) + '</li>')
      .join('');

    const gap = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const tipW = Math.min(520, Math.floor(vw * 0.86));
    portalTip.style.width = tipW + 'px';

    portalTip.style.left = '0px';
    portalTip.style.top = '0px';
    portalTip.classList.add('show');

    const tipRect = portalTip.getBoundingClientRect();
    const tipH = tipRect.height;

    let left = rect.left;
    left = Math.max(8, Math.min(left, vw - tipW - 8));

    let top = rect.bottom + gap;
    if (top + tipH > vh - 8) {
      top = rect.top - gap - tipH;
      top = Math.max(8, top);
    }

    portalTip.style.left = left + 'px';
    portalTip.style.top = top + 'px';
  }

  function bindPostHoverHighlightsAndTooltip(selectedSet, storeById){
    const wrap = document.getElementById('wrap');

    wrap.onmouseover = (ev) => {
      const el = ev.target.closest('.item[data-post-id]');
      if (!el) return;
      const pid = el.getAttribute('data-post-id');
      if (!pid) return;

      const sel = '.item[data-post-id="'+CSS.escape(pid)+'"]';
      for (const same of wrap.querySelectorAll(sel)) same.classList.add('pid-hover');

      cancelHideTip();
      const idsJson = el.getAttribute('data-store-ids') || '[]';
      let ids = [];
      try { ids = JSON.parse(idsJson); } catch(e) { ids = []; }
      const shownIds = (Array.isArray(ids) ? ids : []).map(Number).filter(id => selectedSet.has(id));
      const storeNamesArr = shownIds.map(id => storeById.get(id)?.name || ('#' + id));
      showPortalTipForItem(el, storeNamesArr);
    };

    wrap.onmouseout = (ev) => {
      const el = ev.target.closest('.item[data-post-id]');
      if (!el) return;
      const pid = el.getAttribute('data-post-id');
      if (!pid) return;

      const sel = '.item[data-post-id="'+CSS.escape(pid)+'"]';
      for (const same of wrap.querySelectorAll(sel)) same.classList.remove('pid-hover');

      scheduleHideTip();
    };

    wrap.onclick = (ev) => {
      const el = ev.target.closest('.item[data-post-id]');
      if (!el) return;
      const pid = el.getAttribute('data-post-id');
      if (!pid) return;

      const title = el.getAttribute('data-title') || ('#' + pid);
      const localdt = el.getAttribute('data-localdt') || '';
      showPreview(pid, title, localdt);
    };

    window.addEventListener('scroll', () => hidePortalTip(), true);
    window.addEventListener('resize', () => hidePortalTip());
  }

  function showPreview(pid, title, localdt){
    const p = postsCatalog[String(pid)] || postsCatalog[String(Number(pid))];

    mSub.textContent = (title ? title : ('#' + pid)) + ' · #' + pid;
    mTime.textContent = localdt || '—';

    mErr.style.display = 'none';
    mErr.textContent = '';

    if (!p) {
      mText.textContent = 'Нет данных поста в posts_catalog для post_id=' + pid + '.\\n\\nПроверь, что Build Content Plan пишет posts_catalog в content-plan.json.';
      mMedia.style.display = 'none';
      mMedia.innerHTML = '';
      openModal();
      return;
    }

    mText.textContent = formatTextByParseMode(p.text, p.parse_mode);

    const media = parseMediaLines(p.media_url);
    mMedia.innerHTML = '';
    if (!media.length){
      mMedia.style.display = 'none';
    } else {
      mMedia.style.display = 'grid';
      mMedia.className = 'tgMedia ' + (media.length === 1 ? 'one' : 'grid');

      const show = media;
      for (const m of show) {
        const box = document.createElement('div');
        box.className = 'tgMediaItem';

        const badge = document.createElement('div');
        badge.className = 'tgBadge';
        badge.textContent = (m.type === 'video') ? 'Видео' : 'Фото';
        box.appendChild(badge);

        if (m.type === 'video') {
          const v = document.createElement('video');
          v.src = m.url;
          v.controls = true;
          v.preload = 'metadata';
          box.appendChild(v);
        } else {
          const img = document.createElement('img');
          img.src = m.url;
          img.loading = 'lazy';
          img.alt = '';
          box.appendChild(img);
        }

        mMedia.appendChild(box);
      }
    }

    openModal();
  }

  function render(){
    const region = Number(regionSel.value);
    const startYmd = startInput.value || todayYmd;

    let period = Number(periodSel.value || 14);
    if (!period || period < 1) period = 1;
    if (period > 14) period = 14;

    const endYmd = addDaysLocal(startYmd, period - 1);

    const colDates = [];
    for (let i = 0; i < period; i++) colDates.push(addDaysLocal(startYmd, i));

    const selectedStoreIds = getSelectedStoreIds();
    const selectedSet = new Set(selectedStoreIds);

    const items = itemsAll
      .filter(it => Number(it.region) === region)
      .map(it => {
        const ymd = getItemDateYmd(it);
        const hhmm = getItemTimeHHMM(it);
        return { ...it, _ymd: ymd, _hhmm: hhmm };
      })
      .filter(it =>
        it._ymd && it._hhmm &&
        it._ymd >= startYmd && it._ymd <= endYmd &&
        (selectedSet.size > 0 ? intersectStoreIds(it.store_ids, selectedSet) : false)
      );

    const times = Array.from(new Set(items.map(x => x._hhmm))).sort();

    const map = {};
    for (const t of times) {
      map[t] = {};
      for (const d of colDates) map[t][d] = [];
    }

    for (const it of items) {
      if (map[it._hhmm] && map[it._hhmm][it._ymd]) {
        map[it._hhmm][it._ymd].push(it);
      }
    }

    for (const t of times) {
      for (const d of colDates) {
        map[t][d].sort((a,b) => Number(a.post_id||0) - Number(b.post_id||0));
      }
    }

    const headCols = colDates.map(d => {
      const dow = dowRuFromYmd(d);
      const dateLabel = ddmm(d);
      return '<th><div class="colHead"><div class="colDow">'+dow+'</div><div class="colDate">'+dateLabel+'</div></div></th>';
    }).join('');

    const bodyRows = times.map(t => {
      const cols = colDates.map(d => {
        const arr = map[t][d] || [];
        if (!arr.length) return '<td></td>';

        return '<td>' + arr.map(x => {
          const title = escapeHtml(x.title ?? '');
          const pid = String(x.post_id ?? x.id ?? '');
          const pidEsc = escapeHtml(pid);
          const localdt = escapeHtml(x.local_dt ?? (x._ymd + ' ' + (x.local_time || (t+':00'))) );

          const ids = Array.isArray(x.store_ids) ? x.store_ids.map(Number) : [];
          const shownIds = ids.filter(id => selectedSet.has(id));
          const countStores = shownIds.length;

          const hue = hueFromPostId(pid);

          const isOnce = (x && (x.kind === 'once' || x.source === 'publish_at' || x.is_once === true || x._kind === 'once'));
          const chipClass = 'itemChip' + (isOnce ? ' once' : '');
          const chipText = (isOnce ? 'Разовый · ' : '') + countStores + ' пункт(ов)';

          return '<div class="item pid-colored" data-post-id="'+pidEsc+'" data-title="'+title+'" data-localdt="'+localdt+'" data-store-ids="'+escapeHtml(JSON.stringify(ids))+'" style="--pid-h:'+hue+'">' +
            '<div class="itemTitle">' + title + '</div>' +
            '<div class="itemMeta">#' + pidEsc + ' · ' + localdt + '</div>' +
            '<div class="'+chipClass+'">' + chipText + '</div>' +
          '</div>';
        }).join('') + '</td>';
      }).join('');

      return '<tr><td class="time">' + t + '</td>' + cols + '</tr>';
    }).join('');

    const summary = '<div class="muted" style="margin:8px 0 10px 0;">Период: ' +
      ddmmyyyy(startYmd) + ' — ' + ddmmyyyy(endYmd) +
      ' · колонки: ' + period +
      ' · выбрано пунктов: ' + selectedStoreIds.length +
      '</div>';

    if (selectedStoreIds.length === 0) {
      document.getElementById('wrap').innerHTML =
        summary + '<div class="error">Выберите хотя бы один пункт выдачи.</div>';
      hidePortalTip();
      return;
    }
    if (!times.length) {
      document.getElementById('wrap').innerHTML =
        summary + '<div class="error">Нет событий в выбранном периоде/регионе/пунктах.</div>';
      hidePortalTip();
      return;
    }

    const tableHtml =
      '<div class="tableWrap">' +
        '<table>' +
          '<thead><tr><th>Время</th>' + headCols + '</tr></thead>' +
          '<tbody>' + (bodyRows || '') + '</tbody>' +
        '</table>' +
      '</div>';

    
    // --- Mobile accordion by days ---
    const mobileHtml =
      '<div class="mobileAcc">' +
        colDates.map(d => {
          const dow = dowRuFromYmd(d);
          const dateLabel = ddmm(d);

          // collect times with items for this day
          const dayTimes = times.filter(t => (map[t] && map[t][d] && map[t][d].length));
          if (!dayTimes.length) return '';

          const timeBlocks = dayTimes.map(t => {
            const arr = map[t][d] || [];
            const itemsHtml = arr.map(x => {
              const title = escapeHtml(x.title ?? '');
              const pid = String(x.post_id ?? x.id ?? '');
              const pidEsc = escapeHtml(pid);
              const localdt = escapeHtml(x.local_dt ?? (x._ymd + ' ' + (x.local_time || (t+':00'))) );

              const ids = Array.isArray(x.store_ids) ? x.store_ids.map(Number) : [];
              const shownIds = ids.filter(id => selectedSet.has(id));
              const countStores = shownIds.length;

              const hue = hueFromPostId(pid);

              const isOnce = (x && (x.kind === 'once' || x.source === 'publish_at' || x.is_once === true || x._kind === 'once'));
              const chipClass = 'itemChip' + (isOnce ? ' once' : '');
              const chipText = (isOnce ? 'Разовый · ' : '') + countStores + ' пункт(ов)';

              return '<div class="item pid-colored" data-post-id="'+pidEsc+'" data-title="'+title+'" data-localdt="'+localdt+'" data-store-ids="'+escapeHtml(JSON.stringify(ids))+'" style="--pid-h:'+hue+'">' +
                '<div class="itemTitle">' + title + '</div>' +
                '<div class="itemMeta">#' + pidEsc + ' · ' + localdt + '</div>' +
                '<div class="'+chipClass+'">' + chipText + '</div>' +
              '</div>';
            }).join('');

            return '<div class="accTime">' +
              '<div class="accTimeHead">' + t + '</div>' +
              '<div class="accItems">' + (itemsHtml || '') + '</div>' +
            '</div>';
          }).join('');

          const openClass = (d === startYmd) ? ' open' : '';
          return '<div class="accDay'+openClass+'" data-day="'+escapeHtml(d)+'">' +
            '<div class="accHead" role="button" tabindex="0" aria-expanded="'+(d===startYmd ? 'true' : 'false')+'">' +
              '<div class="accHeadLeft">' +
                '<div class="accDow">'+dow+'</div>' +
                '<div class="accDate">'+dateLabel+'</div>' +
              '</div>' +
              '<div class="accChevron" aria-hidden="true">▾</div>' +
            '</div>' +
            '<div class="accBody">' + (timeBlocks || '') + '</div>' +
          '</div>';
        }).join('') +
      '</div>';

    const wrapEl = document.getElementById('wrap');
    const isMobile = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;

    wrapEl.innerHTML = summary + (isMobile ? mobileHtml : tableHtml);

    // accordion interactions (mobile)
    if (isMobile) {
      const toggle = (dayEl) => {
        const isOpen = dayEl.classList.toggle('open');
        const head = dayEl.querySelector('.accHead');
        if (head) head.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      };

      for (const head of wrapEl.querySelectorAll('.accHead')) {
        head.addEventListener('click', () => {
          const dayEl = head.closest('.accDay');
          if (dayEl) toggle(dayEl);
        });
        head.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const dayEl = head.closest('.accDay');
            if (dayEl) toggle(dayEl);
          }
        });
      }
    }

    bindPostHoverHighlightsAndTooltip(selectedSet, storeById);
}

  rebuildStoresUI();
  render();

  // Re-render on breakpoint change (desktop <-> mobile) to switch table/accordion
  if (window.matchMedia) {
    const mq = window.matchMedia('(max-width: 900px)');
    const onMq = () => { try { render(); } catch(e){} };
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onMq);
    else if (typeof mq.addListener === 'function') mq.addListener(onMq);
  }
})();
</script>

</body>
</html>`
    }
  }
];
