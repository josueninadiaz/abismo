'use strict';
// ─── Combate lateral en 2D (a la manera de The Dark Queen of Mortholme) ───
// Pocos movimientos, lentos y telegrafiados. El protagonista no mata: purifica.
// Cada infectado lleva «sellos» del pilar; cada sello solo cede ante su habilidad (Mente, Recuerdos, Cuerpo, Alma, Ser).
// El golpe físico llena su Resistencia hasta aturdirlo (salvo que sea inmune). Entre fases, se habla.
(function () {
  const CW = 320, CH = 180, FLOOR = 150;
  const CB = (G.CB = { active: false });
  const g = G.R.flatctx;

  // ── pequeña librería de píxeles ──
  const px = (c, x, y, col) => { c.fillStyle = col; c.fillRect(x | 0, y | 0, 1, 1); };
  function ell(c, cx, cy, rx, ry, col) {
    c.fillStyle = col;
    for (let y = Math.floor(-ry); y <= Math.ceil(ry); y++) {
      const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
      if (w >= 0 && Math.abs(y) <= ry) c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
    }
  }
  // elipse con volumen: base, tono medio desplazado hacia la luz, brillo
  function ball(c, cx, cy, rx, ry, cols) {
    ell(c, cx, cy, rx, ry, cols[0]);
    ell(c, cx - rx * 0.12, cy - ry * 0.18, rx * 0.78, ry * 0.72, cols[1]);
    if (cols[2]) ell(c, cx - rx * 0.3, cy - ry * 0.42, rx * 0.35, ry * 0.25, cols[2]);
  }
  function tri(c, a, b, d, col) {
    c.fillStyle = col;
    const minX = Math.floor(Math.min(a[0], b[0], d[0])), maxX = Math.ceil(Math.max(a[0], b[0], d[0]));
    const minY = Math.floor(Math.min(a[1], b[1], d[1])), maxY = Math.ceil(Math.max(a[1], b[1], d[1]));
    const s = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const p = [x + 0.5, y + 0.5], d1 = s(p, a, b), d2 = s(p, b, d), d3 = s(p, d, a);
      if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) c.fillRect(x, y, 1, 1);
    }
  }
  function limb(c, x0, y0, x1, y1, r, col) {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let i = 0; i <= n; i++) ell(c, G.lerp(x0, x1, i / n), G.lerp(y0, y1, i / n), r, r, col);
  }
  // cristal del pilar: dos caras (luz y sombra) y filo brillante
  function shard(c, x, y, w, h, ang, glow) {
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const P = (u, v) => [x + u * ca - v * sa, y + u * sa + v * ca];
    const tip = P(0, -h), l = P(-w, 0), r = P(w, 0), m = P(0, 1);
    if (!glow) { tri(c, tip, l, m, '#b02a44'); tri(c, tip, r, m, '#ff8a9a'); }
    else { tri(c, tip, r, m, '#ff5a78'); px(c, tip[0], tip[1] + 1, '#ffe0e8'); }
  }
  const OUT = '#08040c';
  // contorno de 1 píxel alrededor del dibujo
  const tmpA = G.makeCanvas(120, 120), tmpB = G.makeCanvas(120, 120);
  function withOutline(dst, x, y, flip, draw) {
    const a = tmpA.getContext('2d'), b = tmpB.getContext('2d');
    a.clearRect(0, 0, 120, 120); b.clearRect(0, 0, 120, 120);
    draw(a);
    b.drawImage(tmpA, 0, 0);
    b.globalCompositeOperation = 'source-in'; b.fillStyle = OUT; b.fillRect(0, 0, 120, 120); b.globalCompositeOperation = 'source-over';
    dst.save();
    dst.translate(Math.round(x), Math.round(y));
    if (flip) dst.scale(-1, 1);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) dst.drawImage(tmpB, -60 + dx, -110 + dy);
    dst.drawImage(tmpA, -60, -110);
    dst.restore();
  }

  // ── cuerpos de los enemigos (mirando a la izquierda; origen en los pies: (60, 110)) ──
  const RIG = {
    tharn(c, p, glowOnly) {
      // un guardián encorvado: patas de bestia, hombrera de bronce, garras largas y cuarzo brotando del lomo
      const ox = 60, oy = 110, cr = p.crouch || 0, br = Math.sin(p.t * 0.06) * 1, ln = p.lean || 0;
      const F = ['#2a2230', '#3e3244', '#5a4a5e'], RIM = '#8a7090', W = ['#b8aab0', '#e8dee2', '#ffffff'];
      const B = ['#5a4424', '#8a6a3a', '#c8a060'];
      const hipX = ox + 6, hipY = oy - 30 + cr * 8;
      const chX = ox - 6 - ln * 8, chY = oy - 46 + cr * 10 + br;
      const hx = chX - 15 - ln * 4, hy = chY - 6 + cr * 3;
      const eye = p.eye || '#ff3a4a';
      if (!glowOnly) {
        // cola
        const tw = Math.sin(p.t * 0.05) * 3;
        limb(c, hipX + 8, hipY + 2, hipX + 20, hipY - 6 + tw, 2.5, F[0]);
        limb(c, hipX + 20, hipY - 6 + tw, hipX + 26, hipY - 14 + tw, 2, F[1]);
        // pata de atrás (más oscura)
        limb(c, hipX + 4, hipY, hipX + 10, oy - 14, 5, F[0]);
        limb(c, hipX + 10, oy - 14, hipX + 6, oy - 2, 3.5, F[0]);
        ell(c, hipX + 3, oy - 1, 5, 2, F[0]);
        // brazo de atrás
        limb(c, chX + 6, chY - 2, chX + 2 + p.arm * 6, chY + 26 - p.arm * 30, 3.5, F[0]);
        // cuerpo: cadera y pecho
        ball(c, hipX, hipY, 11, 10, F);
        ball(c, chX, chY, 13, 14, F);
        for (let i = -9; i <= 6; i++) px(c, chX + i - 2, chY - 13 + Math.round((i * i) / 18), RIM);
        // pata delantera
        limb(c, hipX - 4, hipY + 2, hipX - 10, oy - 13, 5.5, F[1]);
        limb(c, hipX - 10, oy - 13, hipX - 6, oy - 2, 4, F[1]);
        ell(c, hipX - 9, oy - 1, 6, 2, F[0]);
        for (let i = 0; i < 3; i++) px(c, hipX - 14 + i * 2, oy, '#e8e0d8');
        // cinturón de bronce
        for (let i = -10; i <= 10; i++) { px(c, hipX + i, hipY - 6 + Math.round(Math.abs(i) / 4), B[1]); px(c, hipX + i, hipY - 5 + Math.round(Math.abs(i) / 4), B[0]); }
        // cabeza: orejas, máscara blanca, hocico
        tri(c, [hx - 3, hy - 6], [hx - 1, hy - 20], [hx + 3, hy - 6], F[1]);
        tri(c, [hx - 1, hy - 7], [hx - 1, hy - 16], [hx + 1, hy - 7], '#6a3a4a');
        tri(c, [hx + 3, hy - 6], [hx + 8, hy - 18], [hx + 9, hy - 3], F[0]);
        ball(c, hx, hy, 9, 8, F);
        ell(c, hx - 4, hy + 2, 7, 5, W[0]); ell(c, hx - 5, hy + 1, 6, 4, W[1]); ell(c, hx - 7, hy - 1, 2, 1, W[2]);
        ell(c, hx - 10, hy + 3, 4, 3, W[1]); px(c, hx - 13, hy + 2, '#1a1016');
        // hombrera
        ball(c, chX + 2, chY - 8, 8, 6, B);
        // brazo delantero y garras
        const ax = chX - 8 - p.arm * 8 - ln * 12, ay = chY + 30 - p.arm * 56;
        const ex = chX - 2 - p.arm * 10, ey = chY + 12 - p.arm * 22;
        limb(c, chX - 2, chY - 4, ex, ey, 4.5, F[1]);
        limb(c, ex, ey, ax, ay, 3.8, F[2]);
        ell(c, ax, ay, 4.5, 4, F[1]);
        for (let i = 0; i < 3; i++) limb(c, ax - 2, ay + 1 - i * 2, ax - 8, ay + 3 - i * 3 + p.arm * 2, 0.5, '#f4ece4');
      }
      // ojos (brillan)
      px(c, hx - 6, hy - 1, eye); px(c, hx - 5, hy - 1, eye); px(c, hx - 1, hy - 2, eye);
      if (glowOnly) { px(c, hx - 5, hy - 2, eye); }
      // cuarzo en el lomo, más o menos según los sellos que quedan
      const spots = [[6, -12, 4, 16, -0.2], [12, -8, 3, 12, 0.4], [0, -13, 3, 11, -0.6], [16, -2, 3, 10, 0.8], [-6, -10, 2, 8, -0.9]];
      for (let i = 0; i < Math.min(p.crystals || 0, spots.length); i++) { const [sx, sy, w, h, a] = spots[i]; shard(c, chX + sx, chY + sy, w, h, a, glowOnly); }
    },
    oren(c, p, glowOnly) {
      const ox = 60, oy = 104 + Math.sin(p.t * 0.04) * 3, lift = p.arm;
      const R = ['#2a2e3a', '#3a4050', '#6a6270'], W = ['#b8b0a4', '#f0ece6', '#ffffff'];
      if (!glowOnly) {
        // túnica
        tri(c, [ox - 10, oy - 56], [ox - 20, oy], [ox + 18, oy], R[0]);
        tri(c, [ox - 10, oy - 56], [ox + 12, oy - 56], [ox + 18, oy], R[0]);
        tri(c, [ox - 8, oy - 54], [ox - 15, oy - 2], [ox + 4, oy - 2], R[1]);
        for (let i = 0; i < 5; i++) px(c, ox - 16 + i * 8, oy - 1, '#c0a870');
        // capa clara sobre los hombros
        ball(c, ox, oy - 52, 15, 7, ['#8a7440', '#c0a870', '#e8dcc0']);
        // brazo con el bastón
        const hx = ox - 16 - lift * 2, hy = oy - 38 - lift * 12;
        limb(c, ox - 8, oy - 50, hx, hy, 3.5, R[1]);
        limb(c, hx + 2, hy + 30, hx - 2, hy - 34, 1.2, '#6a4a2a');
        // cabeza y orejas largas
        const hdx = ox - 3, hdy = oy - 64;
        tri(c, [hdx - 6, hdy - 3], [hdx - 4, hdy - 20], [hdx - 1, hdy - 5], R[2]);
        tri(c, [hdx + 1, hdy - 5], [hdx + 7, hdy - 19], [hdx + 7, hdy - 2], R[1]);
        ball(c, hdx, hdy, 8, 8, R);
        ell(c, hdx - 3, hdy + 2, 6, 5, W[0]); ell(c, hdx - 4, hdy + 1, 5, 4, W[1]);
        // barba
        tri(c, [hdx - 7, hdy + 4], [hdx + 1, hdy + 4], [hdx - 4, hdy + 16], W[1]);
      }
      const hdx = ox - 3, hdy = oy - 64;
      const eye = p.eye || '#ff3a4a';
      px(c, hdx - 6, hdy - 1, eye); px(c, hdx - 5, hdy - 1, eye); px(c, hdx - 1, hdy - 1, eye);
      // punta del bastón
      const hx = ox - 16 - lift * 2, hy = oy - 38 - lift * 12;
      if (glowOnly) { ell(c, hx - 2, hy - 36, 2.5, 3.5, p.staff || '#ff5a78'); px(c, hx - 3, hy - 37, '#ffffff'); }
      // el cuarzo se come medio cuerpo; se retira sello a sello
      const n = p.crystals;
      const spots = [[10, -48, 5, 16, 0.4], [14, -36, 4, 12, 0.9], [6, -58, 3, 10, 0.1], [16, -20, 4, 12, 1.2], [4, -30, 3, 9, 0.6], [12, -8, 3, 8, 1.4], [-2, -44, 3, 8, -0.3], [9, -66, 2, 7, 0.3]];
      for (let i = 0; i < Math.min(n, spots.length); i++) { const [sx, sy, w, h, a] = spots[i]; shard(c, ox + sx, oy + sy, w, h, a, glowOnly); }
    },
  };

  // ── definiciones de cada enfrentamiento ──
  const SKILLDEF = {
    golpe: { wind: 7, act: 5, rec: 12, cd: 0, col: '#e8e0d0' },
    mente: { wind: 14, act: 1, rec: 14, cd: 80, col: '#8ad8ff' },
    recuerdos: { wind: 34, act: 1, rec: 12, cd: 150, col: '#ffd070' },
    cuerpo: { wind: 10, act: 6, rec: 16, cd: 70, col: '#ff8a7a' },
    alma: { wind: 20, act: 30, rec: 10, cd: 220, col: '#c8a0ff' },
    ser: { wind: 50, act: 30, rec: 20, cd: 300, col: '#ffffff' },
  };
  CB.SKILLDEF = SKILLDEF;
  const FIGHTS = {
    tharn: {
      name: 'Tharn, guardián del Claro', rig: 'tharn', bg: 'claro', music: 'combate', immune: false, hits: 2, crystals: 5,
      phases: [
        { seals: ['mente', 'cuerpo'], speed: 1, attacks: ['zarpazo', 'embestida', 'espinas'] },
        { seals: ['recuerdos', 'mente', 'cuerpo'], speed: 1.2, attacks: ['zarpazo', 'embestida', 'espinas', 'lluvia'] },
      ],
      barks: [
        ['Sin... Marca...', 'La Luz... dice que... no perteneces...', 'Protejo... ¿el qué?'],
        ['¡Deja de... revolver... mi cabeza!', 'Había... una puerta...', 'Oren... ¿Oren?', 'Duele... recordar...'],
      ],
    },
    oren: {
      name: 'Oren, el antiguo líder', rig: 'oren', bg: 'santuario', music: 'lider', immune: true, hits: 2, crystals: 8,
      phases: [
        { seals: ['mente'], speed: 0.9, attacks: ['ecos', 'pilar'] },
        { seals: ['recuerdos'], speed: 1, attacks: ['ecos', 'pilar', 'ola'] },
        { seals: ['cuerpo'], speed: 1.05, attacks: ['pilar', 'ola', 'agarre'] },
        { seals: ['alma'], speed: 1.1, attacks: ['ecos', 'ola', 'agarre', 'pilar'] },
        { seals: ['ser'], speed: 1.15, attacks: ['ecos', 'pilar', 'ola', 'agarre'] },
      ],
      barks: [
        ['Vete... antes de que ella hable por mí.', 'No es mi voz... no es mi voz...'],
        ['Recuerdo... una orilla...', '¡No toques eso! Es... mío...'],
        ['Mi cuerpo... ya no es mío.', 'El cuarzo... pesa...'],
        ['Todavía queda... algo de mí...', 'Hijo... ¿eres tú?'],
        ['Termina... lo que empecé.', 'Libérame... por completo.'],
      ],
    },
  };

  // ── estado ──
  let P, E, fx, shots, hazards, floats, barks, st, phase, def, onEnd, tut;

  CB.start = (id, done) => {
    def = FIGHTS[id]; onEnd = done;
    CB.active = true; CB.id = id; CB.finished = false;
    P = { x: 70, face: 1, hp: 5, max: 5, inv: 0, st: 'idle', t: 0, anim: 0, cd: {}, dcd: 0, kx: 0, skill: null, aura: 0 };
    E = { x: 250, face: -1, st: 'idle', t: 0, next: 90, atk: null, res: 0, stun: 0, hit: 0, crystals: def.crystals, pose: { t: 0, arm: 0, crouch: 0, lean: 0 }, vx: 0, bark: 0 };
    fx = []; shots = []; hazards = []; floats = []; barks = [];
    phase = 0; tut = id === 'tharn' && !G.flag('tut_combate');
    startPhase();
    st = 'intro'; CB.t = 0;
    G.audio.play(def.music);
    G.audio.ambient(null);
    buildBg();
  };
  function startPhase() {
    const ph = def.phases[phase];
    E.seals = ph.seals.map((s) => ({ s, hp: def.hits, broken: false }));
    E.speed = ph.speed; E.res = 0; E.stun = 0; E.st = 'idle'; E.t = 0; E.next = 70; E.atk = null;
    E.x = Math.max(E.x, 200);
    hazards = []; shots = [];
  }
  const seal = () => E.seals.find((s) => !s.broken);

  // ── entrada del jugador ──
  const ORDER = ['mente', 'recuerdos', 'cuerpo', 'alma', 'ser'];
  function playerUpdate() {
    P.t++; P.anim++;
    if (P.inv > 0) P.inv--;
    if (P.dcd > 0) P.dcd--;
    for (const k in P.cd) if (P.cd[k] > 0) P.cd[k]--;
    P.x += P.kx; P.kx *= 0.85;
    if (P.st === 'down') return;
    if (P.st === 'hurt') { if (P.t > 22) setP('idle'); return; }
    if (P.st === 'dodge') {
      P.x += P.ddir * (P.t < 12 ? 3.4 : 1.2);
      if (P.t % 3 === 0) fx.push({ ghost: true, x: P.x, face: P.face, life: 14 });
      if (P.t > 16) setP('idle');
      clampP();
      return;
    }
    if (P.st === 'act') { stepSkill(); return; }
    // movimiento
    const d = G.dir.x;
    if (Math.abs(d) > 0.2) { P.x += Math.sign(d) * 1.15; P.face = Math.sign(d); P.moving = true; }
    else P.moving = false;
    clampP();
    if (G.pressed('x') && P.dcd <= 0) {
      setP('dodge'); P.ddir = Math.abs(d) > 0.2 ? Math.sign(d) : -P.face; P.inv = 15; P.dcd = 34; G.audio.sfx('dodge');
      return;
    }
    if (G.pressed('a')) return useSkill('golpe');
    for (let i = 0; i < 5; i++) if (G.pressed('s' + (i + 1))) return useSkill(ORDER[i]);
    // Y / Q: usa la habilidad del sello actual (atajo cómodo en móvil y mando)
    if (G.pressed('y')) { const s = seal(); if (s) useSkill(s.s); }
  }
  function clampP() { P.x = G.clamp(P.x, 18, CW - 18); }
  function setP(s) { P.st = s; P.t = 0; }
  function useSkill(id) {
    if (id !== 'golpe' && !G.save.skills.includes(id)) { floatText(P.x, FLOOR - 50, '???', '#9a94a8'); return; }
    if (P.cd[id] > 0) { G.audio.sfx('back'); return; }
    P.skill = id; setP('act');
    if (id !== 'golpe') G.audio.sfx('warn');
    else G.audio.sfx('swing');
  }
  function stepSkill() {
    const id = P.skill, D = SKILLDEF[id], t = P.t;
    if (t === D.wind) fire(id);
    if (id === 'alma' && t > D.wind && t <= D.wind + D.act) {
      const r = (t - D.wind) / D.act * 70;
      if (t === D.wind + D.act && Math.abs(E.x - P.x) < r + 10) apply('alma');
    }
    if (id === 'ser' && t > D.wind && t < D.wind + D.act && (t - D.wind) % 6 === 0) {
      const inFront = (E.x - P.x) * P.face > 0;
      if (inFront && t - D.wind === 6) apply('ser');
    }
    if (id === 'golpe' && t >= D.wind && t < D.wind + D.act && !P.hitDone) {
      if (Math.abs(E.x - (P.x + P.face * 20)) < 22 && E.st !== 'gone') { P.hitDone = true; physical(8); }
    }
    if (id === 'cuerpo' && t === D.wind + 1 && Math.abs(E.x - (P.x + P.face * 18)) < 24) { apply('cuerpo'); physical(14, true); }
    if (t >= D.wind + D.act + D.rec) { P.cd[id] = D.cd; P.hitDone = false; setP('idle'); }
  }
  function fire(id) {
    const col = SKILLDEF[id].col;
    G.audio.sfx(id === 'golpe' ? 'swing' : id);
    if (id === 'mente') shots.push({ kind: 'onda', x: P.x + P.face * 12, y: FLOOR - 22, vx: P.face * 3.4, life: 120, col, mine: true });
    if (id === 'recuerdos') {
      if (Math.abs(E.x - P.x) < 120) { for (let i = 0; i < 16; i++) fx.push({ thread: true, x0: E.x, y0: FLOOR - 40, x1: P.x, y1: FLOOR - 24, k: i / 16, life: 40, col }); apply('recuerdos'); }
      else floatText(P.x, FLOOR - 50, 'Demasiado lejos', '#9a94a8');
    }
    if (id === 'cuerpo') for (let i = 0; i < 14; i++) fx.push({ x: P.x + P.face * 18, y: FLOOR - 20, vx: P.face * G.rnd(0.5, 2.5), vy: G.rnd(-1.5, 1), life: 22, col, s: 2 });
    if (id === 'ser') G.shake = 3;
    burst(P.x, FLOOR - 20, col, 12);
  }
  // daño físico: llena la Resistencia (salvo inmunes)
  function physical(n, silent) {
    if (def.immune) { if (!silent) { floatText(E.x, FLOOR - 70, 'INMUNE', '#9a94a8'); G.audio.sfx('block'); } burst(E.x - E.face * 4, FLOOR - 30, '#d8d0c0', 6); return; }
    E.hit = 8;
    G.audio.sfx('hit');
    burst(E.x, FLOOR - 30, '#ffffff', 8);
    if (E.stun > 0) return;
    E.res += n;
    if (E.res >= 100) { E.res = 100; E.stun = 170; E.atk = null; E.st = 'stun'; hazards = hazards.filter((h) => h.kind === 'onda'); floatText(E.x, FLOOR - 76, '¡ATURDIDO!', '#ffd070'); G.audio.sfx('crystal'); }
  }
  // una habilidad contra el sello
  function apply(id) {
    const s = seal();
    if (!s) return;
    if (s.s !== id) {
      floatText(E.x, FLOOR - 72, 'Sin efecto', '#9a94a8');
      E.res = Math.min(99, E.res + 4);
      if (!s.seen) { s.seen = true; floatText(E.x, FLOOR - 84, 'El sello pide ' + nameOf(s.s), '#d8bf86'); }
      return;
    }
    s.seen = true;
    s.hp -= E.stun > 0 ? 2 : 1;
    E.hit = 10;
    burst(E.x, FLOOR - 40, SKILLDEF[id].col, 18);
    if (s.hp > 0) { floatText(E.x, FLOOR - 72, 'El sello se agrieta', SKILLDEF[id].col); G.audio.sfx('crystal'); return; }
    s.broken = true;
    E.crystals = Math.max(0, E.crystals - Math.ceil(def.crystals / countSeals()));
    floatText(E.x, FLOOR - 76, '¡Sello de ' + nameOf(id) + ' roto!', SKILLDEF[id].col);
    G.audio.sfx('shatter');
    G.R.flash.a = 0.5; G.R.flash.r = 1; G.R.flash.g = 0.9; G.R.flash.b = 0.95;
    for (let i = 0; i < 30; i++) fx.push({ x: E.x + G.rnd(-10, 10), y: FLOOR - 40 + G.rnd(-12, 12), vx: G.rnd(-2.5, 2.5), vy: G.rnd(-3, 0.5), grav: 0.12, life: 50, col: G.pick(['#ff8a9a', '#ffd0da', '#ff5a78']), s: 2 });
    if (!seal()) endPhase();
  }
  const countSeals = () => def.phases.reduce((n, p) => n + p.seals.length, 0);
  const nameOf = (id) => G.UI.SKILLS.find((s) => s[0] === id)[1];

  function endPhase() {
    st = 'pause';
    hazards = []; shots = [];
    E.atk = null; E.st = 'stun'; E.stun = 9999;
    const last = phase >= def.phases.length - 1;
    const scene = G.STORY['cb_' + CB.id](phase, last);
    runScene(function* () {
      yield G.wait(50);
      yield* scene;
      if (last) {
        st = 'purify'; CB.t = 0;
      } else {
        phase++; startPhase(); st = 'fight';
        G.UI.toast('Fase ' + (phase + 1));
      }
    });
  }

  // ── enemigo ──
  function enemyUpdate() {
    const pose = E.pose;
    pose.t++;
    if (E.hit > 0) E.hit--;
    E.face = P.x < E.x ? -1 : 1;
    if (E.stun > 0) {
      E.stun--;
      pose.crouch = G.lerp(pose.crouch, 1, 0.1); pose.arm = G.lerp(pose.arm, -0.2, 0.1);
      if (E.stun === 0) { E.st = 'idle'; E.res = 0; E.next = 40; }
      return;
    }
    if (E.st === 'idle') {
      pose.crouch = G.lerp(pose.crouch, 0, 0.1); pose.arm = G.lerp(pose.arm, 0, 0.1); pose.lean = G.lerp(pose.lean, 0, 0.1);
      // se acerca despacio
      const want = def.rig === 'oren' ? 150 : 50, d = Math.abs(P.x - E.x);
      if (d > want + 10) E.x += Math.sign(P.x - E.x) * 0.45 * E.speed;
      else if (d < want - 30 && def.rig === 'oren') E.x -= Math.sign(P.x - E.x) * 0.35;
      E.x = G.clamp(E.x, 40, CW - 40);
      if (--E.next <= 0) chooseAttack();
      // frases sueltas durante la pelea
      if (--E.bark <= 0) { E.bark = G.ri(400, 700); const L = def.barks[phase] || []; if (L.length) say(E, G.pick(L)); }
      return;
    }
    if (E.st === 'atk') runAttack();
  }
  // escenas lanzadas desde el combate (lo pausan mientras duran)
  function runScene(fn) { CB.busy = true; G.run(fn, () => { CB.busy = false; }); }
  function say(who, text) { barks.push({ who, text, t: 0, n: 200 }); }
  function chooseAttack() {
    const ph = def.phases[phase], d = Math.abs(P.x - E.x);
    let opts = ph.attacks.slice();
    if (d > 70) opts = opts.filter((a) => a !== 'zarpazo');
    if (d < 60) opts = opts.filter((a) => a !== 'embestida').concat(opts.includes('zarpazo') ? ['zarpazo'] : []);
    E.atk = { kind: G.pick(opts), t: 0 };
    E.st = 'atk';
  }
  function hurtP(n, from) {
    if (P.inv > 0 || P.st === 'down' || st !== 'fight') return;
    P.hp -= n; P.inv = 60; P.kx = Math.sign(P.x - from) * 3; setP('hurt');
    G.audio.sfx('hurt'); G.shake = 3;
    G.R.flash.r = 1; G.R.flash.g = 0.2; G.R.flash.b = 0.3; G.R.flash.a = 0.35;
    burst(P.x, FLOOR - 20, '#ff5a6a', 10);
    if (P.hp <= 0) { P.hp = 0; setP('down'); st = 'lost'; CB.t = 0; }
  }
  const S = (n) => Math.round(n / (E.speed || 1));
  function runAttack() {
    const a = E.atk, pose = E.pose;
    a.t++;
    const t = a.t;
    const done = (rec) => { E.st = 'idle'; E.atk = null; E.next = S(G.ri(50, 90)) + (rec || 0); };
    switch (a.kind) {
      case 'zarpazo': { // levanta el brazo y lo deja caer delante
        const W = S(36);
        if (t === 1) { G.audio.sfx('warn'); hazards.push({ kind: 'aviso', x: E.x + E.face * 30, w: 30, t: 0, n: W }); }
        if (t < W) { pose.arm = G.lerp(pose.arm, 1, 0.12); pose.lean = G.lerp(pose.lean, -0.3, 0.1); }
        else if (t < W + 8) { pose.arm = G.lerp(pose.arm, -0.4, 0.5); pose.lean = 0.6; if (t === W + 1) { G.audio.sfx('swing'); G.shake = 2; } if (Math.abs(P.x - (E.x + E.face * 30)) < 30) hurtP(1, E.x); }
        else if (t > W + 36) done();
        break;
      }
      case 'embestida': { // se agacha y cruza la arena
        const W = S(44);
        if (t === 1) { G.audio.sfx('warn'); a.dir = E.face; }
        if (t < W) { pose.crouch = G.lerp(pose.crouch, 1, 0.1); pose.lean = 0.4; if (t % 4 === 0) fx.push({ x: E.x - a.dir * 10, y: FLOOR - 2, vx: -a.dir * G.rnd(0.5, 1.5), vy: -G.rnd(0.2, 0.8), life: 20, col: '#6a5a60', s: 2 }); }
        else if (t < W + 60) {
          E.x += a.dir * 5; pose.crouch = 0.6; pose.lean = 1;
          if (Math.abs(P.x - E.x) < 20) hurtP(1, E.x - a.dir * 20);
          if (E.x < 40 || E.x > CW - 40) { E.x = G.clamp(E.x, 40, CW - 40); G.shake = 4; G.audio.sfx('boom'); a.t = W + 60; }
        } else if (t > W + 100) done();
        else { pose.crouch = G.lerp(pose.crouch, 0.8, 0.1); pose.lean = G.lerp(pose.lean, 0, 0.1); }
        break;
      }
      case 'espinas': case 'agarre': { // círculo en el suelo bajo el jugador, luego cristales
        const W = S(58);
        if (t === 1) { G.audio.sfx('warn'); a.hz = { kind: 'circulo', x: P.x, w: 20, t: 0, n: W, track: S(30), col: a.kind === 'agarre' ? '#c8a0ff' : '#ff5a78' }; hazards.push(a.hz); }
        pose.arm = G.lerp(pose.arm, t < W ? 0.7 : 0, 0.1);
        if (t === W) { a.hz.boom = 22; G.audio.sfx('crystal'); G.shake = 2; }
        if (t >= W && t < W + 18 && Math.abs(P.x - a.hz.x) < 20) hurtP(1, a.hz.x);
        if (t > W + 40) done();
        break;
      }
      case 'lluvia': { // cristales que caen del techo en varios sitios
        const W = S(70);
        if (t === 1) {
          G.audio.sfx('warn');
          const xs = [P.x, G.rnd(30, CW - 30), G.rnd(30, CW - 30), G.rnd(30, CW - 30)];
          a.marks = xs.map((x) => { const h = { kind: 'aviso', x, w: 14, t: 0, n: W, col: '#ff8a9a' }; hazards.push(h); return h; });
        }
        pose.arm = G.lerp(pose.arm, 1, 0.08);
        if (t === W) for (const m of a.marks) shots.push({ kind: 'caida', x: m.x, y: -10, vy: 6, life: 60 });
        if (t > W + 40) done();
        break;
      }
      case 'ecos': { // recuerdos robados que persiguen
        if (t === 1) { G.audio.sfx('recuerdos'); pose.arm = 1; }
        if (t === 20) for (let i = 0; i < 3; i++) shots.push({ kind: 'eco', x: E.x + G.rnd(-20, 20), y: FLOOR - 60 - i * 12, vx: 0, vy: 0, life: 300, hp: 1 });
        if (t > 50) { pose.arm = G.lerp(pose.arm, 0, 0.1); if (t > 70) done(); }
        break;
      }
      case 'pilar': { // columna de luz roja
        const W = S(50);
        if (t === 1) { G.audio.sfx('warn'); a.hz = { kind: 'columna', x: P.x, w: 16, t: 0, n: W, track: S(24) }; hazards.push(a.hz); }
        pose.arm = G.lerp(pose.arm, 1, 0.1);
        if (t === W) { a.hz.boom = 26; G.audio.sfx('boom'); G.shake = 3; }
        if (t >= W && t < W + 24 && Math.abs(P.x - a.hz.x) < 16) hurtP(1, a.hz.x);
        if (t > W + 40) done();
        break;
      }
      case 'ola': { // onda por el suelo hacia los dos lados
        const W = S(40);
        if (t === 1) G.audio.sfx('warn');
        pose.arm = G.lerp(pose.arm, t < W ? 1 : -0.3, 0.2);
        if (t === W) { G.audio.sfx('boom'); G.shake = 3; for (const d of [-1, 1]) shots.push({ kind: 'ola', x: E.x, y: FLOOR, vx: d * 2.6, life: 160 }); }
        if (t > W + 50) done();
        break;
      }
    }
  }

  // ── proyectiles y peligros ──
  function stepShots() {
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.life--;
      if (s.kind === 'onda') {
        s.x += s.vx;
        if (Math.abs(s.x - E.x) < 16) { apply('mente'); burst(s.x, s.y, s.col, 10); s.life = 0; }
        // la onda también disuelve los ecos
        for (const o of shots) if (o.kind === 'eco' && Math.hypot(o.x - s.x, o.y - s.y) < 12) o.life = 0;
        if (s.x < 0 || s.x > CW) s.life = 0;
      } else if (s.kind === 'caida') {
        s.y += s.vy;
        if (s.y > FLOOR - 4) { s.life = 0; burst(s.x, FLOOR - 4, '#ff8a9a', 8); G.audio.sfx('crystal'); if (Math.abs(P.x - s.x) < 14) hurtP(1, s.x); }
        else if (Math.abs(P.x - s.x) < 8 && s.y > FLOOR - 36) hurtP(1, s.x);
      } else if (s.kind === 'eco') {
        const dx = P.x - s.x, dy = FLOOR - 22 - s.y, l = Math.hypot(dx, dy) || 1;
        s.vx += dx / l * 0.03; s.vy += dy / l * 0.03; s.vx *= 0.985; s.vy *= 0.985;
        s.x += s.vx; s.y += s.vy;
        if (l < 9) { hurtP(1, s.x); s.life = 0; }
        if (P.st === 'act' && P.skill === 'golpe' && P.t >= 7 && P.t < 12 && Math.abs(s.x - (P.x + P.face * 16)) < 16 && Math.abs(s.y - (FLOOR - 22)) < 20) { s.life = 0; burst(s.x, s.y, '#ffd070', 8); G.audio.sfx('block'); }
      } else if (s.kind === 'ola') {
        s.x += s.vx;
        if (Math.abs(P.x - s.x) < 8) hurtP(1, s.x - s.vx * 4);
        if (s.x < 0 || s.x > CW) s.life = 0;
      }
      if (s.life <= 0) shots.splice(i, 1);
    }
    for (let i = hazards.length - 1; i >= 0; i--) {
      const h = hazards[i];
      h.t++;
      if (h.track && h.t < h.track) h.x = G.lerp(h.x, P.x, 0.08);
      if (h.boom != null) { if (--h.boom <= 0) hazards.splice(i, 1); }
      else if (h.t > h.n + 2) hazards.splice(i, 1);
    }
  }
  function burst(x, y, col, n) { for (let i = 0; i < n; i++) fx.push({ x, y, vx: G.rnd(-1.6, 1.6), vy: G.rnd(-1.8, 0.6), life: G.ri(16, 34), col, s: 1 }); }
  function floatText(x, y, text, col) { floats.push({ x, y, text, col, t: 0 }); }

  // ── bucle ──
  CB.update = () => {
    CB.t++;
    if (G.shake) G.shake = Math.max(0, G.shake - 0.2);
    if (G.R.flash.a > 0) G.R.flash.a = Math.max(0, G.R.flash.a - 0.03);
    if (st === 'intro') {
      E.pose.t++;
      if (CB.t > 70) {
        st = 'fight';
        if (tut) {
          G.setFlag('tut_combate');
          runScene(G.STORY.tutorial_combate);
        }
      }
    } else if (st === 'fight') {
      if (!CB.busy && !G.UI.blocking()) { playerUpdate(); enemyUpdate(); stepShots(); }
      if (G.pressed('start') && !CB.busy && !G.UI.blocking()) G.UI.openMenu();
    } else if (st === 'pause') {
      E.pose.t++;
      if (P.st === 'act') stepSkill(); else P.moving = false;
    } else if (st === 'lost') {
      if (CB.t === 90) {
        runScene(function* () {
          yield* G.STORY.derrota(CB.id);
          P.hp = P.max; P.x = 70; P.inv = 90; setP('idle');
          startPhase(); E.x = 250; E.crystals = def.crystals - Math.ceil(def.crystals / countSeals()) * def.phases.slice(0, phase).reduce((n, p) => n + p.seals.length, 0);
          st = 'fight';
        });
      }
    } else if (st === 'purify') {
      E.pose.t++;
      if (CB.t === 1) { G.audio.sfx('purify'); G.audio.play('recuerdo'); }
      if (CB.t % 3 === 0 && CB.t < 150) fx.push({ x: E.x + G.rnd(-18, 18), y: FLOOR - G.rnd(0, 60), vx: 0, vy: -G.rnd(0.3, 1.2), life: 70, col: G.pick(['#ffffff', '#fff0c0', '#9affe8']), s: 2 });
      E.crystals = 0; E.pose.eye = def.rig === 'oren' ? '#ffe8a0' : '#6affd0';
      E.pose.staff = '#fff0c0';
      if (CB.t === 60) { G.R.flash.r = 1; G.R.flash.g = 1; G.R.flash.b = 1; G.R.flash.a = 0.9; }
      if (CB.t === 200) { st = 'end'; CB.active = false; CB.finished = true; if (onEnd) onEnd(); }
    }
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      if (--f.life <= 0) { fx.splice(i, 1); continue; }
      if (f.vx != null) { f.x += f.vx; f.y += f.vy; if (f.grav) f.vy += f.grav; f.vx *= 0.95; }
    }
    for (let i = floats.length - 1; i >= 0; i--) if (++floats[i].t > 70) floats.splice(i, 1);
    for (let i = barks.length - 1; i >= 0; i--) if (++barks[i].t > barks[i].n) barks.splice(i, 1);
    draw();
  };

  // ── fondos ──
  let bg = null;
  function buildBg() {
    bg = G.makeCanvas(CW, CH);
    const c = bg.getContext('2d');
    const claro = def.bg === 'claro';
    const sky = c.createLinearGradient(0, 0, 0, CH);
    if (claro) { sky.addColorStop(0, '#12060e'); sky.addColorStop(0.6, '#2a0c1a'); sky.addColorStop(1, '#0a0408'); }
    else { sky.addColorStop(0, '#08060e'); sky.addColorStop(0.6, '#1a1030'); sky.addColorStop(1, '#06040a'); }
    c.fillStyle = sky; c.fillRect(0, 0, CW, CH);
    // capas de roca lejanas
    const ridge = (base, amp, col, seed) => {
      c.fillStyle = col;
      for (let x = 0; x < CW; x++) {
        const h = base - (Math.sin(x * 0.03 + seed) * 0.5 + Math.sin(x * 0.011 + seed * 2) * 0.5) * amp - G.hash(x >> 2, 0, seed) * amp * 0.25;
        c.fillRect(x, Math.round(h), 1, CH);
      }
    };
    // estalactitas del techo
    c.fillStyle = claro ? '#1a0812' : '#100a1c';
    for (let x = 0; x < CW; x += 3) { const h = 8 + G.hash(x, 1, 3) * 30 * (G.hash(x >> 3, 2, 3) > 0.5 ? 1 : 0.3); c.fillRect(x, 0, 3, Math.round(h)); }
    if (claro) {
      // el pilar al fondo: prisma de cuarzo con caras en luz y en sombra
      const P2 = (pts, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) c.lineTo(q[0], q[1]); c.fill(); };
      P2([[148, 124], [150, 34], [160, 16], [160, 124]], '#4a1428');
      P2([[160, 124], [160, 16], [170, 34], [172, 124]], '#7a2440');
      P2([[157, 124], [158, 30], [160, 18], [161, 30], [162, 124]], '#a83a5a');
      c.fillStyle = '#ff9ab0'; c.fillRect(160, 22, 1, 100);
      for (const [x, h, w] of [[138, 22, 5], [180, 30, 6], [128, 12, 4], [190, 16, 4], [146, 14, 3]]) { P2([[x - w, 124], [x, 124 - h], [x + w, 124]], '#5a1a30'); P2([[x, 124], [x, 124 - h], [x + w, 124]], '#8a2a44'); }
    } else {
      // arcos del santuario
      c.fillStyle = '#1e1634';
      for (const ax of [40, 140, 240]) { c.fillRect(ax, 50, 10, 80); c.fillRect(ax + 40, 50, 10, 80); c.beginPath(); c.arc(ax + 25, 52, 25, Math.PI, 0); c.lineTo(ax + 40, 52); c.arc(ax + 25, 52, 15, 0, Math.PI, true); c.fill(); }
    }
    ridge(118, 22, claro ? '#1e0a14' : '#140e24', 1);
    ridge(134, 12, claro ? '#2a0e1a' : '#1c1430', 5);
    // suelo
    const fl = c.createLinearGradient(0, FLOOR, 0, CH);
    fl.addColorStop(0, claro ? '#4a1422' : '#2a2040'); fl.addColorStop(1, '#08040a');
    c.fillStyle = fl; c.fillRect(0, FLOOR, CW, CH - FLOOR);
    c.fillStyle = claro ? '#6e1a2c' : '#3a2e58'; c.fillRect(0, FLOOR, CW, 1);
    for (let x = 0; x < CW; x++) {
      if (G.hash(x, 5, 1) > 0.55) px(c, x, FLOOR - 1, claro ? '#8a2436' : '#2a3a4a');
      if (claro && G.hash(x, 6, 1) > 0.8) { const h = 2 + G.hash(x, 7) * 5; c.fillStyle = G.hash(x, 8) > 0.5 ? '#c02a3a' : '#7a1628'; c.fillRect(x, FLOOR - h, 1, h); }
      if (G.hash(x, 9, 2) > 0.7) px(c, x, FLOOR + 2 + Math.floor(G.hash(x, 10) * 20), claro ? '#2a0a14' : '#161028');
    }
  }

  // ── dibujo ──
  const light = G.makeCanvas(CW, CH), lctx = light.getContext('2d');
  function draw() {
    const claro = def.bg === 'claro';
    g.save();
    g.clearRect(0, 0, CW, CH);
    const sh = G.shake || 0;
    if (sh) g.translate(Math.round(G.rnd(-sh, sh)), Math.round(G.rnd(-sh, sh)));
    g.drawImage(bg, 0, 0);
    // rayo de luz diagonal
    g.globalCompositeOperation = 'lighter';
    const sx = claro ? 150 : 170;
    const rg = g.createLinearGradient(sx - 60, 0, sx + 40, CH);
    rg.addColorStop(0, 'rgba(255,240,210,0.0)'); rg.addColorStop(0.5, 'rgba(255,240,210,0.10)'); rg.addColorStop(1, 'rgba(255,240,210,0.0)');
    g.fillStyle = rg;
    g.beginPath(); g.moveTo(sx - 70, 0); g.lineTo(sx + 10, 0); g.lineTo(sx + 70, FLOOR); g.lineTo(sx - 20, FLOOR); g.fill();
    g.globalCompositeOperation = 'source-over';
    // peligros en el suelo (avisos)
    for (const h of hazards) drawHazard(h);
    // sombras
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillRect(Math.round(P.x - 8), FLOOR - 1, 16, 2);
    if (E.st !== 'gone') g.fillRect(Math.round(E.x - 18), FLOOR - 1, 36, 2);
    // enemigo
    const rig = RIG[def.rig];
    E.pose.crystals = E.crystals;
    withOutline(g, E.x, FLOOR, E.face > 0, (c) => rig(c, E.pose, false));
    if (E.hit > 0 && E.hit % 2) { g.globalCompositeOperation = 'lighter'; withOutline(g, E.x, FLOOR, E.face > 0, (c) => rig(c, E.pose, false)); g.globalCompositeOperation = 'source-over'; }
    // protagonista
    drawPlayer();
    // proyectiles
    for (const s of shots) drawShot(s);
    // luz: la escena se multiplica por un mapa de luces y lo que brilla se suma encima
    lctx.globalCompositeOperation = 'source-over';
    lctx.fillStyle = claro ? '#a08894' : '#8e8aae'; lctx.fillRect(0, 0, CW, CH);
    lctx.globalCompositeOperation = 'lighter';
    const glow = (x, y, r, col) => { const gr = lctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); lctx.fillStyle = gr; lctx.fillRect(x - r, y - r, r * 2, r * 2); };
    glow(sx + 20, FLOOR - 30, 110, 'rgba(255,230,200,0.55)');
    if (claro) glow(160, 70, 90, 'rgba(255,60,100,0.45)');
    glow(E.x, FLOOR - 40, 50, 'rgba(255,70,100,' + (0.15 + E.crystals * 0.04) + ')');
    const aura = P.st === 'act' && P.skill !== 'golpe' ? SKILLDEF[P.skill].col : null;
    glow(P.x, FLOOR - 20, aura ? 60 : 30, aura ? hexA(aura, 0.6) : 'rgba(120,255,220,0.25)');
    for (const s of shots) glow(s.x, s.y, 30, s.kind === 'eco' ? 'rgba(255,210,120,0.5)' : s.kind === 'onda' ? 'rgba(140,216,255,0.6)' : 'rgba(255,90,120,0.5)');
    for (const h of hazards) if (h.boom != null) glow(h.x, FLOOR - 30, 60, 'rgba(255,80,110,0.7)');
    g.globalCompositeOperation = 'multiply';
    g.drawImage(light, 0, 0);
    g.globalCompositeOperation = 'lighter';
    withOutlineGlow(rig);
    drawPlayerGlow();
    for (const s of shots) drawShot(s, true);
    for (const h of hazards) if (h.boom != null) drawHazard(h, true);
    for (const f of fx) drawFx(f);
    // polvo en la luz
    for (let i = 0; i < 70; i++) {
      const x = (G.hash(i, 1, 7) * CW + CB.t * (0.05 + G.hash(i, 2, 7) * 0.2)) % CW, y = (G.hash(i, 3, 7) * CH - CB.t * 0.08 * G.hash(i, 4, 7) + CH * 4) % CH;
      const inRay = Math.abs(x - (sx - 30 + y * 0.45)) < 40;
      g.fillStyle = inRay ? 'rgba(255,244,220,0.8)' : 'rgba(200,180,200,0.18)';
      g.fillRect(x | 0, y | 0, 1, 1);
    }
    g.globalCompositeOperation = 'source-over';
    g.restore();
  }
  const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  function withOutlineGlow(rig) {
    const a = tmpA.getContext('2d');
    a.clearRect(0, 0, 120, 120);
    rig(a, E.pose, true);
    g.save(); g.translate(Math.round(E.x), FLOOR); if (E.face > 0) g.scale(-1, 1);
    g.drawImage(tmpA, -60, -110);
    g.restore();
  }
  function playerFrame() {
    const set = G.SPR.prota, dir = P.face > 0 ? 'right' : 'left';
    return set[dir][P.moving && P.st === 'idle' ? Math.floor(P.anim / 8) % 4 : 0];
  }
  function drawPlayer() {
    if (P.inv > 0 && P.st !== 'dodge' && Math.floor(P.inv / 3) % 2) return;
    const f = playerFrame();
    let x = Math.round(P.x - f.w / 2), y = FLOOR - f.h;
    if (P.st === 'down') { const l = G.SPR.prota_lie; g.drawImage(l.c, Math.round(P.x - l.w / 2), FLOOR - l.h); return; }
    if (P.st === 'act') {
      const D = SKILLDEF[P.skill];
      if (P.t < D.wind) x -= P.face * (P.t % 2); // tiembla al concentrarse
      else if (P.t < D.wind + 4) x += P.face * 3;
    }
    if (P.st === 'dodge') { g.globalAlpha = 0.85; }
    g.drawImage(f.c, x, y);
    g.globalAlpha = 1;
    if (P.st === 'hurt' && P.t < 6) { g.globalCompositeOperation = 'lighter'; g.drawImage(G.tint(f.c, '#ff4a5a'), x, y); g.globalCompositeOperation = 'source-over'; }
  }
  function drawPlayerGlow() {
    const f = playerFrame();
    if (P.st === 'down') return;
    if (f.e) g.drawImage(f.e, Math.round(P.x - f.w / 2), FLOOR - f.h);
    // estelas de la esquiva
    for (const e of fx) if (e.ghost) { g.globalAlpha = e.life / 30; g.drawImage(G.tint(f.c, '#3cc4a4'), Math.round(e.x - f.w / 2), FLOOR - f.h); g.globalAlpha = 1; }
    if (P.st !== 'act') return;
    const D = SKILLDEF[P.skill], t = P.t, col = D.col;
    if (P.skill === 'golpe') {
      if (t >= D.wind && t < D.wind + D.act) { g.strokeStyle = '#fff4e0'; g.lineWidth = 1; g.beginPath(); g.arc(P.x + P.face * 8, FLOOR - 20, 14, P.face > 0 ? -1 : Math.PI - 0.4, P.face > 0 ? 0.4 : Math.PI + 1); g.stroke(); }
      return;
    }
    // concentración: runas que giran
    if (t < D.wind) {
      const k = t / D.wind;
      for (let i = 0; i < 6; i++) {
        const a = t * 0.15 + (i / 6) * Math.PI * 2, r = 22 - k * 12;
        g.fillStyle = col; g.fillRect(Math.round(P.x + Math.cos(a) * r), Math.round(FLOOR - 20 + Math.sin(a) * r * 0.5), 2, 2);
      }
    }
    if (P.skill === 'alma' && t >= D.wind && t < D.wind + D.act) {
      const r = (t - D.wind) / D.act * 70;
      g.strokeStyle = hexA(col, 1 - (t - D.wind) / D.act * 0.6); g.lineWidth = 2;
      g.beginPath(); g.ellipse(P.x, FLOOR - 14, r, r * 0.35, 0, 0, Math.PI * 2); g.stroke();
    }
    if (P.skill === 'ser' && t >= D.wind && t < D.wind + D.act) {
      const k = 1 - (t - D.wind) / D.act, y = FLOOR - 22;
      g.fillStyle = hexA('#ffffff', 0.9 * k); g.fillRect(P.face > 0 ? P.x : 0, y - 6 * k, P.face > 0 ? CW - P.x : P.x, 12 * k);
      g.fillStyle = hexA('#fff0c0', 0.5 * k); g.fillRect(P.face > 0 ? P.x : 0, y - 12 * k, P.face > 0 ? CW - P.x : P.x, 24 * k);
    }
    if (P.skill === 'cuerpo' && t >= D.wind && t < D.wind + 6) { g.fillStyle = col; g.beginPath(); g.arc(P.x + P.face * 18, FLOOR - 20, 8 - (t - D.wind), 0, 7); g.fill(); }
  }
  function drawShot(s, glowPass) {
    if (s.kind === 'onda') {
      if (!glowPass) return;
      g.strokeStyle = s.col; g.lineWidth = 1;
      for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(s.x - s.vx * i * 2, s.y, 6 + i * 3, -1.2, 1.2); if (s.vx < 0) { g.beginPath(); g.arc(s.x - s.vx * i * 2, s.y, 6 + i * 3, Math.PI - 1.2, Math.PI + 1.2); } g.stroke(); }
    } else if (s.kind === 'caida') {
      if (glowPass) { g.fillStyle = '#ff8a9a'; g.fillRect(s.x - 1, s.y - 14, 2, 10); return; }
      tri(g, [s.x, s.y], [s.x - 4, s.y - 16], [s.x + 4, s.y - 16], '#b02a44');
    } else if (s.kind === 'eco') {
      const r = 4 + Math.sin(CB.t * 0.2 + s.x) * 1;
      if (glowPass) { g.fillStyle = '#ffd070'; g.beginPath(); g.arc(s.x, s.y, r, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(s.x - 1, s.y - 1, 2, 2); }
    } else if (s.kind === 'ola') {
      if (!glowPass) { g.fillStyle = '#7a1628'; for (let i = 0; i < 12; i++) g.fillRect(Math.round(s.x - Math.sign(s.vx) * i), FLOOR - 14 + i, 1, 14 - i); return; }
      g.fillStyle = '#ff5a78'; g.fillRect(Math.round(s.x) - 1, FLOOR - 16, 2, 16);
    }
  }
  function drawHazard(h, glowPass) {
    if (h.kind === 'aviso') {
      const k = h.t / h.n, a = 0.3 + 0.4 * Math.abs(Math.sin(h.t * 0.3));
      g.fillStyle = hexA(h.col || '#ff5a6a', a);
      g.fillRect(Math.round(h.x - h.w), FLOOR, Math.round(h.w * 2), 2);
      g.fillStyle = hexA(h.col || '#ff5a6a', a * 0.4 * k);
      g.fillRect(Math.round(h.x - h.w), FLOOR - 24 * k, Math.round(h.w * 2), 24 * k);
    } else if (h.kind === 'circulo') {
      if (h.boom != null) {
        if (!glowPass) return;
        for (let i = -2; i <= 2; i++) { const hh = 26 - Math.abs(i) * 6; tri(g, [h.x + i * 7, FLOOR - hh * Math.min(1, (22 - h.boom + 4) / 6)], [h.x + i * 7 - 4, FLOOR], [h.x + i * 7 + 4, FLOOR], h.col); }
        return;
      }
      const k = h.t / h.n;
      g.strokeStyle = hexA(h.col, 0.5 + k * 0.5); g.lineWidth = 1;
      g.beginPath(); g.ellipse(h.x, FLOOR + 1, h.w, 4, 0, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.ellipse(h.x, FLOOR + 1, h.w * (1 - k), 4 * (1 - k), 0, 0, Math.PI * 2); g.stroke();
      // runas del círculo
      for (let i = 0; i < 6; i++) { const a = h.t * 0.05 + i; g.fillStyle = h.col; g.fillRect(Math.round(h.x + Math.cos(a) * h.w), Math.round(FLOOR + 1 + Math.sin(a) * 4), 1, 1); }
    } else if (h.kind === 'columna') {
      if (h.boom != null) {
        if (!glowPass) return;
        const k = h.boom / 26;
        g.fillStyle = hexA('#ff5a78', 0.9 * k); g.fillRect(Math.round(h.x - h.w * k), 0, Math.round(h.w * 2 * k), FLOOR);
        g.fillStyle = hexA('#ffe0e8', k); g.fillRect(Math.round(h.x - 2), 0, 4, FLOOR);
        return;
      }
      const k = h.t / h.n;
      g.fillStyle = hexA('#ff5a78', 0.12 + k * 0.2); g.fillRect(Math.round(h.x - h.w), 0, Math.round(h.w * 2), FLOOR);
      g.fillStyle = hexA('#ff5a78', 0.6); g.fillRect(Math.round(h.x - h.w), FLOOR, Math.round(h.w * 2), 2);
    }
  }
  function drawFx(f) {
    if (f.ghost) return;
    if (f.thread) {
      const k = (f.k + CB.t * 0.02) % 1, x = G.lerp(f.x0, f.x1, k), y = G.lerp(f.y0, f.y1, k) - Math.sin(k * Math.PI) * 18;
      g.fillStyle = f.col; g.fillRect(Math.round(x), Math.round(y), 2, 2);
      return;
    }
    g.fillStyle = f.col;
    g.globalAlpha = Math.min(1, f.life / 12);
    g.fillRect(Math.round(f.x), Math.round(f.y), f.s || 1, f.s || 1);
    g.globalAlpha = 1;
  }

  // ── interfaz del combate (en el lienzo de 480×270: 1,5 × el de combate) ──
  CB.drawHUD = (c) => {
    if (!def) return;
    const K = 1.5;
    // luces del protagonista
    for (let i = 0; i < P.max; i++) {
      const x = 16 + i * 14, y = 14, on = i < P.hp;
      c.fillStyle = '#0a0812'; c.fillRect(x - 1, y - 1, 11, 11);
      const col = on ? '#86ffdc' : '#1e2a30';
      c.fillStyle = col;
      c.fillRect(x + 4, y, 1, 9); c.fillRect(x + 2, y + 2, 5, 5); c.fillRect(x, y + 4, 9, 1); c.fillRect(x + 3, y + 1, 3, 7); c.fillRect(x + 1, y + 3, 7, 3);
      if (on) { c.fillStyle = '#e8fff8'; c.fillRect(x + 3, y + 3, 1, 1); }
    }
    // nombre, resistencia y sellos del enemigo
    const nw = G.textW(def.name);
    G.frame(c, 240 - nw / 2 - 16, 8, nw + 32, 16, { ornate: false });
    G.textC(c, def.name, 240, 12, '#ffb0c0');
    let bx = 180, by = 28;
    if (!def.immune) {
      c.fillStyle = '#0a0812'; c.fillRect(bx - 1, by - 1, 122, 5);
      c.fillStyle = '#2a2030'; c.fillRect(bx, by, 120, 3);
      c.fillStyle = E.stun > 0 ? '#ffd070' : '#d8d0c0'; c.fillRect(bx, by, Math.round(120 * E.res / 100), 3);
      G.text(c, 'Resistencia', bx - 56, by - 3, '#9a94a8');
    } else G.textC(c, 'Inmune al daño físico', 240, by - 2, '#9a94a8');
    const seals = E.seals || [];
    const sw = seals.length * 20;
    seals.forEach((s, i) => {
      const x = 240 - sw / 2 + i * 20 + 2, y = 38;
      const cur = s === seal();
      if (s.broken) { G.UI.skillIcon(c, s.s, x, y, 0.2); c.fillStyle = '#d8bf86'; c.fillRect(x + 2, y + 7, 12, 1); }
      else if (!s.seen && !cur) { c.fillStyle = '#1a1628'; c.fillRect(x + 2, y + 2, 12, 12); G.text(c, '?', x + 6, y + 4, '#9a94a8'); }
      else {
        G.UI.skillIcon(c, s.s, x, y + (cur ? Math.round(Math.sin(G.t * 0.15)) : 0), cur ? 1 : 0.6);
        if (cur) for (let k = 0; k < s.hp; k++) { c.fillStyle = '#ffb0c0'; c.fillRect(x + 4 + k * 5, y + 18, 3, 2); }
      }
    });
    if (def.phases.length > 1) G.text(c, 'Fase ' + (phase + 1) + '/' + def.phases.length, 380, 40, '#9a94a8');
    // barra de habilidades (en táctil la sustituyen los botones de la pantalla)
    const list = G.device === 'touch' ? [] : ['golpe'].concat(ORDER);
    const keys = G.device === 'kb' ? ['Z', '1', '2', '3', '4', '5'] : G.device === 'pad' ? ['A', 'LB+A', 'LB+B', 'LB+X', 'LB+Y', 'LB+RB'] : ['', '', '', '', '', ''];
    const x0 = 240 - (list.length * 30) / 2;
    list.forEach((id, i) => {
      const x = x0 + i * 30, y = 238, has = id === 'golpe' || G.save.skills.includes(id);
      G.frame(c, x, y, 26, 26, { ornate: false, fill: 'rgba(8,10,20,0.8)', edge: seal() && seal().s === id && has ? '#ffd070' : '#5a5060' });
      if (has) {
        G.UI.skillIcon(c, id, x + 5, y + 5, 1);
        const cd = P.cd[id] || 0, D = SKILLDEF[id];
        if (cd > 0) { c.fillStyle = 'rgba(0,0,0,0.7)'; c.fillRect(x + 3, y + 3, 20, Math.round(20 * cd / D.cd)); }
      } else G.textC(c, '?', x + 13, y + 9, '#5a5060');
      if (keys[i]) G.textC(c, keys[i], x + 13, y - 11, '#9a94a8');
    });
    if (G.device === 'kb') G.text(c, 'Shift: esquivar', 16, 250, '#9a94a8');
    // textos flotantes y frases
    for (const f of floats) {
      const a = Math.min(1, (70 - f.t) / 20);
      c.globalAlpha = a;
      G.textC(c, f.text, Math.round(f.x * K), Math.round((f.y - f.t * 0.3) * K), f.col, '#0a0812');
      c.globalAlpha = 1;
    }
    for (const b of barks) {
      const a = Math.min(1, b.t / 15, (b.n - b.t) / 20);
      c.globalAlpha = a;
      const who = b.who === E ? E : P;
      const x = G.clamp(who.x * K, 70, 410), y = (FLOOR - (who === E ? 100 : 50)) * K;
      const w = G.textW(b.text) + 14;
      G.frame(c, Math.round(x - w / 2), Math.round(y - 4), w, 16, { ornate: false, fill: 'rgba(20,6,14,0.85)', edge: '#8a3a4a' });
      G.textC(c, b.text, Math.round(x), Math.round(y), '#ffd0d8', null);
      c.globalAlpha = 1;
    }
  };
  CB.say = (who, text) => say(who === 'enemy' ? E : P, text);
  CB.isFighting = () => st === 'fight';
  CB.cdFrac = (id) => (P && P.cd[id] > 0 ? P.cd[id] / SKILLDEF[id].cd : 0);
  CB.sealSkill = () => { const s = E && E.seals ? seal() : null; return s ? s.s : null; };
  // para pruebas automáticas
  CB.debug = { apply: (id) => apply(id), state: () => ({ st, phase, hp: P.hp, seals: E.seals.map((x) => x.s + (x.broken ? '*' : x.hp)) }) };
})();
