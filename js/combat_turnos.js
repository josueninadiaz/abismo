'use strict';
// ─── Combate por turnos con reflejos (a la manera de Clair Obscur: Expedition 33) ───
// Tu turno: eliges Golpe o una habilidad (cuestan Puntos de Acción) y pulsas [a] cuando el anillo se cierra
// sobre el enemigo para un golpe perfecto. Su turno: cada golpe se puede ESQUIVAR ([x], ventana amplia),
// PARAR ([a], ventana justa: da PA, y si paras todos, contraatacas) o SALTAR ([j], para las ondas del suelo).
(function () {
  const L = G.CBLIB, CW = L.CW, CH = L.CH, FLOOR = 116;
  const CB = { active: false };
  G.CBS = G.CBS || {}; G.CBS.turnos = CB;
  const g = G.R.flatctx;
  const nameOf = (id) => G.UI.SKILLS.find((s) => s[0] === id)[1];
  const COL = { golpe: '#e8e0d0', mente: '#8ad8ff', recuerdos: '#ffd070', cuerpo: '#ff8a7a', alma: '#c8a0ff', ser: '#ffffff' };
  // coste en PA, daño y forma de la habilidad
  const ACT = {
    golpe: { pa: 0, dmg: 8, melee: true, gain: 2, desc: 'Dos golpes rápidos. No cuesta PA: da 2 PA.' },
    mente: { pa: 2, dmg: 14, desc: 'Una onda que libera la mente del control del pilar.' },
    recuerdos: { pa: 3, dmg: 16, desc: 'Hilos de memoria: devuelve lo que el pilar robó.' },
    cuerpo: { pa: 3, dmg: 18, melee: true, desc: 'Embestida que arranca la infección del cuerpo.' },
    alma: { pa: 4, dmg: 12, heal: 25, desc: 'Purifica el alma. También te devuelve Luz.' },
    ser: { pa: 6, dmg: 30, desc: 'Todo lo que eres, de una vez.' },
  };
  CB.SKILLDEF = ACT;
  const FIGHTS = {
    oren: {
      name: 'Oren', title: 'El antiguo líder', rig: 'oren', bg: 'santuario', music: 'vals', immune: true, crystals: 8, hp: 70, fragments: true,
      // dos rondas; cada habilidad usada por primera vez sobre él devuelve un fragmento de memoria,
      // y la purificación final solo funciona cuando ya se han usado las cinco
      phases: [
        { seal: 'cuerpo', attacks: ['baston', 'ecos', 'ola'] },
        { seal: 'ser', attacks: ['baston', 'ecos', 'ola', 'pilar', 'tormenta'] },
      ],
      barks: [['Vete... antes de que ella hable por mí.', 'No es mi voz...', 'Recuerdo... una orilla...'], ['Todavía queda... algo de mí...', 'Termina... lo que empecé.']],
    },
  };
  // ataques del enemigo: lista de golpes (tiempo de impacto, tipo); tipo 'ola' hay que saltarlo, 'pilar' solo se esquiva
  const EATK = {
    baston: (s) => ({ name: 'Bastonazo', melee: true, hits: [[46, 'golpe'], [70 - s * 4, 'golpe']].concat(s > 2 ? [[88 - s * 4, 'golpe']] : []) }),
    ecos: (s) => ({ name: 'Ecos robados', hits: [[60, 'eco'], [74, 'eco'], [96 - s * 3, 'eco']].concat(s > 1 ? [[108 - s * 3, 'eco']] : []) }),
    ola: () => ({ name: 'Onda de cuarzo', hits: [[64, 'ola']] }),
    pilar: () => ({ name: 'Columna de luz', hits: [[80, 'pilar']] }),
    tormenta: () => ({ name: 'Tormenta de cristal', hits: [[50, 'eco'], [62, 'golpe'], [80, 'ola'], [100, 'eco'], [112, 'golpe']] }),
  };

  let S, O, def, ph, st, stT, onEnd, fx, floats, banner, menu, act, eatk, turn, film, used;
  const ORDER = ['mente', 'recuerdos', 'cuerpo', 'alma', 'ser'];
  CB.start = (id, done) => {
    def = FIGHTS[id]; onEnd = done;
    CB.active = true; CB.id = id; CB.finished = false; CB.busy = false; CB.t = 0;
    S = { x: 70, hx: 70, y: 0, vy: 0, hp: 100, max: 100, pa: 3, st: 'idle', t: 0, lock: 0 };
    O = { x: 190, hx: 190, y: 0, corr: def.hp, max: def.hp, st: 'idle', crystals: def.crystals, pose: { t: 0, arm: 0, crouch: 0, lean: 0 }, hit: 0 };
    fx = []; floats = []; banner = null; ph = 0; turn = 1; used = new Set();
    const bg = L.makeBg(def.bg, CW); film = bg;
    startPhase();
    G.audio.play(def.music); G.audio.ambient(null);
  };
  function startPhase() {
    O.corr = O.max; O.st = 'idle'; O.x = O.hx; S.x = S.hx; S.st = 'idle';
    O.crystals = Math.max(1, Math.ceil(def.crystals * (def.phases.length - ph) / def.phases.length));
    st = 'intro'; stT = 0;
  }
  const sealNow = () => def.phases[ph].seal;
  const opts = () => ['golpe'].concat(['mente', 'recuerdos', 'cuerpo', 'alma', 'ser'].filter((k) => G.save.skills.includes(k)));
  function toMenu() {
    st = 'menu'; stT = 0;
    S.pa = Math.min(9, S.pa + 1);
    menu = menu || { i: 0 };
    if (O.st === 'dizzy') { const k = opts().indexOf(sealNow()); if (k >= 0) menu.i = k; }
  }

  // ── turno de Soren ──
  function menuUpdate() {
    const list = opts();
    if (G.pressed('up')) { menu.i = (menu.i + list.length - 1) % list.length; G.audio.sfx('move'); }
    if (G.pressed('down')) { menu.i = (menu.i + 1) % list.length; G.audio.sfx('move'); }
    for (let i = 0; i < 5; i++) if (G.pressed('s' + (i + 1))) { const k = list.indexOf(['mente', 'recuerdos', 'cuerpo', 'alma', 'ser'][i]); if (k >= 0) { menu.i = k; choose(list[k]); return; } }
    if (G.pressed('y')) { const k = list.indexOf(sealNow()); if (k >= 0) { menu.i = k; choose(sealNow()); return; } }
    if (G.ok() && stT > 6) choose(list[menu.i]);
  }
  function choose(k) {
    const A = ACT[k];
    if (S.pa < A.pa) { floats.push({ x: S.x, y: FLOOR - 50, text: 'Faltan PA', col: '#9a94a8', t: 0 }); G.audio.sfx('back'); return; }
    S.pa -= A.pa;
    if (A.gain) S.pa = Math.min(9, S.pa + A.gain);
    G.audio.sfx('ok');
    act = { k, t: 0, hits: k === 'golpe' ? 2 : 1, done: 0, rings: [], mult: 1 };
    st = 'act'; stT = 0;
  }
  // anillo que se cierra sobre el objetivo: [a] en el momento justo
  function ring() { act.rings.push({ t: 0, n: 40, res: null }); }
  function actUpdate() {
    const a = act, A = ACT[a.k], t = ++a.t;
    // acercarse para los cuerpo a cuerpo
    if (A.melee) {
      if (t < 20) { S.x = G.lerp(S.hx, O.x - 34, G.ease(t / 20)); S.st = 'walk'; }
      else if (t === 20) { S.st = 'ready'; ring(); }
    } else if (t === 1) { S.st = 'raise'; ring(); }
    // anillos
    for (const r of a.rings) {
      if (r.res) continue;
      r.t++;
      const rad = 40 - (r.t / r.n) * 34; // de 40 a 6
      if (G.ok() || G.pressed('a')) {
        const d = Math.abs(rad - 10);
        r.res = d <= 2.5 ? 'perfecto' : d <= 7 ? 'bien' : 'flojo';
        strike(r.res);
      } else if (r.t >= r.n) { r.res = 'flojo'; strike('flojo'); }
    }
    const pending = a.rings.some((r) => !r.res);
    if (!pending && a.done < a.hits && a.rings.length < a.hits && t > 2) ring();
    if (!pending && a.done >= a.hits) {
      a.after = (a.after || 0) + 1;
      if (A.melee) S.x = G.lerp(S.x, S.hx, 0.2);
      if (a.after > 30) { S.x = S.hx; S.st = 'idle'; endPlayerTurn(); }
    }
  }
  function strike(res) {
    const a = act, A = ACT[a.k];
    a.done++;
    const mult = res === 'perfecto' ? 1.3 : res === 'bien' ? 1 : 0.6;
    floats.push({ x: O.x, y: FLOOR - 80, text: res === 'perfecto' ? '¡PERFECTO!' : res === 'bien' ? 'Bien' : 'Flojo', col: res === 'perfecto' ? '#fff4d0' : res === 'bien' ? '#d8bf86' : '#9a94a8', t: 0 });
    S.st = A.melee ? (a.k === 'cuerpo' ? 'dash' : a.done % 2 ? 'jab1' : 'jab2') : 'cast';
    if (a.k !== 'golpe') G.audio.sfx(a.k); else G.audio.sfx('swing');
    // efecto según la habilidad
    if (a.k === 'mente' || a.k === 'recuerdos' || a.k === 'ser') fx.push({ beam: a.k, life: 20, x0: S.x + 10, x1: O.x });
    // primera vez que usa esta habilidad sobre él: un fragmento de memoria
    if (def.fragments && a.k !== 'golpe' && !used.has(a.k)) { used.add(a.k); a.frag = ORDER.indexOf(a.k); }
    if (a.k === 'alma') { S.hp = Math.min(S.max, S.hp + Math.round(A.heal * mult)); floats.push({ x: S.x, y: FLOOR - 50, text: '+Luz', col: COL.alma, t: 0 }); fx.push({ ringfx: true, x: O.x, life: 24, col: COL.alma }); }
    // ¿purificación?
    if (O.st === 'dizzy') {
      if (a.k === sealNow()) {
        const missing = def.fragments && ph === def.phases.length - 1 ? ORDER.filter((k) => !used.has(k)) : [];
        if (!missing.length) { finisher(); return; }
        floats.push({ x: O.x, y: FLOOR - 90, text: 'Aún le faltan: ' + missing.map(nameOf).join(', '), col: '#d8bf86', t: 0 });
        return;
      }
      if (a.k !== 'golpe') floats.push({ x: O.x, y: FLOOR - 90, text: 'El sello pide ' + nameOf(sealNow()), col: '#d8bf86', t: 0 });
      return;
    }
    let dmg = Math.round(A.dmg * mult * (a.k === sealNow() ? 1.5 : 1));
    if (def.immune && a.k === 'golpe') { dmg = 0; floats.push({ x: O.x, y: FLOOR - 78, text: 'INMUNE', col: '#9a94a8', t: 0 }); }
    hitO(dmg, COL[a.k]);
  }
  function hitO(dmg, col) {
    if (dmg <= 0) { spark(O.x - 8, FLOOR - 50, '#ffffff'); G.audio.sfx('block'); return; }
    O.corr = Math.max(0, O.corr - dmg); O.hit = 10; O.pose.lean = -0.6;
    floats.push({ x: O.x + G.rnd(-6, 6), y: FLOOR - 60, text: '-' + dmg, col, t: 0, big: true });
    spark(O.x - 8, FLOOR - 50, col); G.shake = 2; G.audio.sfx('hit');
    for (let i = 0; i < 8; i++) fx.push({ x: O.x + G.rnd(-10, 10), y: FLOOR - 50 + G.rnd(-14, 14), vx: G.rnd(0.5, 2.5), vy: G.rnd(-2.5, 0), grav: 0.14, life: 30, col: G.pick(['#ff8a9a', '#ffd0da']), s: 2 });
    if (O.corr <= 0) { O.st = 'dizzy'; banner = { text: '¡PURIFÍCALO!', t: 0, n: 110, col: '#fff4d0', icon: sealNow() }; G.audio.sfx('crystal'); }
  }
  function endPlayerTurn() {
    if (st !== 'act') return;
    if (act.frag != null) { const i = act.frag; act.frag = null; st = 'pause'; runScene(function* () { yield* G.STORY.fragmento(i); st = 'act'; endPlayerTurn(); }); return; }
    if (O.st === 'dizzy') { st = 'menuwait'; stT = 0; return; } // en trance no ataca: vuelve tu turno
    startEnemy();
  }

  // ── turno del enemigo ──
  function startEnemy() {
    const p = def.phases[ph];
    const k = G.pick(p.attacks);
    eatk = Object.assign({ k, t: 0, res: [], cleanParry: true }, EATK[k](ph));
    eatk.hits = eatk.hits.map(([at, kind]) => ({ at, kind, done: false }));
    st = 'enemy'; stT = 0;
    banner = { text: eatk.name, t: 0, n: 50, col: '#ff9aa8', small: true, top: true };
    if (G.chance(0.4)) floats.push({ x: O.x, y: FLOOR - 104, text: G.pick(def.barks[ph]), col: '#ffd0d8', t: -10 });
  }
  function enemyUpdate() {
    const a = eatk, t = ++a.t, pose = O.pose;
    if (S.lock > 0) S.lock--;
    // movimiento del enemigo
    if (a.melee) {
      if (t < 30) O.x = G.lerp(O.hx, S.x + 40, G.ease(t / 30));
      pose.arm = G.lerp(pose.arm, 1, 0.1);
    } else pose.arm = G.lerp(pose.arm, 0.8, 0.08);
    // proyectiles en vuelo (ecos) y avisos
    for (const h of a.hits) {
      if (h.kind === 'eco' && !h.spawned && t >= h.at - 40) { h.spawned = true; fx.push({ orb: true, from: O.x - 14, to: S.x + 6, t0: t, at: h.at, h, life: 60 }); }
      if (t === h.at - 14) { G.audio.sfx('tick'); fx.push({ glint: true, x: h.kind === 'eco' ? S.x + 14 : h.kind === 'pilar' ? S.x : O.x - 20, y: h.kind === 'ola' ? FLOOR - 4 : FLOOR - 50, life: 12 }); }
      if (h.kind === 'pilar' && t === h.at - 40) fx.push({ column: true, x: S.x, life: 52, at: h.at, t0: t });
      if (h.kind === 'ola' && t === h.at - 36) fx.push({ wave: true, x0: O.x - 20, x1: S.x, t0: t, at: h.at, life: 44 });
    }
    // reacciones del jugador: [x] esquivar, [a] parar, [j] saltar
    const next = a.hits.find((h) => !h.done);
    if (next && S.lock <= 0) {
      const d = t - next.at;
      const press = G.pressed('x') ? 'esquiva' : G.pressed('a') || G.pressed('b') ? 'para' : G.pressed('j') ? 'salta' : null;
      if (press) {
        const win = press === 'esquiva' ? [-12, 3] : press === 'para' ? [-6, 2] : [-12, 3];
        const ok = d >= win[0] && d <= win[1] && !(press === 'para' && next.kind === 'pilar') && (next.kind !== 'ola' || press === 'salta') && !(press === 'salta' && next.kind !== 'ola');
        if (ok) { next.res = press; S.st = press === 'esquiva' ? 'dodge' : press === 'para' ? 'parry' : 'jump'; S.t = 0; }
        else S.lock = 14; // pulsar a lo loco tiene castigo
        if (press === 'salta') { S.vy = 3.6; S.y = 0.1; }
      }
    }
    for (const h of a.hits) if (!h.done && t >= h.at + (h.res ? 0 : 2)) resolveHit(h);
    if (a.melee && t > a.hits[a.hits.length - 1].at + 10) O.x = G.lerp(O.x, O.hx, 0.15);
    if (t > a.hits[a.hits.length - 1].at + 40) {
      O.x = O.hx; pose.arm = 0;
      if (a.cleanParry && a.hits.every((h) => h.res === 'para')) {
        banner = { text: '¡CONTRAATAQUE!', t: 0, n: 50, col: '#9affe8', small: true };
        S.st = 'jab1'; S.t = 0; hitO(def.immune ? 6 : 12, '#9affe8');
      }
      st = 'between'; stT = 0;
    }
  }
  function resolveHit(h) {
    h.done = true;
    if (h.res === 'para') { S.pa = Math.min(9, S.pa + 1); spark(S.x + 10, FLOOR - 22, '#9affe8'); G.audio.sfx('parry'); floats.push({ x: S.x, y: FLOOR - 46, text: '¡PARADA! +1 PA', col: '#9affe8', t: 0 }); return; }
    eatk.cleanParry = false;
    if (h.res === 'esquiva' || h.res === 'salta') { floats.push({ x: S.x, y: FLOOR - 46, text: h.res === 'salta' ? 'Saltado' : 'Esquivado', col: '#d8bf86', t: 0 }); G.audio.sfx('dodge'); return; }
    const dmg = { golpe: 9, eco: 7, ola: 12, pilar: 16 }[h.kind] + ph * 2;
    S.hp = Math.max(0, S.hp - dmg); S.st = 'hurt'; S.t = 0;
    floats.push({ x: S.x, y: FLOOR - 46, text: '-' + dmg, col: '#ff6a7a', t: 0, big: true });
    spark(S.x, FLOOR - 22, '#ff6a7a'); G.audio.sfx('hurt'); G.shake = 3;
    G.R.flash.r = 1; G.R.flash.g = 0.2; G.R.flash.b = 0.3; G.R.flash.a = 0.25;
    if (S.hp <= 0) { st = 'ko'; stT = 0; banner = { text: 'Te desvaneces...', t: 0, n: 90, col: '#9a94a8', small: true }; }
  }

  // ── purificación y rondas ──
  function finisher() {
    st = 'finisher'; stT = 0;
    G.R.flash.r = 1; G.R.flash.g = 0.95; G.R.flash.b = 0.9; G.R.flash.a = 0.9;
    G.audio.sfx('shatter');
    banner = { text: 'SELLO DE ' + nameOf(sealNow()).toUpperCase() + ' ROTO', t: 0, n: 110, col: COL[sealNow()], small: true };
    for (let i = 0; i < 40; i++) fx.push({ x: O.x + G.rnd(-14, 14), y: FLOOR - 50 + G.rnd(-20, 20), vx: G.rnd(-3, 3), vy: G.rnd(-3.5, 0.5), grav: 0.12, life: 70, col: G.pick(['#ff8a9a', '#ffd0da', '#ffffff']), s: 2 });
    O.crystals = Math.max(0, O.crystals - 2);
  }
  function runScene(fn) { CB.busy = true; G.run(fn, () => { CB.busy = false; }); }
  function spark(x, y, col) { fx.push({ spark: true, x, y, col, life: 10 }); }

  CB.update = () => {
    CB.t++; stT++;
    if (G.shake) G.shake = Math.max(0, G.shake - 0.25);
    if (G.R.flash.a > 0) G.R.flash.a = Math.max(0, G.R.flash.a - 0.03);
    if (banner && ++banner.t > banner.n) banner = null;
    O.pose.t++; if (O.hit > 0) O.hit--;
    if (O.st !== 'dizzy') { O.pose.lean = G.lerp(O.pose.lean, 0, 0.08); O.pose.crouch = G.lerp(O.pose.crouch, 0, 0.08); }
    else { O.pose.crouch = 0.6 + Math.sin(CB.t * 0.1) * 0.2; O.pose.lean = Math.sin(CB.t * 0.05) * 0.4; }
    // salto de Soren
    if (S.y > 0 || S.vy > 0) { S.y += S.vy; S.vy -= 0.22; if (S.y <= 0) { S.y = 0; S.vy = 0; } }
    S.t++;
    if (['jab1', 'jab2', 'dash', 'cast', 'hurt', 'dodge', 'parry', 'jump'].includes(S.st) && S.t > 22 && st !== 'act') S.st = 'idle';
    if (st === 'intro') {
      if (stT === 1) banner = { text: 'SELLO ' + (ph + 1) + ' · ' + nameOf(sealNow()).toUpperCase(), t: 0, n: 70, col: '#fff4d0', small: true };
      if (stT === 3 && ph === 0 && !G.flag('tut_turnos')) { G.setFlag('tut_turnos'); runScene(G.STORY.tutorial_turnos); }
      if (stT > 74 && !CB.busy) toMenu();
    } else if (st === 'menu') { if (!CB.busy && !G.UI.blocking()) menuUpdate(); }
    else if (st === 'menuwait') { if (stT > 20) toMenu(); }
    else if (st === 'act') actUpdate();
    else if (st === 'enemy') enemyUpdate();
    else if (st === 'between') { if (stT > 24) { turn++; toMenu(); } }
    else if (st === 'finisher') {
      if (stT > 100) {
        st = 'pause';
        const last = ph >= def.phases.length - 1;
        runScene(function* () {
          yield G.wait(20);
          if (act && act.frag != null) { const i = act.frag; act.frag = null; yield* G.STORY.fragmento(i); }
          yield* G.STORY['cb_' + CB.id](ph, last);
          if (last) { st = 'purify'; stT = 0; } else { ph++; S.pa = Math.max(S.pa, 3); startPhase(); }
        });
      }
    } else if (st === 'ko') {
      if (stT === 90) runScene(function* () {
        yield* G.STORY.derrota(CB.id);
        S.hp = S.max; S.pa = 4; O.corr = O.max; O.st = 'idle'; fx = [];
        st = 'intro'; stT = 60;
      });
    } else if (st === 'purify') {
      if (stT === 1) { G.audio.sfx('purify'); G.audio.play('recuerdo'); }
      if (stT % 3 === 0 && stT < 150) fx.push({ x: O.x + G.rnd(-18, 18), y: FLOOR - G.rnd(0, 70), vx: 0, vy: -G.rnd(0.3, 1.2), life: 70, col: G.pick(['#ffffff', '#fff0c0', '#9affe8']), s: 2 });
      O.crystals = 0; O.pose.eye = '#ffe8a0'; O.pose.staff = '#fff0c0';
      if (stT === 60) { G.R.flash.r = 1; G.R.flash.g = 1; G.R.flash.b = 1; G.R.flash.a = 0.9; banner = { text: 'PURIFICADO', t: 0, n: 130, col: '#9affe8' }; }
      if (stT === 200) { st = 'end'; CB.active = false; CB.finished = true; if (onEnd) onEnd(); }
    }
    if ((st === 'menu' || st === 'enemy') && G.pressed('start') && !CB.busy && !G.UI.blocking()) G.UI.openMenu();
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; if (--f.life <= 0) { fx.splice(i, 1); continue; } if (f.vx != null) { f.x += f.vx; f.y += f.vy; if (f.grav) f.vy += f.grav; f.vx *= 0.95; } }
    for (let i = floats.length - 1; i >= 0; i--) if (++floats[i].t > 70) floats.splice(i, 1);
    draw();
  };

  // ── dibujo ──
  function sorenFrame() {
    const A = G.SPR.prota_cb, pick = (k, i) => { const l = A[k].right; return l[((i % l.length) + l.length) % l.length]; };
    if (st === 'ko') return null;
    const m = { walk: ['walk', S.t >> 2], ready: ['guard', 0], jab1: ['jab1', 0], jab2: ['jab2', 0], dash: ['dash', 0], cast: ['cast', S.t >> 2], raise: ['raise', S.t >> 3], hurt: ['hurt', 0], dodge: ['crouch', 0], parry: ['guard', 0], jump: ['jump', S.vy > 0 ? 0 : 1] }[S.st];
    if (m) return pick(m[0], m[1]);
    if (st === 'enemy') return pick('guard', 0);
    return pick('idle', CB.t >> 4);
  }
  function draw() {
    g.save();
    g.clearRect(0, 0, CW, CH);
    const sh = G.shake || 0;
    if (sh) g.translate(Math.round(G.rnd(-sh, sh)), Math.round(G.rnd(-sh, sh)));
    g.drawImage(film.far, 0, 0); g.drawImage(film.near, 0, FLOOR - 124);
    // suelo con perspectiva y foco de luz sobre la escena
    const gr = g.createRadialGradient(CW / 2, FLOOR, 10, CW / 2, FLOOR, 150);
    gr.addColorStop(0, 'rgba(232,224,255,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, CW, CH);
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(Math.round(S.x - 7), FLOOR - 1, 14, 2); g.fillRect(Math.round(O.x - 14), FLOOR - 1, 28, 2);
    // Oren
    drawO(false);
    const f = sorenFrame();
    if (!f) { const l = G.SPR.prota_lie; g.drawImage(l.c, Math.round(S.x - l.w / 2), FLOOR - l.h); }
    else g.drawImage(f.c, Math.round(S.x - f.w / 2), FLOOR - f.h - Math.round(S.y));
    g.globalCompositeOperation = 'lighter';
    drawO(true);
    if (f && f.e) g.drawImage(f.e, Math.round(S.x - f.w / 2), FLOOR - f.h - Math.round(S.y));
    // anillos del ataque
    if (st === 'act') for (const r of act.rings) {
      if (r.res) continue;
      const rad = 40 - (r.t / r.n) * 34;
      g.strokeStyle = COL[act.k]; g.lineWidth = 1;
      g.beginPath(); g.arc(O.x - 4, FLOOR - 46, rad, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = 'rgba(255,244,208,0.8)'; g.beginPath(); g.arc(O.x - 4, FLOOR - 46, 10, 0, Math.PI * 2); g.stroke();
    }
    for (const e of fx) {
      if (e.beam) { const k = e.life / 20; g.fillStyle = COL[e.beam]; g.globalAlpha = k; g.fillRect(Math.min(e.x0, e.x1), FLOOR - 26 - 3 * k, Math.abs(e.x1 - e.x0), 6 * k); g.globalAlpha = 1; }
      else if (e.ringfx) { const k = 1 - e.life / 24; g.strokeStyle = e.col; g.beginPath(); g.ellipse(S.x, FLOOR - 10, 10 + k * 40, (10 + k * 40) * 0.4, 0, 0, 7); g.stroke(); }
      else if (e.orb) { const k = G.clamp((eatk ? eatk.t - e.t0 : 0) / (e.at - e.t0), 0, 1); const x = G.lerp(e.from, e.to, k), y = FLOOR - 50 + Math.sin(k * Math.PI) * -16 + k * 26; g.fillStyle = '#ffd070'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(x - 1, y - 1, 2, 2); if (k >= 1) e.life = 0; }
      else if (e.column) { const k = eatk ? (eatk.t - e.t0) / (e.at - e.t0) : 1; if (k < 1) { g.fillStyle = `rgba(255,90,120,${0.1 + k * 0.25})`; g.fillRect(e.x - 10, 0, 20, FLOOR); } else { g.fillStyle = 'rgba(255,90,120,0.9)'; g.fillRect(e.x - 12, 0, 24, FLOOR); g.fillStyle = '#ffe0e8'; g.fillRect(e.x - 2, 0, 4, FLOOR); } }
      else if (e.wave) { const k = eatk ? G.clamp((eatk.t - e.t0) / (e.at - e.t0), 0, 1.2) : 1; const x = G.lerp(e.x0, e.x1, k); g.fillStyle = '#ff5a78'; for (let i = 0; i < 12; i++) g.fillRect(Math.round(x + i), FLOOR - 12 + i, 1, 12 - i); }
      else if (e.glint) { const k = e.life / 12; g.fillStyle = '#ffffff'; g.fillRect(Math.round(e.x - 5 * k), Math.round(e.y), Math.round(10 * k) + 1, 1); g.fillRect(Math.round(e.x), Math.round(e.y - 5 * k), 1, Math.round(10 * k) + 1); }
      else if (e.spark) { const k = e.life / 10, r = (1 - k) * 9 + 2; g.fillStyle = e.col; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillRect(Math.round(e.x + Math.cos(a) * r), Math.round(e.y + Math.sin(a) * r), 1, 1); } }
      else { g.fillStyle = e.col; g.globalAlpha = Math.min(1, e.life / 12); g.fillRect(Math.round(e.x), Math.round(e.y), e.s || 1, e.s || 1); g.globalAlpha = 1; }
    }
    g.globalCompositeOperation = 'source-over';
    g.restore();
  }
  function drawO(glowPass) {
    const rig = L.RIG[def.rig];
    O.pose.crystals = O.crystals;
    if (!glowPass) {
      L.withOutline(g, O.x, FLOOR - O.y, false, (c) => rig(c, O.pose, false));
      if (O.hit > 0 && O.hit % 2) { g.globalCompositeOperation = 'lighter'; L.withOutline(g, O.x, FLOOR - O.y, false, (c) => rig(c, O.pose, false)); g.globalCompositeOperation = 'source-over'; }
    } else {
      const a = L.tmpA.getContext('2d'); a.clearRect(0, 0, 120, 120); rig(a, O.pose, true);
      g.drawImage(L.tmpA, Math.round(O.x) - 60, Math.round(FLOOR - O.y) - 110);
      if (O.st === 'dizzy') for (let i = 0; i < 3; i++) { const a2 = CB.t * 0.1 + i * 2.1; g.fillStyle = i % 2 ? '#ffd070' : '#9affe8'; g.fillRect(Math.round(O.x + Math.cos(a2) * 14), Math.round(FLOOR - 98 + Math.sin(a2) * 4), 2, 2); }
    }
  }

  // ── interfaz ──
  const K = 480 / CW;
  function bar(c, x, y, w, h, v, col) {
    c.fillStyle = '#0a0812'; c.fillRect(x - 2, y - 2, w + 4, h + 4);
    c.fillStyle = '#1c1624'; c.fillRect(x, y, w, h);
    c.fillStyle = col; c.fillRect(x, y, Math.round(w * v), h);
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x, y, Math.round(w * v), 1);
  }
  CB.drawHUD = (c) => {
    if (!def) return;
    // Soren: Luz y PA
    G.frame(c, 10, 10, 170, 40, { ornate: false });
    G.text(c, 'SOREN', 20, 15, '#9affe8');
    bar(c, 20, 28, 150, 5, S.hp / S.max, S.hp > 30 ? '#6affd0' : '#ff9a6a');
    G.text(c, Math.round(S.hp) + '/' + S.max, 130, 15, '#9a94a8');
    for (let i = 0; i < 9; i++) { const x = 20 + i * 12, on = i < S.pa; c.fillStyle = on ? '#ffd070' : '#2a2430'; c.fillRect(x + 2, 38, 5, 5); c.fillRect(x + 3, 37, 3, 7); c.fillRect(x + 1, 39, 7, 3); }
    G.text(c, 'PA', 132, 37, '#ffd070');
    // Oren: Corrupción y sellos
    G.frame(c, 300, 10, 170, 40, { ornate: false });
    G.text(c, def.name.toUpperCase(), 310, 15, '#ffb0c0');
    G.text(c, 'CORRUPCIÓN', 380, 15, '#9a94a8');
    bar(c, 310, 28, 150, 5, O.corr / O.max, '#ff4a6a');
    def.phases.forEach((p, i) => G.UI.skillIcon(c, p.seal, 310 + i * 18, 34, i < ph ? 0.25 : i === ph ? 1 : 0.5));
    G.textC(c, st === 'enemy' ? 'Turno de ' + def.name : 'Turno ' + turn + ' · Soren', 240, 16, st === 'enemy' ? '#ff9aa8' : '#d8bf86');
    // menú de acciones
    if (st === 'menu') {
      const list = opts(), x = 300, y = 150, h = list.length * 16 + 12;
      G.frame(c, x, y, 170, h);
      list.forEach((k, i) => {
        const A = ACT[k], sel = i === menu.i, can = S.pa >= A.pa, isSeal = O.st === 'dizzy' && k === sealNow();
        if (sel) { c.fillStyle = 'rgba(216,191,134,0.16)'; c.fillRect(x + 4, y + 5 + i * 16, 162, 15); }
        if (k === 'golpe') { c.fillStyle = COL.golpe; c.fillRect(x + 12, y + 10 + i * 16, 8, 2); } else G.UI.skillIcon(c, k, x + 8, y + 5 + i * 16, can ? 1 : 0.3);
        G.text(c, k === 'golpe' ? 'Golpe' : nameOf(k), x + 30, y + 9 + i * 16, isSeal ? '#ffd070' : can ? (sel ? '#fff4d0' : '#e8e0d0') : '#5a5468');
        G.text(c, A.pa ? A.pa + ' PA' : '+2 PA', x + 130, y + 9 + i * 16, can ? '#ffd070' : '#5a5468');
      });
      const A = ACT[list[menu.i]];
      G.frame(c, 10, 222, 280, 38, { ornate: false });
      G.wrap(A.desc, 260).slice(0, 2).forEach((l, i) => G.text(c, l, 20, 228 + i * 12, '#e8e0d0'));
      G.text(c, G.keys('[a] usar · ↑↓ elegir · [y] el sello'), 304, y - 12, '#9a94a8');
    }
    if (st === 'act') G.textC(c, G.keys('¡[a] cuando el anillo toque el círculo!'), 240, 236, '#fff4d0');
    if (st === 'enemy') G.textC(c, G.keys('[x] esquivar · [a] parar (justo al golpe) · [j] saltar las ondas'), 240, 250, '#ffd0d8');
    if (banner) {
      const b = banner, a = Math.min(1, b.t / 8, (b.n - b.t) / 12);
      c.globalAlpha = Math.max(0, a);
      const sc = b.small ? 2 : 3, tw = G.textW(b.text) * sc, y = b.top ? 64 : 100;
      const gr = c.createLinearGradient(0, y - 16, 0, y + 44); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gr; c.fillRect(0, y - 16, 480, 60);
      G.textBig(c, b.text, Math.round(240 - tw / 2), y, sc, b.col, '#12060a');
      if (b.icon) { G.UI.skillIcon(c, b.icon, 232, y + 34, 1); G.textC(c, 'usa ' + nameOf(b.icon), 240, y + 52, COL[b.icon]); }
      c.globalAlpha = 1;
    }
    for (const f of floats) {
      if (f.t < 0) continue;
      c.globalAlpha = Math.min(1, (70 - f.t) / 20);
      if (f.big) G.textBig(c, f.text, Math.round(f.x * K) - 10, Math.round((f.y - f.t * 0.4) * K), 2, f.col, '#0a0812');
      else G.textC(c, f.text, Math.round(f.x * K), Math.round((f.y - f.t * 0.3) * K), f.col, '#0a0812');
      c.globalAlpha = 1;
    }
  };
  CB.isFighting = () => st === 'menu' || st === 'enemy';
  CB.cdFrac = (id) => (S && ACT[id] && S.pa < ACT[id].pa ? 1 : 0);
  CB.sealSkill = () => (def ? sealNow() : null);
  CB.debug = {
    state: () => ({ st, ph, hp: S.hp, pa: S.pa, corr: O.corr, ost: O.st }),
    finish: () => { if (ph === def.phases.length - 1) for (const k of ORDER) used.add(k); O.corr = 0; O.st = 'dizzy'; act = { k: sealNow(), t: 0, hits: 1, done: 0, rings: [] }; st = 'act'; strike('perfecto'); },
  };
})();
