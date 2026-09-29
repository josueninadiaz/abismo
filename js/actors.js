'use strict';
// ─── Personajes: el protagonista y los habitantes del Abismo ───
// Todos salen del mismo esqueleto de piezas (js/prota.js): los habitantes son el mismo pueblo,
// con otros colores, las marcas que el protagonista no tiene y, si están infectados, cristales del pilar.
(function () {
  const A = G.ART;
  const BASE = G.PROTA.PAL;

  // G.SPR[name] = { down, up, right, left: [caminar ×6], idle: { down, up, right, left: [quieto ×8] }, cb: {…combate} }
  function makeSet(name, frames, pal) {
    const spr = (rows) => G.sprite(rows, pal);
    const set = {
      down: frames.down.walk.map(spr), up: frames.up.walk.map(spr),
      right: frames.side.walk.map(spr),
      idle: { down: frames.down.idle.map(spr), up: frames.up.idle.map(spr), right: frames.side.idle.map(spr) },
    };
    set.jump = { down: frames.down.jump.map(spr), up: frames.up.jump.map(spr), right: frames.side.jump.map(spr) };
    set.left = set.right.map(G.flipSpr);
    set.idle.left = set.idle.right.map(G.flipSpr);
    set.jump.left = set.jump.right.map(G.flipSpr);
    G.SPR[name] = set;
    return set;
  }
  makeSet('prota', G.PROTA, BASE);
  // animaciones de combate del protagonista (mirando a la derecha; la izquierda es su espejo)
  G.SPR.prota_cb = {};
  for (const k in G.PROTA.combat) {
    const r = G.PROTA.combat[k].map((rows) => G.sprite(rows, BASE));
    G.SPR.prota_cb[k] = { right: r, left: r.map(G.flipSpr) };
  }

  const MARKED = G.PROTA.build({ marks: true });
  const INFECTED = G.PROTA.build({ marks: true, crystals: true });
  const variant = (name, o) => makeSet(name, o.crystals ? INFECTED : o.marks === false ? G.PROTA : MARKED, Object.assign({}, BASE, o.pal));
  const INFECT = { c: '#ff5a6a', C: '#b02a44', M: '#6a1a2a', X: '#ff8a9a', E: '#ffd0da', e: '#ffd0d8' };

  // Mira: joven de la tribu, curiosa; marcas azules
  variant('mira', { pal: { k: '#2a2a44', r: '#222238', d: '#3a3a5e', t: '#56548a', T: '#7a78b0', h: '#b8a6d8', b: '#8a78b0', B: '#5e4e84', x: '#7ac8ff' } });
  // la anciana Suen: pelaje gris, ropa parda, marcas ámbar
  variant('suen', { pal: { k: '#3a3a40', r: '#2e2e34', d: '#4a4a52', t: '#6a5a48', T: '#8a7a62', w: '#e6e0d6', W: '#cfc8bc', h: '#d8c8a0', b: '#a89878', B: '#786848', x: '#ffc86a', c: '#ffe8a0', C: '#c8a060', M: '#8a7040' } });
  // habitantes
  variant('aldeano1', { pal: { k: '#2a2620', r: '#221e1a', d: '#3e3628', t: '#5a4e38', T: '#7a6a4a', x: '#8affc8' } });
  variant('aldeano2', { pal: { k: '#1a2a24', r: '#14221c', d: '#26403a', t: '#3a6a58', T: '#5a8a70', h: '#d0c0a0', x: '#c8a0ff' } });
  variant('guardia', { pal: { k: '#181c24', r: '#12161c', d: '#262c3a', t: '#3a4458', T: '#56647e', h: '#8a8a9a', b: '#5a5a6a', B: '#3a3a48', x: '#6ae0ff' } });
  // Varek, el nuevo líder: rojo del pilar en la ropa y marcas que ya se tiñen
  variant('varek', { crystals: true, pal: { k: '#241624', r: '#1c101c', d: '#3a1e34', t: '#5a2a44', T: '#8a3a5a', h: '#e0c8b0', b: '#a0303e', B: '#6a1a2a', x: '#ff6a8a', X: '#ff8a9a', E: '#ffd0da' } });
  // habitante infectado: ojos y marcas rojos, cristales en los hombros
  variant('infectado', { crystals: true, pal: Object.assign({ k: '#221a22', r: '#1a141a', d: '#322630', t: '#4a3440', T: '#6a4a58', w: '#d8ccd0', W: '#c0b4b8', x: '#ff4a5a' }, INFECT) });
  // Oren, el antiguo líder: capa clara, cubierto de cuarzo
  const OREN = { k: '#2a2e3a', r: '#22262e', d: '#3a4050', t: '#6a6270', T: '#9a90a0', w: '#f0ece6', h: '#e8dcc0', b: '#c0a870', B: '#8a7440', x: '#ffd890' };
  variant('oren', { crystals: true, pal: Object.assign({}, OREN, INFECT, { x: '#ff4a5a' }) });
  variant('oren_libre', { pal: Object.assign({}, OREN, { c: '#ffe8a0', C: '#c8a060', M: '#8a7040' }) });
  // Tharn, guardián del Claro: armadura de bronce oscuro
  const THARN = { k: '#1c1e28', r: '#16181f', d: '#2a2c3a', t: '#4a4034', T: '#6a5a44', h: '#b89a6a', b: '#8a6a3a', B: '#5a4424', w: '#dcd6cc', W: '#c4beb4' };
  variant('tharn', { crystals: true, pal: Object.assign({}, THARN, INFECT, { x: '#ff4a5a' }) });
  variant('tharn_libre', { pal: Object.assign({}, THARN, { x: '#6affd0' }) });
  // eco de un alma antigua: pálida, casi transparente
  variant('alma', { pal: { K: '#8aa0c8', k: '#a8c0e0', r: '#9ab0d0', d: '#bcd0ec', t: '#d0e0f6', T: '#e8f0ff', w: '#ffffff', W: '#e0eaf6', s: '#d0dcea', S: '#b0c0d8', n: '#8aa0c8', h: '#f0f4ff', b: '#d0dcf0', B: '#b0c0dc', c: '#ffffff', C: '#e0f0ff', M: '#c0d8f0', x: '#ffe8a0', e: '#ffffff' } });

  // el protagonista tumbado (al despertar y al caer en combate)
  const lie = G.SPR.prota.idle.right[0];
  const rot = (cv) => {
    if (!cv) return null;
    const c = G.makeCanvas(cv.height, cv.width), x = c.getContext('2d');
    x.translate(c.width, 0); x.rotate(Math.PI / 2); x.drawImage(cv, 0, 0);
    return c;
  };
  G.SPR.prota_lie = { c: rot(lie.c), e: rot(lie.e), w: lie.h, h: lie.w };

  for (const k of ['planta', 'planta_off', 'hongo', 'hongos', 'roja', 'roja_flor', 'farol', 'memoria', 'polilla1', 'polilla2', 'grillo1', 'grillo2', 'pez', 'murci1', 'murci2', 'planta_azul', 'planta_verde', 'planta_morada', 'hongo_rojo', 'mapa_pared', 'inscripcion', 'artefacto', 'artefacto_off']) G.makeStatic(k, A[k]);
})();
