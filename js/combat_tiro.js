'use strict';
// ─── Combate «a la Cuphead»: correr, saltar y disparar contra un jefe enorme ───
// Soren dispara chispas de luz (mantén [a]), salta, embiste y se agacha. Los cristales cian se pueden PARAR:
// salta y pulsa salto otra vez al tocarlos para rebotar y cargar una carta de Resonancia. [b] gasta una carta en un disparo potente.
// Tres golpes y caes. El jefe tiene fases; al final de cada una queda en trance y hay que purificarlo con el sello.
(function () {
  const L = G.CBLIB, CW = L.CW, CH = L.CH, FLOOR = 124;
  const CB = { active: false };
  G.CBS = G.CBS || {}; G.CBS.tiro = CB;
  const g = G.R.flatctx;
  const nameOf = (id) => G.UI.SKILLS.find((s) => s[0] === id)[1];
  const COL = { mente: '#8ad8ff', recuerdos: '#ffd070', cuerpo: '#ff8a7a', alma: '#c8a0ff', ser: '#ffffff' };

  const FIGHTS = {
    tharn: {
      name: 'Tharn', title: 'Guardián del Claro', rig: 'tharn', bg: 'claro', music: 'tiro', scale: 1.35, crystals: 5,
      phases: [
        { seal: 'mente', hp: 200, attacks: ['piso', 'esquirlas', 'zarpazo'], gap: [50, 90] },
        { seal: 'recuerdos', hp: 240, attacks: ['raices', 'lluvia', 'salto', 'piso', 'esquirlas'], gap: [40, 70] },
      ],
      barks: [['¡Sin... Marca!', 'Fuera... de mi Claro...'], ['Las raíces... me sujetan...', '¡No... quiero... recordar!']],
    },
  };

  let P, B, def, ph, st, stT, onEnd, bullets, shots, fx, floats, banner, freeze, film;
  CB.start = (id, done) => {
    def = FIGHTS[id]; onEnd = done;
    CB.active = true; CB.id = id; CB.finished = false; CB.busy = false; CB.t = 0;
    P = { x: 50, y: 0, vx: 0, vy: 0, face: 1, hp: 3, inv: 0, st: 'idle', t: 0, anim: 0, fire: 0, cards: 0, meter: 0, parried: false, dash: 0, dcd: 0 };
    B = { x: 205, face: -1, hp: 0, max: 1, st: 'idle', t: 0, next: 80, atk: null, crystals: def.crystals, pose: { t: 0, arm: 0, crouch: 0, lean: 0 }, hit: 0, y: 0 };
    ph = 0; startPhase();
    const bg = L.makeBg(def.bg, CW); film = { far: bg.far, near: bg.near };
    G.audio.play(def.music); G.audio.ambient(null);
    // aspecto de película antigua
    CB.lookSaved = Object.assign({}, G.R.look);
    Object.assign(G.R.look, { tint: [1.1, 1.0, 0.86], sat: 0.82, contrast: 1.14, exposure: 1.05 });
  };
  function startPhase() {
    const p = def.phases[ph];
    B.max = p.hp; B.hp = p.hp; B.st = 'idle'; B.atk = null; B.next = 90; B.t = 0;
    B.crystals = Math.max(1, Math.ceil(def.crystals * (def.phases.length - ph) / def.phases.length));
    bullets = []; shots = []; fx = fx || []; floats = floats || []; freeze = 0;
    st = 'intro'; stT = 0;
  }
  const sealNow = () => def.phases[ph].seal;
  const boxB = () => { const s = def.scale; return { x0: B.x - 24 * s, x1: B.x + 18 * s, y0: FLOOR - B.y - 82 * s, y1: FLOOR - B.y - 6 }; };
  const boxP = () => { const h = P.st === 'duck' ? 13 : 24; return { x0: P.x - 4, x1: P.x + 4, y0: FLOOR - P.y - h, y1: FLOOR - P.y - 2 }; };
  const inBox = (x, y, b, m = 0) => x > b.x0 - m && x < b.x1 + m && y > b.y0 - m && y < b.y1 + m;

  // ── Soren ──
  function playerUpdate() {
    P.t++; P.anim++;
    if (P.inv > 0) P.inv--;
    if (P.dcd > 0) P.dcd--;
    const dx = G.dir.x, down = G.dir.y > 0.45, up = G.dir.y < -0.45;
    const ground = P.y <= 0;
    if (P.st === 'hit') { P.x += P.vx; P.vx *= 0.9; if (P.t > 20) P.st = 'idle'; gravity(); return; }
    if (P.dash > 0) {
      P.dash--; P.x += P.face * 4; P.inv = Math.max(P.inv, 2);
      if (P.t % 2 === 0) fx.push({ ghost: true, x: P.x, y: P.y, life: 10 });
      clampP(); if (P.dash === 0) P.st = 'idle';
      return;
    }
    // moverse (no se mueve agachado)
    if (Math.abs(dx) > 0.25 && !(down && ground)) { P.x += Math.sign(dx) * 1.5; P.face = Math.sign(dx); P.st = ground ? 'run' : 'jump'; }
    else P.st = ground ? (down ? 'duck' : 'idle') : 'jump';
    clampP();
    // saltar / parar en el aire
    if (G.pressed('j')) {
      if (ground) { P.vy = 4.6; P.y = 0.1; P.parried = false; G.audio.sfx('jump'); }
      else if (!P.parried) tryParry();
    }
    if (G.pressed('x') && P.dcd <= 0) { P.dash = 9; P.dcd = 36; P.st = 'dash'; P.t = 0; G.audio.sfx('dodge'); return; }
    gravity();
    // disparar (mantener) en la dirección que apuntes
    let ax = P.face, ay = 0;
    if (up) { ay = -1; ax = Math.abs(dx) > 0.25 ? P.face * 0.75 : 0; if (ax) ay = -0.7; }
    if (G.held('a') && --P.fire <= 0) {
      P.fire = 7;
      const sy = FLOOR - P.y - (P.st === 'duck' ? 8 : 17);
      bullets.push({ x: P.x + ax * 8, y: sy, vx: ax * 5.5, vy: ay * 5.5, life: 70, dmg: 1 });
      if (P.anim % 2) G.audio.sfx('pew');
    }
    // disparo potente: gasta una carta
    if (G.pressed('b') && P.cards >= 1) {
      P.cards--; G.audio.sfx('mente'); G.shake = 2;
      bullets.push({ x: P.x + ax * 10, y: FLOOR - P.y - 17, vx: ax * 4, vy: ay * 4, life: 90, dmg: 14, big: true });
      burst(P.x + P.face * 10, FLOOR - P.y - 17, COL.mente, 12);
    }
    // purificar con el sello (cuando está en trance)
    if ((G.pressed('y') || ['s1', 's2', 's3', 's4', 's5'].some((k, i) => G.pressed(k) && ['mente', 'recuerdos', 'cuerpo', 'alma', 'ser'][i] === sealNow())) && B.st === 'dizzy') {
      bullets.push({ x: P.x + P.face * 10, y: FLOOR - P.y - 17, vx: P.face * 4.5, vy: 0, life: 90, dmg: 0, seal: sealNow(), big: true });
      G.audio.sfx(sealNow());
    }
  }
  function gravity() {
    if (P.y > 0 || P.vy > 0) {
      P.y += P.vy; P.vy -= 0.25;
      if (P.y <= 0) { P.y = 0; P.vy = 0; dust(P.x, 4); }
    }
  }
  function clampP() { P.x = G.clamp(P.x, 8, CW - 8); }
  function tryParry() {
    const b = boxP();
    for (const s of shots) if (s.parry && inBox(s.x, s.y, b, 10)) {
      s.life = 0; P.parried = true; P.vy = 4; P.cards = Math.min(5, P.cards + 1);
      freeze = 8; G.audio.sfx('parry'); spark(s.x, s.y, '#9affe8');
      floats.push({ x: s.x, y: s.y - 10, text: '¡PARADA!', col: '#9affe8', t: 0 });
      return;
    }
  }
  function hurtP() {
    if (P.inv > 0 || st !== 'fight') return;
    P.hp--; P.inv = 90; P.st = 'hit'; P.t = 0; P.vx = -P.face * 1.5; P.vy = 2; P.y = Math.max(P.y, 0.1);
    G.audio.sfx('hurt'); G.shake = 3; freeze = 6;
    G.R.flash.r = 1; G.R.flash.g = 0.2; G.R.flash.b = 0.3; G.R.flash.a = 0.3;
    spark(P.x, FLOOR - P.y - 14, '#ff6a7a');
    if (P.hp <= 0) { st = 'ko'; stT = 0; banner = { text: 'Te desvaneces...', t: 0, n: 90, col: '#d8c8a8', small: true }; }
  }

  // ── el jefe ──
  function bossUpdate() {
    const pose = B.pose, p = def.phases[ph];
    pose.t++; B.t++;
    if (B.hit > 0) B.hit--;
    B.face = P.x < B.x ? -1 : 1;
    if (B.st === 'dizzy') { pose.crouch = 0.6 + Math.sin(B.t * 0.1) * 0.2; pose.lean = Math.sin(B.t * 0.05) * 0.4; return; }
    if (B.st === 'atk') { runAttack(); return; }
    pose.crouch = G.lerp(pose.crouch, 0, 0.1); pose.arm = G.lerp(pose.arm, 0, 0.1); pose.lean = G.lerp(pose.lean, 0, 0.1);
    if (--B.next <= 0) {
      let k = G.pick(p.attacks);
      if (k === 'zarpazo' && Math.abs(P.x - B.x) > 90) k = 'esquirlas';
      B.atk = { k, t: 0 }; B.st = 'atk';
    }
    if (CB.t % 600 === 300) { const l = def.barks[ph]; floats.push({ x: B.x, y: FLOOR - 120, text: G.pick(l), col: '#ffd0d8', t: -60, big: true }); }
  }
  function done(extra = 0) { const gp = def.phases[ph].gap; B.st = 'idle'; B.atk = null; B.next = G.ri(gp[0], gp[1]) + extra; }
  function runAttack() {
    const a = B.atk, t = ++a.t, pose = B.pose, f = B.face, s = def.scale;
    switch (a.k) {
      case 'piso': // levanta la pata y pisa: ondas por el suelo hacia Soren
        if (t < 30) { pose.arm = G.lerp(pose.arm, 1, 0.12); pose.lean = -0.3; }
        if (t === 30 || (ph > 0 && t === 60)) { pose.arm = -0.4; pose.lean = 0.6; G.shake = 4; G.audio.sfx('boom'); dust(B.x + f * 20, 10); shots.push({ k: 'onda', x: B.x + f * 30, y: FLOOR - 5, vx: f * 2.4, vy: 0, life: 200, r: 6 }); }
        if (t > (ph > 0 ? 80 : 50)) done();
        break;
      case 'esquirlas': // lanza cristales en arco; uno brilla cian y se puede parar
        if (t < 24) pose.arm = G.lerp(pose.arm, 1, 0.15);
        if (t >= 24 && t <= 48 && t % 8 === 0) {
          const n = (t - 24) / 8, tx = P.x + G.rnd(-30, 30), fl = 50 + n * 4;
          const sx = B.x + f * 20, sy = FLOOR - 80 * s;
          shots.push({ k: 'esquirla', x: sx, y: sy, vx: (tx - sx) / fl, vy: -3.2, grav: (2 * (FLOOR - 4 - sy + 3.2 * fl)) / (fl * fl), life: 160, r: 4, parry: n === 1 || (ph > 0 && n === 3) });
          G.audio.sfx('swing');
        }
        if (t > 60) done();
        break;
      case 'zarpazo': // barrido enorme de la garra a ras de suelo
        if (t < 26) { pose.arm = G.lerp(pose.arm, 1, 0.12); pose.crouch = 0.3; if (t === 2) addWarn(B.x + f * 50, 46, 26); }
        if (t === 26) { pose.arm = -0.3; pose.lean = 1; G.audio.sfx('swing'); G.shake = 3; }
        if (t >= 26 && t < 34) { const x0 = Math.min(B.x, B.x + f * 96), x1 = Math.max(B.x, B.x + f * 96); if (P.x > x0 && P.x < x1 && P.y < 18) hurtP(); }
        if (t > 60) done();
        break;
      case 'raices': // raíces rojas que salen del suelo donde estás
        pose.arm = G.lerp(pose.arm, 0.6, 0.1);
        if (t === 1 || t === 22 || t === 44) { const x = G.clamp(P.x + G.rnd(-8, 8), 10, CW - 10); addWarn(x, 10, 30, true); a['r' + t] = x; }
        for (const k of [1, 22, 44]) if (t === k + 30) { shots.push({ k: 'raiz', x: a['r' + k], y: FLOOR, life: 40, r: 10, h: 56 }); G.audio.sfx('crystal'); G.shake = 2; }
        if (t > 100) done();
        break;
      case 'lluvia': // cristales cayendo del techo
        pose.arm = 1; pose.lean = -0.3;
        if (t > 10 && t < 140 && t % 11 === 0) { const x = G.rnd(10, CW - 10); shots.push({ k: 'cae', x, y: -8, vx: 0, vy: 2.6, life: 120, r: 4, parry: G.chance(0.22) }); }
        if (t > 160) done();
        break;
      case 'salto': { // salta al otro lado del claro y cae con estruendo
        const to = B.x > CW / 2 ? 52 : CW - 52;
        if (t === 1) { a.from = B.x; a.to = to; addWarn(to, 40, 40); pose.crouch = 1; }
        if (t > 20 && t <= 60) { const k = (t - 20) / 40; B.x = G.lerp(a.from, a.to, k); B.y = Math.sin(k * Math.PI) * 70; pose.crouch = 0.2; pose.lean = 0.4; }
        if (t === 60) { B.y = 0; G.shake = 6; G.audio.sfx('boom'); dust(B.x, 14); if (Math.abs(P.x - B.x) < 40 && P.y < 20) hurtP(); for (const d of [-1, 1]) shots.push({ k: 'onda', x: B.x + d * 30, y: FLOOR - 5, vx: d * 2.2, vy: 0, life: 160, r: 6 }); }
        if (t > 80) done();
        break;
      }
    }
  }
  function addWarn(x, w, n, root) { shots.push({ k: 'aviso', x, w, life: n, n, root }); }

  // ── balas, proyectiles y daño ──
  function stepBullets() {
    const bb = boxB();
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx; b.y += b.vy; b.life--;
      if (inBox(b.x, b.y, bb, b.big ? 4 : 0) && B.st !== 'gone') {
        b.life = 0;
        if (b.seal) { if (B.st === 'dizzy' && b.seal === sealNow()) finisher(); continue; }
        if (B.st === 'dizzy') { spark(b.x, b.y, '#ffffff'); continue; }
        B.hp = Math.max(0, B.hp - b.dmg); B.hit = 4;
        P.meter += b.big ? 0 : 1; if (P.meter >= 40) { P.meter = 0; P.cards = Math.min(5, P.cards + 1); }
        spark(b.x, b.y, b.big ? COL.mente : '#fff4d0', !b.big);
        if (b.big) { freeze = 5; G.audio.sfx('hit'); }
        if (B.hp <= 0) dizzy();
      }
      if (b.life <= 0 || b.x < -10 || b.x > CW + 10 || b.y < -10) bullets.splice(i, 1);
    }
    const pb = boxP();
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.life--;
      if (s.k === 'onda') { s.x += s.vx; if (Math.abs(s.x - P.x) < 6 && P.y < 9) hurtP(); }
      else if (s.k === 'esquirla') { s.x += s.vx; s.y += s.vy; s.vy += s.grav; if (s.y >= FLOOR - 3) { s.life = 0; burst(s.x, FLOOR - 3, s.parry ? '#9affe8' : '#ff8a9a', 6); } else if (inBox(s.x, s.y, pb, 2)) { hurtP(); s.life = 0; } }
      else if (s.k === 'cae') { s.y += s.vy; if (s.y >= FLOOR - 3) { s.life = 0; burst(s.x, FLOOR - 3, s.parry ? '#9affe8' : '#ff8a9a', 5); } else if (inBox(s.x, s.y, pb, 2)) { hurtP(); s.life = 0; } }
      else if (s.k === 'raiz') { if (s.life > 8 && Math.abs(P.x - s.x) < s.r && P.y < s.h) hurtP(); }
      if (s.life <= 0 || s.x < -20 || s.x > CW + 20) shots.splice(i, 1);
    }
  }
  function dizzy() {
    B.st = 'dizzy'; B.t = 0; B.atk = null; B.y = 0;
    shots = [];
    banner = { text: '¡PURIFÍCALO!', t: 0, n: 120, col: '#fff4d0', icon: sealNow() };
    G.audio.sfx('crystal');
  }
  function finisher() {
    st = 'finisher'; stT = 0; freeze = 14;
    G.R.flash.r = 1; G.R.flash.g = 0.95; G.R.flash.b = 0.9; G.R.flash.a = 0.9;
    G.audio.sfx('shatter');
    banner = { text: 'SELLO DE ' + nameOf(sealNow()).toUpperCase() + ' ROTO', t: 0, n: 120, col: COL[sealNow()], small: true };
    for (let i = 0; i < 50; i++) fx.push({ x: B.x + G.rnd(-20, 20), y: FLOOR - 60 + G.rnd(-20, 20), vx: G.rnd(-3, 3), vy: G.rnd(-3.5, 0.5), grav: 0.12, life: 70, col: G.pick(['#ff8a9a', '#ffd0da', '#ff5a78', '#ffffff']), s: 2 });
    B.crystals = Math.max(0, B.crystals - 3);
  }
  function runScene(fn) { CB.busy = true; G.run(fn, () => { CB.busy = false; }); }
  function burst(x, y, col, n) { for (let i = 0; i < n; i++) fx.push({ x, y, vx: G.rnd(-1.6, 1.6), vy: G.rnd(-1.8, 0.6), life: G.ri(14, 30), col, s: 1 }); }
  function dust(x, n) { for (let i = 0; i < n; i++) fx.push({ x: x + G.rnd(-6, 6), y: FLOOR - 1, vx: G.rnd(-0.8, 0.8), vy: -G.rnd(0.1, 0.6), life: G.ri(14, 26), col: '#6a4a48', s: 2 }); }
  function spark(x, y, col, small) { fx.push({ spark: true, x, y, col, life: small ? 5 : 10 }); }

  // ── bucle ──
  CB.update = () => {
    CB.t++; stT++;
    if (G.shake) G.shake = Math.max(0, G.shake - 0.25);
    if (G.R.flash.a > 0) G.R.flash.a = Math.max(0, G.R.flash.a - 0.03);
    if (banner && ++banner.t > banner.n) banner = null;
    let run = true;
    if (freeze > 0) { freeze--; run = false; }
    if (st === 'intro') {
      B.pose.t++;
      if (stT === 1) banner = { text: ph === 0 ? '¿PREPARADO?' : 'FASE ' + (ph + 1), t: 0, n: 55, col: '#fff4d0', small: ph > 0 };
      if (stT === 58) { banner = { text: '¡ADELANTE!', t: 0, n: 40, col: '#ffd070' }; G.audio.sfx('boom'); }
      if (stT === 2 && ph === 0 && !G.flag('tut_tiro')) { G.setFlag('tut_tiro'); runScene(G.STORY.tutorial_tiro); }
      if (CB.busy) stT = Math.min(stT, 50);
      if (stT > 66) st = 'fight';
    } else if (st === 'fight') {
      if (!CB.busy && !G.UI.blocking() && run) { playerUpdate(); bossUpdate(); stepBullets(); }
      if (G.pressed('start') && !CB.busy && !G.UI.blocking()) G.UI.openMenu();
    } else if (st === 'finisher') {
      if (stT > 100) {
        st = 'pause';
        const last = ph >= def.phases.length - 1;
        runScene(function* () {
          yield G.wait(20);
          yield* G.STORY['cb_' + CB.id](ph, last);
          if (last) { st = 'purify'; stT = 0; } else { ph++; startPhase(); }
        });
      }
    } else if (st === 'ko') {
      P.y = Math.max(0, P.y - 1);
      if (stT === 100) runScene(function* () {
        yield* G.STORY.derrota(CB.id);
        P.hp = 3; P.inv = 60; P.x = 50; P.y = 0; P.st = 'idle';
        B.hp = B.max; B.x = 205; B.y = 0; B.st = 'idle'; B.atk = null; B.next = 90; shots = []; bullets = [];
        st = 'intro'; stT = 50;
      });
    } else if (st === 'purify') {
      B.pose.t++;
      if (stT === 1) { G.audio.sfx('purify'); G.audio.play('recuerdo'); }
      if (stT % 3 === 0 && stT < 150) fx.push({ x: B.x + G.rnd(-24, 24), y: FLOOR - G.rnd(0, 80), vx: 0, vy: -G.rnd(0.3, 1.2), life: 70, col: G.pick(['#ffffff', '#fff0c0', '#9affe8']), s: 2 });
      B.crystals = 0; B.pose.eye = '#6affd0';
      B.pose.crouch = G.lerp(B.pose.crouch, 0, 0.05);
      if (stT === 60) { G.R.flash.r = 1; G.R.flash.g = 1; G.R.flash.b = 1; G.R.flash.a = 0.9; banner = { text: '¡PURIFICADO!', t: 0, n: 130, col: '#9affe8' }; }
      if (stT === 200) { st = 'end'; CB.active = false; CB.finished = true; Object.assign(G.R.look, CB.lookSaved); if (onEnd) onEnd(); }
    }
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; if (--f.life <= 0) { fx.splice(i, 1); continue; } if (f.vx != null && run) { f.x += f.vx; f.y += f.vy; if (f.grav) f.vy += f.grav; f.vx *= 0.95; } }
    for (let i = floats.length - 1; i >= 0; i--) if (++floats[i].t > 70) floats.splice(i, 1);
    draw();
  };

  // ── dibujo ──
  function playerFrame() {
    const A = G.SPR.prota_cb, side = P.face > 0 ? 'right' : 'left';
    const pick = (k, i) => { const l = A[k][side]; return l[((i % l.length) + l.length) % l.length]; };
    if (st === 'ko') return null;
    if (P.st === 'hit') return pick('hurt', 0);
    if (P.dash > 0) return pick('dash', 0);
    if (P.st === 'duck') return pick('crouch', 0);
    if (P.y > 0) return pick('jump', P.vy > 0 ? 0 : 1);
    if (G.held('a')) return pick('cast', P.anim >> 2);
    if (P.st === 'run') return pick('walk', P.anim >> 2);
    return pick('idle', CB.t >> 4);
  }
  function draw() {
    g.save();
    g.clearRect(0, 0, CW, CH);
    const sh = G.shake || 0;
    if (sh) g.translate(Math.round(G.rnd(-sh, sh)), Math.round(G.rnd(-sh, sh)));
    g.drawImage(film.far, 0, 0); g.drawImage(film.near, 0, 0);
    // avisos en el suelo
    for (const s of shots) if (s.k === 'aviso') {
      const k = 1 - s.life / s.n, a = 0.3 + 0.4 * Math.abs(Math.sin(CB.t * 0.3));
      g.fillStyle = s.root ? `rgba(255,70,90,${a})` : `rgba(255,220,150,${a})`;
      g.fillRect(Math.round(s.x - s.w / 2), FLOOR, Math.round(s.w), 2);
      g.fillStyle = s.root ? `rgba(255,70,90,${a * 0.35 * k})` : `rgba(255,220,150,${a * 0.25 * k})`;
      g.fillRect(Math.round(s.x - s.w / 2), FLOOR - 30 * k, Math.round(s.w), 30 * k);
    }
    // sombras
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillRect(Math.round(P.x - 6), FLOOR - 1, 12, 2);
    const bw = 50 - B.y * 0.3; g.fillRect(Math.round(B.x - bw / 2), FLOOR - 1, Math.round(bw), 2);
    drawBoss(false);
    const f = playerFrame();
    if (st === 'ko') { const l = G.SPR.prota_lie; g.drawImage(l.c, Math.round(P.x - l.w / 2), FLOOR - l.h); }
    else if (f && !(P.inv > 0 && Math.floor(P.inv / 3) % 2 && P.dash === 0)) g.drawImage(f.c, Math.round(P.x - f.w / 2), FLOOR - f.h - Math.round(P.y));
    // brillo
    g.globalCompositeOperation = 'lighter';
    drawBoss(true);
    if (f && f.e && st !== 'ko') g.drawImage(f.e, Math.round(P.x - f.w / 2), FLOOR - f.h - Math.round(P.y));
    for (const e of fx) if (e.ghost && f) { g.globalAlpha = e.life / 20; g.drawImage(G.tint(f.c, '#3cc4a4'), Math.round(e.x - f.w / 2), FLOOR - f.h - Math.round(e.y)); g.globalAlpha = 1; }
    for (const b of bullets) {
      const col = b.seal ? COL[b.seal] : b.big ? COL.mente : '#fff4d0';
      g.fillStyle = col;
      if (b.big) { g.beginPath(); g.arc(b.x, b.y, 5 + Math.sin(CB.t) * 1, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.fillRect(b.x - 1, b.y - 1, 3, 3); }
      else { g.fillRect(Math.round(b.x - b.vx * 0.6) - 1, Math.round(b.y - b.vy * 0.6), 4, 2); g.fillStyle = '#ffffff'; g.fillRect(Math.round(b.x), Math.round(b.y), 2, 2); }
    }
    for (const s of shots) {
      if (s.k === 'onda') { g.fillStyle = '#ff5a78'; for (let i = 0; i < 10; i++) g.fillRect(Math.round(s.x - Math.sign(s.vx) * i), FLOOR - 10 + i, 1, 10 - i); g.fillStyle = '#ffd0da'; g.fillRect(Math.round(s.x) - 1, FLOOR - 11, 2, 11); }
      else if (s.k === 'esquirla' || s.k === 'cae') {
        const c = s.parry ? '#9affe8' : '#ff6a8a';
        L.tri(g, [s.x, s.y + 5], [s.x - 3, s.y - 4], [s.x + 3, s.y - 4], c);
        if (s.parry) { g.fillStyle = 'rgba(154,255,232,0.4)'; g.beginPath(); g.arc(s.x, s.y, 7 + Math.sin(CB.t * 0.3) * 1.5, 0, 7); g.fill(); }
      } else if (s.k === 'raiz') {
        const k = Math.min(1, (40 - s.life) / 6) * Math.min(1, s.life / 8);
        g.fillStyle = '#c02a44'; g.fillRect(Math.round(s.x - 4), Math.round(FLOOR - s.h * k), 8, Math.round(s.h * k));
        g.fillStyle = '#ff8a9a'; g.fillRect(Math.round(s.x - 1), Math.round(FLOOR - s.h * k), 2, Math.round(s.h * k));
      }
    }
    for (const e of fx) {
      if (e.ghost) continue;
      if (e.spark) { const k = e.life / 10, r = (1 - k) * 8 + 2; g.fillStyle = e.col; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillRect(Math.round(e.x + Math.cos(a) * r), Math.round(e.y + Math.sin(a) * r), 1, 1); } continue; }
      g.fillStyle = e.col; g.globalAlpha = Math.min(1, e.life / 12); g.fillRect(Math.round(e.x), Math.round(e.y), e.s || 1, e.s || 1); g.globalAlpha = 1;
    }
    g.globalCompositeOperation = 'source-over';
    // película antigua: rayas, manchas y parpadeo
    if (G.hash(CB.t >> 2, 1) > 0.6) { g.fillStyle = 'rgba(255,240,210,0.08)'; g.fillRect(Math.floor(G.hash(CB.t >> 2, 2) * CW), 0, 1, CH); }
    for (let i = 0; i < 3; i++) if (G.hash(CB.t >> 1, i + 5) > 0.7) { g.fillStyle = 'rgba(20,10,5,0.35)'; g.fillRect(Math.floor(G.hash(CB.t, i) * CW), Math.floor(G.hash(CB.t, i + 9) * CH), 1 + (i % 2), 1); }
    g.fillStyle = `rgba(30,20,10,${0.04 + G.hash(CB.t >> 1, 3) * 0.05})`; g.fillRect(0, 0, CW, CH);
    g.restore();
  }
  function drawBoss(glowPass) {
    const rig = L.RIG[def.rig], s = def.scale;
    B.pose.crystals = B.crystals;
    const a = L.tmpA.getContext('2d');
    a.clearRect(0, 0, 120, 120);
    rig(a, B.pose, glowPass);
    const x = Math.round(B.x), y = Math.round(FLOOR - B.y);
    g.save(); g.translate(x, y); if (B.face > 0) g.scale(-1, 1);
    g.imageSmoothingEnabled = false;
    if (!glowPass) {
      const o = G.tint(L.tmpA, '#08040c');
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(o, -60 * s + dx, -110 * s + dy, 120 * s, 120 * s);
    }
    g.drawImage(L.tmpA, -60 * s, -110 * s, 120 * s, 120 * s);
    if (!glowPass && B.hit > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5; g.drawImage(G.tint(L.tmpA, '#ffffff'), -60 * s, -110 * s, 120 * s, 120 * s); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    g.restore();
    if (glowPass && B.st === 'dizzy') for (let i = 0; i < 3; i++) { const a2 = CB.t * 0.1 + i * 2.1; g.fillStyle = i % 2 ? '#ffd070' : '#9affe8'; g.fillRect(Math.round(B.x + Math.cos(a2) * 18), Math.round(FLOOR - 110 + Math.sin(a2) * 4), 2, 2); }
  }

  // ── interfaz: cartas de vida y de Resonancia, progreso del jefe ──
  const K = 480 / CW;
  CB.drawHUD = (c) => {
    if (!def) return;
    // vida como cartas (abajo a la izquierda)
    for (let i = 0; i < 3; i++) {
      const x = 12 + i * 22, y = 234, on = i < P.hp;
      G.frame(c, x, y, 18, 24, { ornate: false, fill: on ? 'rgba(20,40,40,0.9)' : 'rgba(10,10,14,0.7)', edge: on ? '#9affe8' : '#3a3a48' });
      if (on) { c.fillStyle = '#9affe8'; c.fillRect(x + 7, y + 8, 4, 8); c.fillRect(x + 5, y + 10, 8, 4); }
    }
    // cartas de Resonancia
    for (let i = 0; i < 5; i++) {
      const x = 84 + i * 13, y = 240, full = i < P.cards, part = i === P.cards ? P.meter / 40 : 0;
      c.fillStyle = '#0a0812'; c.fillRect(x - 1, y - 1, 11, 17);
      c.fillStyle = full ? '#8ad8ff' : '#1c2030'; c.fillRect(x, y, 9, 15);
      if (part > 0) { c.fillStyle = '#3a5a8a'; c.fillRect(x, y + 15 - Math.round(15 * part), 9, Math.round(15 * part)); }
      if (full && Math.floor(G.t / 10) % 2) { c.fillStyle = '#ffffff'; c.fillRect(x + 2, y + 2, 2, 2); }
    }
    G.text(c, G.keys('[b]: disparo potente'), 84, 228, '#9a94a8');
    // progreso del jefe (barra fina con las fases)
    const w = 200, x0 = 140, y0 = 14;
    c.fillStyle = '#0a0812'; c.fillRect(x0 - 1, y0 - 1, w + 2, 5);
    const total = def.phases.reduce((s, p) => s + p.hp, 0);
    const done = def.phases.slice(0, ph).reduce((s, p) => s + p.hp, 0) + (B.max - B.hp);
    c.fillStyle = '#d8bf86'; c.fillRect(x0, y0, Math.round(w * done / total), 3);
    let acc = 0;
    def.phases.forEach((p, i) => { acc += p.hp; G.UI.skillIcon(c, p.seal, x0 + Math.round(w * acc / total) - 8, y0 + 5, i < ph ? 0.3 : i === ph ? 1 : 0.5); });
    G.textC(c, def.name.toUpperCase() + ' · ' + def.title, 240, 2, '#ffb0c0');
    if (G.device === 'kb') { G.text(c, 'Z (mantener) disparar · ↑ apuntar · ↓ agacharse', 190, 248, '#6a6478'); G.text(c, 'Espacio saltar (y PARAR lo cian) · Shift embestir', 190, 260, '#6a6478'); }
    // carteles
    if (banner) {
      const b = banner, a = Math.min(1, b.t / 8, (b.n - b.t) / 12);
      c.globalAlpha = Math.max(0, a);
      const sc = b.small ? 2 : 3, tw = G.textW(b.text) * sc;
      const gr = c.createLinearGradient(0, 84, 0, 144); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gr; c.fillRect(0, 84, 480, 60);
      G.textBig(c, b.text, Math.round(240 - tw / 2), 100, sc, b.col, '#12060a');
      if (b.icon) { G.UI.skillIcon(c, b.icon, 232, 134, 1); G.textC(c, G.keys('usa ' + nameOf(b.icon) + ' ([y] o su número)'), 240, 152, COL[b.icon]); }
      c.globalAlpha = 1;
    }
    for (const f of floats) {
      if (f.t < 0) continue;
      c.globalAlpha = Math.min(1, (70 - f.t) / 20);
      G.textC(c, f.text, Math.round(f.x * K), Math.round((f.y - f.t * 0.3) * K), f.col, '#0a0812');
      c.globalAlpha = 1;
    }
  };
  CB.isFighting = () => st === 'fight';
  CB.cdFrac = () => 0;
  CB.sealSkill = () => (def ? sealNow() : null);
  CB.debug = {
    state: () => ({ st, ph, hp: P.hp, bhp: B.hp, bst: B.st, cards: P.cards }),
    finish: () => { B.hp = 0; dizzy(); bullets.push({ x: B.x, y: FLOOR - 40, vx: 0, vy: 0, life: 2, dmg: 0, seal: sealNow() }); },
  };
})();
