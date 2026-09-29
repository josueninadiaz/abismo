'use strict';
// ─── Soren: su hoja de sprites (frente, espalda, perfil y agachado) convertida en piezas animadas ───
// El dibujo base es el de la hoja original (capa de cuero, cara en 3/4, bigotes cian, cola en damero).
// Cada pose se parte en zonas (cabeza, cuerpo, capa, brazos, piernas, cola) que se mueven por separado;
// al componer se añade un contorno fino para que no se pierda sobre el suelo oscuro.
(function () {
  const PAL = {
    K: '#021820', k: '#042c3a', r: '#03222e', d: '#0b4858', t: '#0f6573', T: '#22a2a8',
    w: '#ffffff', W: '#e7e7e8', s: '#d2d3d4', n: '#0c2030',
    c: '#03fcd1', C: '#1fcbae', M: '#0d6a5c', e: '#e8fff6',
    b: '#927e6b', h: '#a48d73', B: '#6e5e4e',
  };
  const BASE = {
    front: [
      '..ww...............',
      '..dww......k.......',
      '..ddkk....kkd......',
      '..dkktkkktkkd......',
      '..kkwkkkkkwkk......',
      '.kkkWWkkkWWkkk.....',
      'ckwWcwWWWWWWwkc....',
      '.ckWcwcWssswkc.....',
      '..ckWWWWWWWkc......',
      '.ckwwWWkWWwwkc.....',
      '...tkwswswkt.......',
      '..bbkkwwwkkbb......',
      '.bhhhkkkkkhhhb.....',
      '.bkkkbhwhbkkkb.....',
      '.kkktkdddktkkk.....',
      '.kkktdddddtkkk.....',
      '.kkktdtdddtkkk.....',
      '.kkktddtddtkkk.....',
      '.kkktdtdddtkkk.....',
      '.kkktddtddtkkk.....',
      '.CCktdddddtkCC.....',
      '.bCCdttdttdCCb..c..',
      '..hkkddtddkkh.cckc.',
      '..bkkkdtdkkktkkkc..',
      '...kkkktkkkktkkkkc.',
      '....kkktkkktkkkkc..',
      '...kkkk.kkkktkk....',
      '...kkkk.kkkk.......',
      '..kkkkk.kkkkk......',
      '..CCCk...kCCC......',
    ],
    back: [
      '...............ww..',
      '.......k......www..',
      '......kkk....kkkw..',
      '......kktttttttkk..',
      '......ktkkkkkkktk..',
      '.....kkkkktkkkkkkk.',
      '....ckkkktkkkkkkkkc',
      '.....ckkkktkkkkkkc.',
      '......ckkkkkkkkkc..',
      '.....ckkkkkkkkkkkc.',
      '.......tkkkkkkkt...',
      '......bbbkkkkkbbb..',
      '.....bhhhbbkbbhhhb.',
      '.....bbhhhhbhhhhbb.',
      '.....bhbhhhhhhhbhb.',
      '.....bhhbbhhhbbhhb.',
      '.....bhhhhbbbhhhhb.',
      '.....bhhbhhhhhbhhb.',
      '.....bhbhhhbhhhbhb.',
      '.....bhbhhhbhhhbhb.',
      '.....bbhhhhbhhhhbb.',
      '..c..bhhhhbhhhhhhb.',
      '.ckcc.bhhbkbhbhhb..',
      '..ckkkkbbkkbbkbb...',
      '.ckkkkkkbkkbkkbb...',
      '..ckkkkkkkttkkb....',
      '....kkkkktk.kkkk...',
      '.......ttkk.kkkk...',
      '......kkkkk.kkkkk..',
      '......kkkk...kkkk..',
    ],
    right: [
      '.............w.......',
      '............wd.......',
      '...........kdd.k.....',
      '...........kkttt.....',
      '..........kkkwkkk....',
      '..........kkkWWWWk...',
      '........kkkwWWtcwW...',
      '.........kkkwWWcwWWk.',
      '..........kkkwWWWWWs.',
      '.........kkkwwwwwwsw.',
      '..........kkkkkkwww..',
      '..........kbbbbbbk...',
      '..........bhhhhhhb...',
      '.........bhbbbbbdhw..',
      '.........bhktkktddt..',
      '.........bktkkktdddt.',
      '........bhktkkktddt..',
      '........bkktkkktddt..',
      '........bkkktkkktd...',
      '.c......btkktkkktd...',
      'ckc.....btkktkkCtd...',
      '.ckcc...bktkktCCt....',
      'ckkkkk..kkktkkttd....',
      '.ckkkkkkkkktkkkdd....',
      '.ckkkkkkkkk.kkkkk....',
      '..cckkkkkk..kkkkk....',
      '....kkkk....kkkk.....',
      '............kkkkk....',
      '.............kkkkC...',
      '.............kkkCC...',
    ],
    crouch: [
      '...............w.......',
      '..............wd.......',
      '.............kdd.k.....',
      '.............kkttt.....',
      '............kkkWkkk....',
      '............kkkWWWWk...',
      '..........kkkwWWtcwW...',
      '...........kkkwWWcwWWk.',
      '..........bkkkkwWWWWWs.',
      '.........bhbbkwwwwwwsw.',
      '........bhhhhbbkkkwww..',
      '.......bhtkkthhbbk.....',
      '.......btkkktddhbw.....',
      '......bhtkkkktddt......',
      '......bkktkkkktt.......',
      '.....bhkkktkkkkt.......',
      '.....bhkkkktkkkCt......',
      '....kbktkkkktkCCt......',
      '...kkbk.ttttdttt.......',
      '..kkkkk.ddddkkkk.......',
      '.ckkkk.kkkkkkk.........',
      'ckkkkk.kkkk............',
      'kckkk..kkkkC...........',
      'c.cc....kkCC...........',
    ],
  };
  const W = 30, H = 32, OY = 1;
  const OX = { front: 7, back: 4, right: 1, crouch: 2 };

  // zonas de cada vista (en coordenadas de la hoja)
  const REGION = {
    front: (x, y) => (y <= 10 ? 'head' : y >= 21 && y <= 25 && x >= 14 ? 'tail' : y >= 26 ? (x <= 7 ? 'legL' : 'legR') : y >= 14 && y <= 22 && x <= 3 ? 'armL' : y >= 14 && y <= 22 && x >= 11 && x <= 13 ? 'armR' : 'body'),
    back: (x, y) => (y <= 10 ? 'head' : y >= 20 && y <= 25 && x <= 5 ? 'tail' : y >= 26 ? (x <= 10 ? 'legL' : 'legR') : y >= 17 ? 'cloak' : 'body'),
    right: (x, y) => (y <= 10 ? 'head' : y >= 18 && y <= 26 && x <= 7 ? 'tail' : y >= 24 && x >= 11 ? 'leg' : y >= 19 && y <= 21 && x >= 13 && x <= 15 ? 'arm' : 'body'),
    crouch: () => 'all',
  };
  // parpadeo, oreja y marcas de la tribu / cristales del pilar (en coordenadas de la hoja)
  const BLINK = { front: [[4, 6, 'W'], [4, 7, 'n'], [6, 7, 'n']], right: [[15, 6, 'W'], [15, 7, 'n']], crouch: [[17, 6, 'W'], [17, 7, 'n']] };
  const EAR = { front: [[2, 0, '.'], [3, 0, '.'], [3, 1, 'w']], back: [[15, 0, '.'], [16, 0, '.'], [15, 1, 'w']], right: [[13, 0, '.'], [13, 1, 'w']] };
  const MARKS = {
    front: [[6, 3], [8, 3], [7, 4], [9, 8], [10, 9], [2, 16], [2, 17], [12, 16], [12, 17]],
    back: [[8, 6], [10, 6], [9, 7]],
    right: [[11, 3], [12, 4], [11, 5], [17, 9], [13, 16], [13, 17]],
    crouch: [[13, 3], [14, 4], [13, 5]],
  };
  const CRYST = {
    front: [[1, 12, 'X'], [2, 11, 'E'], [3, 11, 'X'], [11, 11, 'X'], [12, 11, 'E'], [13, 12, 'X']],
    back: [[6, 11, 'X'], [7, 10, 'E'], [8, 11, 'X'], [14, 11, 'X'], [15, 10, 'E'], [16, 11, 'X']],
    right: [[11, 11, 'E'], [12, 10, 'X'], [13, 11, 'X'], [10, 12, 'X']],
    crouch: [[10, 8, 'E'], [11, 7, 'X'], [9, 9, 'X']],
  };
  // piezas extra para el combate (perfil, mirando a la derecha; coordenadas de la hoja)
  const EXTRA = {
    armUp: ['kkkkkCCh.', 'kdkkkCChh'],
    armUpB: ['rrrrrMMb.', 'rrrrrMMbb'],
    armRaise: ['..hh', '..hC', '..CC', '.kk.', '.kk.', 'kdk.', 'kk..'],
    armGuard: ['CCh', 'kCC', 'kk.', 'kdk', '.kk'],
    legKick: ['kkkk....', 'kkkkkkCC', '..kkkkCC'],
    legSweep: ['kkkkkkkCC', '.kkkkkkCC'],
  };

  function build(mod = {}) {
    // prepara cada vista (con marcas / cristales si es un habitante) y la parte en piezas
    const parts = {}, extras = {};
    for (const v in BASE) {
      const rows = BASE[v].map((r) => r.split(''));
      const put = (list, ch) => { for (const [x, y, c] of list) if (rows[y] && rows[y][x] && rows[y][x] !== '.') rows[y][x] = c || ch; else if (rows[y] && c) rows[y][x] = c; };
      if (mod.marks) put(MARKS[v], 'x');
      if (mod.crystals) put(CRYST[v]);
      const P = (parts[v] = {});
      rows.forEach((r, y) => r.forEach((ch, x) => {
        if (ch === '.') return;
        const k = REGION[v](x, y);
        (P[k] = P[k] || []).push([x + OX[v], y + OY, ch]);
      }));
    }
    for (const k in EXTRA) extras[k] = EXTRA[k];

    const blank = () => Array.from({ length: H }, () => Array(W).fill('.'));
    const stamp = (g, pts, dx = 0, dy = 0, map) => { for (const [x, y, ch] of pts || []) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H) g[Y][X] = map ? map[ch] || ch : ch; } };
    const stampRows = (g, rows, x0, y0) => rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.') { const X = x0 + i, Y = y0 + j; if (X >= 0 && Y >= 0 && X < W && Y < H) g[Y][X] = r[i]; } });
    const pts = (g, list, v, dx, dy) => { for (const [x, y, ch] of list || []) { const X = x + OX[v] + dx, Y = y + OY + dy; if (g[Y] && X >= 0 && X < W && g[Y][X] !== '.') g[Y][X] = ch; } };
    // contorno fino
    function finish(g) {
      const out = g.map((r) => r.slice());
      const solid = (x, y) => y >= 0 && y < H && x >= 0 && x < W && g[y][x] !== '.';
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === '.' && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) out[y][x] = 'K';
      return out.map((r) => r.join(''));
    }
    const DARK = { k: 'r', d: 'r', t: 'r', C: 'M', c: 'M', b: 'B', h: 'B' };

    // frente: o = { by, hy, al, ar, ll: [dy, dx], lr, tx, blink, ear }
    function poseD(o = {}) {
      const g = blank(), P = parts.front, by = o.by || 0, hy = by + (o.hy || 0);
      stamp(g, P.tail, o.tx || 0, by);
      stamp(g, P.legL, o.ll ? o.ll[1] : 0, o.ll ? o.ll[0] : 0);
      stamp(g, P.legR, o.lr ? o.lr[1] : 0, o.lr ? o.lr[0] : 0);
      stamp(g, P.body, 0, by);
      stamp(g, P.armL, 0, by + (o.al || 0));
      stamp(g, P.armR, 0, by + (o.ar || 0));
      stamp(g, P.head, 0, hy);
      if (o.ear) pts(g, EAR.front, 'front', 0, hy);
      if (o.blink) pts(g, BLINK.front, 'front', 0, hy);
      return finish(g);
    }
    // espalda: la capa se mece al andar
    function poseU(o = {}) {
      const g = blank(), P = parts.back, by = o.by || 0, hy = by + (o.hy || 0);
      stamp(g, P.legL, o.ll ? o.ll[1] : 0, o.ll ? o.ll[0] : 0);
      stamp(g, P.legR, o.lr ? o.lr[1] : 0, o.lr ? o.lr[0] : 0);
      stamp(g, P.body, 0, by);
      stamp(g, P.cloak, o.cl || 0, by);
      stamp(g, P.head, 0, hy);
      stamp(g, P.tail, o.tx || 0, by);
      if (o.ear) pts(g, EAR.back, 'back', 0, hy);
      return finish(g);
    }
    // perfil (derecha): o = { by, hy, bx, lf: [dx, dy], lb, af, tail: [dx, dy], arm, leg, blink, ear }
    function poseR(o = {}) {
      const g = blank(), P = parts.right, by = o.by || 0, hy = by + (o.hy || 0), bx = o.bx || 0, ox = OX.right;
      stamp(g, P.tail, bx + (o.tail ? o.tail[0] : 0), by + (o.tail ? o.tail[1] : 0));
      if (o.arm === 'upB') stampRows(g, EXTRA.armUpB, ox + 14 + bx, OY + 15 + by);
      if (o.leg !== 'kick') {
        stamp(g, P.leg, -2 + (o.lb ? o.lb[0] : 0), o.lb ? o.lb[1] : 0, DARK); // la pierna de atrás, más oscura
        stamp(g, P.leg, o.lf ? o.lf[0] : 0, o.lf ? o.lf[1] : 0);
      } else stamp(g, P.leg, -3, -1, DARK);
      stamp(g, P.body, bx, by);
      if (o.leg === 'kick') stampRows(g, EXTRA.legKick, ox + 14 + bx, OY + 21 + by);
      if (!o.arm || o.arm === 'upB') stamp(g, P.arm, bx + (o.af ? o.af[0] : 0), by + (o.af ? o.af[1] : 0));
      if (o.arm === 'up') stampRows(g, EXTRA.armUp, ox + 14 + bx, OY + 14 + by);
      stamp(g, P.head, bx + (o.hx || 0), hy);
      if (o.arm === 'raise') stampRows(g, EXTRA.armRaise, ox + 17 + bx, OY + 5 + by);
      if (o.arm === 'high') stampRows(g, EXTRA.armRaise, ox + 16 + bx, OY + 1 + by);
      if (o.arm === 'guard') stampRows(g, EXTRA.armGuard, ox + 18 + bx, OY + 8 + by);
      if (o.ear) pts(g, EAR.right, 'right', bx + (o.hx || 0), hy);
      if (o.blink) pts(g, BLINK.right, 'right', bx + (o.hx || 0), hy);
      return finish(g);
    }
    // agachado (su propia pose de la hoja)
    function poseC(o = {}) {
      const g = blank(), ox = OX.crouch;
      stamp(g, parts.crouch.all, o.bx || 0, o.by || 0);
      if (o.sweep) stampRows(g, EXTRA.legSweep, ox + 15, OY + 21);
      if (o.guard) stampRows(g, EXTRA.armGuard, ox + 20, OY + 9);
      if (o.blink) pts(g, BLINK.crouch, 'crouch', o.bx || 0, o.by || 0);
      return finish(g);
    }

    // ── animaciones ──
    const walkD = [
      poseD({ al: 1, ar: -1, ll: [-1, 0], tx: 1 }), poseD({ by: -1, ll: [-2, 0], tx: 1, ear: true }), poseD({ al: -1, ar: 1, tx: 0 }),
      poseD({ al: -1, ar: 1, lr: [-1, 0], tx: -1 }), poseD({ by: -1, lr: [-2, 0], tx: -1, ear: true }), poseD({ al: 1, ar: -1, tx: 0 }),
    ];
    const idleD = [poseD(), poseD({ tx: 1 }), poseD({ by: 1, hy: -1, tx: 1 }), poseD({ by: 1, hy: -1 }), poseD({ tx: -1 }), poseD({ tx: -1, blink: true }), poseD(), poseD({ ear: true, tx: 1 })];
    const jumpD = [poseD({ by: -1, al: -3, ar: -3, ll: [-3, 1], lr: [-3, -1], tx: 1, ear: true }), poseD({ al: -1, ar: -1, ll: [-1, 0], lr: [-1, 0], tx: -1 })];
    const walkU = [
      poseU({ ll: [-1, 0], cl: 1, tx: -1 }), poseU({ by: -1, ll: [-2, 0], cl: 1, tx: -1, ear: true }), poseU({ cl: 0 }),
      poseU({ lr: [-1, 0], cl: -1, tx: 1 }), poseU({ by: -1, lr: [-2, 0], cl: -1, tx: 1, ear: true }), poseU({ cl: 0 }),
    ];
    const idleU = [poseU(), poseU({ tx: -1 }), poseU({ by: 1, hy: -1, tx: -1 }), poseU({ by: 1, hy: -1, cl: 1 }), poseU({ tx: 1 }), poseU({ tx: 1 }), poseU(), poseU({ ear: true })];
    const jumpU = [poseU({ by: -1, ll: [-3, 1], lr: [-3, -1], cl: -1, tx: -1, ear: true }), poseU({ ll: [-1, 0], lr: [-1, 0], cl: 1, tx: 1 })];
    const walkR = [
      poseR({ lf: [2, 0], lb: [-2, 0], af: [-1, 0], tail: [0, 0] }), poseR({ by: -1, lf: [1, -1], lb: [-1, 0], tail: [-1, 1], ear: true }), poseR({ lb: [0, -1], af: [1, 0], tail: [-1, 1] }),
      poseR({ lf: [-2, 0], lb: [2, 0], af: [1, 0], tail: [0, 0] }), poseR({ by: -1, lf: [-1, 0], lb: [1, -1], tail: [1, -1], ear: true }), poseR({ lf: [0, -1], af: [-1, 0], tail: [1, -1] }),
    ];
    const idleR = [poseR(), poseR({ tail: [-1, 0] }), poseR({ by: 1, hy: -1, tail: [-1, 1] }), poseR({ by: 1, hy: -1, tail: [0, 1] }), poseR({ tail: [1, 0] }), poseR({ tail: [1, 0], blink: true }), poseR(), poseR({ ear: true, tail: [-1, 0] })];
    const jumpR = [poseR({ by: -1, hy: -1, lf: [1, -3], lb: [-1, -2], af: [1, -2], tail: [-1, -2], ear: true }), poseR({ lf: [1, -1], lb: [-2, 0], af: [1, -1], tail: [1, 1] })];
    // combate (de perfil)
    const combat = {
      idle: [poseR(), poseR({ tail: [-1, 0] }), poseR({ by: 1, hy: -1, tail: [-1, 1] }), poseR({ by: 1, hy: -1 })],
      walk: walkR,
      jump: jumpR,
      crouch: [poseC()],
      raise: [poseR({ arm: 'raise' }), poseR({ arm: 'raise', by: -1, ear: true, tail: [-1, 0] })],
      cast: [poseR({ arm: 'up', bx: 1, lf: [2, 0], lb: [-2, 0], tail: [-2, 0] }), poseR({ arm: 'up', bx: 1, lf: [2, 0], lb: [-2, 0], tail: [-2, -1] })],
      strike: [poseR({ arm: 'up', bx: 2, lf: [3, 0], lb: [-2, 0], tail: [-2, 0], by: 1 })],
      hurt: [poseR({ bx: -1, hx: -1, af: [-2, -1], blink: true, tail: [1, -1], by: 1 })],
      guard: [poseR({ arm: 'guard', bx: -1, lf: [1, 0], lb: [-2, 0], tail: [1, 0] })],
      cguard: [poseC({ guard: true })],
      jab1: [poseR({ arm: 'up', bx: 1, lf: [2, 0], lb: [-2, 0], tail: [-1, 0] })],
      jab2: [poseR({ arm: 'upB', bx: 1, lf: [2, 0], lb: [-2, 0], tail: [-1, 0] })],
      gancho: [poseR({ arm: 'high', bx: 1, by: -1, lf: [1, -1], lb: [-2, 0], tail: [-2, -1], ear: true })],
      kick: [poseR({ leg: 'kick', bx: -1, af: [-1, -1], tail: [1, 1] })],
      sweep: [poseC({ sweep: true })],
      airkick: [poseR({ leg: 'kick', by: -1, bx: -1, af: [-1, -2], tail: [1, -2], ear: true })],
      dash: [poseR({ bx: 2, hx: 1, lf: [3, -1], lb: [-3, 0], af: [-2, 0], tail: [-3, -1], ear: true })],
      win: [poseR({ arm: 'high', hy: -1, ear: true, tail: [-1, -2] }), poseR({ arm: 'high', tail: [1, -1] })],
    };
    return {
      down: { walk: walkD, idle: idleD, jump: jumpD },
      up: { walk: walkU, idle: idleU, jump: jumpU },
      side: { walk: walkR, idle: idleR, jump: jumpR },
      combat,
    };
  }
  G.PROTA = Object.assign(build(), { PAL, build });
})();
