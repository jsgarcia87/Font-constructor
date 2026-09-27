/* =========================================================================
   EXPORTACIÓN
   - Fuente vectorial .OTF (contornos limpios trazados a partir de los
     píxeles, sin solapamientos) mediante opentype.js.
   - Kit web: CSS con @font-face incrustado.
   - Sprite sheet PNG + JSON para motores de juego.
   - Proyecto JSON (ediciones del usuario) para guardar / cargar.
   ========================================================================= */
(function (global) {
  const E = global.BlasonEngine;
  const UNIT = 50; // unidades de fuente por píxel

  /* ------------ trazado de contornos a partir de la matriz ------------ */
  // Recorre los bordes de los píxeles dejando siempre la tinta a la derecha
  // (sentido horario en pantalla = antihorario con el eje Y hacia arriba).
  function traceContours(g) {
    const W = g.w, H = g.h;
    const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && g.d[y * W + x];
    const out = new Map(); // "x,y" -> [{x,y,dx,dy,used}]
    const addEdge = (x1, y1, x2, y2) => {
      const k = x1 + ',' + y1;
      if (!out.has(k)) out.set(k, []);
      out.get(k).push({ x1, y1, x2, y2, dx: x2 - x1, dy: y2 - y1, used: false });
    };
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (!on(x, y)) continue;
        if (!on(x, y - 1)) addEdge(x, y, x + 1, y);
        if (!on(x + 1, y)) addEdge(x + 1, y, x + 1, y + 1);
        if (!on(x, y + 1)) addEdge(x + 1, y + 1, x, y + 1);
        if (!on(x - 1, y)) addEdge(x, y + 1, x, y);
      }

    const contours = [];
    for (const list of out.values())
      for (const start of list) {
        if (start.used) continue;
        const pts = [];
        let e = start;
        while (e && !e.used) {
          e.used = true;
          pts.push([e.x1, e.y1]);
          const cands = (out.get(e.x2 + ',' + e.y2) || []).filter(c => !c.used);
          if (!cands.length) break;
          // Preferencia: giro a la derecha > recto > izquierda (separa píxeles
          // que sólo se tocan en diagonal y evita contornos auto-intersecados)
          const right = [-e.dy, e.dx];
          e = cands.find(c => c.dx === right[0] && c.dy === right[1])
            || cands.find(c => c.dx === e.dx && c.dy === e.dy)
            || cands[0];
        }
        // eliminar puntos colineales
        const simp = [];
        for (let i = 0; i < pts.length; i++) {
          const p = pts[(i - 1 + pts.length) % pts.length], c = pts[i], n = pts[(i + 1) % pts.length];
          if ((c[0] - p[0]) * (n[1] - c[1]) - (c[1] - p[1]) * (n[0] - c[0]) !== 0) simp.push(c);
        }
        if (simp.length >= 3) contours.push(simp);
      }
    return contours;
  }

  function glyphPath(g) {
    const path = new opentype.Path();
    const base = E.BASELINE_ROW + 1;
    for (const c of traceContours(g)) {
      c.forEach(([x, y], i) => {
        const X = x * UNIT, Y = (base - y) * UNIT;
        if (i === 0) path.moveTo(X, Y); else path.lineTo(X, Y);
      });
      path.close();
    }
    return path;
  }

  /* ------------------------------ fuente ------------------------------ */
  function buildFont({ familyName = 'Blason Pixel', weight = 0, tracking = 1 } = {}) {
    if (!global.opentype) throw new Error('opentype.js no está disponible (¿sin conexión?).');
    const H = E.H, base = E.BASELINE_ROW + 1;
    const unitsPerEm = H * UNIT;
    const ascender = base * UNIT, descender = -(H - base) * UNIT;

    const notdef = new opentype.Path();
    const nb = { l: UNIT, r: 7 * UNIT, b: 0, t: 14 * UNIT };
    notdef.moveTo(nb.l, nb.b); notdef.lineTo(nb.l, nb.t); notdef.lineTo(nb.r, nb.t); notdef.lineTo(nb.r, nb.b); notdef.close();
    notdef.moveTo(nb.l + UNIT, nb.b + UNIT); notdef.lineTo(nb.r - UNIT, nb.b + UNIT);
    notdef.lineTo(nb.r - UNIT, nb.t - UNIT); notdef.lineTo(nb.l + UNIT, nb.t - UNIT); notdef.close();

    const glyphs = [
      new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth: 8 * UNIT, path: notdef }),
      new opentype.Glyph({ name: 'space', unicode: 32, advanceWidth: (6 + weight) * UNIT, path: new opentype.Path() }),
      new opentype.Glyph({ name: 'nbspace', unicode: 160, advanceWidth: (6 + weight) * UNIT, path: new opentype.Path() })
    ];
    for (const ch of E.allChars()) {
      if (ch === ' ') continue;
      const src = E.glyph(ch);
      if (!src) continue;
      const g = E.embolden(src, weight);
      const b = E.bounds(g);
      const cp = ch.codePointAt(0);
      glyphs.push(new opentype.Glyph({
        name: 'uni' + cp.toString(16).toUpperCase().padStart(4, '0'),
        unicode: cp,
        advanceWidth: ((b ? b.maxX + 1 : g.w) + tracking) * UNIT,
        path: glyphPath(g)
      }));
    }
    const styleName = weight === 0 ? 'Regular' : weight === 1 ? 'Bold' : 'Black';
    return new opentype.Font({
      familyName, styleName, unitsPerEm, ascender, descender,
      designer: 'Forja Heráldica', description: 'Fuente pixel art gótica/heráldica (textura).',
      glyphs
    });
  }

  function fontBuffer(opts) { return buildFont(opts).toArrayBuffer(); }

  /* ---------------------------- descargas ----------------------------- */
  function download(name, data, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  function slug(s) {
    return String(s || 'blason-pixel').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'blason-pixel';
  }

  function toBase64(buf) {
    const bytes = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }

  function webKitCSS(opts) {
    const family = opts.familyName || 'Blason Pixel';
    const b64 = toBase64(fontBuffer(opts));
    const px = E.H;
    return `/* ${family} — kit web generado con Forja Heráldica
   Tamaños "pixel perfect": múltiplos de ${px}px (${px}, ${px * 2}, ${px * 3}, ${px * 4}...) */
@font-face {
  font-family: '${family}';
  src: url(data:font/otf;base64,${b64}) format('opentype');
  font-weight: ${opts.weight ? 700 : 400};
  font-style: normal;
  font-display: swap;
}

.${slug(family)} {
  font-family: '${family}', serif;
  font-size: ${px * 2}px;
  line-height: 1;
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: grayscale;
  font-smooth: never;
  text-rendering: optimizeSpeed;
}
`;
  }

  /* --------------------------- sprite sheet --------------------------- */
  function spriteSheet({ weight = 0, color = '#ffffff', cols = 16 } = {}) {
    const chars = E.allChars().filter(c => c !== ' ');
    const items = chars.map(ch => {
      const g = E.embolden(E.glyph(ch), weight);
      const b = E.bounds(g);
      return { ch, g, adv: b ? b.maxX + 1 : g.w };
    });
    const cellW = Math.max(...items.map(i => i.g.w)) + 1;
    const cellH = E.H + 1;
    const rows = Math.ceil(items.length / cols);
    const cv = document.createElement('canvas');
    cv.width = cols * cellW; cv.height = rows * cellH;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = color;
    const meta = {
      font: 'Blason Pixel', lineHeight: E.H, baseline: E.BASELINE_ROW + 1,
      spaceAdvance: 6 + weight, tracking: 1, glyphs: {}
    };
    items.forEach((it, i) => {
      const ox = (i % cols) * cellW, oy = Math.floor(i / cols) * cellH;
      for (let y = 0; y < it.g.h; y++)
        for (let x = 0; x < it.g.w; x++)
          if (it.g.d[y * it.g.w + x]) ctx.fillRect(ox + x, oy + y, 1, 1);
      meta.glyphs[it.ch] = { x: ox, y: oy, w: it.g.w, h: it.g.h, advance: it.adv };
    });
    return { canvas: cv, meta };
  }

  /* ----------------------------- proyecto ----------------------------- */
  function serializeGlyph(g) {
    const rows = [];
    for (let y = 0; y < g.h; y++) {
      let r = '';
      for (let x = 0; x < g.w; x++) r += g.d[y * g.w + x] ? '#' : '.';
      rows.push(r);
    }
    return { w: g.w, h: g.h, rows };
  }
  function deserializeGlyph(o) {
    const g = E.blank(o.w, E.H);
    o.rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === '#') E.set(g, x, y); });
    return g;
  }
  function exportProject(name) {
    const glyphs = {};
    for (const ch of Object.keys(E.overrides)) glyphs[ch] = serializeGlyph(E.overrides[ch]);
    return JSON.stringify({ app: 'forja-heraldica', version: 1, name, height: E.H, glyphs }, null, 1);
  }
  function importProject(json) {
    const o = typeof json === 'string' ? JSON.parse(json) : json;
    if (!o || !o.glyphs) throw new Error('Archivo de proyecto no válido.');
    let n = 0;
    for (const [ch, g] of Object.entries(o.glyphs)) { E.setOverride(ch, deserializeGlyph(g)); n++; }
    return { name: o.name, count: n };
  }

  global.BlasonExport = {
    UNIT, traceContours, buildFont, fontBuffer, webKitCSS, spriteSheet,
    exportProject, importProject, serializeGlyph, deserializeGlyph,
    download, slug, toBase64
  };
})(typeof window !== 'undefined' ? window : globalThis);
