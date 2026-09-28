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
  function clone(g) { const c = { w: g.w, h: g.h, d: new Uint8Array(g.d) }; if (g.adv != null) c.adv = g.adv; return c; }
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
    if (g.adv != null) n.adv = g.adv + amount;
    return n;
  }

  /** Avance horizontal del glifo (sin el espaciado entre letras). */
  function advanceOf(g) {
    if (g.adv != null) return g.adv;
    const b = bounds(g);
    return b ? b.maxX + 1 : g.w;
  }

  /* ------------- transformación global de todo el abecedario ---------- */
  // Parámetros que se aplican encima de cada glifo (sin destruir el dibujo):
  //   weightX  grosor horizontal (-1 adelgaza, +1..+3 engorda)
  //   weightY  grosor vertical (engorda los trazos horizontales hacia arriba)
  //   block    pixelado: tamaño del "píxel gordo" (1 = original, 2..4)
  //   threshold % de cobertura necesario para encender un bloque
  //   scaleX   anchura (0.75 condensada ... 2 muy expandida)
  //   slant    inclinación cursiva (0..3)
  //   stroke   'solid' | 'hollow' (hueca) | 'engraved' (grabada) | 'shadowed' (sombreada)
  const DEFAULT_TRANSFORM = { weightX: 0, weightY: 0, block: 1, threshold: 60, scaleX: 1, slant: 0, stroke: 'solid' };
  const transform = { ...DEFAULT_TRANSFORM };
  let transformKey = JSON.stringify(transform);
  const displayCache = {};

  function setTransform(t) {
    Object.assign(transform, t);
    transformKey = JSON.stringify(transform);
  }
  function resetTransform() { setTransform(DEFAULT_TRANSFORM); }
  function isIdentity() { return transformKey === JSON.stringify(DEFAULT_TRANSFORM); }

  function scaleWidth(g, sx) {
    if (sx === 1) return g;
    const nw = Math.max(1, Math.round(g.w * sx));
    const n = blank(nw, g.h);
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < nw; x++)
        if (get(g, Math.min(g.w - 1, Math.floor((x + 0.5) / sx)), y)) set(n, x, y);
    return n;
  }

  function thin(g) {
    // Quita el píxel más a la derecha de cada tramo horizontal de 2 o más
    const n = clone(g);
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++)
        if (get(g, x, y) && !get(g, x + 1, y) && get(g, x - 1, y)) set(n, x, y, 0);
    return n;
  }

  function thickenY(g, amount) {
    if (!amount) return g;
    const n = clone(g);
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++)
        if (get(g, x, y)) for (let k = 1; k <= amount; k++) set(n, x, y - k);
    return n;
  }

  function shear(g, slant, k = 1) {
    if (!slant) return g;
    // filas por cada paso; con pixelado, los pasos son del tamaño del bloque
    const every = ([0, 6, 4, 3][slant] || 3) * k;
    const shiftAt = y => Math.floor((BASELINE_ROW - y) / every) * k;
    const maxS = shiftAt(0), minS = shiftAt(g.h - 1);
    const n = blank(g.w + maxS - minS, g.h);
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++)
        if (get(g, x, y)) set(n, x + shiftAt(y) - minS, y);
    // El avance se mide en la línea base: la cursiva no separa las letras
    n.adv = advanceOf(g) + shiftAt(BASELINE_ROW) - minS;
    return n;
  }

  function pixelateAt(g, k, need, ox) {
    // Rejilla anclada en la línea base (vertical) y desplazada ox columnas
    const base = BASELINE_ROW + 1;
    const n = blank(Math.ceil((g.w + ox) / k) * k, g.h);
    for (let top = base - Math.ceil(base / k) * k; top < g.h; top += k)
      for (let left = -ox; left < g.w; left += k) {
        let on = 0;
        for (let y = top; y < top + k; y++)
          for (let x = left; x < left + k; x++) on += get(g, x, y);
        if (on && on / (k * k) >= need)
          for (let y = top; y < top + k; y++)
            for (let x = left; x < left + k; x++) set(n, x + ox, y);
      }
    return n;
  }

  function pixelate(g, k, threshold) {
    if (k <= 1) return g;
    const need = threshold / 100;
    // Se prueba cada desplazamiento horizontal de la rejilla gruesa y se elige
    // el que más se parece al dibujo original (conserva las contraformas).
    let best = null, bestErr = Infinity;
    for (let ox = 0; ox < k; ox++) {
      const r = pixelateAt(g, k, need, ox);
      let err = 0;
      for (let y = 0; y < g.h; y++)
        for (let x = 0; x < Math.max(g.w + ox, r.w); x++)
          if (get(g, x - ox, y) !== get(r, x, y)) err++;
      if (err < bestErr) { bestErr = err; best = { r, ox }; }
    }
    // Deshacer el desplazamiento para no añadir aire a la izquierda
    const b = bounds(best.r);
    if (!b || !best.ox) return best.r;
    const shift = Math.min(best.ox, b.minX);
    return shift ? widen(best.r, best.r.w, -shift) : best.r;
  }

  function strokeStyle(g, mode) {
    if (mode === 'solid') return g;
    const n = clone(g);
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++) {
        if (!get(g, x, y)) continue;
        const interior = get(g, x - 1, y) && get(g, x + 1, y) && get(g, x, y - 1) && get(g, x, y + 1);
        if (mode === 'hollow' && interior) set(n, x, y, 0);
        // grabada: una línea vacía horizontal cada 3 filas dentro del trazo
        if (mode === 'engraved' && interior && (BASELINE_ROW - y) % 3 === 1) set(n, x, y, 0);
        // sombreada: vacía la mitad izquierda interior de los fustes (luz)
        if (mode === 'shadowed' && interior && get(g, x - 2, y) === 0) set(n, x, y, 0);
      }
    return n;
  }

  function applyTransform(g, t = transform) {
    if (!g) return g;
    const k = Math.max(1, t.block | 0);
    // Orden: anchura -> pixelado -> grosor -> inclinación -> trazo.
    // Pixelar antes de engordar conserva las contraformas abiertas.
    let r = scaleWidth(g, Number(t.scaleX) || 1);
    r = pixelate(r, k, Number(t.threshold) || 60);
    const wx = t.weightX | 0;
    if (wx < 0) r = thin(r); else r = embolden(r, wx);
    r = thickenY(r, t.weightY | 0);
    r = shear(r, t.slant | 0, k);
    r = strokeStyle(r, t.stroke || 'solid');
    return r;
  }

  /** Glifo tal y como se muestra/exporta (con la transformación global). */
  function display(ch) {
    const raw = glyph(ch);
    if (!raw || isIdentity()) return raw;
    const c = displayCache[ch];
    if (c && c.v === version && c.k === transformKey && c.raw === raw) return c.g;
    const g = applyTransform(raw);
    displayCache[ch] = { v: version, k: transformKey, raw, g };
    return g;
  }

  /** Congela la transformación en todos los glifos (se vuelven editables). */
  function bakeTransform() {
    if (isIdentity()) return 0;
    const chars = allChars().filter(c => c !== ' ');
    const baked = chars.map(ch => [ch, glyph(ch) && applyTransform(glyph(ch))]);
    for (const [ch, g] of baked) if (g) overrides[ch] = g;
    version++;
    resetTransform();
    return baked.length;
  }

  /* -------------------------- composición ----------------------------- */
  const FALLBACK = '?';
  function resolve(ch) {
    let g = display(ch);
    if (!g) {
      const n = ch.normalize('NFD')[0];
      g = display(n) || display(ch.toLowerCase()) || display(ch.toUpperCase()) || display(FALLBACK);
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
    const spaceW = Math.round(((opts.spaceWidth ?? 5) + weight) * (Number(transform.scaleX) || 1));
    const lines = String(text).split('\n');

    const placed = []; // {g, x, lineIdx}
    const lineWidths = [];
    lines.forEach((line, li) => {
      let x = 0;
      const chars = Array.from(line);
      chars.forEach((ch, i) => {
        if (ch === ' ') { x += spaceW; return; }
        const g = embolden(resolve(ch), weight);
        placed.push({ g, x, li, ch });
        x += advanceOf(g) + tracking;
      });
      if (chars.length && chars[chars.length - 1] !== ' ') x -= tracking;
      lineWidths.push(Math.max(0, x));
    });

    // Ancho real: la tinta de la última letra puede sobresalir de su avance
    let inkW = 0;
    for (const p of placed) inkW = Math.max(inkW, p.x + p.g.w);
    const maxW = Math.max(1, ...lineWidths, inkW);
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
    glyph, originalGlyph, resolve, embolden, advanceOf, bounds, blank, clone, get, set, widen,
    setOverride, clearOverride, clearAllOverrides, hasOverride, overrides,
    get version() { return version; },
    layout,
    DEFAULT_TRANSFORM, transform, setTransform, resetTransform, isIdentity, applyTransform, display, bakeTransform,
    get transformKey() { return transformKey; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
