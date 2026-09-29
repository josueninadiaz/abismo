'use strict';
// ─── Combate: lucha lateral en 2D, a la manera de los juegos de pelea (Mortal Kombat, Street Fighter) ───
// El protagonista no mata: purifica. Barras de Luz (tú) y Corrupción (el infectado); cada ronda es un sello.
// Puños encadenados, patada, barrido agachado, patada en el aire, bloquear manteniendo hacia atrás, rodar.
// Las cinco habilidades son golpes especiales (botones 1-5 o giros de joystick: ↓→ puño = Mente, ↓← puño = Recuerdos,
// ←→ patada = Cuerpo, →↓→ puño = Alma, ↓↓ patada = Ser con la Resonancia llena).
// Cuando la Corrupción llega a cero queda en trance: «¡PURIFÍCALO!» con la habilidad de su sello.
(function () {
  const CW = 256, CH = 144, FLOOR = 124, STAGE = 400;
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
  function withOutline(dst, x, y, flip, draw, rot) {
    const a = tmpA.getContext('2d'), b = tmpB.getContext('2d');
    a.clearRect(0, 0, 120, 120); b.clearRect(0, 0, 120, 120);
    draw(a);
    b.drawImage(tmpA, 0, 0);
    b.globalCompositeOperation = 'source-in'; b.fillStyle = OUT; b.fillRect(0, 0, 120, 120); b.globalCompositeOperation = 'source-over';
    dst.save();
    dst.translate(Math.round(x), Math.round(y));
    if (rot) dst.rotate(rot);
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

  // ── movimientos del protagonista ──
  // su: arranque · act: golpe activo · rec: recuperación (en fotogramas a 60 por segundo)
  // reach: alcance [desde, hasta] delante de él · h: altura (mid, low = bloquear agachado, high = de pie)
  const MOVES = {
    jab1: { anim: 'jab1', su: 4, act: 3, rec: 9, dmg: 4, reach: [2, 24], stun: 15, push: 1.2, h: 'mid', next: 'jab2' },
    jab2: { anim: 'jab2', su: 4, act: 3, rec: 10, dmg: 4, reach: [2, 24], stun: 15, push: 1.2, h: 'mid', next: 'gancho' },
    gancho: { anim: 'gancho', su: 6, act: 4, rec: 18, dmg: 7, reach: [0, 22], stun: 30, push: 2, launch: 3.4, h: 'mid', heavy: true },
    kick: { anim: 'kick', su: 8, act: 4, rec: 17, dmg: 9, reach: [4, 32], stun: 22, push: 4, h: 'mid', heavy: true },
    sweep: { anim: 'sweep', su: 7, act: 4, rec: 19, dmg: 7, reach: [2, 32], stun: 0, kd: true, h: 'low', heavy: true },
    airkick: { anim: 'airkick', su: 3, act: 60, rec: 0, dmg: 8, reach: [2, 26], stun: 20, push: 2, h: 'high', air: true },
  };
  // habilidades como golpes especiales
  const SKILLDEF = {
    mente: { su: 12, act: 1, rec: 14, cd: 55, col: '#8ad8ff', dmg: 10 },
    recuerdos: { su: 12, act: 1, rec: 16, cd: 110, col: '#ffd070', dmg: 8 },
    cuerpo: { su: 8, act: 12, rec: 14, cd: 80, col: '#ff8a7a', dmg: 12 },
    alma: { su: 6, act: 18, rec: 12, cd: 160, col: '#c8a0ff', dmg: 10 },
    ser: { su: 30, act: 28, rec: 18, cd: 30, col: '#ffffff', dmg: 32, meter: 100 },
  };
  CB.SKILLDEF = SKILLDEF;
  const ORDER = ['mente', 'recuerdos', 'cuerpo', 'alma', 'ser'];
  const nameOf = (id) => G.UI.SKILLS.find((s) => s[0] === id)[1];

  // ── enfrentamientos ──
  const FIGHTS = {
    tharn: {
      name: 'Tharn', title: 'Guardián del Claro', rig: 'tharn', bg: 'claro', music: 'combate', immune: false, crystals: 5, half: 15, block: [0.08, 0.18], hp: 55,
      rounds: [
        { seal: 'mente', speed: 1, moves: ['zarpazo', 'barrido', 'embestida', 'salto', 'espinas'] },
        { seal: 'recuerdos', speed: 1.2, moves: ['zarpazo', 'garras', 'barrido', 'embestida', 'salto', 'espinas', 'lluvia'] },
      ],
      barks: [['Sin... Marca...', 'La Luz... dice que... no perteneces...', 'Protejo... ¿el qué?'], ['¡Deja de... revolver... mi cabeza!', 'Había... una puerta...', 'Oren... ¿Oren?']],
    },
    oren: {
      name: 'Oren', title: 'El antiguo líder', rig: 'oren', bg: 'santuario', music: 'lider', immune: true, crystals: 8, half: 12, block: [0, 0], hp: 45,
      rounds: [
        { seal: 'mente', speed: 0.95, moves: ['bastonazo', 'ecos', 'pilar'] },
        { seal: 'recuerdos', speed: 1, moves: ['bastonazo', 'ecos', 'pilar', 'ola'] },
        { seal: 'cuerpo', speed: 1.05, moves: ['bastonazo', 'pilar', 'ola', 'agarre'] },
        { seal: 'alma', speed: 1.1, moves: ['bastonazo', 'ecos', 'ola', 'agarre', 'teleport'] },
        { seal: 'ser', speed: 1.15, moves: ['bastonazo', 'ecos', 'pilar', 'ola', 'agarre', 'teleport'] },
      ],
      barks: [['Vete... antes de que ella hable por mí.', 'No es mi voz...'], ['Recuerdo... una orilla...', '¡No toques eso! Es... mío...'], ['Mi cuerpo... ya no es mío.', 'El cuarzo... pesa...'], ['Todavía queda... algo de mí...', 'Hijo... ¿eres tú?'], ['Termina... lo que empecé.', 'Libérame... por completo.']],
    },
  };
  // ataques de los enemigos
  const EMOVES = {
    zarpazo: { su: 16, act: 6, rec: 22, dmg: 8, reach: [0, 44], h: 'mid', stun: 20, push: 3.5, pose: 'claw' },
    garras: { su: 12, act: 5, rec: 10, dmg: 6, reach: [0, 42], h: 'mid', stun: 16, push: 1.5, pose: 'claw', then: 'zarpazo' },
    barrido: { su: 16, act: 6, rec: 24, dmg: 7, reach: [0, 46], h: 'low', kd: true, pose: 'low' },
    bastonazo: { su: 14, act: 6, rec: 20, dmg: 8, reach: [0, 40], h: 'mid', stun: 20, push: 3, pose: 'claw' },
    embestida: { su: 24, dmg: 10, h: 'mid', kd: true, special: 'dash' },
    salto: { su: 12, dmg: 10, h: 'high', kd: true, special: 'slam' },
    espinas: { su: 42, dmg: 10, h: 'unblock', special: 'spikes' },
    lluvia: { su: 50, dmg: 8, h: 'unblock', special: 'rain' },
    ecos: { su: 22, dmg: 6, h: 'mid', special: 'orbs' },
    pilar: { su: 48, dmg: 12, h: 'unblock', special: 'column' },
    ola: { su: 30, dmg: 10, h: 'low', special: 'wave' },
    agarre: { su: 22, act: 6, rec: 26, dmg: 12, reach: [0, 36], h: 'unblock', kd: true, pose: 'claw' },
    teleport: { su: 30, special: 'teleport' },
  };

  // ── estado ──
  let P, E, def, round, st, stT, onEnd, shots, fx, floats, barks, camX, freeze, slow, banner, tut, lastDirs;
  CB.start = (id, done) => {
    def = FIGHTS[id]; onEnd = done;
    CB.active = true; CB.id = id; CB.finished = false; CB.busy = false;
    P = { x: 0, y: 0, vx: 0, vy: 0, face: 1, hp: 100, ghost: 100, meter: 0, st: 'idle', t: 0, anim: 0, cd: {}, combo: 0, comboT: 0, inv: 0, kx: 0, rcd: 0 };
    E = { x: 0, y: 0, vx: 0, vy: 0, face: -1, corr: 100, ghost: 100, st: 'idle', t: 0, next: 80, atk: null, crystals: def.crystals, pose: { t: 0, arm: 0, crouch: 0, lean: 0 }, bark: 300, hit: 0, inv: 0 };
    shots = []; fx = []; floats = []; barks = []; freeze = 0; slow = 0; banner = null; lastDirs = [];
    round = 0; tut = id === 'tharn' && !G.flag('tut_combate');
    startRound();
    G.audio.play(def.music);
    G.audio.ambient(null);
    buildBg();
  };
  function startRound() {
    const r = def.rounds[round];
    P.x = STAGE / 2 - 60; P.y = 0; P.vx = P.vy = 0; P.st = 'idle'; P.t = 0; P.face = 1; P.inv = 0; P.hp = Math.max(P.hp, 60); P.ghost = P.hp;
    E.x = STAGE / 2 + 60; E.y = 0; E.vx = E.vy = 0; E.st = 'idle'; E.t = 0; E.face = -1; E.max = def.hp; E.corr = E.max; E.ghost = E.max; E.atk = null; E.next = 80; E.speed = r.speed;
    E.crystals = Math.max(1, Math.ceil(def.crystals * (def.rounds.length - round) / def.rounds.length));
    E.pose.eye = null;
    shots = []; camX = STAGE / 2 - CW / 2;
    st = 'intro'; stT = 0;
  }
  const sealNow = () => def.rounds[round].seal;
  const seeEnemy = () => (E.x > P.x ? 1 : -1);

  // ── entrada: historial de direcciones (para los movimientos especiales con giro de joystick) ──
  function dirCode() {
    const fx2 = G.dir.x * P.face, dy = G.dir.y;
    const h = fx2 > 0.4 ? 1 : fx2 < -0.4 ? -1 : 0, v = dy > 0.45 ? 1 : dy < -0.45 ? -1 : 0;
    return v === 1 ? (h === 1 ? '3' : h === -1 ? '1' : '2') : v === -1 ? '8' : h === 1 ? '6' : h === -1 ? '4' : '5';
  }
  function trackDirs() {
    const d = dirCode(), last = lastDirs[lastDirs.length - 1];
    if (!last || last.d !== d) lastDirs.push({ d, t: CB.t });
    while (lastDirs.length && CB.t - lastDirs[0].t > 24) lastDirs.shift();
  }
  const motion = () => lastDirs.map((q) => q.d).join('').replace(/5/g, '');
  function readSpecial(btn) {
    const m = motion();
    if (btn === 'a' && /6.*2.*[36]$/.test(m)) return 'alma';
    if (btn === 'b' && /2.*2$/.test(m)) return 'ser';
    if (btn === 'a' && /2.*[36]$/.test(m)) return 'mente';
    if (btn === 'a' && /2.*[14]$/.test(m)) return 'recuerdos';
    if (btn === 'b' && /4.*6$/.test(m)) return 'cuerpo';
    return null;
  }

  // ── protagonista ──
  const onGround = (f) => f.y <= 0;
  function setP(s) { P.st = s; P.t = 0; }
  function canAct() { return ['idle', 'walk', 'crouch', 'guard'].includes(P.st) || (P.st === 'jump' && !P.atk); }
  function playerUpdate() {
    P.t++; P.anim++;
    if (P.inv > 0) P.inv--;
    if (P.rcd > 0) P.rcd--;
    if (P.comboT > 0 && --P.comboT === 0) P.combo = 0;
    for (const k in P.cd) if (P.cd[k] > 0) P.cd[k]--;
    trackDirs();
    // física vertical
    if (P.y > 0 || P.vy > 0) {
      P.y += P.vy; P.vy -= 0.24; P.x += P.vx;
      if (P.y <= 0) {
        P.y = 0; P.vy = 0; P.vx = 0; dust(P.x, 5); G.audio.sfx('land');
        if (P.st === 'jump' || P.st === 'airatk') setP('idle');
        if (P.st === 'hit' && P.kd) { setP('down'); G.shake = 3; }
      }
    }
    P.x += P.kx; P.kx *= 0.8;
    const away = G.dir.x * seeEnemy() < -0.3, down = G.dir.y > 0.45;
    switch (P.st) {
      case 'hit': if (P.t > P.stun && onGround(P)) setP(P.kd ? 'down' : 'idle'); return;
      case 'down': if (P.t > 40) { setP('getup'); P.inv = 26; } return;
      case 'getup': if (P.t > 16) setP('idle'); return;
      case 'blockstun': if (P.t > P.stun) setP(down ? 'crouch' : 'guard'); return;
      case 'roll':
        P.x += P.rdir * (P.t < 12 ? 3.6 : 1.4);
        if (P.t % 3 === 0) fx.push({ ghost: true, x: P.x, y: P.y, face: P.face, life: 14 });
        if (P.t > 16) setP('idle');
        return;
      case 'atk': stepAttack(); return;
      case 'airatk': stepAttack(); return;
      case 'special': stepSpecial(); return;
      case 'win': return;
    }
    // girarse hacia el enemigo cuando está en el suelo
    if (onGround(P)) P.face = seeEnemy();
    // saltar
    if ((G.pressed('j') || G.pressed('up')) && onGround(P) && canAct()) {
      P.vy = 4.4; P.y = 0.1; P.vx = Math.abs(G.dir.x) > 0.3 ? Math.sign(G.dir.x) * 1.7 : 0;
      setP('jump'); G.audio.sfx('jump'); dust(P.x, 4);
      return;
    }
    // botones de ataque (con giros de joystick para los especiales)
    const pa = G.pressed('a'), pb = G.pressed('b');
    if ((pa || pb) && canAct()) {
      const sp = readSpecial(pa ? 'a' : 'b');
      if (sp && onGround(P) && trySpecial(sp)) return;
      if (!onGround(P)) return startAttack('airkick');
      if (down) return startAttack('sweep');
      return startAttack(pa ? 'jab1' : 'kick');
    }
    for (let i = 0; i < 5; i++) if (G.pressed('s' + (i + 1)) && onGround(P) && canAct()) { trySpecial(ORDER[i]); return; }
    if (G.pressed('y') && onGround(P) && canAct()) { trySpecial(sealNow()); return; }
    // rodar
    if (G.pressed('x') && onGround(P) && P.rcd <= 0 && canAct()) {
      setP('roll'); P.rdir = Math.abs(G.dir.x) > 0.3 ? Math.sign(G.dir.x) : -P.face; P.inv = 14; P.rcd = 30; G.audio.sfx('dodge');
      return;
    }
    if (!onGround(P)) return;
    // agacharse, bloquear, caminar
    if (down) { P.st = away ? 'cguard' : 'crouch'; return; }
    if (away && E.st === 'atk') { P.st = 'guard'; P.x += G.dir.x * 0.6; return; }
    if (Math.abs(G.dir.x) > 0.25) {
      const fwd = Math.sign(G.dir.x) === P.face;
      P.x += Math.sign(G.dir.x) * (fwd ? 1.35 : 1.05);
      P.st = away ? 'guard' : 'walk'; P.back = !fwd;
    } else P.st = 'idle';
  }
  function startAttack(k) {
    const m = MOVES[k];
    P.atk = { k, m, t: 0, done: false, queued: null };
    P.st = m.air ? 'airatk' : 'atk'; P.t = 0;
    G.audio.sfx('swing');
  }
  function stepAttack() {
    const a = P.atk, m = a.m;
    a.t++;
    // encadenar: pulsar otra vez durante el golpe
    if (m.next && (G.pressed('a')) && a.t > 2) a.queued = m.next;
    if (a.t >= m.su && a.t < m.su + m.act && !a.done) {
      if (m.air && !onGround(P)) { /* la patada aérea sigue activa hasta tocar suelo */ }
      if (hitsEnemy(m)) { a.done = true; landHit(m, P.x, false); }
    }
    if (m.air) { if (onGround(P)) { P.atk = null; setP('idle'); } return; }
    if (a.done && a.queued && a.t >= m.su + m.act) { startAttack(a.queued); return; }
    if (a.t >= m.su + m.act + m.rec) { P.atk = null; setP('idle'); }
  }
  function hitsEnemy(m) {
    if (E.st === 'down' || E.inv > 0 || E.st === 'gone') return false;
    const dx = (E.x - P.x) * P.face;
    if (dx < m.reach[0] - 4 || dx > m.reach[1] + def.half) return false;
    if (m.h === 'low' && E.y > 4) return false;
    if (Math.abs(E.y - P.y) > 40) return false;
    return true;
  }
  // un golpe físico del protagonista (o un especial, con skill) alcanza al enemigo
  function landHit(m, fromX, skill) {
    // ¿bloquea?
    const canBlock = !skill || skill !== 'ser';
    if (canBlock && (E.st === 'block' || (E.st === 'idle' && G.chance(def.block[Math.min(round, 1)] * (m.heavy ? 1.3 : 1))) ) && onGround(E)) {
      E.st = 'block'; E.t = 0; E.x += P.face * 2;
      spark(E.x - P.face * 8, FLOOR - E.y - 22, '#8ad8ff', true);
      G.audio.sfx('block'); freeze = 3; P.meter = Math.min(100, P.meter + 3);
      if (!skill) return;
    }
    const seal = sealNow();
    let dmg = m.dmg;
    if (def.immune && !skill) {
      dmg = 0;
      if (G.chance(0.35)) floatText(E.x, FLOOR - 70, 'INMUNE', '#9a94a8');
    }
    if (skill === seal) dmg = Math.round(dmg * 1.6);
    // en trance: solo lo purifica la habilidad del sello
    if (E.st === 'dizzy') {
      if (skill === seal) { finisher(); return; }
      if (skill) floatText(E.x, FLOOR - 76, 'El sello pide ' + nameOf(seal), '#d8bf86');
      spark(E.x, FLOOR - E.y - 24, '#ffffff'); freeze = 3;
      return;
    }
    E.corr = Math.max(0, E.corr - dmg);
    E.hit = 8;
    P.meter = Math.min(100, P.meter + (skill ? 4 : 6));
    P.combo++; P.comboT = 60;
    const heavy = m.heavy || skill;
    spark(E.x - P.face * 6, FLOOR - E.y - 24 + G.rnd(-6, 6), skill ? SKILLDEF[skill].col : '#fff4d0');
    if (dmg > 0) for (let i = 0; i < (heavy ? 6 : 3); i++) fx.push({ x: E.x + G.rnd(-8, 8), y: FLOOR - E.y - 30 + G.rnd(-8, 8), vx: P.face * G.rnd(0.5, 2.5), vy: G.rnd(-2.5, 0), grav: 0.14, life: 34, col: G.pick(['#ff8a9a', '#ffd0da', '#ff5a78']), s: 2 });
    G.audio.sfx(heavy ? 'hit' : 'jab');
    freeze = heavy ? 7 : 4; G.shake = heavy ? 2.5 : 1;
    // reacción
    E.atk = null; E.face = -P.face;
    const imm = def.immune && !skill;
    if (m.kd && !imm) { E.st = 'fall'; E.t = 0; E.vy = 2.6; E.y = Math.max(E.y, 0.1); E.vx = P.face * 1.6; }
    else if ((m.launch || (!onGround(E))) && !imm) { E.st = 'air'; E.t = 0; E.vy = m.launch || 2; E.y = Math.max(E.y, 0.1); E.vx = P.face * 1.2; }
    else { E.st = 'hit'; E.t = 0; E.stun = imm ? 8 : m.stun || 18; E.kx = P.face * (m.push || 2); }
    if (skill === seal) floatText(E.x, FLOOR - 80, '¡Efectivo!', SKILLDEF[skill].col);
    if (E.corr <= 0) dizzy();
  }
  function trySpecial(id) {
    const D = SKILLDEF[id];
    if (!G.save.skills.includes(id)) { floatText(P.x, FLOOR - 50, '???', '#9a94a8'); return false; }
    if (P.cd[id] > 0) { G.audio.sfx('back'); return false; }
    // Ser necesita la Resonancia llena (salvo para purificar a un enemigo en trance)
    const cost = D.meter && E.st !== 'dizzy' ? D.meter : 0;
    if (cost && P.meter < cost) { floatText(P.x, FLOOR - 50, 'Falta resonancia', '#9a94a8'); G.audio.sfx('back'); return false; }
    P.meter -= cost;
    P.skill = id; setP('special'); P.done = false;
    G.audio.sfx('warn');
    if (id === 'ser') { slow = 30; banner = { text: 'SER', t: 0, n: 50, col: '#ffffff', small: true }; }
    return true;
  }
  function stepSpecial() {
    const id = P.skill, D = SKILLDEF[id], t = P.t;
    if (t === D.su) {
      G.audio.sfx(id);
      if (id === 'mente') shots.push({ kind: 'onda', x: P.x + P.face * 14, y: FLOOR - 22, vx: P.face * 3.6, life: 140, mine: true, col: D.col });
      if (id === 'recuerdos') shots.push({ kind: 'hilo', x: P.x + P.face * 12, y: FLOOR - 24, vx: P.face * 5, life: 34, mine: true, col: D.col, x0: P.x });
      if (id === 'ser') G.shake = 4;
      burst(P.x, FLOOR - 20 - P.y, D.col, 12);
    }
    if (id === 'cuerpo' && t >= D.su && t < D.su + D.act) {
      P.x += P.face * 3.6;
      if (t % 2 === 0) fx.push({ ghost: true, x: P.x, y: 0, face: P.face, life: 10 });
      if (!P.done && hitsEnemy({ reach: [0, 20], h: 'mid' })) { P.done = true; landHit({ dmg: D.dmg, kd: true, heavy: true }, P.x, 'cuerpo'); }
    }
    if (id === 'alma' && t >= D.su && t < D.su + D.act) {
      P.inv = 2;
      if (t === D.su) { P.hp = Math.min(100, P.hp + 12); floatText(P.x, FLOOR - 50, '+Luz', D.col); }
      const r = 12 + (t - D.su) * 1.4;
      if (!P.done && Math.abs(E.x - P.x) < r + def.half && E.y < 60) { P.done = true; landHit({ dmg: D.dmg, launch: 4, heavy: true }, P.x, 'alma'); }
    }
    if (id === 'ser' && t >= D.su && t < D.su + D.act) {
      if (!P.done && (E.x - P.x) * P.face > 0) { P.done = true; landHit({ dmg: D.dmg, kd: true, heavy: true }, P.x, 'ser'); }
    }
    if (t >= D.su + D.act + D.rec) { P.cd[id] = D.cd; setP('idle'); }
  }

  // ── daño al protagonista ──
  function hurtP(dmg, fromX, h, kd) {
    if (P.inv > 0 || ['down', 'getup'].includes(P.st) || st !== 'fight') return false;
    const away = (P.x - fromX) * Math.sign(P.x - fromX || 1);
    void away;
    const holdingBack = G.dir.x * Math.sign(fromX - P.x) < -0.3;
    const crouching = G.dir.y > 0.45;
    const blockable = h !== 'unblock' && onGround(P) && ['idle', 'walk', 'guard', 'cguard', 'crouch', 'blockstun'].includes(P.st);
    if (blockable && holdingBack && (h !== 'low' || crouching) && (h !== 'high' || !crouching)) {
      setP('blockstun'); P.stun = 12; P.kx = Math.sign(P.x - fromX) * 2.5;
      spark(P.x + Math.sign(fromX - P.x) * 6, FLOOR - 22, '#8ad8ff', true);
      G.audio.sfx('block'); freeze = 3; P.meter = Math.min(100, P.meter + 4);
      return false;
    }
    P.hp = Math.max(0, P.hp - dmg);
    P.meter = Math.min(100, P.meter + 8);
    P.atk = null; P.combo = 0;
    setP('hit'); P.stun = kd ? 30 : 18; P.kd = !!kd;
    P.kx = Math.sign(P.x - fromX || -1) * (kd ? 3 : 2.2);
    if (kd) { P.vy = 2.6; P.y = Math.max(P.y, 0.1); }
    P.inv = kd ? 50 : 20;
    spark(P.x, FLOOR - P.y - 20, '#ff6a7a');
    G.audio.sfx('hurt'); freeze = 6; G.shake = 3;
    G.R.flash.r = 1; G.R.flash.g = 0.2; G.R.flash.b = 0.3; G.R.flash.a = 0.25;
    if (P.hp <= 0) ko();
    return true;
  }

  // ── enemigo ──
  const SPD = (n) => Math.round(n / (E.speed || 1));
  function enemyUpdate() {
    const pose = E.pose;
    pose.t++; E.t++;
    if (E.hit > 0) E.hit--;
    if (E.inv > 0) E.inv--;
    E.x += E.kx || 0; E.kx = (E.kx || 0) * 0.8;
    // en el aire (lanzado o cayendo)
    if (E.st === 'air' || E.st === 'fall' || E.st === 'jump') {
      E.y += E.vy; E.vy -= 0.2; E.x += E.vx;
      pose.lean = E.st === 'jump' ? 0.3 : -0.8; pose.arm = G.lerp(pose.arm, E.st === 'jump' ? 1 : -0.3, 0.2);
      if (E.y <= 0) {
        E.y = 0; E.vx = 0; dust(E.x, 8); G.shake = 2;
        if (E.st === 'jump') slamLand();
        else if (E.st === 'fall' || E.st === 'air') { E.st = 'down'; E.t = 0; G.audio.sfx('boom'); }
      }
      return;
    }
    if (E.st === 'down') { pose.rot = G.lerp(pose.rot || 0, 1, 0.25); if (E.t > 45) { E.st = 'getup'; E.t = 0; E.inv = 24; } return; }
    pose.rot = G.lerp(pose.rot || 0, 0, 0.3);
    if (E.st === 'getup') { pose.crouch = 1 - E.t / 20; if (E.t > 20) { E.st = 'idle'; E.next = 20; } return; }
    if (E.st === 'hit') { pose.lean = -0.7; pose.arm = -0.3; if (E.t > E.stun) { E.st = 'idle'; E.next = SPD(20); } return; }
    if (E.st === 'block') { pose.arm = 0.55; pose.crouch = 0.3; pose.lean = -0.2; if (E.t > 22) { E.st = 'idle'; E.next = SPD(10); } return; }
    if (E.st === 'dizzy') {
      pose.crouch = 0.5 + Math.sin(E.t * 0.1) * 0.2; pose.lean = Math.sin(E.t * 0.05) * 0.4; pose.arm = -0.3;
      if (E.t > 360) { E.corr = Math.round(E.max * 0.3); E.st = 'idle'; banner = { text: '¡Se recupera!', t: 0, n: 60, col: '#ff9aa8', small: true }; }
      return;
    }
    if (E.st === 'gone') return;
    if (E.st === 'atk') { runAttack(); return; }
    // quieto / caminando
    E.face = seeEnemy() * -1;
    pose.crouch = G.lerp(pose.crouch, 0, 0.15); pose.arm = G.lerp(pose.arm, 0, 0.15); pose.lean = G.lerp(pose.lean, 0, 0.15);
    const d = Math.abs(P.x - E.x), want = def.rig === 'oren' ? 90 : 40;
    if (d > want + 12) { E.x += Math.sign(P.x - E.x) * 0.8 * E.speed; E.st = 'walk'; }
    else if (d < want - 16 && def.rig === 'oren') { E.x -= Math.sign(P.x - E.x) * 0.6; E.st = 'walk'; }
    else E.st = 'idle';
    // bloquea si el protagonista ataca cerca
    if ((P.st === 'atk' || P.st === 'special') && d < 50 && G.chance(def.block[Math.min(round, 1)] * 0.08)) { E.st = 'block'; E.t = 0; return; }
    if (--E.next <= 0) chooseAttack();
    if (--E.bark <= 0) { E.bark = G.ri(500, 800); const L = def.barks[round] || []; if (L.length) barks.push({ who: 'E', text: G.pick(L), t: 0, n: 190 }); }
  }
  function chooseAttack() {
    const d = Math.abs(P.x - E.x), moves = def.rounds[round].moves;
    const W = [];
    const add = (k, w) => { if (moves.includes(k)) for (let i = 0; i < w; i++) W.push(k); };
    if (d < 50) { add('zarpazo', 3); add('garras', 2); add('barrido', 2); add('bastonazo', 3); add('agarre', 2); add('teleport', 1); }
    else if (d < 120) { add('embestida', 2); add('salto', 2); add('espinas', 1); add('ecos', 2); add('pilar', 1); add('ola', 2); add('teleport', 1); }
    else { add('espinas', 2); add('embestida', 2); add('lluvia', 1); add('ecos', 2); add('pilar', 2); add('ola', 1); }
    if (!W.length) { E.next = 20; return; }
    const k = G.pick(W);
    E.atk = { k, m: EMOVES[k], t: 0, done: false };
    E.st = 'atk'; E.t = 0;
    E.face = seeEnemy() * -1;
  }
  function runAttack() {
    const a = E.atk, m = a.m, pose = E.pose;
    a.t++;
    const t = a.t, su = SPD(m.su);
    const done = (rec) => { E.st = 'idle'; E.atk = null; E.next = SPD(G.ri(26, 60)) + (rec || 0); };
    const ef = E.face; // hacia el protagonista
    if (t === 1) { G.audio.sfx('warn'); floatText(E.x, FLOOR - E.y - 76, '!', '#ff5a6a'); }
    if (!m.special) {
      // golpe cuerpo a cuerpo con pose: se prepara, golpea y se recupera
      if (t < su) { pose.arm = G.lerp(pose.arm, m.pose === 'low' ? 0.2 : 1, 0.15); pose.lean = G.lerp(pose.lean, -0.3, 0.1); pose.crouch = G.lerp(pose.crouch, m.pose === 'low' ? 1 : 0.2, 0.15); }
      else if (t < su + m.act) {
        pose.arm = m.pose === 'low' ? -0.2 : -0.5; pose.lean = 0.8; if (m.pose === 'low') pose.crouch = 1;
        if (t === su) { G.audio.sfx('swing'); E.x += ef * 4; }
        const dx = (P.x - E.x) * ef;
        if (!a.done && dx > m.reach[0] - 6 && dx < m.reach[1] && (m.h !== 'low' || P.y < 5)) {
          a.done = true;
          if (m.h === 'unblock' && Math.abs(P.y) < 10 && P.inv <= 0 && st === 'fight') { hurtP(m.dmg, E.x, 'unblock', true); G.audio.sfx('crystal'); }
          else hurtP(m.dmg, E.x, m.h, m.kd);
        }
      } else if (t > su + m.act + (m.rec || 20)) {
        if (m.then) { E.atk = { k: m.then, m: EMOVES[m.then], t: 0, done: false }; return; }
        done();
      }
      return;
    }
    switch (m.special) {
      case 'dash': // se agacha y cruza la arena (se puede saltar por encima)
        if (t < su) { pose.crouch = G.lerp(pose.crouch, 1, 0.12); pose.lean = 0.5; a.dir = ef; if (t % 4 === 0) dust(E.x - ef * 10, 2); }
        else if (t < su + 50) {
          E.x += a.dir * 5; pose.crouch = 0.6; pose.lean = 1;
          if (!a.done && Math.abs(P.x - E.x) < 18 && P.y < 14) { a.done = true; hurtP(m.dmg, E.x - a.dir * 20, m.h, true); }
          if (E.x < 30 || E.x > STAGE - 30) { E.x = G.clamp(E.x, 30, STAGE - 30); G.shake = 4; G.audio.sfx('boom'); a.t = su + 50; }
        } else if (t > su + 80) done(10);
        else { pose.crouch = G.lerp(pose.crouch, 0.8, 0.1); pose.lean = G.lerp(pose.lean, 0, 0.1); }
        break;
      case 'slam': // salta y cae encima: onda de choque al aterrizar
        if (t < su) { pose.crouch = G.lerp(pose.crouch, 1, 0.2); }
        else if (t === su) { E.st = 'jump'; E.vy = 4.6; E.y = 0.1; E.vx = G.clamp((P.x - E.x) / 40, -3, 3); G.audio.sfx('dodge'); }
        break;
      case 'spikes': case 'rain': case 'column': case 'wave': case 'orbs':
        pose.arm = G.lerp(pose.arm, t < su ? 1 : 0, 0.12);
        if (t === 1) {
          if (m.special === 'spikes') a.hz = addHz({ kind: 'circulo', x: P.x, w: 18, n: su, track: SPD(26), col: '#ff5a78' });
          if (m.special === 'column') a.hz = addHz({ kind: 'columna', x: P.x, w: 14, n: su, track: SPD(22) });
          if (m.special === 'rain') a.marks = [P.x, P.x + G.rnd(-80, 80), P.x + G.rnd(-80, 80)].map((x) => addHz({ kind: 'aviso', x: G.clamp(x, 20, STAGE - 20), w: 12, n: su, col: '#ff8a9a' }));
        }
        if (t === su) {
          if (m.special === 'spikes') { a.hz.boom = 22; G.audio.sfx('crystal'); G.shake = 2; }
          if (m.special === 'column') { a.hz.boom = 26; G.audio.sfx('boom'); G.shake = 3; }
          if (m.special === 'rain') for (const h of a.marks) shots.push({ kind: 'caida', x: h.x, y: -10, vy: 6, life: 80 });
          if (m.special === 'wave') { G.audio.sfx('boom'); G.shake = 3; shots.push({ kind: 'ola', x: E.x, vx: ef * 2.8, life: 160, dmg: m.dmg }); }
          if (m.special === 'orbs') for (let i = 0; i < 3; i++) shots.push({ kind: 'eco', x: E.x + G.rnd(-16, 16), y: FLOOR - 60 - i * 12, vx: 0, vy: 0, life: 280, dmg: m.dmg });
        }
        if (a.hz && t >= su && t < su + 20 && Math.abs(P.x - a.hz.x) < a.hz.w + 4 && !a.done) {
          if (m.special === 'spikes' && P.y < 16) { a.done = true; hurtP(m.dmg, a.hz.x, 'unblock', false); }
          if (m.special === 'column') { a.done = true; hurtP(m.dmg, a.hz.x, 'unblock', false); }
        }
        if (t > su + 36) done();
        break;
      case 'teleport': // se desvanece y aparece detrás del protagonista
        if (t < su) { E.fade = 1 - t / su; }
        else if (t === su) { E.x = G.clamp(P.x - P.face * 34, 24, STAGE - 24); E.face = seeEnemy() * -1; burst(E.x, FLOOR - 30, '#ff9ab0', 16); G.audio.sfx('crystal'); }
        else if (t < su + 10) E.fade = (t - su) / 10;
        else { E.fade = 1; E.atk = { k: 'bastonazo', m: EMOVES.bastonazo, t: 4, done: false }; }
        break;
    }
  }
  function slamLand() {
    E.st = 'atk'; E.atk.t = 999; burst(E.x, FLOOR - 2, '#ff8a9a', 14); G.audio.sfx('boom'); G.shake = 5;
    if (Math.abs(P.x - E.x) < 34 && P.y < 8) hurtP(EMOVES.salto.dmg, E.x, 'high', true);
    E.st = 'idle'; E.atk = null; E.next = SPD(40);
  }
  function addHz(h) { h.t = 0; hazards.push(h); return h; }
  let hazards = [];

  // ── proyectiles ──
  function stepShots() {
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.life--;
      if (s.kind === 'onda' || s.kind === 'hilo') {
        s.x += s.vx;
        if (Math.abs(s.x - E.x) < def.half && E.y < 40 && E.st !== 'down') {
          const id = s.kind === 'onda' ? 'mente' : 'recuerdos';
          landHit({ dmg: SKILLDEF[id].dmg, stun: id === 'recuerdos' ? 40 : 18, push: id === 'recuerdos' ? -3 : 2 }, s.x, id);
          if (id === 'recuerdos' && E.st === 'hit') E.kx = -P.face * 3.5; // el hilo tira de él hacia ti
          burst(s.x, s.y, s.col, 10); s.life = 0;
        }
        for (const o of shots) if (o.kind === 'eco' && Math.hypot(o.x - s.x, o.y - s.y) < 12) { o.life = 0; burst(o.x, o.y, '#ffd070', 6); }
      } else if (s.kind === 'caida') {
        s.y += s.vy;
        if (s.y > FLOOR - 4) { s.life = 0; burst(s.x, FLOOR - 4, '#ff8a9a', 8); G.audio.sfx('crystal'); if (Math.abs(P.x - s.x) < 12 && P.y < 20) hurtP(8, s.x, 'unblock', false); }
      } else if (s.kind === 'eco') {
        const dx = P.x - s.x, dy = FLOOR - 22 - P.y - s.y, l = Math.hypot(dx, dy) || 1;
        s.vx += dx / l * 0.035; s.vy += dy / l * 0.035; s.vx *= 0.985; s.vy *= 0.985;
        s.x += s.vx; s.y += s.vy;
        if (l < 9) { hurtP(s.dmg, s.x, 'mid', false); s.life = 0; }
        if (P.atk && P.atk.t >= P.atk.m.su && P.atk.t < P.atk.m.su + 4 && Math.abs(s.x - (P.x + P.face * 16)) < 16 && Math.abs(s.y - (FLOOR - 22 - P.y)) < 20) { s.life = 0; burst(s.x, s.y, '#ffd070', 8); G.audio.sfx('block'); }
      } else if (s.kind === 'ola') {
        s.x += s.vx;
        if (Math.abs(P.x - s.x) < 8 && P.y < 12 && !s.hit) { s.hit = true; hurtP(s.dmg, s.x - s.vx * 4, 'low', true); }
      }
      if (s.x < -20 || s.x > STAGE + 20) s.life = 0;
      if (s.life <= 0) shots.splice(i, 1);
    }
    for (let i = hazards.length - 1; i >= 0; i--) {
      const h = hazards[i];
      h.t++;
      if (h.track && h.t < h.track) h.x = G.lerp(h.x, P.x, 0.1);
      if (h.boom != null) { if (--h.boom <= 0) hazards.splice(i, 1); } else if (h.t > h.n + 2) hazards.splice(i, 1);
    }
  }

  // ── rondas, trance y purificación ──
  function dizzy() {
    E.st = 'dizzy'; E.t = 0; E.atk = null; E.corr = 0;
    hazards = []; shots = shots.filter((s) => s.mine);
    banner = { text: '¡PURIFÍCALO!', t: 0, n: 110, col: '#fff4d0', icon: sealNow() };
    G.audio.sfx('crystal'); slow = 40;
  }
  function finisher() {
    st = 'finisher'; stT = 0; slow = 90; freeze = 14;
    G.R.flash.r = 1; G.R.flash.g = 0.95; G.R.flash.b = 0.9; G.R.flash.a = 0.9;
    G.audio.sfx('shatter');
    banner = { text: 'SELLO DE ' + nameOf(sealNow()).toUpperCase() + ' ROTO', t: 0, n: 120, col: SKILLDEF[sealNow()].col, small: true };
    for (let i = 0; i < 50; i++) fx.push({ x: E.x + G.rnd(-14, 14), y: FLOOR - 40 + G.rnd(-16, 16), vx: G.rnd(-3, 3), vy: G.rnd(-3.5, 0.5), grav: 0.12, life: 70, col: G.pick(['#ff8a9a', '#ffd0da', '#ff5a78', '#ffffff']), s: 2 });
    E.crystals = Math.max(0, E.crystals - Math.ceil(def.crystals / def.rounds.length));
  }
  function endRound() {
    const last = round >= def.rounds.length - 1;
    st = 'pause';
    runScene(function* () {
      yield G.wait(20);
      yield* G.STORY['cb_' + CB.id](round, last);
      if (last) { st = 'purify'; stT = 0; }
      else { round++; startRound(); }
    });
  }
  function ko() {
    st = 'ko'; stT = 0; slow = 40;
    banner = { text: 'Te desvaneces...', t: 0, n: 90, col: '#9a94a8', small: true };
  }
  function runScene(fn) { CB.busy = true; G.run(fn, () => { CB.busy = false; }); }

  // ── efectos ──
  function burst(x, y, col, n) { for (let i = 0; i < n; i++) fx.push({ x, y, vx: G.rnd(-1.6, 1.6), vy: G.rnd(-1.8, 0.6), life: G.ri(16, 34), col, s: 1 }); }
  function dust(x, n) { for (let i = 0; i < n; i++) fx.push({ x: x + G.rnd(-6, 6), y: FLOOR - 1, vx: G.rnd(-0.8, 0.8), vy: -G.rnd(0.1, 0.6), life: G.ri(14, 26), col: def.bg === 'claro' ? '#6a3a48' : '#4a4466', s: 2 }); }
  // chispa de golpe: rayos cortos que salen del impacto (azul si se bloquea)
  function spark(x, y, col, block) { fx.push({ spark: true, x, y, col, life: 10, block }); for (let i = 0; i < 5; i++) fx.push({ x, y, vx: G.rnd(-2.4, 2.4), vy: G.rnd(-2.4, 1), life: G.ri(8, 16), col, s: 1 }); }
  function floatText(x, y, text, col) { floats.push({ x, y, text, col, t: 0 }); }

  // ── bucle ──
  CB.update = () => {
    CB.t = (CB.t || 0) + 1; stT++;
    if (G.shake) G.shake = Math.max(0, G.shake - 0.25);
    if (G.R.flash.a > 0) G.R.flash.a = Math.max(0, G.R.flash.a - 0.03);
    if (banner && ++banner.t > banner.n) banner = null;
    let run = true;
    if (freeze > 0) { freeze--; run = false; }
    else if (slow > 0) { slow--; run = slow % 3 === 0; }
    if (st === 'intro') {
      E.pose.t++;
      if (stT === 1) banner = { text: 'RONDA ' + (round + 1), t: 0, n: 60, col: '#fff4d0', sub: def.rounds.length > 1 ? 'Sello: ' + nameOf(sealNow()) : '' };
      if (stT === 62) { banner = { text: '¡ADELANTE!', t: 0, n: 40, col: '#ffd070' }; G.audio.sfx('boom'); }
      if (stT === 2 && tut && round === 0) { G.setFlag('tut_combate'); runScene(G.STORY.tutorial_combate); }
      if (stT > 70 && !CB.busy) st = 'fight';
      if (CB.busy) stT = Math.min(stT, 60);
    } else if (st === 'fight') {
      if (!CB.busy && !G.UI.blocking() && run) { playerUpdate(); enemyUpdate(); stepShots(); separate(); }
      if (G.pressed('start') && !CB.busy && !G.UI.blocking()) G.UI.openMenu();
    } else if (st === 'finisher') {
      if (run) { E.pose.t++; E.pose.crouch = G.lerp(E.pose.crouch, 1, 0.05); }
      if (stT > 110) { P.st = 'win'; P.t = 0; endRound(); }
    } else if (st === 'pause') {
      E.pose.t++;
    } else if (st === 'ko') {
      if (run) { playerUpdate(); enemyUpdate(); }
      if (P.st !== 'down' && onGround(P) && stT > 10) { setP('down'); }
      if (stT === 100) {
        runScene(function* () {
          yield* G.STORY.derrota(CB.id);
          P.hp = 100; P.meter = Math.max(P.meter, 30);
          startRound(); st = 'intro'; stT = 60;
        });
      }
    } else if (st === 'purify') {
      E.pose.t++;
      if (stT === 1) { G.audio.sfx('purify'); G.audio.play('recuerdo'); }
      if (stT % 3 === 0 && stT < 150) fx.push({ x: E.x + G.rnd(-18, 18), y: FLOOR - G.rnd(0, 60), vx: 0, vy: -G.rnd(0.3, 1.2), life: 70, col: G.pick(['#ffffff', '#fff0c0', '#9affe8']), s: 2 });
      E.crystals = 0; E.pose.eye = def.rig === 'oren' ? '#ffe8a0' : '#6affd0'; E.pose.staff = '#fff0c0';
      E.pose.crouch = G.lerp(E.pose.crouch, 0, 0.05); E.pose.lean = G.lerp(E.pose.lean, 0, 0.05);
      if (stT === 60) { G.R.flash.r = 1; G.R.flash.g = 1; G.R.flash.b = 1; G.R.flash.a = 0.9; banner = { text: 'PURIFICADO', t: 0, n: 130, col: '#9affe8' }; }
      if (stT === 200) { st = 'end'; CB.active = false; CB.finished = true; if (onEnd) onEnd(); }
    }
    // barras «fantasma» que bajan despacio detrás del daño (como en los juegos de lucha)
    P.ghost = P.ghost > P.hp ? Math.max(P.hp, P.ghost - 0.6) : P.hp;
    E.ghost = E.ghost > E.corr ? Math.max(E.corr, E.ghost - 0.6) : E.corr;
    // cámara
    const mid = (P.x + E.x) / 2;
    camX = G.lerp(camX, G.clamp(mid - CW / 2, 0, STAGE - CW), 0.12);
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      if (--f.life <= 0) { fx.splice(i, 1); continue; }
      if (f.vx != null && run) { f.x += f.vx; f.y += f.vy; if (f.grav) f.vy += f.grav; f.vx *= 0.95; }
    }
    for (let i = floats.length - 1; i >= 0; i--) if (++floats[i].t > 70) floats.splice(i, 1);
    for (let i = barks.length - 1; i >= 0; i--) if (++barks[i].t > barks[i].n) barks.splice(i, 1);
    draw();
  };
  // los dos luchadores no se atraviesan y no salen de la pantalla
  function separate() {
    const minD = 8 + def.half;
    if (Math.abs(P.x - E.x) < minD && P.y < 20 && E.y < 20 && E.st !== 'down' && P.st !== 'roll') {
      const s = Math.sign(P.x - E.x) || -1, push = (minD - Math.abs(P.x - E.x)) / 2;
      P.x += s * push; E.x -= s * push;
    }
    P.x = G.clamp(P.x, 12, STAGE - 12); E.x = G.clamp(E.x, 20, STAGE - 20);
    if (Math.abs(P.x - E.x) > CW - 30) P.x = E.x + Math.sign(P.x - E.x) * (CW - 30);
  }

  // ── fondos (dos capas con paralaje) ──
  let bgFar = null, bgNear = null;
  function buildBg() {
    const claro = def.bg === 'claro';
    const FW = Math.round(CW + (STAGE - CW) * 0.5);
    bgFar = G.makeCanvas(FW, CH);
    let c = bgFar.getContext('2d');
    const sky = c.createLinearGradient(0, 0, 0, CH);
    if (claro) { sky.addColorStop(0, '#12060e'); sky.addColorStop(0.6, '#2a0c1a'); sky.addColorStop(1, '#0a0408'); }
    else { sky.addColorStop(0, '#08060e'); sky.addColorStop(0.6, '#1a1030'); sky.addColorStop(1, '#06040a'); }
    c.fillStyle = sky; c.fillRect(0, 0, FW, CH);
    c.fillStyle = claro ? '#1a0812' : '#100a1c';
    for (let x = 0; x < FW; x += 3) { const h = 6 + G.hash(x, 1, 3) * 26 * (G.hash(x >> 3, 2, 3) > 0.5 ? 1 : 0.3); c.fillRect(x, 0, 3, Math.round(h)); }
    const P2 = (pts, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) c.lineTo(q[0], q[1]); c.fill(); };
    const cx = FW / 2;
    if (claro) {
      P2([[cx - 12, 104], [cx - 10, 28], [cx, 12], [cx, 104]], '#4a1428');
      P2([[cx, 104], [cx, 12], [cx + 10, 28], [cx + 12, 104]], '#7a2440');
      P2([[cx - 3, 104], [cx - 2, 24], [cx, 14], [cx + 1, 24], [cx + 2, 104]], '#a83a5a');
      c.fillStyle = '#ff9ab0'; c.fillRect(cx, 18, 1, 84);
      for (const [x, h, w] of [[-22, 18, 4], [20, 24, 5], [-34, 10, 3], [32, 13, 3], [-14, 11, 3]]) { P2([[cx + x - w, 104], [cx + x, 104 - h], [cx + x + w, 104]], '#5a1a30'); P2([[cx + x, 104], [cx + x, 104 - h], [cx + x + w, 104]], '#8a2a44'); }
    } else {
      c.fillStyle = '#1e1634';
      for (let ax = 10; ax < FW; ax += 80) { c.fillRect(ax, 40, 8, 70); c.fillRect(ax + 34, 40, 8, 70); c.beginPath(); c.arc(ax + 21, 42, 21, Math.PI, 0); c.lineTo(ax + 34, 42); c.arc(ax + 21, 42, 13, 0, Math.PI, true); c.fill(); }
    }
    bgNear = G.makeCanvas(STAGE, CH);
    c = bgNear.getContext('2d');
    const ridge = (base, amp, col, seed) => {
      c.fillStyle = col;
      for (let x = 0; x < STAGE; x++) {
        const h = base - (Math.sin(x * 0.03 + seed) * 0.5 + Math.sin(x * 0.011 + seed * 2) * 0.5) * amp - G.hash(x >> 2, 0, seed) * amp * 0.25;
        c.fillRect(x, Math.round(h), 1, CH);
      }
    };
    ridge(98, 18, claro ? '#1e0a14' : '#140e24', 1);
    ridge(112, 10, claro ? '#2a0e1a' : '#1c1430', 5);
    const fl = c.createLinearGradient(0, FLOOR, 0, CH);
    fl.addColorStop(0, claro ? '#4a1422' : '#2a2040'); fl.addColorStop(1, '#08040a');
    c.fillStyle = fl; c.fillRect(0, FLOOR, STAGE, CH - FLOOR);
    c.fillStyle = claro ? '#6e1a2c' : '#3a2e58'; c.fillRect(0, FLOOR, STAGE, 1);
    for (let x = 0; x < STAGE; x++) {
      if (G.hash(x, 5, 1) > 0.55) px(c, x, FLOOR - 1, claro ? '#8a2436' : '#2a3a4a');
      if (claro && G.hash(x, 6, 1) > 0.8) { const h = 2 + G.hash(x, 7) * 5; c.fillStyle = G.hash(x, 8) > 0.5 ? '#c02a3a' : '#7a1628'; c.fillRect(x, FLOOR - h, 1, h); }
      if (!claro && G.hash(x, 6, 1) > 0.9) { c.fillStyle = '#3a3060'; c.fillRect(x, FLOOR - 2, 2, 2); }
      if (G.hash(x, 9, 2) > 0.7) px(c, x, FLOOR + 2 + Math.floor(G.hash(x, 10) * 16), claro ? '#2a0a14' : '#161028');
    }
  }

  // ── dibujo ──
  const light = G.makeCanvas(CW, CH), lctx = light.getContext('2d');
  const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  function draw() {
    const claro = def.bg === 'claro', cx = Math.round(camX);
    g.save();
    g.clearRect(0, 0, CW, CH);
    const sh = G.shake || 0;
    if (sh) g.translate(Math.round(G.rnd(-sh, sh)), Math.round(G.rnd(-sh, sh)));
    g.drawImage(bgFar, -Math.round(camX * 0.5), 0);
    // rayo de luz diagonal
    g.globalCompositeOperation = 'lighter';
    const sx = STAGE / 2 - cx - 10;
    const rg = g.createLinearGradient(sx - 50, 0, sx + 30, CH);
    rg.addColorStop(0, 'rgba(255,240,210,0)'); rg.addColorStop(0.5, 'rgba(255,240,210,0.10)'); rg.addColorStop(1, 'rgba(255,240,210,0)');
    g.fillStyle = rg; g.beginPath(); g.moveTo(sx - 56, 0); g.lineTo(sx + 8, 0); g.lineTo(sx + 56, FLOOR); g.lineTo(sx - 16, FLOOR); g.fill();
    g.globalCompositeOperation = 'source-over';
    g.drawImage(bgNear, -cx, 0);
    g.translate(-cx, 0);
    for (const h of hazards) drawHazard(h);
    // sombras
    g.fillStyle = 'rgba(0,0,0,0.45)';
    const psw = Math.max(6, Math.round(16 - P.y * 0.3)), esw = Math.max(12, Math.round(36 - E.y * 0.4));
    g.fillRect(Math.round(P.x - psw / 2), FLOOR - 1, psw, 2);
    g.fillRect(Math.round(E.x - esw / 2), FLOOR - 1, esw, 2);
    drawEnemy(false);
    drawPlayer(false);
    for (const s of shots) drawShot(s);
    g.translate(cx, 0);
    // luz: la escena se multiplica por un mapa de luces y lo que brilla se suma encima
    lctx.globalCompositeOperation = 'source-over';
    lctx.fillStyle = claro ? '#a08894' : '#8e8aae'; lctx.fillRect(0, 0, CW, CH);
    lctx.globalCompositeOperation = 'lighter';
    const glow = (x, y, r, col) => { x -= cx; const gr = lctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); lctx.fillStyle = gr; lctx.fillRect(x - r, y - r, r * 2, r * 2); };
    glow(STAGE / 2, FLOOR - 30, 100, 'rgba(255,230,200,0.5)');
    if (claro) glow(STAGE / 2, 60, 80, 'rgba(255,60,100,0.4)');
    glow(E.x, FLOOR - 40 - E.y, 46, 'rgba(255,70,100,' + (0.12 + E.crystals * 0.04) + ')');
    const aura = P.st === 'special' ? SKILLDEF[P.skill].col : null;
    glow(P.x, FLOOR - 20 - P.y, aura ? 56 : 28, aura ? hexA(aura, 0.6) : 'rgba(120,255,220,0.22)');
    for (const s of shots) glow(s.x, s.y || FLOOR - 8, 28, s.kind === 'eco' ? 'rgba(255,210,120,0.5)' : s.mine ? 'rgba(140,216,255,0.6)' : 'rgba(255,90,120,0.5)');
    for (const h of hazards) if (h.boom != null) glow(h.x, FLOOR - 30, 56, 'rgba(255,80,110,0.7)');
    g.globalCompositeOperation = 'multiply';
    g.drawImage(light, 0, 0);
    g.globalCompositeOperation = 'lighter';
    g.translate(-cx, 0);
    drawEnemy(true);
    drawPlayer(true);
    for (const s of shots) drawShot(s, true);
    for (const h of hazards) if (h.boom != null) drawHazard(h, true);
    for (const f of fx) drawFx(f);
    g.translate(cx, 0);
    // polvo en la luz
    for (let i = 0; i < 60; i++) {
      const x = (G.hash(i, 1, 7) * CW + CB.t * (0.05 + G.hash(i, 2, 7) * 0.2) - camX * 0.3 + CW * 4) % CW, y = (G.hash(i, 3, 7) * CH - CB.t * 0.08 * G.hash(i, 4, 7) + CH * 4) % CH;
      const inRay = Math.abs(x - (sx - 26 + y * 0.45)) < 36;
      g.fillStyle = inRay ? 'rgba(255,244,220,0.8)' : 'rgba(200,180,200,0.16)';
      g.fillRect(x | 0, y | 0, 1, 1);
    }
    g.globalCompositeOperation = 'source-over';
    g.restore();
  }
  function drawEnemy(glowPass) {
    const rig = RIG[def.rig];
    E.pose.crystals = E.crystals;
    const rot = (E.pose.rot || 0) * (E.face > 0 ? Math.PI / 2 : -Math.PI / 2);
    const x = E.x, y = FLOOR - E.y;
    const alpha = E.fade != null ? E.fade : 1;
    if (alpha < 0.05) return;
    g.globalAlpha = alpha;
    if (!glowPass) {
      withOutline(g, x, y, E.face > 0, (c) => rig(c, E.pose, false), rot);
      if (E.hit > 0 && E.hit % 2) { g.globalCompositeOperation = 'lighter'; withOutline(g, x, y, E.face > 0, (c) => rig(c, E.pose, false), rot); g.globalCompositeOperation = 'source-over'; }
    } else {
      const a = tmpA.getContext('2d');
      a.clearRect(0, 0, 120, 120);
      rig(a, E.pose, true);
      g.save(); g.translate(Math.round(x), Math.round(y)); if (rot) g.rotate(rot); if (E.face > 0) g.scale(-1, 1);
      g.drawImage(tmpA, -60, -110);
      g.restore();
      // estrellas del trance
      if (E.st === 'dizzy') for (let i = 0; i < 3; i++) { const a2 = CB.t * 0.1 + i * 2.1; g.fillStyle = i % 2 ? '#ffd070' : '#9affe8'; g.fillRect(Math.round(E.x + Math.cos(a2) * 14), Math.round(FLOOR - 78 + Math.sin(a2) * 4), 2, 2); }
    }
    g.globalAlpha = 1;
  }
  // fotograma del protagonista según lo que esté haciendo
  function playerFrame() {
    const A = G.SPR.prota_cb, side = P.face > 0 ? 'right' : 'left';
    const pick = (k, i) => { const l = A[k][side]; return l[((i % l.length) + l.length) % l.length]; };
    switch (P.st) {
      case 'roll': return { f: pick('crouch', 0), rot: (P.t / 16) * Math.PI * 2 * P.rdir };
      case 'hit': return { f: pick('hurt', 0) };
      case 'down': return { lie: true };
      case 'getup': return { f: pick('crouch', 0) };
      case 'blockstun': case 'guard': return { f: pick(G.dir.y > 0.45 ? 'cguard' : 'guard', 0) };
      case 'cguard': return { f: pick('cguard', 0) };
      case 'crouch': return { f: pick('crouch', 0) };
      case 'jump': return { f: pick('jump', P.vy > 0 ? 0 : 1) };
      case 'airatk': return { f: pick('airkick', 0) };
      case 'atk': { const a = P.atk; return { f: pick(a.t < a.m.su ? (a.m.anim === 'sweep' ? 'crouch' : 'idle') : a.m.anim, 0) }; }
      case 'special': {
        const D = SKILLDEF[P.skill];
        if (P.t < D.su) return { f: pick('raise', P.t >> 3) };
        if (P.skill === 'cuerpo') return { f: pick('dash', 0) };
        if (P.skill === 'alma') return { f: pick('gancho', 0) };
        return { f: pick('cast', P.t >> 2) };
      }
      case 'win': return { f: pick('win', Math.floor(CB.t / 20)) };
      case 'walk': return { f: pick('walk', P.back ? -Math.floor(P.anim / 6) : Math.floor(P.anim / 6)) };
      default: return { f: pick('idle', Math.floor(CB.t / 16)) };
    }
  }
  function drawPlayer(glowPass) {
    const fr = playerFrame();
    if (fr.lie) { if (!glowPass) { const l = G.SPR.prota_lie; g.drawImage(l.c, Math.round(P.x - l.w / 2), FLOOR - l.h); } return; }
    if (!glowPass && P.inv > 0 && ['hit', 'getup'].includes(P.st) === false && P.st !== 'roll' && P.st !== 'special' && Math.floor(P.inv / 3) % 2) return;
    const f = fr.f;
    const blit = (cv) => {
      const x = Math.round(P.x), y = FLOOR - f.h - Math.round(P.y);
      if (fr.rot) { g.save(); g.translate(x, y + f.h / 2 + 4); g.rotate(fr.rot); g.drawImage(cv, -Math.round(f.w / 2), -Math.round(f.h / 2)); g.restore(); }
      else g.drawImage(cv, x - Math.round(f.w / 2), y);
    };
    if (!glowPass) {
      if (P.st === 'special' && P.t < SKILLDEF[P.skill].su && P.t % 4 < 2) { P.x -= P.face; blit(f.c); P.x += P.face; } else blit(f.c);
      if (P.st === 'hit' && P.t < 6) { g.globalCompositeOperation = 'lighter'; blit(G.tint(f.c, '#ff4a5a')); g.globalCompositeOperation = 'source-over'; }
      return;
    }
    if (f.e) blit(f.e);
    for (const e of fx) if (e.ghost) { g.globalAlpha = e.life / 30; g.drawImage(G.tint(f.c, '#3cc4a4'), Math.round(e.x - f.w / 2), FLOOR - f.h - Math.round(e.y || 0)); g.globalAlpha = 1; }
    if (P.st !== 'special') return;
    const D = SKILLDEF[P.skill], t = P.t, col = D.col;
    if (t < D.su) for (let i = 0; i < 6; i++) { const a = t * 0.15 + (i / 6) * Math.PI * 2, r = 20 - (t / D.su) * 11; g.fillStyle = col; g.fillRect(Math.round(P.x + Math.cos(a) * r), Math.round(FLOOR - 20 + Math.sin(a) * r * 0.5), 2, 2); }
    if (P.skill === 'alma' && t >= D.su && t < D.su + D.act) { const r = 12 + (t - D.su) * 1.4; g.strokeStyle = hexA(col, 1 - (t - D.su) / D.act * 0.6); g.lineWidth = 2; g.beginPath(); g.ellipse(P.x, FLOOR - 14, r, r * 0.4, 0, 0, Math.PI * 2); g.stroke(); }
    if (P.skill === 'ser' && t >= D.su && t < D.su + D.act) {
      const k = 1 - (t - D.su) / D.act, y = FLOOR - 22, x0 = P.face > 0 ? P.x : P.x - STAGE, w = STAGE;
      g.fillStyle = hexA('#ffffff', 0.9 * k); g.fillRect(x0, y - 6 * k, w, 12 * k);
      g.fillStyle = hexA('#fff0c0', 0.5 * k); g.fillRect(x0, y - 12 * k, w, 24 * k);
    }
  }
  function drawShot(s, glowPass) {
    if (s.kind === 'onda') {
      if (!glowPass) return;
      g.strokeStyle = s.col; g.lineWidth = 1;
      for (let i = 0; i < 3; i++) { g.beginPath(); if (s.vx > 0) g.arc(s.x - s.vx * i * 2, s.y, 5 + i * 3, -1.2, 1.2); else g.arc(s.x - s.vx * i * 2, s.y, 5 + i * 3, Math.PI - 1.2, Math.PI + 1.2); g.stroke(); }
    } else if (s.kind === 'hilo') {
      if (!glowPass) return;
      g.fillStyle = s.col;
      const n = Math.abs(s.x - s.x0);
      for (let i = 0; i < n; i += 3) g.fillRect(Math.round(s.x0 + Math.sign(s.vx) * i), Math.round(s.y + Math.sin(i * 0.3 + CB.t * 0.5) * 2), 2, 1);
      g.fillRect(Math.round(s.x) - 2, s.y - 2, 4, 4);
    } else if (s.kind === 'caida') {
      if (glowPass) { g.fillStyle = '#ff8a9a'; g.fillRect(s.x - 1, s.y - 12, 2, 8); return; }
      tri(g, [s.x, s.y], [s.x - 4, s.y - 14], [s.x + 4, s.y - 14], '#b02a44');
    } else if (s.kind === 'eco') {
      if (!glowPass) return;
      const r = 4 + Math.sin(CB.t * 0.2 + s.x);
      g.fillStyle = '#ffd070'; g.beginPath(); g.arc(s.x, s.y, r, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(s.x - 1, s.y - 1, 2, 2);
    } else if (s.kind === 'ola') {
      if (!glowPass) { g.fillStyle = '#7a1628'; for (let i = 0; i < 12; i++) g.fillRect(Math.round(s.x - Math.sign(s.vx) * i), FLOOR - 13 + i, 1, 13 - i); return; }
      g.fillStyle = '#ff5a78'; g.fillRect(Math.round(s.x) - 1, FLOOR - 15, 2, 15);
    }
  }
  function drawHazard(h, glowPass) {
    if (h.kind === 'aviso') {
      const k = h.t / h.n, a = 0.3 + 0.4 * Math.abs(Math.sin(h.t * 0.3));
      g.fillStyle = hexA(h.col || '#ff5a6a', a); g.fillRect(Math.round(h.x - h.w), FLOOR, Math.round(h.w * 2), 2);
      g.fillStyle = hexA(h.col || '#ff5a6a', a * 0.4 * k); g.fillRect(Math.round(h.x - h.w), FLOOR - 22 * k, Math.round(h.w * 2), 22 * k);
    } else if (h.kind === 'circulo') {
      if (h.boom != null) {
        if (!glowPass) return;
        for (let i = -2; i <= 2; i++) { const hh = 24 - Math.abs(i) * 6; tri(g, [h.x + i * 7, FLOOR - hh * Math.min(1, (22 - h.boom + 4) / 6)], [h.x + i * 7 - 4, FLOOR], [h.x + i * 7 + 4, FLOOR], h.col); }
        return;
      }
      const k = h.t / h.n;
      g.strokeStyle = hexA(h.col, 0.5 + k * 0.5); g.lineWidth = 1;
      g.beginPath(); g.ellipse(h.x, FLOOR + 1, h.w, 4, 0, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.ellipse(h.x, FLOOR + 1, h.w * (1 - k), 4 * (1 - k), 0, 0, Math.PI * 2); g.stroke();
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
    if (f.spark) {
      // estrella de impacto
      const k = f.life / 10, r = (1 - k) * 12 + 3;
      g.fillStyle = f.block ? '#bfe8ff' : '#fff8e0';
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + (f.block ? 0.4 : 0); for (let j = r * 0.4; j < r; j += 1) g.fillRect(Math.round(f.x + Math.cos(a) * j), Math.round(f.y + Math.sin(a) * j), 1, 1); }
      if (k > 0.6) { g.fillStyle = '#ffffff'; g.fillRect(Math.round(f.x) - 2, Math.round(f.y) - 2, 4, 4); }
      return;
    }
    g.fillStyle = f.col;
    g.globalAlpha = Math.min(1, f.life / 12);
    g.fillRect(Math.round(f.x), Math.round(f.y), f.s || 1, f.s || 1);
    g.globalAlpha = 1;
  }

  // ── interfaz del combate (480×270) ──
  const K = 480 / CW;
  function bar(c, x, y, w, h, v, ghost, col, rightToLeft) {
    c.fillStyle = '#0a0812'; c.fillRect(x - 2, y - 2, w + 4, h + 4);
    c.fillStyle = '#d8bf86'; c.fillRect(x - 1, y - 1, w + 2, 1); c.fillRect(x - 1, y + h, w + 2, 1); c.fillRect(x - 1, y, 1, h); c.fillRect(x + w, y, 1, h);
    c.fillStyle = '#1c1624'; c.fillRect(x, y, w, h);
    const gw = Math.round(w * ghost / 100), vw = Math.round(w * v / 100);
    c.fillStyle = '#fff0c0';
    if (rightToLeft) c.fillRect(x + w - gw, y, gw, h); else c.fillRect(x, y, gw, h);
    c.fillStyle = col;
    if (rightToLeft) c.fillRect(x + w - vw, y, vw, h); else c.fillRect(x, y, vw, h);
    c.fillStyle = 'rgba(255,255,255,0.25)';
    if (rightToLeft) c.fillRect(x + w - vw, y, vw, 2); else c.fillRect(x, y, vw, 2);
  }
  CB.drawHUD = (c) => {
    if (!def) return;
    // barras: Luz del protagonista a la izquierda, Corrupción del enemigo a la derecha
    const pn = 'SOREN';
    bar(c, 16, 22, 188, 10, P.hp, P.ghost, P.hp > 30 ? '#6affd0' : '#ff9a6a');
    bar(c, 276, 22, 188, 10, E.corr / E.max * 100, E.ghost / E.max * 100, '#ff4a6a', true);
    G.text(c, pn, 18, 9, '#9affe8');
    G.text(c, 'LUZ', 180, 9, '#9a94a8');
    const en = def.name.toUpperCase();
    G.text(c, en, 462 - G.textW(en), 9, '#ffb0c0');
    G.text(c, 'CORRUPCIÓN', 278, 9, '#9a94a8');
    // rondas: un medallón por sello
    const n = def.rounds.length;
    def.rounds.forEach((r, i) => {
      const x = 240 - (n * 18) / 2 + i * 18 + 1, y = 16;
      const cur = i === round;
      G.UI.skillIcon(c, r.seal, x, y + (cur ? Math.round(Math.sin(G.t * 0.15)) : 0), i < round ? 0.3 : cur ? 1 : 0.5);
      if (i < round) { c.fillStyle = '#d8bf86'; c.fillRect(x + 2, y + 7, 12, 1); }
    });
    // resonancia (para Ser)
    const mw = 120;
    c.fillStyle = '#0a0812'; c.fillRect(15, 36, mw + 2, 6);
    for (let i = 0; i < 4; i++) { const seg = G.clamp((P.meter - i * 25) / 25, 0, 1); c.fillStyle = seg >= 1 ? (Math.floor(G.t / 8) % 2 && P.meter >= 100 ? '#ffffff' : '#9ad8ff') : '#3a4a6a'; c.fillRect(16 + i * 30, 37, Math.round(29 * seg), 4); }
    G.text(c, 'RESONANCIA', 140, 35, P.meter >= 100 ? '#ffffff' : '#6a7a9a');
    // combo
    if (P.combo >= 2) {
      const s = P.combo + ' GOLPES';
      G.textBig(c, s, 16, 60, 2, '#ffd070', '#1a0a04');
      if (P.combo >= 5) G.text(c, P.combo >= 8 ? '¡Imparable!' : '¡Brutal!', 18, 86, '#fff0c0');
    }
    // barra de habilidades (teclado y mando; en táctil están los botones)
    if (G.device !== 'touch') {
      const list = ORDER;
      const keys = G.device === 'kb' ? ['1', '2', '3', '4', '5'] : ['LB+A', 'LB+B', 'LB+X', 'LB+Y', 'LB+RB'];
      const x0 = 240 - (list.length * 30) / 2;
      list.forEach((id, i) => {
        const x = x0 + i * 30, y = 238, has = G.save.skills.includes(id);
        G.frame(c, x, y, 26, 26, { ornate: false, fill: 'rgba(8,10,20,0.8)', edge: sealNow() === id && has ? '#ffd070' : '#5a5060' });
        if (has) {
          G.UI.skillIcon(c, id, x + 5, y + 5, 1);
          const cd = P.cd[id] || 0, D = SKILLDEF[id];
          if (cd > 0) { c.fillStyle = 'rgba(0,0,0,0.7)'; c.fillRect(x + 3, y + 3, 20, Math.round(20 * cd / D.cd)); }
          if (D.meter && P.meter < D.meter) { c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(x + 3, y + 3, 20, 20); }
        } else G.textC(c, '?', x + 13, y + 9, '#5a5060');
        G.textC(c, keys[i], x + 13, y - 11, '#9a94a8');
      });
      if (G.device === 'kb') {
        G.text(c, 'Z puño · X patada · ↓ agacharse', 8, 236, '#6a6478');
        G.text(c, 'Espacio saltar · Shift rodar', 8, 248, '#6a6478');
        G.text(c, '← (atrás) bloquear', 8, 260, '#6a6478');
      }
    }
    // carteles grandes (ronda, ¡purifícalo!)
    if (banner) {
      const b = banner, a = Math.min(1, b.t / 8, (b.n - b.t) / 12);
      c.globalAlpha = Math.max(0, a);
      const sc = b.small ? 2 : 3, w = G.textW(b.text) * sc, zoom = b.t < 8 ? (8 - b.t) * 2 : 0;
      const gy = 100;
      const gr = c.createLinearGradient(0, gy - 16, 0, gy + 44);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gr; c.fillRect(0, gy - 16, 480, 60);
      G.textBig(c, b.text, Math.round(240 - w / 2) - zoom, gy - zoom / 2, sc, b.col, '#12060a');
      if (b.sub) G.textC(c, b.sub, 240, gy + 36, '#d8bf86');
      if (b.icon) { G.UI.skillIcon(c, b.icon, 232, gy + 34, 1); G.textC(c, 'usa ' + nameOf(b.icon), 240, gy + 52, SKILLDEF[b.icon].col); }
      c.globalAlpha = 1;
    }
    // textos flotantes y frases
    for (const f of floats) {
      const a = Math.min(1, (70 - f.t) / 20);
      c.globalAlpha = a;
      G.textC(c, f.text, Math.round((f.x - camX) * K), Math.round((f.y - f.t * 0.3) * K), f.col, '#0a0812');
      c.globalAlpha = 1;
    }
    for (const b of barks) {
      const a = Math.min(1, b.t / 15, (b.n - b.t) / 20);
      c.globalAlpha = a;
      const x = G.clamp((E.x - camX) * K, 90, 390), y = (FLOOR - E.y - 92) * K;
      const w = G.textW(b.text) + 14;
      G.frame(c, Math.round(x - w / 2), Math.round(y - 4), w, 16, { ornate: false, fill: 'rgba(20,6,14,0.85)', edge: '#8a3a4a' });
      G.textC(c, b.text, Math.round(x), Math.round(y), '#ffd0d8', null);
      c.globalAlpha = 1;
    }
  };
  CB.say = (who, text) => barks.push({ who, text, t: 0, n: 200 });
  CB.isFighting = () => st === 'fight';
  CB.cdFrac = (id) => (P && P.cd[id] > 0 ? P.cd[id] / SKILLDEF[id].cd : SKILLDEF[id] && SKILLDEF[id].meter && P && P.meter < 100 ? 1 - P.meter / 100 : 0);
  CB.sealSkill = () => (def ? sealNow() : null);
  // para pruebas automáticas
  CB.debug = {
    state: () => ({ st, round, hp: Math.round(P.hp), corr: Math.round(E.corr), est: E.st, pst: P.st, jy: Math.round(P.y), meter: P.meter }),
    // deja al enemigo en trance y lo purifica con la habilidad del sello
    finish: () => { E.corr = 0; dizzy(); landHit({ dmg: 1 }, P.x, sealNow()); },
    dmg: (n) => { E.corr = Math.max(0, E.corr - n); if (E.corr <= 0) dizzy(); },
  };
})();
