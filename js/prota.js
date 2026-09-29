'use strict';
// ─── El protagonista: esqueleto de piezas de pixel art y todas sus animaciones ───
// El diseño base es el del sprite original (cara en 3/4, un ojo grande y otro pequeño, punta blanca en la oreja,
// bigotes cian, hombreras de cuero con broche, cola con punta en damero). Aquí se parte en piezas
// (cabeza, brazos, piernas, cola, abrigo) para moverlas por separado, y al componer se añaden contorno y brillo de borde.
(function () {
  const PAL = {
    K: '#06121a', k: '#0c2a36', d: '#1e4854', t: '#2a6072', T: '#3e8698', r: '#16384a',
    w: '#fcfcfa', W: '#e2e4e4', s: '#c2cacc', S: '#8e9a9e', n: '#10223a',
    c: '#78f6cc', C: '#5ec6ac', e: '#e8fff6', M: '#2e7a6a',
    h: '#c0ae98', b: '#9c8a76', B: '#6e6052',
  };
  G.PAL_PROTA2 = PAL;
  const W = 22, H = 33;

  // ── piezas (coordenadas locales; '.' = transparente) ──
  const BASE = {
    // ─ de frente ─
    head_d: [
      '..ww............',
      '..dwk......k....',
      '..ddkk....kdd...',
      '..dkkkkkkkkkd...',
      '..kkWkkkkkwkk...',
      '.kkkWWkdkwwkkk..',
      'ckWWewWWwwwwwkc.',
      '.ckWcwcwssswkc..',
      '..ckWWWWwwwkc...',
      '.ckWWWWnwwwwkc..',
      '...kkWswswkk....',
    ],
    // parpadeo: ojos cerrados (se superpone a la cabeza)
    blink_d: [[4, 6, 'W'], [4, 7, 'n'], [6, 7, 'n']],
    // oreja que se mueve (la de la punta blanca, doblada)
    ear_d: [[2, 0, '.'], [3, 0, '.'], [2, 1, 'w'], [3, 1, 'w'], [4, 1, 'k']],
    body_d: [
      '..bbkkwwwkkbb...',
      '.bhhhkkkkkhhhb..',
      '.bkkkbhwhbkkkb..',
      '....tkdddkt.....',
      '....tdddddt.....',
      '....tdtdddt.....',
      '....tddtddt.....',
      '....tdtdddt.....',
      '....tddtddt.....',
      '...ktdddddtk....',
      '...kdttdttdk....',
      '...kkkddtddkk...',
      '....kkkdtdkkk...',
      '....kkkktkkkk...',
    ],
    armL_d: ['kkk', 'kdk', 'kkk', 'kdk', 'kkk', 'kkk', 'CCk', 'bCC', 'hh.', '.h.'],
    armR_d: ['kkk', 'kkk', 'kkk', 'kkk', 'kkk', 'kkk', 'kCC', 'CCb', '.hh', '.h.'],
    legL_d: ['kkkk', 'kkkk', 'kkkkk', 'CCCk'],
    legR_d: ['kkkk', 'kkkk', 'kkkkk', 'kCCC'],
    tail_d: [
      '.....c.',
      '...cckc',
      '..kkkc.',
      '.kkkkkc',
      'kkkkkc.',
      'kkkk...',
      '.kk....',
    ],
    // ─ de espaldas ─
    head_u: [
      '............ww..',
      '....k......kwd..',
      '...ddk....kkdd..',
      '...dkkkkkkkkkd..',
      '...kkkkkkkkkkk..',
      '..kkkkkdkkkkkkk.',
      '.ckkkkkkkkkkkkkc',
      '..ckkkkkkkkkkkc.',
      '...ckkkkkkkkkc..',
      '..ckkkkkkkkkkkc.',
      '....kkkkkkkkk...',
    ],
    ear_u: [[12, 0, '.'], [13, 0, '.'], [12, 1, 'w'], [13, 1, 'w'], [11, 1, 'k']],
    body_u: [
      '...bbkkkkkkkbb..',
      '..bhhhkkkkkhhhb.',
      '..bkkkbkkkbkkkb.',
      '.....kkkdkkk....',
      '.....kkkdkkk....',
      '.....kkkdkkk....',
      '.....kkkdkkk....',
      '.....kkkdkkk....',
      '.....kkkdkkk....',
      '....kkkkdkkkk...',
      '....kkkkdkkkk...',
      '....kkkkdkkkk...',
      '.....kkkdkkk....',
      '.....kkkdkkk....',
    ],
    armL_u: ['kkk', 'kkk', 'kkk', 'kkk', 'kkk', 'kkk', 'CCk', 'bCC', 'hh.', '.h.'],
    armR_u: ['kkk', 'kdk', 'kkk', 'kdk', 'kkk', 'kkk', 'kCC', 'CCb', '.hh', '.h.'],
    legL_u: ['kkkk', 'kkkk', 'kkkkk', 'CCCk'],
    legR_u: ['kkkk', 'kkkk', 'kkkkk', 'kCCC'],
    tail_u: [
      '.kkk.',
      '.kkk.',
      '..kkk',
      '..kkk',
      '.kkck',
      '.kckc',
      '..c.c',
    ],
    // ─ de perfil (mirando a la derecha) ─
    head_s: [
      '...ww...........',
      '...dwk.k........',
      '...ddkkdk.......',
      '...dkkkkk.......',
      '..kkkkkkWk......',
      '.kkkkkkWWwk..c..',
      'kkkkkkWWewwwk...',
      '.kkkkkWWcwwwwwn.',
      '..kkkkkWWwwwwk..',
      '..ckkkkkWsssk..c',
      '...kkkkkkkkk....',
    ],
    blink_s: [[8, 6, 'W'], [8, 7, 'n']],
    ear_s: [[3, 0, '.'], [4, 0, '.'], [3, 1, 'w'], [4, 1, 'w'], [5, 1, 'k']],
    body_s: [
      '....bbkkkwk.....',
      '...bhhhbkkkt....',
      '...bhhbkkkdt....',
      '...kbbkkkddt....',
      '...kkkkkkddt....',
      '...kkkkkkdtt....',
      '...kkkkkkddt....',
      '...kkkkkkdtt....',
      '...kkkkkkddt....',
      '...kkkkkkddt....',
      '...kkkkkdttt....',
      '...kkkkkkddk....',
      '....kkkkkdk.....',
      '....kkkkkkk.....',
    ],
    armF_s: ['kkk', 'kdk', 'kkk', 'kdk', 'kkk', 'kkk', 'CCC', 'bhb', '.h.'],
    armB_s: ['rrr', 'rrr', 'rrr', 'rrr', 'rrr', 'rrr', 'CCC', 'BbB', '.b.'],
    armUp_s: ['kkkkkCCh.', 'kdkkkCChh', '.......h.'], // brazo extendido hacia delante (lanzar, golpear)
    armRaise_s: ['..hh', '..hC', '..CC', '.kk.', '.kk.', 'kdk.', 'kk..'], // brazo en alto delante de la cara (concentración)
    legF_s: ['kkk', 'kkk', 'kkk', 'CCCC'],
    legB_s: ['rrr', 'rrr', 'rrr', 'MMMM'],
    tail_s: [
      'c.c....',
      '.ckc...',
      'ckkk...',
      '.kkkk..',
      '..kkkkk',
      '...kkkk',
      '.....kk',
    ],
  };

  // marcas de la tribu (brillan) y cristales del pilar, puestos sobre las piezas para que se muevan con ellas
  const MARKS = {
    head_d: [[7, 3], [8, 3], [7, 4], [10, 8], [11, 9]], head_u: [[7, 5], [8, 5], [7, 6], [8, 6]], head_s: [[6, 3], [7, 3], [6, 4], [10, 8]],
    armL_d: [[1, 2], [1, 3]], armR_d: [[1, 2], [1, 3]], armL_u: [[1, 2], [1, 3]], armR_u: [[1, 2], [1, 3]], armF_s: [[1, 2], [1, 3]],
  };
  const CRYST = {
    body_d: [[2, 0, 'E'], [3, 0, 'X'], [1, 1, 'X'], [12, 0, 'X'], [11, 0, 'E'], [13, 1, 'X']],
    body_u: [[3, 0, 'X'], [4, 0, 'E'], [2, 1, 'X'], [13, 0, 'E'], [12, 0, 'X'], [14, 1, 'X']],
    body_s: [[4, 0, 'E'], [5, 0, 'X'], [3, 1, 'X'], [4, -1, 'X']],
  };
  const over = (rows, list, ch) => {
    const out = rows.map((r) => r.split(''));
    for (const [x, y, c] of list) if (out[y] && out[y][x] && out[y][x] !== '.') out[y][x] = c || ch; else if (out[y] && c) out[y][x] = c;
    return out.map((r) => r.join(''));
  };
  function build(mod = {}) {
  const P = {};
  for (const k in BASE) {
    let v = BASE[k];
    if (Array.isArray(v) && typeof v[0] === 'string') {
      if (mod.marks && MARKS[k]) v = over(v, MARKS[k], 'x');
      if (mod.crystals && CRYST[k]) v = over(v, CRYST[k]);
    }
    P[k] = v;
  }

  // ── composición ──
  function blank() { return Array.from({ length: H }, () => Array(W).fill('.')); }
  function stamp(g, rows, x, y, mode) {
    rows.forEach((r, j) => {
      for (let i = 0; i < r.length; i++) {
        const ch = r[i];
        if (ch === '.') continue;
        const X = x + i, Y = y + j;
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        if (mode === 'under' && g[Y][X] !== '.') continue;
        g[Y][X] = ch;
      }
    });
  }
  function pts(g, list, x, y) { for (const [i, j, ch] of list) { const X = x + i, Y = y + j; if (g[Y] && X >= 0 && X < W) g[Y][X] = ch; } }
  // contorno oscuro y brillo de borde (la luz viene de arriba a la izquierda)
  function finish(g) {
    const out = g.map((r) => r.slice());
    const solid = (x, y) => y >= 0 && y < H && x >= 0 && x < W && g[y][x] !== '.';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (g[y][x] === '.') {
        if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) out[y][x] = 'K';
      } else if (g[y][x] === 'k' && (!solid(x - 1, y) || !solid(x, y - 1)) && solid(x + 1, y) && solid(x, y + 1)) out[y][x] = 'd';
    }
    return out.map((r) => r.join(''));
  }
  const OX = 3, OY = 1; // margen para el contorno y la cola

  // pose de frente / espaldas: o = { by: bote del cuerpo, hy: cabeza, al/ar: brazos, ll/lr: piernas (dy, dx), tx: cola, blink, ear }
  function poseDU(view, o) {
    const g = blank(), up = view === 'u';
    const by = o.by || 0, hy = (o.hy || 0) + by;
    const tail = P['tail_' + view];
    if (!up) stamp(g, tail, OX + 11 + (o.tx || 0), OY + 21 + by);
    // piernas
    stamp(g, P['legL_' + view], OX + 2 + (o.ll ? o.ll[1] : 0), OY + 26 + (o.ll ? o.ll[0] : 0));
    stamp(g, P['legR_' + view], OX + 8 + (o.lr ? o.lr[1] : 0), OY + 26 + (o.lr ? o.lr[0] : 0));
    stamp(g, P['body_' + view], OX, OY + 11 + by);
    if (up) stamp(g, tail, OX + 6 + (o.tx || 0), OY + 22 + by);
    stamp(g, P['armL_' + view], OX + 1, OY + 14 + by + (o.al || 0));
    stamp(g, P['armR_' + view], OX + 11, OY + 14 + by + (o.ar || 0));
    stamp(g, P['head_' + view], OX, OY + hy);
    if (o.ear) pts(g, P['ear_' + view], OX, OY + hy);
    if (o.blink && !up) pts(g, P.blink_d, OX, OY + hy);
    return finish(g);
  }
  // pose de perfil: o = { by, hy, af/ab: brazos [dx, dy], lf/lb: piernas [dx, dy], tx, ty, arm: 'up'|'raise', blink, ear, lean }
  function poseS(o) {
    const g = blank();
    const by = o.by || 0, hy = (o.hy || 0) + by, ln = o.lean || 0;
    stamp(g, P.tail_s, OX - 2 + (o.tx || 0), OY + 18 + by + (o.ty || 0));
    stamp(g, P.armB_s, OX + 6 + (o.ab ? o.ab[0] : 0), OY + 13 + by + (o.ab ? o.ab[1] : 0));
    stamp(g, P.legB_s, OX + 6 + (o.lb ? o.lb[0] : 0), OY + 26 + (o.lb ? o.lb[1] : 0));
    stamp(g, P.legF_s, OX + 5 + (o.lf ? o.lf[0] : 0), OY + 26 + (o.lf ? o.lf[1] : 0));
    stamp(g, P.body_s, OX + ln, OY + 11 + by);
    if (o.arm === 'up') stamp(g, P.armUp_s, OX + 7 + ln, OY + 15 + by);
    else if (!o.arm) stamp(g, P.armF_s, OX + 5 + ln + (o.af ? o.af[0] : 0), OY + 13 + by + (o.af ? o.af[1] : 0));
    stamp(g, P.head_s, OX + ln, OY + hy);
    if (o.arm === 'raise') stamp(g, P.armRaise_s, OX + 11 + ln, OY + 7 + by);
    if (o.ear) pts(g, P.ear_s, OX + ln, OY + hy);
    if (o.blink) pts(g, P.blink_s, OX + ln, OY + hy);
    return finish(g);
  }

  // ── animaciones ──
  // caminar: 6 fotogramas (apoyo, paso, alto, apoyo, paso, alto); brazos al revés que las piernas, la cola se mece
  const walkDU = (v) => [
    poseDU(v, { by: 0, al: 1, ar: -1, ll: [-1, 0], lr: [0, 0], tx: 1 }),
    poseDU(v, { by: -1, al: 0, ar: 0, ll: [-2, 0], lr: [0, 0], tx: 1, ear: true }),
    poseDU(v, { by: 0, al: -1, ar: 1, ll: [0, 0], lr: [0, 0], tx: 0 }),
    poseDU(v, { by: 0, al: -1, ar: 1, ll: [0, 0], lr: [-1, 0], tx: -1 }),
    poseDU(v, { by: -1, al: 0, ar: 0, ll: [0, 0], lr: [-2, 0], tx: -1, ear: true }),
    poseDU(v, { by: 0, al: 1, ar: -1, ll: [0, 0], lr: [0, 0], tx: 0 }),
  ];
  // quieto: respira (el pecho baja y sube), la cola se mece, parpadea y mueve una oreja de vez en cuando
  const idleDU = (v) => [
    poseDU(v, {}), poseDU(v, { tx: 1 }), poseDU(v, { by: 1, hy: -1, tx: 1 }), poseDU(v, { by: 1, hy: -1, tx: 0, al: 0 }),
    poseDU(v, { tx: -1 }), poseDU(v, { tx: -1, blink: true }), poseDU(v, {}), poseDU(v, { ear: true, tx: 1 }),
  ];
  const walkS = [
    poseS({ lf: [2, 0], lb: [-2, 0], af: [-1, 0], ab: [2, -1], tx: 0, ty: 0 }),
    poseS({ by: -1, lf: [1, -1], lb: [-1, 0], af: [0, 0], ab: [1, 0], tx: -1, ty: 1, ear: true }),
    poseS({ lf: [0, 0], lb: [0, -1], af: [1, 0], ab: [0, 0], tx: -1, ty: 1 }),
    poseS({ lf: [-2, 0], lb: [2, 0], af: [2, -1], ab: [-1, 0], tx: 0, ty: 0 }),
    poseS({ by: -1, lf: [-1, 0], lb: [1, -1], af: [1, 0], ab: [0, 0], tx: 1, ty: -1, ear: true }),
    poseS({ lf: [0, -1], lb: [0, 0], af: [0, 0], ab: [1, 0], tx: 1, ty: -1 }),
  ];
  const idleS = [
    poseS({}), poseS({ tx: -1 }), poseS({ by: 1, hy: -1, tx: -1, ty: 1 }), poseS({ by: 1, hy: -1, ty: 1 }),
    poseS({ tx: 1 }), poseS({ tx: 1, blink: true }), poseS({}), poseS({ ear: true, tx: -1 }),
  ];
  // salto: subiendo (piernas recogidas, brazos arriba) y cayendo (piernas estiradas, brazos abiertos)
  const jumpDU = (v) => [
    poseDU(v, { by: -1, hy: -1, al: -3, ar: -3, ll: [-3, 1], lr: [-3, -1], tx: 1, ear: true }),
    poseDU(v, { by: 0, hy: -1, al: -1, ar: -1, ll: [-1, 0], lr: [-1, 0], tx: -1 }),
  ];
  const jumpS = [
    poseS({ by: -1, hy: -1, lf: [2, -3], lb: [-1, -2], af: [1, -3], ab: [-1, -3], tx: -1, ty: -2, ear: true }),
    poseS({ lf: [1, -1], lb: [-2, 0], af: [2, -1], ab: [-2, -1], tx: 1, ty: 1 }),
  ];
  // combate (de perfil): concentrarse, lanzar, golpear, recibir, agacharse para rodar
  const combat = {
    idle: [poseS({}), poseS({ tx: -1 }), poseS({ by: 1, hy: -1, tx: -1 }), poseS({ by: 1, hy: -1 })],
    walk: walkS,
    raise: [poseS({ arm: 'raise', by: 0 }), poseS({ arm: 'raise', by: -1, ear: true, tx: -1 })],
    cast: [poseS({ arm: 'up', lean: 1, lf: [2, 0], lb: [-2, 0], tx: -2 }), poseS({ arm: 'up', lean: 1, lf: [2, 0], lb: [-2, 0], tx: -2, ty: -1 })],
    strike: [poseS({ arm: 'up', lean: 2, lf: [3, 0], lb: [-2, 0], tx: -2, by: 1 }), poseS({ af: [2, -1], lean: 1, lf: [2, 0], lb: [-1, 0], tx: -1 })],
    hurt: [poseS({ lean: -1, af: [-2, -1], ab: [-2, -1], blink: true, tx: 1, ty: -1, by: 1 })],
    crouch: [poseS({ by: 3, hy: 1, lf: [1, -1], lb: [-1, -1], af: [1, -2], tx: 1, ear: true })],
    jump: jumpS,
  };

  return {
    down: { walk: walkDU('d'), idle: idleDU('d'), jump: jumpDU('d') },
    up: { walk: walkDU('u'), idle: idleDU('u'), jump: jumpDU('u') },
    side: { walk: walkS, idle: idleS, jump: jumpS },
    combat,
  };
  }
  G.PROTA = Object.assign(build(), { PAL, build });
})();
