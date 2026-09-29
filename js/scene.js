'use strict';
// ─── Escenas: generadores que avanzan paso a paso (diálogos, esperas, movimientos, combates) ───
// Una escena es function* () { yield G.say('mira', '¡Hola!'); const i = yield G.ask('mira', '¿Y tú?', ['Sí', 'No']); ... }
(function () {
  G.scene = null;
  const stack = []; // una escena puede lanzar otra (p. ej. el combate): la de fuera espera
  G.run = (fn, onDone) => {
    if (!fn) return;
    if (G.scene) stack.push(G.scene);
    G.scene = { it: fn(), task: null, onDone, started: false };
    G.stepScene();
  };
  G.stepScene = () => {
    const s = G.scene;
    if (!s) return;
    for (let guard = 0; guard < 64; guard++) {
      let r;
      if (!s.started) { s.started = true; r = s.it.next(); }
      else if (s.task) {
        if (!s.task.update()) return;
        const v = s.task.value; s.task = null;
        r = s.it.next(v);
      } else r = s.it.next();
      if (r.done) {
        if (G.scene === s) G.scene = stack.pop() || null;
        if (s.onDone) s.onDone();
        return;
      }
      s.task = r.value || null;
    }
  };

  // ── tareas ──
  const task = (update, o = {}) => Object.assign({ update, value: undefined }, o);
  G.wait = (n) => task(() => --n <= 0);
  G.say = (who, text, o) => { const d = G.UI.say(who, text, o || {}); return task(() => d.done); };
  G.ask = (who, text, opts) => {
    const d = G.UI.say(who, text, { keep: true });
    let c = null;
    const t = task(() => {
      if (!c && d.n >= d.total) c = G.UI.ask(opts);
      if (c && c.done) { G.UI.closeDialog(); t.value = c.value; return true; }
      return false;
    });
    return t;
  };
  G.narrate = (lines, o) => { const n = G.UI.narrate(lines, o); return task(() => n.done); };
  G.memory = (title, lines) => { const m = G.UI.memory(title, lines); return task(() => m.done); };
  G.titleCard = (text, sub) => { const c = G.UI.titleCard(text, sub); return task(() => c.done); };
  // fundido a negro (a = 1) o desde negro (a = 0)
  G.fade = (a, n = 30, col) => {
    const F = G.R.fade, a0 = F.a;
    if (col) { F.r = col[0]; F.g = col[1]; F.b = col[2]; }
    let t = 0;
    return task(() => { t++; F.a = G.lerp(a0, a, Math.min(1, t / n)); return t >= n; });
  };
  // los ojos que se abren: k = 0 cerrados … 1 abiertos
  G.eyes = (k, n = 40) => {
    const k0 = G.UI.eyesK;
    let t = 0;
    return task(() => { t++; G.UI.eyesK = G.lerp(k0, k, G.ease(Math.min(1, t / n))); return t >= n; });
  };
  G.flashFx = (col = [1, 1, 1], n = 20, a = 0.8) => {
    const F = G.R.flash; F.r = col[0]; F.g = col[1]; F.b = col[2];
    let t = 0;
    return task(() => { t++; F.a = a * (1 - t / n); return t >= n; });
  };
  // mueve a un personaje por una lista de casillas
  G.walk = (id, pts, sp = 0.8, face) => {
    const a = G.EX.get(id);
    if (!a) return task(() => true);
    a.path = pts.map(([x, y]) => ({ x: x * 16 + 8, z: y * 16 + 10, sp }));
    if (face) a.path[a.path.length - 1].face = face;
    return task(() => !a.path);
  };
  G.face = (id, dir) => { const a = G.EX.get(id); if (a) a.dir = dir; return null; };
  G.call = (fn) => task(() => { fn(); return true; });
  // desplaza la cámara (en unidades del mundo) y espera
  G.camTo = (x, z, n = 60) => {
    const o = G.W3.camOffset, P = G.EX.player, x0 = o.x, z0 = o.z;
    const tx = x == null ? 0 : x - P.x, tz = z == null ? 0 : z - P.z;
    let t = 0;
    return task(() => { t++; const k = G.ease(Math.min(1, t / n)); o.x = G.lerp(x0, tx, k); o.z = G.lerp(z0, tz, k); return t >= n; });
  };
  G.camBack = (n = 50) => G.camTo(null, null, n);

  // ── partida guardada ──
  const SKEY = 'abismo-partida', MKEY = 'abismo-meta';
  G.newSave = () => ({ zone: 'gruta', x: 6, y: 11, dir: 'down', flags: {}, plants: [], frags: [], skills: [], arts: [], time: 0 });
  G.save = G.newSave();
  G.meta = { ended: false, plants: [] };
  try { const m = JSON.parse(localStorage.getItem(MKEY) || 'null'); if (m) G.meta = m; } catch (e) { /* nada */ }
  try { const a = JSON.parse(localStorage.getItem('abismo-audio') || 'null'); if (a) G.audio.setVol(a.m, a.s); } catch (e) { /* nada */ }
  G.audio.retro = G.R.opt.retro;
  G.flag = (k) => !!G.save.flags[k];
  G.setFlag = (k, v = true) => { G.save.flags[k] = v; };
  G.hasSave = () => { try { return !!localStorage.getItem(SKEY); } catch (e) { return false; } };
  G.writeSave = (plant) => {
    const P = G.EX.player;
    const s = G.save;
    if (plant) { s.zone = plant.zone; s.x = plant.x; s.y = plant.y + 1; s.plant = plant.id; }
    else { s.zone = G.EX.zoneId; s.x = Math.floor(P.x / 16); s.y = Math.floor(P.z / 16); }
    try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) { /* nada */ }
    for (const id of s.plants) if (!G.meta.plants.includes(id)) G.meta.plants.push(id);
    G.writeMeta();
  };
  G.writeMeta = () => { try { localStorage.setItem(MKEY, JSON.stringify(G.meta)); } catch (e) { /* nada */ } };
  G.readSave = () => { try { return JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) { return null; } };

  // ── las diez plantas-alma del Abismo (las que aún no existen en el mapa están por descubrir) ──
  G.PLANTS = [
    { id: 1, zone: 'aldea', x: 29, y: 15, name: 'Lago Nhar' },
    { id: 2, zone: 'senda', x: 18, y: 19, name: 'Senda de las Raíces' },
    { id: 3, zone: 'santuario', x: 6, y: 14, name: 'Santuario Hundido' },
    { id: 4, name: '???' }, { id: 5, name: '???' }, { id: 6, name: '???' }, { id: 7, name: '???' },
    { id: 8, name: '???' }, { id: 9, name: '???' }, { id: 10, name: '???' },
  ];
  G.plantAt = (zone, x, y) => G.PLANTS.find((p) => p.zone === zone && p.x === x && p.y === y);

  // ── artefactos de viaje: al activarlos, desde el Mapa se puede viajar a cualquiera de ellos ──
  G.ARTIFACTS = [
    { id: 1, zone: 'aldea', x: 4, y: 11, name: 'Boca de la Gruta' },
    { id: 2, zone: 'senda', x: 13, y: 33, name: 'Pie de la Senda' },
    { id: 3, zone: 'santuario', x: 5, y: 12, name: 'Puerta del Santuario' },
  ];
  G.artifactAt = (zone, x, y) => G.ARTIFACTS.find((p) => p.zone === zone && p.x === x && p.y === y);
})();
