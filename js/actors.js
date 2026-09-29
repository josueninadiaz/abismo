'use strict';
// ─── Personajes: el protagonista y los habitantes del Abismo (variantes de color con marcas) ───
(function () {
  const A = G.ART;
  const VIEWS = {
    down: { rows: A.prota_down.rows, legY: 31, split: 10 },
    up: { rows: A.prota_up.rows, legY: 32, split: 10 },
    side: { rows: A.prota_side.rows, legY: 32, split: 10 },
  };
  G.makeActor('prota', VIEWS, G.PAL_PROTA);

  // posiciones de las marcas en cada vista (frente, espalda, perfil)
  const MARKS = {
    down: [[10, 6], [11, 6], [10, 7], [11, 7], [5, 13], [6, 14], [15, 13], [14, 14], [2, 22], [2, 23], [2, 24], [18, 22], [18, 23], [18, 24]],
    up: [[10, 8], [11, 8], [10, 9], [11, 9], [9, 11], [12, 11], [2, 22], [2, 23], [2, 24], [17, 22], [17, 23], [17, 24]],
    side: [[11, 7], [12, 7], [11, 8], [13, 13], [12, 14], [7, 22], [7, 23], [7, 24]],
  };
  // cristales del pilar sobre los hombros de los infectados
  const CRYST = {
    down: [[3, 17], [2, 18], [3, 18], [18, 17], [18, 18], [19, 18], [4, 16]],
    up: [[3, 17], [2, 18], [3, 18], [17, 17], [17, 18], [18, 18]],
    side: [[2, 17], [3, 17], [2, 16], [1, 18], [4, 16]],
  };
  // variantes: colores del pelaje, la cara, la ropa y las marcas
  function variant(name, o) {
    const pal = Object.assign({}, G.PAL_PROTA, o.pal || {});
    const views = {};
    for (const dir of ['down', 'up', 'side']) {
      let rows = VIEWS[dir].rows;
      if (o.marks !== false) rows = G.overlay(rows, MARKS[dir].map(([x, y]) => [x, y, 'x']));
      if (o.crystals) rows = G.overlay(rows, CRYST[dir].map(([x, y], i) => [x, y, i % 3 ? 'X' : 'E']));
      views[dir] = Object.assign({}, VIEWS[dir], { rows });
    }
    return G.makeActor(name, views, pal);
  }
  const INFECT = { c: '#ff5a6a', C: '#b02a44', X: '#ff8a9a', E: '#ffd0da' };

  // Mira: joven de la tribu, curiosa; marcas azules
  variant('mira', { pal: { n: '#2a2a44', d: '#3a3a5e', t: '#56548a', T: '#7a78b0', y: '#b8a6d8', b: '#8a78b0', B: '#5e4e84', x: '#7ac8ff', p: '#6a4a6a' } });
  // la anciana Suen: pelaje gris, ropa parda, marcas ámbar
  variant('suen', { pal: { n: '#3a3a40', d: '#4a4a52', t: '#6a5a48', T: '#8a7a62', w: '#e6e0d6', W: '#b8b0a4', y: '#d8c8a0', b: '#a89878', B: '#786848', x: '#ffc86a', c: '#ffe8a0', C: '#c8a060' } });
  // habitantes
  variant('aldeano1', { pal: { n: '#2a2620', d: '#3e3628', t: '#5a4e38', T: '#7a6a4a', x: '#8affc8' } });
  variant('aldeano2', { pal: { n: '#1a2a24', d: '#26403a', t: '#3a6a58', T: '#5a8a70', y: '#d0c0a0', x: '#c8a0ff' } });
  variant('guardia', { pal: { n: '#181c24', d: '#262c3a', t: '#3a4458', T: '#56647e', y: '#8a8a9a', b: '#5a5a6a', B: '#3a3a48', x: '#6ae0ff' } });
  // Varek, el nuevo líder: rojo del pilar en la ropa y marcas que ya se tiñen
  variant('varek', { crystals: true, pal: Object.assign({ n: '#241624', d: '#3a1e34', t: '#5a2a44', T: '#8a3a5a', y: '#e0c8b0', b: '#a0303e', B: '#6a1a2a', x: '#ff6a8a' }, { X: '#ff8a9a', E: '#ffd0da' }) });
  // habitante infectado: ojos y marcas rojos, cristales en los hombros
  variant('infectado', { crystals: true, pal: Object.assign({ n: '#221a22', d: '#322630', t: '#4a3440', T: '#6a4a58', w: '#d8ccd0', W: '#a898a0', x: '#ff4a5a' }, INFECT) });
  // Oren, el antiguo líder: capa clara, cubierto de cuarzo
  const OREN = { n: '#2a2e3a', d: '#3a4050', t: '#6a6270', T: '#9a90a0', w: '#f0ece6', y: '#e8dcc0', b: '#c0a870', B: '#8a7440', x: '#ffd890' };
  variant('oren', { crystals: true, pal: Object.assign({}, OREN, INFECT, { x: '#ff4a5a' }) });
  variant('oren_libre', { pal: Object.assign({}, OREN, { c: '#ffe8a0', C: '#c8a060' }) });
  // Tharn, guardián del Claro: armadura de bronce oscuro
  const THARN = { n: '#1c1e28', d: '#2a2c3a', t: '#4a4034', T: '#6a5a44', y: '#b89a6a', b: '#8a6a3a', B: '#5a4424', w: '#dcd6cc', W: '#a8a098' };
  variant('tharn', { crystals: true, pal: Object.assign({}, THARN, INFECT, { x: '#ff4a5a' }) });
  variant('tharn_libre', { pal: Object.assign({}, THARN, { x: '#6affd0' }) });
  // eco de un alma antigua: pálida, casi transparente
  variant('alma', { pal: { k: '#6a80a8', n: '#a8c0e0', d: '#bcd0ec', t: '#d0e0f6', T: '#e8f0ff', w: '#ffffff', W: '#e0eaf6', g: '#c0d0e0', y: '#f0f4ff', b: '#d0dcf0', B: '#b0c0dc', p: '#c0cce0', c: '#ffffff', C: '#e0f0ff', x: '#ffe8a0' } });

  // el protagonista tumbado (al despertar)
  const lie = G.SPR.prota.right[0];
  const rot = (cv) => {
    if (!cv) return null;
    const c = G.makeCanvas(cv.height, cv.width), x = c.getContext('2d');
    x.translate(c.width, 0); x.rotate(Math.PI / 2); x.drawImage(cv, 0, 0);
    return c;
  };
  G.SPR.prota_lie = { c: rot(lie.c), e: rot(lie.e), w: lie.h, h: lie.w };

  for (const k of ['planta', 'planta_off', 'hongo', 'hongos', 'roja', 'roja_flor', 'farol', 'memoria', 'polilla1', 'polilla2', 'grillo1', 'grillo2', 'pez', 'murci1', 'murci2']) G.makeStatic(k, A[k]);
})();
