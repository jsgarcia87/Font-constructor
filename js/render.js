/* =========================================================================
   RENDERIZADOR DE EFECTOS
   Convierte texto + estilo en un búfer RGBA a escala 1:1 (1 píxel de la
   fuente = 1 píxel del búfer). Todo se pinta en píxeles enteros para
   mantener la estética pixel art: esmaltes, contorno, sombra, relieve,
   capitular iluminada y fondos heráldicos.
   ========================================================================= */
(function (global) {
  const E = global.BlasonEngine;

  /* --------------------------- color ---------------------------------- */
  function hex(c) {
    c = String(c || '#000').replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const n = parseInt(c, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const mix = (a, b, t) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t));
  const lighten = (c, t) => mix(c, [255, 255, 255], t);
  const darken = (c, t) => mix(c, [0, 0, 0], t);

  /* ------------------------ ruido determinista ------------------------ */
  function hash(x, y, seed) {
    let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function valueNoise(x, y, cell, seed) {
    const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
    const fx = x / cell - gx, fy = y / cell - gy;
    const s = t => t * t * (3 - 2 * t);
    const a = hash(gx, gy, seed), b = hash(gx + 1, gy, seed);
    const c = hash(gx, gy + 1, seed), d = hash(gx + 1, gy + 1, seed);
    const u = s(fx), v = s(fy);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  /* ------------------------ utilidades de máscara --------------------- */
  function dilate(mask, W, H, r) {
    if (r <= 0) return mask;
    let cur = mask;
    for (let k = 0; k < r; k++) {
      const n = new Uint8Array(cur);
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          if (!cur[y * W + x]) continue;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              const X = x + dx, Y = y + dy;
              if (X >= 0 && Y >= 0 && X < W && Y < H) n[Y * W + X] = 1;
            }
        }
      cur = n;
    }
    return cur;
  }

  // Distancia (Chebyshev) desde el borde de una máscara, para marcos.
  function edgeDistance(mask, W, H, maxD) {
    const dist = new Int16Array(W * H).fill(-1);
    let frontier = [];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!mask[i]) continue;
        let edge = x === 0 || y === 0 || x === W - 1 || y === H - 1;
        if (!edge) edge = !mask[i - 1] || !mask[i + 1] || !mask[i - W] || !mask[i + W];
        if (edge) { dist[i] = 0; frontier.push(i); }
      }
    for (let d = 1; d <= maxD && frontier.length; d++) {
      const next = [];
      for (const i of frontier) {
        const x = i % W, y = (i / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const X = x + dx, Y = y + dy;
          if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
          const j = Y * W + X;
          if (mask[j] && dist[j] < 0) { dist[j] = d; next.push(j); }
        }
      }
      frontier = next;
    }
    return dist;
  }

  /* ---------------------------- estilo base --------------------------- */
  const DEFAULT_STYLE = {
    text: 'Blanc IX',
    tracking: 1, leading: 3, weight: 0, align: 'center',
    padX: 6, padY: 5,
    fill: { mode: 'solid', c1: '#f1e2bd', c2: '#b9832f', steps: 4 },
    bevel: false,
    outline: { size: 0, color: '#1a1206' },
    shadow: { x: 0, y: 0, color: '#0d1630' },
    cap: { on: false, box: '#1f4fa0', letter: '#f2c14e', border: '#f2c14e' },
    bg: { mode: 'leather', c1: '#2451a4', c2: '#1a3a7a', frame: false, frameColor: '#f1e2bd', check: 4 }
  };

  /* ----------------------------- render ------------------------------- */
  function render(style) {
    const st = style;
    const M = E.METRICS;
    const L = E.layout(st.text, {
      tracking: st.tracking, leading: st.leading, weight: st.weight, align: st.align
    });

    // Filas con tinta (se recorta el aire vertical sobrante)
    let minY = Infinity, maxY = -1;
    for (let y = 0; y < L.h; y++)
      for (let x = 0; x < L.w; x++)
        if (L.d[y * L.w + x]) { if (y < minY) minY = y; if (y > maxY) maxY = y; }
    if (maxY < 0) { minY = M.top; maxY = E.BASELINE_ROW; }

    // Capitular iluminada
    let box = null;
    if (st.cap.on && L.items.length) {
      const it = L.items[0];
      box = {
        x0: it.x - 3, x1: it.x + it.w + 2,
        y0: it.y + M.top - 3, y1: it.y + E.BASELINE_ROW + 3, item: it
      };
      minY = Math.min(minY, box.y0); maxY = Math.max(maxY, box.y1);
    }

    const o = Math.max(0, st.outline.size | 0);
    const sx = st.shadow.x | 0, sy = st.shadow.y | 0;
    const banner = st.bg.mode === 'banner';
    let ml = st.padX + o + Math.max(0, -sx), mr = st.padX + o + Math.max(0, sx);
    let mt = st.padY + o + Math.max(0, -sy), mb = st.padY + o + Math.max(0, sy);
    if (box) ml += Math.max(0, -box.x0);
    if (st.bg.frame && !banner) { ml += 3; mr += 3; mt += 3; mb += 3; }
    if (banner) { mt += 2; mb += 3; }
    const H = mt + (maxY - minY + 1) + mb;
    if (banner) { const tail = Math.max(9, Math.floor(H / 2) + 3); ml += tail; mr += tail; }
    const W = ml + L.w + mr;
    const ox = ml, oy = mt - minY;
    const px = new Uint8ClampedArray(W * H * 4);
    const put = (x, y, c, a = 255) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const i = (y * W + x) * 4;
      px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = a;
    };

    // Máscara del texto en coordenadas del lienzo
    const text = new Uint8Array(W * H);
    const owner = new Int16Array(W * H).fill(-1); // índice de glifo por píxel
    L.items.forEach((it, idx) => {
      const g = it.g;
      for (let y = 0; y < g.h; y++)
        for (let x = 0; x < g.w; x++)
          if (g.d[y * g.w + x]) {
            const X = it.x + x + ox, Y = it.y + y + oy;
            if (X >= 0 && Y >= 0 && X < W && Y < H) { text[Y * W + X] = 1; owner[Y * W + X] = idx; }
          }
    });

    /* ---------- 1. fondo ---------- */
    const bg1 = hex(st.bg.c1), bg2 = hex(st.bg.c2);
    let bgMask = new Uint8Array(W * H);
    if (st.bg.mode !== 'none') {
      if (banner) {
        // Estandarte con cola de golondrina en ambos extremos
        const notch = Math.max(3, Math.floor(H / 2) - 1);
        for (let y = 0; y < H; y++) {
          const dy = Math.abs(y - (H - 1) / 2);
          const cut = Math.round(notch - dy * notch / ((H - 1) / 2));
          for (let x = 0; x < W; x++) {
            if (x < cut || x >= W - cut) continue;
            bgMask[y * W + x] = 1;
          }
        }
      } else bgMask.fill(1);
    }

    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (!bgMask[y * W + x]) continue;
        let c = bg1;
        switch (st.bg.mode) {
          case 'leather': {
            const n = valueNoise(x, y, 5, 7) * 0.6 + valueNoise(x, y, 2, 13) * 0.4;
            const grain = hash(x, y, 3);
            c = n > 0.62 ? lighten(bg1, 0.07) : n < 0.36 ? darken(bg1, 0.12) : bg1;
            if (grain > 0.985) c = darken(bg1, 0.22);
            break;
          }
          case 'parchment': {
            const n = valueNoise(x, y, 6, 21) * 0.7 + valueNoise(x, y, 2, 5) * 0.3;
            const ex = Math.min(x, W - 1 - x) / W, ey = Math.min(y, H - 1 - y) / H;
            const edge = Math.min(ex * 4, ey * 3, 1);
            let t = (1 - edge) * 0.35 + (n < 0.35 ? 0.08 : 0);
            t = Math.round(t * 6) / 6;
            c = mix(bg1, bg2, Math.min(1, t));
            if (hash(x, y, 9) > 0.99) c = darken(bg1, 0.15);
            break;
          }
          case 'checky': {
            const k = Math.max(1, st.bg.check | 0);
            c = ((Math.floor(x / k) + Math.floor(y / k)) & 1) ? bg2 : bg1;
            break;
          }
          case 'lozengy': {
            const k = Math.max(2, (st.bg.check | 0) + 2);
            const a = (x + y) % (k * 2), b = ((x - y) % (k * 2) + k * 2) % (k * 2);
            c = (a === 0 || b === 0) ? bg2 : bg1;
            if (a === 0 && b === 0) c = lighten(bg2, 0.25);
            break;
          }
          case 'banner': {
            const n = valueNoise(x, y, 4, 17);
            c = n > 0.65 ? lighten(bg1, 0.06) : bg1;
            if (y >= H - 2) c = darken(bg1, 0.25);
            else if (y <= 1) c = lighten(bg1, 0.12);
            break;
          }
          default: c = bg1;
        }
        put(x, y, c);
      }

    // Marco doble (borde exterior + filete interior)
    if (st.bg.frame && st.bg.mode !== 'none') {
      const fc = hex(st.bg.frameColor);
      const dist = edgeDistance(bgMask, W, H, 3);
      for (let i = 0; i < W * H; i++) {
        if (dist[i] === 0) put(i % W, (i / W) | 0, darken(fc, 0.35));
        else if (dist[i] === 1 || dist[i] === 3) put(i % W, (i / W) | 0, fc);
      }
      if (!banner) {
        // Rombos en las esquinas
        const corners = [[4, 4], [W - 5, 4], [4, H - 5], [W - 5, H - 5]];
        for (const [cx, cy] of corners)
          for (let dy = -2; dy <= 2; dy++)
            for (let dx = -2; dx <= 2; dx++)
              if (Math.abs(dx) + Math.abs(dy) <= 2) put(cx + dx, cy + dy, fc);
      }
    }

    /* ---------- 2. caja de la capitular ---------- */
    if (box) {
      const bc = hex(st.cap.box), br = hex(st.cap.border);
      const x0 = box.x0 + ox, x1 = box.x1 + ox, y0 = box.y0 + oy, y1 = box.y1 + oy;
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const edge = x === x0 || x === x1 || y === y0 || y === y1;
          const lx = x - x0, ly = y - y0;
          let c = bc;
          if (edge) c = br;
          else if ((lx + ly) % 4 === 0 && (lx - ly + 400) % 4 === 0) c = lighten(bc, 0.3); // diaprado
          else if ((lx + ly) % 4 === 0 || (lx - ly + 400) % 4 === 0) c = darken(bc, 0.18);
          put(x, y, c);
        }
    }

    /* ---------- 3. sombra y 4. contorno ---------- */
    const outlined = dilate(text, W, H, o);
    if (sx || sy) {
      const sc = hex(st.shadow.color);
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          if (outlined[y * W + x]) put(x + sx, y + sy, sc);
    }
    if (o > 0) {
      const oc = hex(st.outline.color);
      for (let i = 0; i < W * H; i++) if (outlined[i]) put(i % W, (i / W) | 0, oc);
    }

    /* ---------- 5. esmalte del texto ---------- */
    const c1 = hex(st.fill.c1), c2 = hex(st.fill.c2);
    const steps = Math.max(2, st.fill.steps | 0);
    const metal = [lighten(c1, 0.55), lighten(c1, 0.25), c1, darken(c1, 0.22), darken(c1, 0.42)];
    const capTopRel = M.top, baseRel = E.BASELINE_ROW;
    const capLetter = hex(st.cap.letter);

    function fillColor(x, y, idx) {
      const it = L.items[idx];
      if (box && idx === 0) return capLetter;
      const rel = (y - oy) - it.y; // fila dentro de la línea
      const t = Math.max(0, Math.min(1, (rel - capTopRel) / (baseRel - capTopRel)));
      switch (st.fill.mode) {
        case 'metal': {
          if (rel > baseRel) return metal[4];
          const k = t < 0.14 ? 0 : t < 0.38 ? 1 : t < 0.7 ? 2 : t < 0.9 ? 3 : 4;
          return metal[k];
        }
        case 'gradient': {
          const q = Math.round(Math.min(1, t) * (steps - 1)) / (steps - 1);
          return mix(c1, c2, q);
        }
        case 'fess': // cortado
          return rel <= Math.round((capTopRel + baseRel) / 2 + 1) ? c1 : c2;
        case 'alternate': // letras alternas (contracambiado)
          return (idx % 2 === 0) ? c1 : c2;
        default: return c1;
      }
    }

    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!text[i]) continue;
        let c = fillColor(x, y, owner[i]);
        if (st.bevel) {
          const up = y > 0 && text[i - W], dn = y < H - 1 && text[i + W];
          const lf = x > 0 && text[i - 1], rt = x < W - 1 && text[i + 1];
          if (!up || !lf) c = lighten(c, 0.38);
          else if (!dn || !rt) c = darken(c, 0.32);
        }
        put(x, y, c);
      }

    return { w: W, h: H, data: px };
  }

  /* ------------------------ salida a canvas / svg --------------------- */
  function toCanvas(buf, scale = 1, canvas) {
    const src = document.createElement('canvas');
    src.width = buf.w; src.height = buf.h;
    src.getContext('2d').putImageData(new ImageData(buf.data, buf.w, buf.h), 0, 0);
    if (scale === 1 && !canvas) return src;
    const c = canvas || document.createElement('canvas');
    c.width = buf.w * scale; c.height = buf.h * scale;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }

  function toSVG(buf, scale = 1) {
    const { w, h, data } = buf;
    const parts = [];
    for (let y = 0; y < h; y++) {
      let x = 0;
      while (x < w) {
        const i = (y * w + x) * 4;
        if (!data[i + 3]) { x++; continue; }
        const key = data[i] + ',' + data[i + 1] + ',' + data[i + 2];
        let run = 1;
        while (x + run < w) {
          const j = (y * w + x + run) * 4;
          if (!data[j + 3] || data[j] + ',' + data[j + 1] + ',' + data[j + 2] !== key) break;
          run++;
        }
        const col = '#' + [data[i], data[i + 1], data[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('');
        parts.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${col}"/>`);
        x += run;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w * scale}" height="${h * scale}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">\n${parts.join('\n')}\n</svg>`;
  }

  global.BlasonRender = { render, toCanvas, toSVG, DEFAULT_STYLE, hex, lighten, darken, mix };
})(typeof window !== 'undefined' ? window : globalThis);
