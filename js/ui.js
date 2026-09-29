'use strict';
// ─── Interfaz: diálogos, elecciones, carteles de zona, narración, avisos, menú y opciones ───
// Todo se dibuja en el lienzo de 480×270 que la cadena de post-proceso pone encima de la imagen.
(function () {
  const UI = (G.UI = {});
  const ctx = G.R.uictx;
  const GOLD = '#d8bf86', INK = '#f4ecd8', DIM = '#9a94a8';

  // ── quién habla ──
  G.WHO = {
    prota: { name: 'Soren', spr: 'prota' },
    yo: { name: () => '', spr: null },
    mira: { name: 'Mira', spr: 'mira' },
    suen: { name: 'Anciana Suen', spr: 'suen' },
    varek: { name: 'Varek', spr: 'varek' },
    guardia: { name: 'Guardia', spr: 'guardia' },
    aldeano1: { name: 'Habitante', spr: 'aldeano1' },
    aldeano2: { name: 'Habitante', spr: 'aldeano2' },
    aldeano3: { name: 'Habitante', spr: 'aldeano1' },
    perdido: { name: 'Habitante perdido', spr: 'infectado' },
    tharn: { name: () => (G.flag('tharn_libre') ? 'Tharn' : 'Guardián'), spr: 'tharn' },
    tharn_libre: { name: 'Tharn', spr: 'tharn_libre' },
    oren: { name: () => (G.flag('oren_libre') ? 'Oren' : 'Antiguo líder'), spr: 'oren' },
    oren_libre: { name: 'Oren', spr: 'oren_libre' },
    alma: { name: 'Alma antigua', spr: 'alma' },
  };
  const nameOf = (w) => { const d = G.WHO[w]; if (!d) return w || ''; return typeof d.name === 'function' ? d.name() : d.name; };
  const portraits = {};
  function portrait(spr) {
    if (!spr || !G.SPR[spr]) return null;
    if (portraits[spr]) return portraits[spr];
    // la cabeza, centrada en el lienzo del sprite
    const s = G.SPR[spr].idle ? G.SPR[spr].idle.down[0].c : G.SPR[spr].down[0].c, c = G.makeCanvas(22, 18);
    c.getContext('2d').drawImage(s, Math.round((s.width - 22) / 2) - 1, 0, 22, 18, 0, 0, 22, 18);
    return (portraits[spr] = c);
  }

  // ── párpados: negro con una abertura elíptica que se abre ──
  UI.eyesK = 1;
  function drawEyes() {
    const k = UI.eyesK;
    if (k >= 0.999) return;
    ctx.save();
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 480, 270);
    if (k > 0.01) {
      ctx.globalCompositeOperation = 'destination-out';
      const g = ctx.createRadialGradient(240, 135, 0, 240, 135, 300);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.7, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(240, 135, 330, 180 * k * k, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // ── estado ──
  let dlg = null, choice = null, card = null, narr = null, toast = null, hint = null, menu = null, memo = null;
  UI.blocking = () => !!(dlg || choice || narr || menu || memo);

  // ── diálogo ──
  UI.say = (who, text, o = {}) => {
    const lines = G.wrap(G.keys(text), who && G.WHO[who] && G.WHO[who].spr ? 330 : 380);
    dlg = { who, lines, total: lines.join('').length, n: 0, done: false, o, t: 0 };
    return dlg;
  };
  function drawDialog() {
    const d = dlg;
    d.t++;
    // mantener [b] avanza rápido (sin pararse en cada línea); en las elecciones siempre se para
    const fast = d.t > 2 && G.held('b');
    if (d.n < d.total) {
      d.n += d.o.slow ? 0.5 : 1.2;
      if (Math.floor(d.n) % 3 === 0) G.audio.sfx('blip');
      if (d.t > 2 && (G.ok() || G.pressed('b') || fast)) { d.n = d.total; d.full = d.t; }
    } else {
      if (d.full == null) d.full = d.t;
      if (!d.o.keep && (G.ok() || (fast && d.t - d.full > 4))) { d.done = true; dlg = null; G.audio.sfx('move'); return; }
    }
    const x = 36, y = G.mode === 'combat' ? 62 : 194, w = 408, h = 68;
    G.frame(ctx, x, y, w, h);
    const name = nameOf(d.who);
    if (name) {
      const nw = G.textW(name) + 18;
      G.frame(ctx, x + 10, y - 11, nw, 15, { fill: 'rgba(20,16,28,0.95)', ornate: false });
      G.text(ctx, name, x + 19, y - 8, GOLD);
    }
    const info = G.WHO[d.who], pic = info && info.spr ? portrait(typeof info.spr === 'function' ? info.spr() : info.spr) : null;
    let tx = x + 16;
    if (pic) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + 10, y + 12, 48, 40);
      ctx.drawImage(pic, x + 12, y + 14, 44, 36);
      tx = x + 68;
    }
    let left = Math.floor(d.n);
    d.lines.forEach((l, i) => {
      const plain = G.stripCodes(l).length;
      G.text(ctx, l, tx, y + 11 + i * 12, INK, '#0a0812', left);
      left -= plain;
    });
    if (G.scene) G.text(ctx, G.keys('Mantén [b]: avanzar'), x + w - 26 - G.textW(G.keys('Mantén [b]: avanzar')), y + h - 13, 'rgba(154,148,168,0.8)', '#0a0812');
    if (d.n >= d.total && !d.o.keep && Math.floor(d.t / 20) % 2) { ctx.fillStyle = GOLD; ctx.fillRect(x + w - 16, y + h - 12, 5, 1); ctx.fillRect(x + w - 15, y + h - 11, 3, 1); ctx.fillRect(x + w - 14, y + h - 10, 1, 1); }
  }

  UI.closeDialog = () => { dlg = null; };

  // ── elecciones ──
  UI.ask = (opts) => { choice = { opts, i: 0, done: false, value: 0, t: 0 }; return choice; };
  function drawChoice() {
    const c = choice;
    c.t++;
    if (G.pressed('up')) { c.i = (c.i + c.opts.length - 1) % c.opts.length; G.audio.sfx('move'); }
    if (G.pressed('down')) { c.i = (c.i + 1) % c.opts.length; G.audio.sfx('move'); }
    if (c.t > 8 && G.ok()) { c.done = true; c.value = c.i; choice = null; G.audio.sfx('ok'); return; }
    const w = Math.max(...c.opts.map((o) => G.textW(o))) + 36, h = c.opts.length * 14 + 12;
    const x = 444 - w, y = G.mode === 'combat' ? 136 : 186 - h;
    G.frame(ctx, x, y, w, h);
    c.opts.forEach((o, i) => {
      const sel = i === c.i;
      if (sel) { ctx.fillStyle = 'rgba(216,191,134,0.16)'; ctx.fillRect(x + 4, y + 5 + i * 14, w - 8, 13); }
      G.text(ctx, o, x + 20, y + 8 + i * 14, sel ? '#fff4d0' : DIM);
      if (sel) G.text(ctx, '>', x + 9 + (Math.floor(G.t / 12) % 2), y + 8 + i * 14, GOLD);
    });
  }

  // ── cartel de zona (al entrar por primera vez) ──
  UI.titleCard = (text, sub) => { card = { text, sub, t: 0, done: false }; return card; };
  function drawCard() {
    const c = card;
    c.t++;
    const T = 220;
    if (c.t > 20 && c.t < T - 40 && (G.ok() || G.pressed('b'))) c.t = T - 40;
    const a = c.t < 40 ? c.t / 40 : c.t > T - 40 ? (T - c.t) / 40 : 1;
    if (c.t >= T) { c.done = true; card = null; return; }
    ctx.globalAlpha = Math.max(0, a);
    const w = G.textW(c.text) * 2, x = Math.round(240 - w / 2), y = 104;
    const g = ctx.createLinearGradient(0, y - 20, 0, y + 44);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, y - 20, 480, 64);
    G.textBig(ctx, c.text, x, y, 2, '#fff2d8', '#1a1208');
    const lw = Math.min(160, 40 + c.t * 2);
    ctx.fillStyle = GOLD;
    ctx.fillRect(240 - lw, y + 28, lw * 2, 1);
    ctx.fillRect(238, y + 26, 5, 5); ctx.fillStyle = '#1a1208'; ctx.fillRect(239, y + 27, 3, 3); ctx.fillStyle = GOLD; ctx.fillRect(240, y + 28, 1, 1);
    if (c.sub) G.textC(ctx, c.sub, 240, y + 34, DIM);
    ctx.globalAlpha = 1;
  }

  // ── narración sobre negro ──
  UI.narrate = (lines, o = {}) => { narr = { lines, i: 0, t: 0, done: false, o }; return narr; };
  function drawNarr() {
    const n = narr;
    n.t++;
    ctx.fillStyle = n.o.bg || '#000'; ctx.fillRect(0, 0, 480, 270);
    const l = n.lines[n.i];
    const a = Math.min(1, n.t / 50);
    const ls = G.wrap(l, 380);
    ctx.globalAlpha = a;
    ls.forEach((s, i) => G.textC(ctx, s, 240, 128 - ls.length * 7 + i * 14, n.o.color || '#e8e0d0', null));
    ctx.globalAlpha = 1;
    if (n.t > 50 && Math.floor(n.t / 30) % 2) G.textC(ctx, '·', 240, 230, DIM, null);
    G.text(ctx, G.keys('[b]: saltar'), 470 - G.textW(G.keys('[b]: saltar')), 256, '#5a5468', null);
    if (n.t > 5 && (G.pressed('b') || G.pressed('start'))) { n.done = true; narr = null; G.audio.sfx('back'); return; }
    if (n.t > 20 && (G.ok() || n.t > (n.o.auto || 99999))) {
      n.i++; n.t = 0;
      if (n.i >= n.lines.length) { n.done = true; narr = null; }
    }
  }

  // ── fragmento de memoria (pantalla sepia) ──
  UI.memory = (title, lines) => { memo = { title, lines, i: 0, t: 0, done: false }; return memo; };
  function drawMemo() {
    const m = memo;
    m.t++;
    const g = ctx.createRadialGradient(240, 135, 20, 240, 135, 280);
    g.addColorStop(0, 'rgba(60,44,30,0.88)'); g.addColorStop(1, 'rgba(8,4,2,0.97)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 480, 270);
    // polvo dorado del recuerdo
    for (let i = 0; i < 40; i++) {
      const px = (G.hash(i, 1) * 480 + G.t * (0.1 + G.hash(i, 2) * 0.3)) % 480, py = (G.hash(i, 3) * 270 - G.t * 0.15 * G.hash(i, 4) + 270) % 270;
      ctx.fillStyle = `rgba(255,220,150,${0.2 + 0.3 * Math.abs(Math.sin(G.t * 0.03 + i))})`; ctx.fillRect(px | 0, py | 0, 1, 1);
    }
    G.textC(ctx, m.title, 240, 40, GOLD, null);
    ctx.fillStyle = GOLD; ctx.fillRect(180, 54, 120, 1);
    const a = Math.min(1, m.t / 40);
    ctx.globalAlpha = a;
    const ls = G.wrap(m.lines[m.i], 360);
    ls.forEach((s, i) => G.textC(ctx, s, 240, 120 - ls.length * 7 + i * 14, '#f6e6c8', '#1a0e04'));
    ctx.globalAlpha = 1;
    if (m.t > 40 && Math.floor(m.t / 30) % 2) G.textC(ctx, '·', 240, 232, GOLD, null);
    if ((m.t > 25 && G.ok()) || (m.t > 12 && G.held('b'))) { m.i++; m.t = 0; if (m.i >= m.lines.length) { m.done = true; memo = null; } }
  }

  // ── avisos ──
  UI.toast = (text, col) => { toast = { text, t: 0, col: col || GOLD }; };
  UI.hint = (text, frames = 360) => { hint = { text, t: 0, n: frames }; };
  function drawToast() {
    toast.t++;
    const T = 200, a = toast.t < 20 ? toast.t / 20 : toast.t > T - 30 ? (T - toast.t) / 30 : 1;
    if (toast.t > T) { toast = null; return; }
    ctx.globalAlpha = a;
    const w = G.textW(toast.text) + 28;
    const ty = G.mode === 'combat' ? 206 : 18;
    G.frame(ctx, 240 - w / 2, ty, w, 18, { ornate: false });
    G.textC(ctx, toast.text, 240, ty + 5, toast.col);
    ctx.globalAlpha = 1;
  }
  function drawHint() {
    hint.t++;
    if (hint.t > hint.n) { hint = null; return; }
    const a = Math.min(1, hint.t / 20, (hint.n - hint.t) / 30);
    ctx.globalAlpha = a;
    const s = G.keys(hint.text), w = G.textW(s) + 20;
    G.frame(ctx, 10, 10, w, 17, { ornate: false, fill: 'rgba(8,10,20,0.7)' });
    G.text(ctx, s, 20, 14, INK);
    ctx.globalAlpha = 1;
  }

  // ── icono sobre lo que se puede examinar ──
  function drawPrompt() {
    if (!G.EX.player || G.mode !== 'explore' || G.scene || UI.blocking()) return;
    const t = G.EX.target();
    if (!t) return;
    let x, y, z;
    if (t.kind === 'npc') { x = t.a.x; y = t.a.y + 44 * (t.a.o.scale || 1); z = t.a.z; }
    else if (t.kind === 'planta' || t.kind === 'prop') { x = t.p.x; y = 32; z = t.p.z; }
    else { x = t.t.x * 16 + 8; y = 18; z = t.t.y * 16 + 8; }
    const [sx, sy] = G.W3.project(x, y, z);
    const bob = Math.round(Math.sin(G.t * 0.12) * 1.5);
    const bx = Math.round(sx) - 7, by = Math.round(sy) - 14 + bob;
    G.frame(ctx, bx, by, 15, 12, { ornate: false, fill: 'rgba(10,10,20,0.85)' });
    ctx.fillStyle = t.kind === 'npc' ? INK : t.kind === 'planta' ? '#9affe8' : GOLD;
    if (t.kind === 'npc') { ctx.fillRect(bx + 4, by + 5, 1, 1); ctx.fillRect(bx + 7, by + 5, 1, 1); ctx.fillRect(bx + 10, by + 5, 1, 1); }
    else { ctx.fillRect(bx + 7, by + 3, 1, 4); ctx.fillRect(bx + 7, by + 8, 1, 1); }
    ctx.fillStyle = 'rgba(10,10,20,0.85)'; ctx.fillRect(bx + 6, by + 12, 3, 1); ctx.fillRect(bx + 7, by + 13, 1, 1);
  }

  // ── menú de pausa ──
  const SKILLS = [
    ['mente', 'Mente', 'Libera la mente de una criatura del control directo del pilar. Rompe su influencia sobre pensamientos, decisiones y voluntad.'],
    ['recuerdos', 'Recuerdos', 'Restaura los recuerdos dañados por el pilar, que usa las memorias de sus víctimas para manipularlas.'],
    ['cuerpo', 'Cuerpo', 'Elimina la infección física. Detiene la transformación y recupera las partes del cuerpo alteradas por el pilar.'],
    ['alma', 'Alma', 'Recupera o purifica el alma de quien está siendo consumido por la infección. Mucho más profundo que curar el cuerpo.'],
    ['ser', 'Ser', 'La más profunda de las cinco. Actúa sobre la esencia completa: une mente, recuerdos, cuerpo y alma.'],
  ];
  UI.SKILLS = SKILLS;
  const OPTS = [
    ['retro', 'Modo retro (CRT, 320p, tramado)'], ['crt', 'Líneas de barrido'], ['dither', 'Tramado de color'], ['pixel', 'Píxel grueso'],
    ['dof', 'Profundidad de campo'], ['bloom', 'Resplandor'], ['quality', 'Calidad'], ['music', 'Música'], ['sfx', 'Efectos'],
  ];
  UI.openMenu = (fromTitle) => { menu = { page: fromTitle ? 'opciones' : 'main', i: 0, j: 0, fromTitle, t: 0 }; G.audio.sfx('ok'); G.consume(); };
  UI.menuOpen = () => !!menu;
  const MAIN = ['Continuar', 'Mapa', 'Habilidades', 'Recuerdos', 'Plantas-alma', 'Opciones', 'Volver al título'];
  function drawMenu() {
    const m = menu;
    m.t++;
    ctx.fillStyle = 'rgba(4,4,10,0.55)'; ctx.fillRect(0, 0, 480, 270);
    const back = () => { if (m.page === 'main' || m.fromTitle) { menu = null; G.audio.sfx('back'); } else { m.page = 'main'; m.j = 0; G.audio.sfx('back'); } };
    // columna izquierda
    G.frame(ctx, 16, 16, 130, 238);
    G.text(ctx, 'ABISMO', 30, 26, GOLD);
    ctx.fillStyle = GOLD; ctx.fillRect(30, 38, 102, 1);
    MAIN.forEach((o, i) => {
      const sel = m.page === 'main' ? i === m.i : MAIN[m.i] === o;
      G.text(ctx, o, 38, 50 + i * 16, sel ? '#fff4d0' : DIM);
      if (sel && m.page === 'main') G.text(ctx, '>', 27 + (Math.floor(G.t / 12) % 2), 50 + i * 16, GOLD);
    });
    const sv = G.save;
    G.text(ctx, 'Plantas ' + sv.plants.length + '/10', 30, 216, DIM);
    G.text(ctx, 'Recuerdos ' + sv.frags.length + '/5', 30, 230, DIM);
    // panel derecho
    G.frame(ctx, 154, 16, 310, 238);
    const px = 170, py = 28;
    if (m.page === 'main') {
      if (G.pressed('up')) { m.i = (m.i + MAIN.length - 1) % MAIN.length; G.audio.sfx('move'); }
      if (G.pressed('down')) { m.i = (m.i + 1) % MAIN.length; G.audio.sfx('move'); }
      if (G.pressed('b') || G.pressed('start')) return back();
      if (G.ok() && m.t > 5) {
        G.audio.sfx('ok');
        if (m.i === 0) { menu = null; return; }
        if (m.i === 6) { menu = null; G.toTitle(); return; }
        m.page = ['main', 'mapa', 'habilidades', 'recuerdos', 'plantas', 'opciones'][m.i]; m.j = 0; return;
      }
      const loc = G.ZONES[G.EX.zoneId];
      G.text(ctx, loc ? loc.name : '', px, py, GOLD);
      const lines = G.wrap('Un Abismo que poco a poco deja de parecerse al mundo que fue. Solo tú no oyes su voz, y solo tú no oyes la del pilar.', 270);
      lines.forEach((l, i) => G.text(ctx, l, px, py + 20 + i * 12, INK));
      drawSkillIcons(px, 200);
      return;
    }
    if (G.pressed('b') || G.pressed('start')) return back();
    if (m.page === 'mapa') { if (drawMap(px, py, m)) return; }
    else if (m.page === 'habilidades') {
      if (G.pressed('up')) { m.j = (m.j + 4) % 5; G.audio.sfx('move'); }
      if (G.pressed('down')) { m.j = (m.j + 1) % 5; G.audio.sfx('move'); }
      G.text(ctx, 'Las cinco habilidades', px, py, GOLD);
      SKILLS.forEach(([id, name], i) => {
        const has = G.save.skills.includes(id), sel = i === m.j;
        UI.skillIcon(ctx, id, px, py + 18 + i * 22, has ? 1 : 0.25);
        G.text(ctx, has ? name : '???', px + 22, py + 22 + i * 22, sel ? '#fff4d0' : has ? INK : DIM);
        if (sel) G.text(ctx, '<', px + 90, py + 22 + i * 22, GOLD);
      });
      const [id, , desc] = SKILLS[m.j];
      const txt = G.save.skills.includes(id) ? desc : 'Todavía no has despertado esta habilidad.';
      G.wrap(txt, 170).forEach((l, i) => G.text(ctx, l, px + 110, py + 22 + i * 12, INK));
    } else if (m.page === 'recuerdos') {
      G.text(ctx, 'Fragmentos de memoria', px, py, GOLD);
      const F = G.STORY.FRAGS;
      for (let i = 0; i < 5; i++) {
        const has = G.save.frags.includes(i);
        G.spr2(ctx, 'memoria', px, py + 18 + i * 20, has ? 1 : 0.2);
        G.text(ctx, has ? F[i].title : '? ? ?', px + 14, py + 18 + i * 20, has ? INK : DIM);
      }
      if (!G.save.frags.length) G.wrap('Todavía no has recuperado ningún fragmento. Quizá quien te conocía guarde algo tuyo.', 270).forEach((l, i) => G.text(ctx, l, px, py + 130 + i * 12, DIM));
    } else if (m.page === 'plantas') {
      G.text(ctx, 'Plantas-alma', px, py, GOLD);
      G.wrap('Diez plantas guardan cada una una pequeña parte del alma de un ser. Solo en ellas puedes guardar tu camino.', 280).forEach((l, i) => G.text(ctx, l, px, py + 14 + i * 12, DIM));
      G.PLANTS.forEach((p, i) => {
        const has = G.save.plants.includes(p.id);
        const cx = px + (i % 2) * 140, cy = py + 48 + Math.floor(i / 2) * 18;
        ctx.fillStyle = has ? '#9affe8' : '#3a4450'; ctx.fillRect(cx, cy + 3, 4, 4);
        G.text(ctx, has ? p.name : '? ? ?', cx + 9, cy, has ? INK : DIM);
      });
    } else if (m.page === 'opciones') drawOptions(px, py, m);
  }
  // ── el mapa del Abismo: zonas conocidas, dónde estás y los artefactos de viaje ──
  const NODES = { gruta: [40, 130], aldea: [120, 130], senda: [120, 60], santuario: [210, 60] };
  const LINKS = [['gruta', 'aldea'], ['aldea', 'senda'], ['senda', 'santuario']];
  function drawMap(px, py, m) {
    G.text(ctx, 'Mapa del Abismo', px, py, GOLD);
    if (!G.flag('mapa')) { G.wrap('Todavía no tienes un mapa.', 270).forEach((l, i) => G.text(ctx, l, px, py + 20 + i * 12, DIM)); return; }
    const arts = G.ARTIFACTS.filter((a) => (G.save.arts || []).includes(a.id));
    const ox = px + 12, oy = py + 14;
    // papel del mapa
    ctx.fillStyle = 'rgba(216,192,144,0.10)'; ctx.fillRect(ox - 6, oy, 270, 170);
    for (const [a, b] of LINKS) {
      if (!G.flag('visto_' + a) && !G.flag('visto_' + b)) continue;
      const A = NODES[a], B = NODES[b];
      ctx.fillStyle = 'rgba(216,191,134,0.5)';
      const n = Math.hypot(B[0] - A[0], B[1] - A[1]);
      for (let i = 0; i < n; i += 4) ctx.fillRect(Math.round(ox + A[0] + (B[0] - A[0]) * i / n), Math.round(oy + A[1] + (B[1] - A[1]) * i / n), 2, 1);
    }
    for (const id in NODES) {
      const [x, y] = NODES[id], seen = G.flag('visto_' + id), here = G.EX.zoneId === id;
      ctx.fillStyle = seen ? '#d8bf86' : '#4a4450'; ctx.fillRect(ox + x - 4, oy + y - 4, 9, 9);
      ctx.fillStyle = '#12101a'; ctx.fillRect(ox + x - 3, oy + y - 3, 7, 7);
      if (here && Math.floor(G.t / 15) % 2) { ctx.fillStyle = '#9affe8'; ctx.fillRect(ox + x - 2, oy + y - 2, 5, 5); }
      G.textC(ctx, seen ? G.ZONES[id].name : '? ? ?', ox + x, oy + y + 8, here ? '#fff4d0' : seen ? INK : DIM);
      const art = arts.find((a) => a.zone === id);
      if (art) { ctx.fillStyle = '#9affe8'; ctx.fillRect(ox + x + 6, oy + y - 8, 3, 3); ctx.fillRect(ox + x + 7, oy + y - 9, 1, 5); }
    }
    // viajar a un artefacto
    G.text(ctx, 'Artefactos de viaje', px, py + 192, GOLD);
    if (!arts.length) { G.text(ctx, 'Ninguno activado todavía.', px, py + 206, DIM); return; }
    if (G.pressed('up')) { m.j = (m.j + arts.length - 1) % arts.length; G.audio.sfx('move'); }
    if (G.pressed('down')) { m.j = (m.j + 1) % arts.length; G.audio.sfx('move'); }
    m.j = Math.min(m.j, arts.length - 1);
    const a = arts[m.j];
    G.text(ctx, '< ' + a.name + ' >', px + 110, py + 192, '#9affe8');
    const can = G.mode === 'explore' && !G.scene;
    G.text(ctx, G.keys(can ? '[a]: viajar allí' : 'No puedes viajar ahora'), px + 110, py + 206, can ? INK : DIM);
    if (can && m.t > 5 && G.ok()) {
      menu = null;
      G.audio.sfx('fragment');
      G.run(function* () {
        yield G.flashFx([0.6, 1, 0.9], 30, 0.9);
        yield G.fade(1, 20, [0, 0, 0]);
        G.EX.enter(a.zone, a.x, a.y + 1, 'down');
        yield G.wait(6);
        yield G.fade(0, 30);
      });
      return true;
    }
  }
  function drawOptions(px, py, m) {
    const o = G.R.opt, A = G.audio;
    if (G.pressed('up')) { m.j = (m.j + OPTS.length - 1) % OPTS.length; G.audio.sfx('move'); }
    if (G.pressed('down')) { m.j = (m.j + 1) % OPTS.length; G.audio.sfx('move'); }
    const [k] = OPTS[m.j];
    const dx = G.pressed('right') ? 1 : G.pressed('left') ? -1 : G.ok() ? 1 : 0;
    if (dx) {
      G.audio.sfx('move');
      if (k === 'quality') { o.quality = (o.quality + dx + 3) % 3; G.R.resize(); }
      else if (k === 'music') A.setVol(G.clamp(Math.round((A.musicVol + dx * 0.1) * 10) / 10, 0, 1));
      else if (k === 'sfx') A.setVol(null, G.clamp(Math.round((A.sfxVol + dx * 0.1) * 10) / 10, 0, 1));
      else { o[k] = !o[k]; if (k === 'retro' || k === 'pixel') G.R.resize(); if (k === 'retro') G.audio.retro = o.retro; }
      G.R.saveOpt();
      try { localStorage.setItem('abismo-audio', JSON.stringify({ m: A.musicVol, s: A.sfxVol })); } catch (e) { /* nada */ }
    }
    G.text(ctx, 'Opciones', px, py, GOLD);
    OPTS.forEach(([key, label], i) => {
      const sel = i === m.j, y = py + 20 + i * 17;
      let val;
      if (key === 'quality') val = ['Baja', 'Media', 'Alta'][o.quality];
      else if (key === 'music') val = bar(A.musicVol);
      else if (key === 'sfx') val = bar(A.sfxVol);
      else val = o[key] ? 'Sí' : 'No';
      G.text(ctx, label, px + 12, y, sel ? '#fff4d0' : INK);
      G.text(ctx, val, px + 230, y, sel ? GOLD : DIM);
      if (sel) G.text(ctx, '>', px + (Math.floor(G.t / 12) % 2), y, GOLD);
    });
    G.text(ctx, G.keys('[a] / flechas: cambiar   [b]: volver'), px, py + 190, DIM);
  }
  const bar = (v) => '+'.repeat(Math.round(v * 10)) + '·'.repeat(10 - Math.round(v * 10));
  function drawSkillIcons(x, y) {
    SKILLS.forEach(([id], i) => UI.skillIcon(ctx, id, x + i * 22, y, G.save.skills.includes(id) ? 1 : 0.2));
  }

  // iconos de las habilidades (16×16, dibujados a mano en código)
  const ICON_COL = { mente: '#8ad8ff', recuerdos: '#ffd070', cuerpo: '#ff8a7a', alma: '#c8a0ff', ser: '#ffffff', golpe: '#d8d0c0' };
  UI.ICON_COL = ICON_COL;
  const iconCache = {};
  UI.skillIcon = (c, id, x, y, a = 1) => {
    if (!iconCache[id]) {
      const col = ICON_COL[id] || '#fff';
      iconCache[id] = G.pix(16, 16, (i, j) => {
        const dx = i - 7.5, dy = j - 7.5, r = Math.hypot(dx, dy);
        if (r > 7.6) return null;
        if (r > 6.6) return '#0a0812';
        let on = false;
        if (id === 'mente') on = Math.abs(r - 4) < 0.8 || (r < 1.6);
        else if (id === 'recuerdos') on = (Math.abs(dx) + Math.abs(dy) < 5 && Math.abs(dx) + Math.abs(dy) > 3) || (Math.abs(dx) < 1 && Math.abs(dy) < 1);
        else if (id === 'cuerpo') on = (Math.abs(dx) < 1.2 && Math.abs(dy) < 4.5) || (Math.abs(dy) < 1.2 && Math.abs(dx) < 4.5);
        else if (id === 'alma') on = Math.abs(r - 2.2 - Math.sin(Math.atan2(dy, dx) * 3) * 1.6) < 0.8;
        else if (id === 'ser') on = r < 2 || Math.abs(r - 5) < 0.6 || (Math.abs(dx) < 0.6 && r < 6) || (Math.abs(dy) < 0.6 && r < 6);
        else if (id === 'golpe') on = Math.abs(dx - dy) < 1.2 && r < 5;
        return on ? col : '#1a1628';
      });
    }
    c.globalAlpha = a; c.drawImage(iconCache[id], Math.round(x), Math.round(y)); c.globalAlpha = 1;
  };
  G.spr2 = (c, name, x, y, a = 1) => { const s = G.SPR[name]; if (!s) return; c.globalAlpha = a; c.drawImage(s.c, Math.round(x), Math.round(y)); c.globalAlpha = 1; };

  // ── dibujo de cada fotograma ──
  UI.draw = () => {
    ctx.clearRect(0, 0, 480, 270);
    if (G.mode === 'combat' && G.CB) G.CB.drawHUD(ctx);
    if (G.mode === 'title' && G.TITLE) G.TITLE.draw(ctx);
    drawPrompt();
    drawEyes();
    if (card) drawCard();
    if (hint && !UI.blocking()) drawHint();
    if (toast) drawToast();
    if (memo) drawMemo();
    else if (narr) drawNarr();
    if (dlg) drawDialog();
    if (choice) drawChoice();
    if (menu) drawMenu();
  };
})();
