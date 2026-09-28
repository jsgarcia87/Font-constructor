/* =========================================================================
   FORJA HERÁLDICA — interfaz
   ========================================================================= */
(function () {
  const E = window.BlasonEngine;
  const R = window.BlasonRender;
  const X = window.BlasonExport;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  const LS_GLYPHS = 'forja-heraldica:glyphs:v1';
  const LS_STYLE = 'forja-heraldica:style:v1';

  const deep = o => JSON.parse(JSON.stringify(o));
  function merge(base, patch) {
    const out = deep(base);
    for (const k in patch) {
      if (patch[k] && typeof patch[k] === 'object' && !Array.isArray(patch[k])) out[k] = merge(out[k] || {}, patch[k]);
      else out[k] = patch[k];
    }
    return out;
  }
  const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  function setPath(o, p, v) {
    const ks = p.split('.'); let a = o;
    ks.slice(0, -1).forEach(k => { a = a[k] = a[k] || {}; });
    a[ks[ks.length - 1]] = v;
  }

  function toast(msg, ms = 2600) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), ms);
  }
  const storage = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }
  };

  /* ---------------------------- esmaltes ------------------------------ */
  const TINCTURES = [
    ['Oro', '#e0b04c'], ['Plata (argén)', '#eef0f2'], ['Crema', '#f1e2bd'], ['Gules', '#b3262f'],
    ['Azur', '#2451a4'], ['Sable', '#17151a'], ['Sinople', '#2f7d3f'], ['Púrpura', '#6e2f86'],
    ['Naranjado', '#c8661e'], ['Sanguino', '#7a1d2a'], ['Bronce', '#9a6b2f'], ['Pergamino', '#e6d3a8']
  ];

  /* ---------------------------- presets ------------------------------- */
  const PRESETS = [
    { name: 'Blanc IX', style: {
      fill: { mode: 'solid', c1: '#f1e2bd' }, bevel: false, outline: { size: 0 }, shadow: { x: 0, y: 0 },
      cap: { on: false }, bg: { mode: 'leather', c1: '#2451a4', frame: false } } },
    { name: 'Oro sobre gules', style: {
      fill: { mode: 'metal', c1: '#e0a93a' }, bevel: false, outline: { size: 1, color: '#2a0d08' },
      shadow: { x: 1, y: 1, color: '#3d0a0e' }, cap: { on: false },
      bg: { mode: 'banner', c1: '#a61e28', frame: true, frameColor: '#e0b04c' } } },
    { name: 'Manuscrito iluminado', style: {
      fill: { mode: 'solid', c1: '#2a1c12' }, bevel: false, outline: { size: 0 }, shadow: { x: 0, y: 0 },
      cap: { on: true, box: '#2451a4', letter: '#e8b640', border: '#b3262f' },
      bg: { mode: 'parchment', c1: '#ead7ac', c2: '#b88f55', frame: true, frameColor: '#8a2a22' } } },
    { name: 'Sable y argén', style: {
      fill: { mode: 'solid', c1: '#e7e9ee' }, bevel: true, outline: { size: 1, color: '#000000' },
      shadow: { x: 0, y: 2, color: '#000000' }, cap: { on: false },
      bg: { mode: 'lozengy', c1: '#1b1a20', c2: '#2a2932', check: 4, frame: true, frameColor: '#bfc3cc' } } },
    { name: 'Grimorio', style: {
      fill: { mode: 'gradient', c1: '#b6f07c', c2: '#1f7a4a', steps: 4 }, bevel: false,
      outline: { size: 1, color: '#07130b' }, shadow: { x: 2, y: 2, color: '#000000' }, cap: { on: false },
      bg: { mode: 'leather', c1: '#1c1712', frame: true, frameColor: '#6b5a3a' } } },
    { name: 'Torneo', style: {
      fill: { mode: 'fess', c1: '#f4f1e8', c2: '#e0b04c' }, bevel: false, outline: { size: 2, color: '#14100c' },
      shadow: { x: 0, y: 0 }, cap: { on: false },
      bg: { mode: 'checky', c1: '#2451a4', c2: '#b3262f', check: 5, frame: true, frameColor: '#e0b04c' } } },
    { name: 'Plata azur', style: {
      fill: { mode: 'metal', c1: '#b9c3d3' }, bevel: false, outline: { size: 1, color: '#0b1433' },
      shadow: { x: 1, y: 2, color: '#081026' }, cap: { on: false },
      bg: { mode: 'banner', c1: '#2451a4', frame: true, frameColor: '#dfe5ee' } } },
    { name: 'Sello de lacre', style: {
      fill: { mode: 'solid', c1: '#8e1620' }, bevel: true, outline: { size: 0 }, shadow: { x: 1, y: 1, color: '#c9b48a' },
      cap: { on: false }, bg: { mode: 'none', frame: false } } }
  ];

  /* ------------------------------ estado ------------------------------ */
  const BASE = merge(R.DEFAULT_STYLE, { scale: 8 });
  let S = merge(BASE, PRESETS[0].style);
  try {
    const saved = JSON.parse(storage.get(LS_STYLE) || 'null');
    if (saved) S = merge(S, saved);
  } catch (e) { /* estilo guardado corrupto */ }

  function loadGlyphs() {
    try {
      const raw = storage.get(LS_GLYPHS);
      if (!raw) return;
      const o = JSON.parse(raw);
      for (const [ch, g] of Object.entries(o)) E.setOverride(ch, X.deserializeGlyph(g));
    } catch (e) { console.warn('No se pudieron cargar los glifos guardados', e); }
  }
  function saveGlyphs() {
    const o = {};
    for (const ch of Object.keys(E.overrides)) o[ch] = X.serializeGlyph(E.overrides[ch]);
    storage.set(LS_GLYPHS, JSON.stringify(o));
  }
  let styleSaveT;
  function saveStyle() {
    clearTimeout(styleSaveT);
    styleSaveT = setTimeout(() => storage.set(LS_STYLE, JSON.stringify(S)), 300);
  }
  loadGlyphs();
  const LS_TRANSFORM = 'forja-heraldica:transform:v1';
  try {
    const t = JSON.parse(storage.get(LS_TRANSFORM) || 'null');
    if (t) E.setTransform(t);
  } catch (e) { /* transformación guardada corrupta */ }

  /* ------------------------------ pestañas ---------------------------- */
  function showTab(id) {
    $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
    $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + id));
    if (id === 'alpha') buildAlphabet();
    if (id === 'edit') drawEditor();
    if (id === 'gen') renderPreview();
  }
  $$('.tab-btn').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));

  /* ============================ GENERADOR ============================= */
  const preview = $('#previewCanvas');
  let lastBuf = null;

  function renderPreview() {
    S.text = $('#textInput').value;
    lastBuf = R.render(S);
    // En pantalla se reduce a un múltiplo entero si no cabe (la descarga usa el tamaño elegido)
    const avail = $('#canvasWrap').clientWidth - 32;
    const fit = avail > 0 ? Math.max(1, Math.floor(avail / lastBuf.w)) : S.scale;
    const shown = Math.min(S.scale, fit);
    R.toCanvas(lastBuf, shown, preview);
    $('#stageInfo').textContent =
      `${lastBuf.w} × ${lastBuf.h} px de arte · exporta ×${S.scale} = ${lastBuf.w * S.scale} × ${lastBuf.h * S.scale} px` +
      (shown < S.scale ? ` · vista ×${shown}` : '');
  }

  // Enlace automático de controles con data-k
  function syncControls() {
    $$('[data-k]').forEach(el => {
      const v = getPath(S, el.dataset.k);
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = v;
    });
    $$('[data-out]').forEach(o => { o.textContent = getPath(S, o.dataset.out); });
    $$('[data-show]').forEach(el => {
      const [path, vals] = el.dataset.show.split(':');
      const v = String(getPath(S, path));
      el.dataset.hidden = vals.split(',').includes(v) ? 'false' : 'true';
    });
  }
  $$('[data-k]').forEach(el => {
    el.addEventListener('input', () => {
      let v = el.type === 'checkbox' ? el.checked : el.value;
      if (el.type === 'range' || el.dataset.k === 'weight') v = Number(v);
      setPath(S, el.dataset.k, v);
      $$('.preset').forEach(p => p.classList.remove('active'));
      syncControls(); renderPreview(); saveStyle();
    });
  });
  $('#textInput').addEventListener('input', () => { renderPreview(); saveStyle(); });

  // Esmaltes heráldicos (paletas rápidas)
  $$('.tinctures').forEach(box => {
    const target = box.dataset.target;
    for (const [name, col] of TINCTURES) {
      const b = document.createElement('button');
      b.className = 'tincture'; b.title = name; b.style.background = col;
      b.setAttribute('aria-label', name);
      b.addEventListener('click', () => {
        setPath(S, target, col);
        if (target === 'bg.c1' && S.bg.mode === 'none') S.bg.mode = 'solid';
        syncControls(); renderPreview(); saveStyle();
      });
      box.appendChild(b);
    }
  });

  // Ornamentos insertables
  const ORN = '⚜✠☩♔⚔❦☙✦♥†§«»';
  Array.from(ORN).forEach(ch => {
    const b = document.createElement('button');
    b.textContent = ch; b.title = 'Insertar ' + ch;
    b.addEventListener('click', () => {
      const ta = $('#textInput');
      const s = ta.selectionStart ?? ta.value.length, e = ta.selectionEnd ?? ta.value.length;
      ta.value = ta.value.slice(0, s) + ch + ta.value.slice(e);
      ta.focus(); ta.selectionStart = ta.selectionEnd = s + ch.length;
      renderPreview(); saveStyle();
    });
    $('#insertChips').appendChild(b);
  });

  // Presets con miniatura
  function buildPresets() {
    const box = $('#presets'); box.innerHTML = '';
    PRESETS.forEach(p => {
      const b = document.createElement('button');
      b.className = 'preset';
      const st = merge(merge(BASE, p.style), { text: 'Blanc', padX: 4, padY: 2, align: 'left' });
      const cv = R.toCanvas(R.render(st), 1);
      b.appendChild(cv);
      const sp = document.createElement('span'); sp.textContent = p.name; b.appendChild(sp);
      b.addEventListener('click', () => {
        const keep = { text: S.text, scale: S.scale, tracking: S.tracking, leading: S.leading,
          weight: S.weight, align: S.align, padX: S.padX, padY: S.padY };
        S = merge(merge(BASE, p.style), keep);
        $$('.preset').forEach(x => x.classList.remove('active')); b.classList.add('active');
        syncControls(); renderPreview(); saveStyle();
      });
      box.appendChild(b);
    });
  }

  // Descargas de imagen
  const fileBase = () => X.slug(($('#textInput').value.split('\n')[0] || 'texto').slice(0, 40));
  $('#btnPNG').addEventListener('click', () => {
    const c = R.toCanvas(lastBuf, S.scale);
    c.toBlob(b => { X.download(fileBase() + '.png', b); toast('PNG descargado'); }, 'image/png');
  });
  $('#btnSVG').addEventListener('click', () => {
    X.download(fileBase() + '.svg', R.toSVG(lastBuf, S.scale), 'image/svg+xml');
    toast('SVG descargado (vectorial, píxeles como rectángulos)');
  });
  $('#btnCopy').addEventListener('click', async () => {
    try {
      const c = R.toCanvas(lastBuf, S.scale);
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast('Imagen copiada al portapapeles');
    } catch (e) { toast('Tu navegador no permite copiar imágenes; usa «Descargar PNG».'); }
  });
  $('#checkerToggle').addEventListener('change', e => $('#canvasWrap').classList.toggle('checker', e.target.checked));

  // Cabecera dibujada con la propia fuente
  function drawBrand() {
    const st = merge(BASE, {
      text: 'Forja Heráldica', padX: 1, padY: 1, align: 'left',
      fill: { mode: 'metal', c1: '#e0a93a' }, outline: { size: 1, color: '#1a0f05' },
      shadow: { x: 1, y: 1, color: '#000000' }, bevel: false, cap: { on: false }, bg: { mode: 'none', frame: false }
    });
    const small = window.matchMedia('(max-width: 600px)').matches;
    const saved = { ...E.transform };
    E.resetTransform();                       // la cabecera siempre con el diseño original
    R.toCanvas(R.render(st), small ? 1 : 2, $('#brandCanvas'));
    E.setTransform(saved);
  }

  /* ============================ FUENTE / OTF ========================== */
  const fontOpts = () => ({
    familyName: ($('#fontName').value || 'Blason Pixel').trim(),
    weight: Number($('#fontWeight').value)
  });
  function needOpentype() {
    if (!window.opentype) { toast('No se pudo cargar opentype.js (se necesita conexión la primera vez).', 4000); return false; }
    return true;
  }
  function downloadOTF(opts) {
    if (!needOpentype()) return;
    try {
      const buf = X.fontBuffer(opts);
      X.download(X.slug(opts.familyName) + (opts.weight ? '-bold' : '') + '.otf', buf, 'font/otf');
      toast('Fuente .OTF descargada — instálala con doble clic');
    } catch (e) { console.error(e); toast('Error al generar la fuente: ' + e.message, 5000); }
  }
  $('#btnOTF').addEventListener('click', () => downloadOTF(fontOpts()));
  $('#btnOTFQuick').addEventListener('click', () => downloadOTF({ familyName: $('#fontName').value || 'Blason Pixel', weight: S.weight }));
  $('#btnCSS').addEventListener('click', () => {
    if (!needOpentype()) return;
    const o = fontOpts();
    X.download(X.slug(o.familyName) + '.css', X.webKitCSS(o), 'text/css');
    toast('Kit web descargado (la fuente va incrustada en el CSS)');
  });
  $('#btnSprite').addEventListener('click', () => {
    const { canvas } = X.spriteSheet({ weight: fontOpts().weight });
    canvas.toBlob(b => X.download(X.slug(fontOpts().familyName) + '-sprite.png', b));
  });
  $('#btnSpriteJSON').addEventListener('click', () => {
    const { meta } = X.spriteSheet({ weight: fontOpts().weight });
    X.download(X.slug(fontOpts().familyName) + '-sprite.json', JSON.stringify(meta, null, 1), 'application/json');
  });
  $('#btnSaveProject').addEventListener('click', () => {
    X.download(X.slug(fontOpts().familyName) + '-proyecto.json', X.exportProject(fontOpts().familyName), 'application/json');
    toast(`Proyecto guardado (${Object.keys(E.overrides).length} glifos editados)`);
  });
  $('#fileProject').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const r = X.importProject(await f.text());
      if (r.name) $('#fontName').value = r.name;
      transformChanged(); glyphsChanged(); buildAlphabet(true);
      toast(`Proyecto cargado: ${r.count} glifos`);
    } catch (err) { toast('No se pudo leer el proyecto: ' + err.message, 4000); }
    e.target.value = '';
  });
  $('#btnResetAll').addEventListener('click', () => {
    if (!Object.keys(E.overrides).length) { toast('No hay glifos editados.'); return; }
    if (!confirm('¿Restaurar todos los glifos a su diseño original? Se perderán tus ediciones.')) return;
    E.clearAllOverrides(); glyphsChanged(); buildAlphabet(true); loadEditorChar(editChar);
    toast('Glifos restaurados');
  });

  // Fuente instalada en vivo (FontFace) para probarla como texto real
  let liveT, liveFace = null;
  function rebuildLiveFont() {
    clearTimeout(liveT);
    liveT = setTimeout(async () => {
      if (!window.opentype || !window.FontFace) { $('#liveFontStatus').textContent = 'Necesita opentype.js y un navegador moderno.'; return; }
      try {
        const buf = X.fontBuffer({ familyName: 'Blason Pixel Live', weight: 0 });
        const face = new FontFace('Blason Pixel Live', buf);
        await face.load();
        if (liveFace) document.fonts.delete(liveFace);
        document.fonts.add(face); liveFace = face;
        $('#liveFontStatus').textContent = 'Fuente compilada y cargada en el navegador. Escribe para probarla:';
      } catch (e) {
        console.error(e); $('#liveFontStatus').textContent = 'No se pudo compilar la fuente: ' + e.message;
      }
    }, 400);
  }
  $('#liveSize').addEventListener('change', e => { $('#liveText').style.fontSize = e.target.value + 'px'; });

  /* ============================ ABECEDARIO ============================ */
  let alphaVersion = -1;
  function glyphThumb(ch) {
    const g = E.display(ch) || E.blank(6);
    const cv = document.createElement('canvas');
    cv.width = Math.max(g.w, 6); cv.height = E.H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#f1e2bd';
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.d[y * g.w + x]) ctx.fillRect(x, y, 1, 1);
    return cv;
  }
  function buildAlphabet(force) {
    if (!force && alphaVersion === E.version && $('#alphabet').childElementCount) return;
    alphaVersion = E.version;
    const root = $('#alphabet'); root.innerHTML = '';
    const cats = Object.entries(E.CHARSET);
    const custom = E.customChars();
    if (custom.length) cats.push(['Personalizados', custom.join('')]);
    let total = 0;
    for (const [name, chars] of cats) {
      const sec = document.createElement('div'); sec.className = 'cat';
      const list = Array.from(chars).filter(c => c !== ' ');
      total += list.length;
      sec.innerHTML = `<h3>${name} · ${list.length}</h3>`;
      const grid = document.createElement('div'); grid.className = 'grid';
      for (const ch of list) {
        const card = document.createElement('div');
        card.className = 'gcard' + (E.hasOverride(ch) ? ' edited' : '');
        card.title = `${ch}  U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')} — clic para editar`;
        card.appendChild(glyphThumb(ch));
        const s = document.createElement('small'); s.textContent = ch; card.appendChild(s);
        card.addEventListener('click', () => { loadEditorChar(ch); showTab('edit'); });
        grid.appendChild(card);
      }
      sec.appendChild(grid); root.appendChild(sec);
    }
    $('#glyphCount').textContent = `${total} glifos: mayúsculas, minúsculas, cifras, acentos de las lenguas europeas, puntuación, símbolos y ornamentos heráldicos.`;
    $('#footStatus').textContent = `${total} glifos · ${Object.keys(E.overrides).length} editados`;
  }

  /* ============================== EDITOR ============================== */
  const ed = $('#editorCanvas');
  let editChar = 'B';
  let work = null;       // matriz en edición
  let tool = 'pen';
  let cell = 22;

  function charInfo(ch) {
    const cp = ch.codePointAt(0);
    let kind = 'Símbolo';
    if (/\p{Lu}/u.test(ch)) kind = 'Mayúscula';
    else if (/\p{Ll}/u.test(ch)) kind = 'Minúscula';
    else if (/\p{N}/u.test(ch)) kind = 'Cifra';
    else if (/\p{P}/u.test(ch)) kind = 'Puntuación';
    let origin = E.hasOverride(ch) ? 'editado' : E.isComposed(ch) ? 'compuesto' : E.originalGlyph(ch) ? 'original' : 'nuevo';
    if (E.isComposed(ch) && !E.hasOverride(ch)) {
      const base = window.BLASON_GLYPHS.COMPOSE[ch][0];
      origin += ` (${base} + marca)`;
    }
    const note = E.isIdentity() ? '' : ' · la vista previa incluye la transformación global';
    return `U+${cp.toString(16).toUpperCase().padStart(4, '0')} · ${kind} · ${work.w} col · ${origin}${note}`;
  }

  function loadEditorChar(ch) {
    editChar = ch;
    $('#charInput').value = ch;
    const g = E.glyph(ch);
    work = g ? E.clone(g) : E.blank(8);
    if (work.h !== E.H) { const n = E.blank(work.w); n.d.set(work.d.subarray(0, n.d.length)); work = n; }
    drawEditor();
  }

  function commit() {
    E.setOverride(editChar, E.clone(work));
    glyphsChanged();
    $('#charMeta').textContent = charInfo(editChar);
  }

  let saveT;
  function glyphsChanged() {
    clearTimeout(saveT); saveT = setTimeout(saveGlyphs, 250);
    renderPreview(); drawEditorPreview(); rebuildLiveFont();
    $('#footStatus').textContent = `${E.allChars().length} glifos · ${Object.keys(E.overrides).length} editados`;
  }

  function drawEditor() {
    if (!work) return;
    const wrap = $('.editor-canvas-wrap');
    const availW = Math.max(200, wrap.clientWidth - 40), availH = Math.max(300, wrap.clientHeight - 40);
    const cols = work.w + 2; // una columna de margen a cada lado
    cell = Math.max(10, Math.min(30, Math.floor(Math.min(availW / cols, availH / E.H))));
    if (!$('#tab-edit').classList.contains('active')) cell = 22;
    ed.width = cols * cell; ed.height = E.H * cell;
    const ctx = ed.getContext('2d');
    const M = E.METRICS;
    const top = M.top, xTop = E.X_TOP_ROW, base = E.BASELINE_ROW + 1;

    // zonas
    for (let y = 0; y < E.H; y++) {
      ctx.fillStyle = y < top ? '#1b1733' : y >= base ? '#132519' : (y >= xTop ? '#141c34' : '#171a30');
      ctx.fillRect(0, y * cell, ed.width, cell);
    }
    // columnas de margen
    ctx.fillStyle = '#0006';
    ctx.fillRect(0, 0, cell, ed.height); ctx.fillRect(ed.width - cell, 0, cell, ed.height);

    // fantasma del original
    const orig = E.originalGlyph(editChar);
    if (orig && E.hasOverride(editChar)) {
      ctx.fillStyle = '#ffffff14';
      for (let y = 0; y < orig.h; y++) for (let x = 0; x < orig.w; x++)
        if (orig.d[y * orig.w + x]) ctx.fillRect((x + 1) * cell, y * cell, cell, cell);
    }
    // píxeles
    for (let y = 0; y < work.h; y++) for (let x = 0; x < work.w; x++) {
      if (!work.d[y * work.w + x]) continue;
      const X0 = (x + 1) * cell, Y0 = y * cell;
      ctx.fillStyle = '#f1e2bd'; ctx.fillRect(X0, Y0, cell, cell);
      ctx.fillStyle = '#ffffff55'; ctx.fillRect(X0, Y0, cell, 2);
      ctx.fillStyle = '#00000033'; ctx.fillRect(X0, Y0 + cell - 2, cell, 2);
    }
    // rejilla
    ctx.strokeStyle = '#ffffff12'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= cols; x++) { ctx.moveTo(x * cell + .5, 0); ctx.lineTo(x * cell + .5, ed.height); }
    for (let y = 0; y <= E.H; y++) { ctx.moveTo(0, y * cell + .5); ctx.lineTo(ed.width, y * cell + .5); }
    ctx.stroke();
    // guías
    const guide = (row, col) => { ctx.fillStyle = col; ctx.fillRect(0, row * cell - 1, ed.width, 2); };
    guide(top, '#e0b04c'); guide(xTop, '#4fa3d9'); guide(base, '#e05a5a'); guide(E.H, '#58b36a');
    // borde del avance
    ctx.fillStyle = '#e0b04c66';
    ctx.fillRect((work.w + 1) * cell - 1, 0, 2, ed.height);

    $('#charMeta').textContent = charInfo(editChar);
    drawEditorPreview();
  }

  function drawEditorPreview() {
    const sample = $('#editorSample').value || 'Blanc IX';
    const common = { padX: 4, padY: 3, scale: 1, align: 'left', tracking: 1, leading: 3, weight: 0,
      fill: { mode: 'solid', c1: '#f1e2bd' }, bevel: false, outline: { size: 0 }, shadow: { x: 0, y: 0 },
      cap: { on: false }, bg: { mode: 'solid', c1: '#2451a4', frame: false } };
    const a = R.render(merge(BASE, { ...common, text: sample }));
    const w1 = $('.editor-preview').clientWidth - 54;
    R.toCanvas(a, Math.max(1, Math.min(4, Math.floor(w1 / a.w))), $('#editorPreview'));
    const ch = editChar;
    const b = R.render(merge(BASE, { ...common, text: `n${ch}n H${ch}H\no${ch}o ${ch}${ch}${ch}`, bg: { mode: 'solid', c1: '#1c1712' } }));
    R.toCanvas(b, Math.max(1, Math.min(4, Math.floor(w1 / b.w))), $('#editorPreview2'));
  }

  // Pintura con puntero (ratón, lápiz o dedo)
  let painting = false, paintVal = 1, lastCell = null;
  function cellAt(ev) {
    const r = ed.getBoundingClientRect();
    const x = Math.floor((ev.clientX - r.left) * (ed.width / r.width) / cell) - 1;
    const y = Math.floor((ev.clientY - r.top) * (ed.height / r.height) / cell);
    return { x, y };
  }
  function paintAt(p) {
    if (p.y < 0 || p.y >= E.H) return;
    if (p.x < 0 || p.x >= work.w) return;
    const k = p.x + ',' + p.y;
    if (k === lastCell) return;
    lastCell = k;
    work.d[p.y * work.w + p.x] = paintVal;
    drawEditor();
  }
  ed.addEventListener('contextmenu', e => e.preventDefault());
  ed.addEventListener('pointerdown', e => {
    e.preventDefault();
    const p = cellAt(e);
    if (p.x < 0 || p.x >= work.w || p.y < 0 || p.y >= E.H) return;
    const cur = work.d[p.y * work.w + p.x];
    paintVal = (tool === 'eraser' || e.button === 2) ? 0 : (cur ? 0 : 1);
    painting = true; lastCell = null;
    ed.setPointerCapture(e.pointerId);
    paintAt(p);
  });
  ed.addEventListener('pointermove', e => { if (painting) paintAt(cellAt(e)); });
  const endPaint = () => { if (painting) { painting = false; commit(); } };
  ed.addEventListener('pointerup', endPaint);
  ed.addEventListener('pointercancel', endPaint);

  $$('.tool').forEach(b => b.addEventListener('click', () => {
    tool = b.dataset.tool;
    $$('.tool').forEach(x => x.classList.toggle('active', x === b));
  }));

  function resize(newW) {
    newW = Math.max(1, Math.min(32, newW));
    const n = E.blank(newW);
    for (let y = 0; y < E.H; y++) for (let x = 0; x < Math.min(newW, work.w); x++) n.d[y * newW + x] = work.d[y * work.w + x];
    work = n; commit(); drawEditor();
  }
  $('#btnWiden').addEventListener('click', () => resize(work.w + 1));
  $('#btnNarrow').addEventListener('click', () => resize(work.w - 1));
  $$('[data-shift]').forEach(b => b.addEventListener('click', () => {
    const [dx, dy] = b.dataset.shift.split(',').map(Number);
    const n = E.blank(work.w);
    for (let y = 0; y < E.H; y++) for (let x = 0; x < work.w; x++)
      if (work.d[y * work.w + x]) E.set(n, x + dx, y + dy);
    work = n; commit(); drawEditor();
  }));
  $('#btnFlip').addEventListener('click', () => {
    const n = E.blank(work.w);
    for (let y = 0; y < E.H; y++) for (let x = 0; x < work.w; x++)
      if (work.d[y * work.w + x]) E.set(n, work.w - 1 - x, y);
    work = n; commit(); drawEditor();
  });
  $('#btnClear').addEventListener('click', () => { work = E.blank(work.w); commit(); drawEditor(); });
  $('#btnCopyFrom').addEventListener('click', () => {
    const c = prompt('¿De qué carácter quieres copiar el dibujo?', 'O');
    if (!c) return;
    const src = E.glyph(Array.from(c)[0]);
    if (!src) { toast('Ese carácter no existe en la fuente.'); return; }
    work = E.clone(src); commit(); drawEditor();
  });
  $('#btnRestore').addEventListener('click', () => {
    E.clearOverride(editChar); glyphsChanged(); loadEditorChar(editChar);
    toast(E.originalGlyph(editChar) ? 'Glifo restaurado al diseño original' : 'Carácter personalizado eliminado');
  });

  function step(dir) {
    const all = E.allChars().filter(c => c !== ' ');
    const i = all.indexOf(editChar);
    loadEditorChar(all[(i + dir + all.length) % all.length] || 'A');
  }
  $('#btnPrev').addEventListener('click', () => step(-1));
  $('#btnNext').addEventListener('click', () => step(1));
  $('#charInput').addEventListener('input', e => {
    const ch = Array.from(e.target.value.trim()).pop();
    if (ch) loadEditorChar(ch);
  });
  $('#editorSample').addEventListener('input', drawEditorPreview);

  let resizeT;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { drawEditor(); drawBrand(); renderPreview(); }, 120);
  });

  /* ===================== TRANSFORMAR EL ABECEDARIO ==================== */
  const XFORM_PRESETS = [
    ['Original', {}],
    ['Negrita', { weightX: 1 }],
    ['Extra negra', { weightX: 2, weightY: 1 }],
    ['Fina', { weightX: -1 }],
    ['8 bits', { block: 2, weightX: 1 }],
    ['Mosaico', { block: 3, weightX: 1, threshold: 55 }],
    ['Expandida', { scaleX: 1.5 }],
    ['Condensada', { scaleX: 0.75 }],
    ['Cursiva', { slant: 2 }],
    ['Hueca', { weightX: 2, stroke: 'hollow' }],
    ['Grabada', { weightX: 1, weightY: 1, stroke: 'engraved' }],
    ['Sombreada', { weightX: 2, stroke: 'shadowed' }]
  ];
  const tLabel = {
    weightX: v => (v > 0 ? '+' : '') + v + ' px',
    weightY: v => '+' + v + ' px',
    block: v => v == 1 ? 'original' : v + '×' + v,
    threshold: v => v + ' %',
    slant: v => ['recta', 'suave', 'media', 'fuerte'][v] || v
  };

  function syncTransform() {
    const t = E.transform;
    $$('[data-t]').forEach(el => { el.value = String(t[el.dataset.t]); });
    $$('[data-tout]').forEach(o => {
      const k = o.dataset.tout, f = tLabel[k];
      o.textContent = f ? f(t[k]) : t[k];
    });
    $$('[data-tshow]').forEach(el => { el.dataset.hidden = Number(t[el.dataset.tshow]) > 1 ? 'false' : 'true'; });
    const key = E.transformKey;
    $$('.xform-presets button').forEach(b => {
      const t2 = JSON.stringify({ ...E.DEFAULT_TRANSFORM, ...XFORM_PRESETS[b.dataset.i][1] });
      b.classList.toggle('active', t2 === key);
    });
  }

  let xformT;
  function transformChanged() {
    syncTransform();
    storage.set(LS_TRANSFORM, JSON.stringify(E.transform));
    renderPreview(); drawEditorPreview();
    if (editChar && work) $('#charMeta').textContent = charInfo(editChar);
    clearTimeout(xformT);
    xformT = setTimeout(() => {           // lo costoso, agrupado
      buildPresets(); buildAlphabet(true); rebuildLiveFont();
    }, 150);
  }

  $$('.xform-presets').forEach(box => {
    XFORM_PRESETS.forEach(([name, t], i) => {
      const b = document.createElement('button');
      b.textContent = name; b.dataset.i = i;
      b.addEventListener('click', () => { E.resetTransform(); E.setTransform(t); transformChanged(); });
      box.appendChild(b);
    });
  });
  $$('[data-t]').forEach(el => el.addEventListener('input', () => {
    const k = el.dataset.t;
    E.setTransform({ [k]: k === 'stroke' ? el.value : Number(el.value) });
    transformChanged();
  }));
  $$('.xform-reset').forEach(b => b.addEventListener('click', () => { E.resetTransform(); transformChanged(); }));
  $$('.xform-bake').forEach(b => b.addEventListener('click', () => {
    if (E.isIdentity()) { toast('No hay ninguna transformación activa.'); return; }
    if (!confirm('Se guardará la transformación como el nuevo dibujo de todos los glifos, para que puedas retocarlos en el editor.\n\nLos acentos quedarán fijados (ya no se regenerarán al editar la letra base). Siempre puedes volver al diseño original con «Restaurar todos los glifos».\n\n¿Continuar?')) return;
    const n = E.bakeTransform();
    transformChanged(); glyphsChanged(); loadEditorChar(editChar);
    toast(`Transformación fijada en ${n} glifos`);
  }));

  /* ------------------------------ arranque ---------------------------- */
  $('#textInput').value = S.text || 'Blanc IX';
  buildPresets();
  syncControls();
  syncTransform();
  drawBrand();
  renderPreview();
  loadEditorChar('B');
  buildAlphabet(true);
  window.addEventListener('load', rebuildLiveFont);
  if (document.readyState === 'complete') rebuildLiveFont();
})();
