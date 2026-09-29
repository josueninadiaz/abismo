'use strict';
// ─── Gráficos 2D: sprites desde texto, capa emisiva, fotogramas de caminar, variantes ───
// Un sprite es { c: lienzo de color, e: lienzo emisivo (lo que brilla) o null, w, h }.
G.SPR = {};

G.sprite = (rows, pal) => {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const c = G.makeCanvas(w, h), x = c.getContext('2d');
  let e = null, ex = null;
  for (let j = 0; j < h; j++) {
    const r = rows[j];
    for (let i = 0; i < r.length; i++) {
      const ch = r[i];
      if (ch === '.' || ch === ' ') continue;
      const col = pal[ch];
      if (!col) continue;
      x.fillStyle = col; x.fillRect(i, j, 1, 1);
      if (G.GLOW.includes(ch)) {
        if (!e) { e = G.makeCanvas(w, h); ex = e.getContext('2d'); }
        ex.fillStyle = col; ex.fillRect(i, j, 1, 1);
      }
    }
  }
  return { c, e, w, h };
};
G.flipCanvas = (cv) => {
  if (!cv) return null;
  const c = G.makeCanvas(cv.width, cv.height), x = c.getContext('2d');
  x.translate(cv.width, 0); x.scale(-1, 1); x.drawImage(cv, 0, 0);
  return c;
};
G.flipSpr = (s) => ({ c: G.flipCanvas(s.c), e: G.flipCanvas(s.e), w: s.w, h: s.h });
// silueta de un color (destellos de golpe, sombras)
G.tint = (cv, color) => {
  const c = G.makeCanvas(cv.width, cv.height), x = c.getContext('2d');
  x.drawImage(cv, 0, 0);
  x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return c;
};

// ── edición de filas ──
G.overlay = (rows, pts) => {
  const out = rows.map((r) => r.split(''));
  for (const [x, y, ch] of pts) if (out[y] && x >= 0 && x < out[y].length) out[y][x] = ch;
  return out.map((r) => r.join(''));
};
// ── imagen suelta ──
G.makeStatic = (name, art) => (G.SPR[name] = G.sprite(art.rows, art.pal));

// ── dibujo procedural píxel a píxel: fn(x, y) -> color | null ──
G.pix = (w, h, fn) => {
  const c = G.makeCanvas(w, h), x = c.getContext('2d');
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const col = fn(i, j);
    if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); }
  }
  return c;
};
G.rect = (ctx, x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

// ── marco de diálogo con esquinas de píxel (estilo Octopath: fondo oscuro translúcido, filo dorado) ──
G.frame = (ctx, x, y, w, h, o = {}) => {
  const fill = o.fill || 'rgba(8,10,20,0.86)', edge = o.edge || '#c9b07a', inner = o.inner || 'rgba(255,240,200,0.10)';
  ctx.fillStyle = fill;
  ctx.fillRect(x + 2, y, w - 4, h); ctx.fillRect(x, y + 2, w, h - 4); ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = edge;
  ctx.fillRect(x + 3, y, w - 6, 1); ctx.fillRect(x + 3, y + h - 1, w - 6, 1);
  ctx.fillRect(x, y + 3, 1, h - 6); ctx.fillRect(x + w - 1, y + 3, 1, h - 6);
  ctx.fillRect(x + 1, y + 1, 2, 1); ctx.fillRect(x + 1, y + 2, 1, 1);
  ctx.fillRect(x + w - 3, y + 1, 2, 1); ctx.fillRect(x + w - 2, y + 2, 1, 1);
  ctx.fillRect(x + 1, y + h - 2, 2, 1); ctx.fillRect(x + 1, y + h - 3, 1, 1);
  ctx.fillRect(x + w - 3, y + h - 2, 2, 1); ctx.fillRect(x + w - 2, y + h - 3, 1, 1);
  ctx.fillStyle = inner; ctx.fillRect(x + 3, y + 2, w - 6, 1);
  // adornos en las esquinas
  if (o.ornate !== false) {
    ctx.fillStyle = edge;
    for (const [cx, cy] of [[x + 5, y + 3], [x + w - 6, y + 3], [x + 5, y + h - 4], [x + w - 6, y + h - 4]]) ctx.fillRect(cx, cy, 1, 1);
  }
};
