/* =========================================================================
   MOTOR DE LA FUENTE
   - Convierte los dibujos ASCII en matrices de píxeles.
   - Compone los caracteres acentuados (base + marca diacrítica).
   - Aplica variantes de grosor y compone texto en un mapa de bits.
   ========================================================================= */
(function (global) {
  const { SRC, MARKS, COMPOSE, METRICS } = global.BLASON_GLYPHS;
  const H = METRICS.top + METRICS.body;          // alto total de la rejilla
  const BASELINE_ROW = METRICS.top + METRICS.baseline; // última fila sobre la línea base
  const X_TOP_ROW = METRICS.top + METRICS.xTop;

  /* ---------- utilidades de matriz: {w, h, d: Uint8Array} ---------- */
  function blank(w, h = H) { return { w, h, d: new Uint8Array(w * h) }; }
  function clone(g) { return { w: g.w, h: g.h, d: new Uint8Array(g.d) }; }
  function get(g, x, y) { return x >= 0 && y >= 0 && x < g.w && y < g.h ? g.d[y * g.w + x] : 0; }
  function set(g, x, y, v = 1) { if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.d[y * g.w + x] = v; }

  function widen(g, newW, offsetX = 0) {
    const n = blank(newW, g.h);
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++)
        if (g.d[y * g.w + x]) set(n, x + offsetX, y);
    return n;
  }

  function bounds(g, y0 = 0, y1 = g.h - 1) {
    let minX = Infinity, maxX = -1, minY = Infinity, maxY = -1;
    for (let y = y0; y <= y1; y++)
      for (let x = 0; x < g.w; x++)
        if (g.d[y * g.w + x]) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
    return maxX < 0 ? null : { minX, maxX, minY, maxY };
  }

  function fromArt(src) {
    const w = Math.max(...src.rows.map(r => r.length));
    const g = blank(w);
    src.rows.forEach((row, ry) => {
      for (let x = 0; x < row.length; x++)
        if (row[x] === '#') set(g, x, METRICS.top + src.y + ry);
    });
    return g;
  }

  function stamp(g, rows, ox, oy) {
    rows.forEach((row, ry) => {
      for (let x = 0; x < row.length; x++) if (row[x] === '#') set(g, ox + x, oy + ry);
    });
  }

  /* ---------------------- composición de acentos ---------------------- */
  function composeGlyph(ch, lookup) {
    const [baseCh, markName] = COMPOSE[ch];
    let g = clone(lookup(baseCh));
    const b = bounds(g);
    if (!b) return g;

    if (markName === 'stroke') {
      // Barra diagonal que atraviesa la letra (Ø ø)
      const x0 = b.minX - 1, x1 = b.maxX + 1, y0 = b.maxY + 1, y1 = b.minY - 1;
      if (x0 < 0) { g = widen(g, g.w + 1, 1); }
      const need = x1 + 2 + (x0 < 0 ? 1 : 0);
      if (need > g.w) g = widen(g, need);
      const sx = x0 < 0 ? 1 : 0;
      const steps = Math.max(x1 - x0, y0 - y1);
      for (let i = 0; i <= steps; i++) {
        const x = Math.round(x0 + (x1 - x0) * i / steps) + sx;
        const y = Math.round(y0 + (y1 - y0) * i / steps);
        set(g, x, y); set(g, x + 1, y);   // barra de 2 px
      }
      return g;
    }

    const mark = MARKS[markName];
    const mw = Math.max(...mark.map(r => r.length));
    const mh = mark.length;

    if (markName === 'cedilla' || markName === 'ogonek') {
      // Por debajo de la línea base
      const low = bounds(g, BASELINE_ROW - 1, BASELINE_ROW);
      const cx = markName === 'cedilla'
        ? Math.round((low.minX + low.maxX) / 2) - 1
        : low.maxX - mw + 1;
      if (cx + mw > g.w) g = widen(g, cx + mw);
      stamp(g, mark, Math.max(0, cx), BASELINE_ROW + 1);
      return g;
    }

    // Por encima: centrar respecto a la parte superior de la tinta
    const top = bounds(g, b.minY, Math.min(b.minY + 3, g.h - 1));
    const cx = Math.round((b.minX + b.maxX + 1) / 2 + (top.minX + top.maxX + 1) / 2) / 2;
    let ox = Math.round(cx - mw / 2);
    let oy = b.minY - 1 - mh;           // una fila de aire
    if (oy < 0) oy = 0;
    if (ox < 0) { g = widen(g, g.w - ox, -ox); ox = 0; }
    if (ox + mw > g.w) g = widen(g, ox + mw);
    stamp(g, mark, ox, oy);
    return g;
  }

  /* --------------------------- repertorio ----------------------------- */
  const CHARSET = {
    'Mayúsculas': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    'Minúsculas': 'abcdefghijklmnopqrstuvwxyz',
    'Cifras': '0123456789',
    'Acentos (mayúsculas)': 'ÁÀÂÄÃÅĀĂĄÆÇĆČÉÈÊËĚĒĖĘĞÍÌÎÏĪİÑŃÓÒÔÖÕŌØŒŘŠŚŞÚÙÛÜŮŪÝŸŽŹŻ',
    'Acentos (minúsculas)': 'áàâäãåāăąæçćčéèêëěēėęğíìîïīıñńóòôöõōøœřšśşúùûüůūýÿžźżßȷ',
    'Puntuación': '.,;:!¡?¿\'"‘’“”«»‹›-–—_()[]{}/\\|…·•`´^~',
    'Símbolos': '+=*<>&@#%$€£¢¥§¶°ªº©®™†‡',
    'Ornamentos heráldicos': '⚜✠☩♔⚔❦☙✦♥'
  };
  const BUILTIN_CHARS = Object.values(CHARSET).join('').split('');

  /* ----------------- glifos editados por el usuario ------------------- */
  const overrides = {};
  let version = 0;
  const artCache = {};
  const composedCache = {};

  function setOverride(ch, g) { overrides[ch] = g; version++; }
  function clearOverride(ch) { delete overrides[ch]; version++; }
  function clearAllOverrides() { for (const k in overrides) delete overrides[k]; version++; }
  function hasOverride(ch) { return !!overrides[ch]; }

  /** Glifo original (sin ediciones del usuario). */
  function originalGlyph(ch) {
    if (SRC[ch]) return artCache[ch] || (artCache[ch] = fromArt(SRC[ch]));
    if (COMPOSE[ch]) return composeGlyph(ch, originalGlyph);
    return null;
  }

  /** Glifo vigente: edición del usuario > dibujo base > composición. */
  function glyph(ch) {
    if (overrides[ch]) return overrides[ch];
    if (SRC[ch]) return artCache[ch] || (artCache[ch] = fromArt(SRC[ch]));
    if (COMPOSE[ch]) {
      const c = composedCache[ch];
      if (c && c.v === version) return c.g;
      const g = composeGlyph(ch, glyph);
      composedCache[ch] = { v: version, g };
      return g;
    }
    return null;
  }

  /** Todos los caracteres disponibles (incluye los creados por el usuario). */
  function allChars() {
    const extra = Object.keys(overrides).filter(c => !BUILTIN_CHARS.includes(c));
    return BUILTIN_CHARS.concat(extra);
  }
  function customChars() {
    return Object.keys(overrides).filter(c => !BUILTIN_CHARS.includes(c));
  }
  function isComposed(ch) { return !SRC[ch] && !!COMPOSE[ch]; }

  /* ------------------------------ grosor ------------------------------ */
  function embolden(g, amount) {
    if (!amount) return g;
    const n = blank(g.w + amount, g.h);
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++)
        if (g.d[y * g.w + x]) for (let k = 0; k <= amount; k++) set(n, x + k, y);
    return n;
  }

  /* -------------------------- composición ----------------------------- */
  const FALLBACK = '?';
  function resolve(ch) {
    let g = glyph(ch);
    if (!g) {
      const n = ch.normalize('NFD')[0];
      g = glyph(n) || glyph(ch.toLowerCase()) || glyph(ch.toUpperCase()) || glyph(FALLBACK);
    }
    return g;
  }

  /**
   * Compone texto en un mapa de bits.
   * opts: { tracking, leading, weight, align, spaceWidth }
   * Devuelve { w, h, d, lines:[{y, x, w}], firstGlyph:{x,y,w,h} }
   */
  function layout(text, opts = {}) {
    const tracking = opts.tracking ?? 1;
    const leading = opts.leading ?? 2;
    const weight = opts.weight ?? 0;
    const align = opts.align || 'left';
    const spaceW = (opts.spaceWidth ?? 5) + weight;
    const lines = String(text).split('\n');

    const placed = []; // {g, x, lineIdx}
    const lineWidths = [];
    lines.forEach((line, li) => {
      let x = 0;
      const chars = Array.from(line);
      chars.forEach((ch, i) => {
        if (ch === ' ') { x += spaceW; return; }
        const g = embolden(resolve(ch), weight);
        const b = bounds(g);
        placed.push({ g, x, li, ch });
        x += (b ? b.maxX + 1 : g.w) + tracking;
      });
      if (chars.length && chars[chars.length - 1] !== ' ') x -= tracking;
      lineWidths.push(Math.max(0, x));
    });

    const maxW = Math.max(1, ...lineWidths);
    const lineH = H + leading;
    const out = blank(maxW, Math.max(H, lines.length * lineH - leading));
    const lineOffsets = lineWidths.map(w =>
      align === 'center' ? Math.floor((maxW - w) / 2) : align === 'right' ? maxW - w : 0);

    for (const p of placed) {
      const ox = p.x + lineOffsets[p.li], oy = p.li * lineH;
      for (let y = 0; y < p.g.h; y++)
        for (let x = 0; x < p.g.w; x++)
          if (p.g.d[y * p.g.w + x]) set(out, ox + x, oy + y);
    }
    const items = placed.map(p => {
      const b = bounds(p.g);
      return { ch: p.ch, li: p.li, x: p.x + lineOffsets[p.li], y: p.li * lineH, w: b ? b.maxX + 1 : p.g.w, g: p.g };
    });
    return { ...out, lineH, lineWidths, lineOffsets, items };
  }

  global.BlasonEngine = {
    H, BASELINE_ROW, X_TOP_ROW, METRICS,
    CHARSET, BUILTIN_CHARS, allChars, customChars, isComposed,
    glyph, originalGlyph, resolve, embolden, bounds, blank, clone, get, set, widen,
    setOverride, clearOverride, clearAllOverrides, hasOverride, overrides,
    get version() { return version; },
    layout
  };
})(typeof window !== 'undefined' ? window : globalThis);
