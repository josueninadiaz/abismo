'use strict';
// ─── Exploración: el protagonista, los habitantes, colisiones, salidas y disparadores ───
(function () {
  const TS = 16;
  const E = (G.EX = { actors: [], player: null, zone: null, frozen: false });

  // ── personajes en la maqueta ──
  class Actor {
    constructor(spr, tx, ty, o = {}) {
      this.id = o.id || spr; this.spr = spr; this.o = o;
      this.x = tx * TS + 8; this.z = ty * TS + 10;
      this.y = 0; this.dir = o.dir || 'down'; this.anim = 0; this.moving = false;
      this.home = { x: this.x, z: this.z }; this.wait = G.ri(60, 200); this.goal = null;
      this.r = o.scale ? 7 : 5;
      this.phase = G.ri(0, 200);
      this.jz = 0; this.vz = 0; this.air = false;
      const set = G.SPR[spr];
      this.bb = G.W3.billboard((set.idle ? set.idle.down : set.down)[0], { scale: o.scale || 1, glow: o.glow });
      if (o.ghost) {
        const m = this.bb.mat;
        m.transparent = true; m.opacity = 0.7; m.alphaTest = 0.1; m.depthWrite = false;
        m.emissiveIntensity = 0.9;
        this.ghost = true;
      }
      G.W3.zone().root.add(this.bb.root);
    }
    // caminando: 6 pasos; quieto: respira, mece la cola y parpadea (cada uno a su ritmo)
    frame() {
      const set = G.SPR[this.spr];
      if (this.air && set.jump) return set.jump[this.dir][this.vz > 0 ? 0 : 1];
      if (this.moving) { const fr = set[this.dir] || set.down; return fr[Math.floor(this.anim / 6) % fr.length]; }
      const idle = set.idle && set.idle[this.dir];
      if (idle) return idle[Math.floor((G.t + this.phase) / 15) % idle.length];
      return (set[this.dir] || set.down)[0];
    }
    face(dir) { this.dir = dir; }
    faceTo(x, z) {
      const dx = x - this.x, dz = z - this.z;
      this.dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'right' : 'left') : dz > 0 ? 'down' : 'up';
    }
    // intenta moverse; devuelve si se movió
    step(dx, dz) {
      const Z = G.W3.zone();
      let moved = false;
      if (dx && E.free(this.x + dx, this.z, this)) { this.x += dx; moved = true; }
      if (dz && E.free(this.x, this.z + dz, this)) { this.z += dz; moved = true; }
      if (!this.air) {
        const gh = Z.hAt(Math.floor(this.x / TS), Math.floor(this.z / TS));
        this.y += (Math.max(0, gh) - this.y) * 0.35;
      }
      return moved;
    }
    update() {
      if (this.moving) this.anim++;
      if (this.ghost) this.bb.mat.opacity = 0.55 + Math.sin(G.t * 0.05) * 0.15;
      // paseo tranquilo alrededor de su sitio
      if (this.o.wander && !E.frozen && this !== E.player && !this.busy) {
        if (this.goal) {
          const dx = this.goal.x - this.x, dz = this.goal.z - this.z, l = Math.hypot(dx, dz);
          if (l < 1.5 || --this.goal.t < 0) { this.goal = null; this.moving = false; this.wait = G.ri(90, 260); }
          else { this.faceTo(this.goal.x, this.goal.z); this.moving = this.step(dx / l * 0.45, dz / l * 0.45); }
        } else if (--this.wait < 0) {
          const R = this.o.wander * TS;
          this.goal = { x: this.home.x + G.rnd(-R, R), z: this.home.z + G.rnd(-R, R), t: 240 };
        }
      }
      if (this.path) this.followPath();
      this.bb.set(this.frameOverride || this.frame());
      this.bb.place(this.x, this.y + this.jz, this.z);
      if (this.bb.blob) {
        this.bb.blob.position.y = 0.4 - this.jz;
        const k = 1 / (1 + this.jz * 0.04);
        this.bb.blob.material.opacity = 0.8 * k;
      }
    }
    followPath() {
      const p = this.path[0];
      if (!p) { this.path = null; this.moving = false; return; }
      const dx = p.x - this.x, dz = p.z - this.z, l = Math.hypot(dx, dz), sp = p.sp || 0.8;
      if (l <= sp) { this.x = p.x; this.z = p.z; this.path.shift(); if (!this.path.length) { this.path = null; this.moving = false; if (p.face) this.dir = p.face; } return; }
      this.faceTo(p.x, p.z);
      this.x += dx / l * sp; this.z += dz / l * sp; this.moving = true;
    }
    remove() { const Z = G.W3.zone(); if (Z) Z.root.remove(this.bb.root); }
  }
  E.Actor = Actor;

  // ── colisiones ──
  E.free = (x, z, who) => {
    const Z = G.W3.zone();
    const r = who ? who.r : 5;
    const base = who ? who.y : 0;
    for (const [ox, oz] of [[-r, -2], [r, -2], [-r, 3], [r, 3]]) {
      const cx = Math.floor((x + ox) / TS), cy = Math.floor((z + oz) / TS);
      if (cx < 0 || cy < 0 || cx >= Z.w || cy >= Z.h) return false;
      const c = Z.cells[cy][cx];
      const air = who && who.air, top = base + (who ? who.jz : 0);
      // en el aire se puede cruzar agua y bajar de las repisas; subir, solo lo que alcance el salto
      if ((c.t.water || c.t.pit) && !(air && who.jz > 3)) return false;
      if (c.h > top + 9) return false;
      if (!air && c.h < base - 9 && !c.t.water && !c.t.pit) return false;
    }
    for (const s of Z.solids) if (Math.hypot(s.x - x, (s.z - z) * 1.3) < s.r + r * 0.6) return false;
    for (const a of E.actors) if (a !== who && !a.ghost && Math.hypot(a.x - x, (a.z - z) * 1.4) < a.r + r) return false;
    return true;
  };

  // ── cargar una zona ──
  E.enter = (id, tx, ty, dir) => {
    for (const a of E.actors) a.remove();
    E.actors = [];
    const zone = G.ZONES[id];
    E.zone = zone; E.zoneId = id;
    G.W3.load(zone);
    const L = G.R.look, lk = zone.look || {};
    Object.assign(L, { tint: [1, 1, 1], lift: [0, 0, 0], sat: 1.05, contrast: 1.06, bloom: 0.9, exposure: 1, corrupt: 0, dof: 1, tilt: 0.75 }, lk);
    E.player = new Actor('prota', tx, ty, { id: 'prota', dir: dir || 'down' });
    E.actors.push(E.player);
    for (const n of zone.npcs || []) {
      if (n.hideIf && G.flag(n.hideIf)) continue;
      if (n.showIf && !G.flag(n.showIf)) continue;
      const a = new Actor(n.spr, n.x, n.y, n);
      a.talk = n.talk;
      E.actors.push(a);
    }
    // el guardia se aparta cuando Varek da permiso
    const gd = E.get('guardia');
    if (gd && G.flag('permiso')) { gd.x += TS * 2; gd.dir = 'left'; }
    // plantas-alma: encendidas si ya se despertaron
    for (const p of G.W3.zone().props) if (p.kind === 'planta') {
      const def = G.plantAt(id, Math.floor(p.x / TS), Math.floor(p.z / TS));
      p.def = def;
      if (def && G.save.plants.includes(def.id)) G.lightPlant(p, true);
    }
    // el mapa de la gruta ya no está si lo cogiste
    const Zp = G.W3.zone().props;
    for (let i = Zp.length - 1; i >= 0; i--) if (Zp[i].kind === 'mapa' && G.flag('mapa')) { Zp[i].bb.root.visible = false; Zp.splice(i, 1); }
    // artefactos de viaje ya activados
    for (const p of G.W3.zone().props) if (p.kind === 'artefacto') {
      p.def = G.artifactAt(id, Math.floor(p.x / TS), Math.floor(p.z / TS));
      if (p.def && (G.save.arts || []).includes(p.def.id)) G.lightArtifact(p, true);
    }
    G.audio.play(zone.music);
    G.audio.ambient(zone.ambient);
    G.W3.snap();
    E.frozen = false;
    E.update(true);
  };
  E.get = (id) => E.actors.find((a) => a.id === id);

  G.lightArtifact = (p, quiet) => {
    p.bb.set(G.SPR.artefacto);
    p.light.i = 1.2;
    if (!quiet) { G.audio.sfx('fragment'); G.fxBurst(p.x, 24, p.z, '#9affe8', 50); }
  };
  G.lightPlant = (p, quiet) => {
    p.bb.set(G.SPR.planta);
    p.light.i = 1.3; p.light.col = '#9affe8';
    if (!quiet) { G.audio.sfx('save'); G.fxBurst(p.x, 18, p.z, '#9affe8', 40); }
  };

  // ── bucle de exploración ──
  let lastStep = 0;
  E.update = (still) => {
    const P = E.player;
    if (!P) return;
    const busy = E.frozen || G.UI.blocking() || G.scene;
    if (!busy && !still) {
      const d = G.dir, mag = Math.hypot(d.x, d.y);
      if (mag > 0.15) {
        const sp = 1.15 * Math.min(1, mag * 1.2);
        if (Math.abs(d.x) > Math.abs(d.y) * 1.05) P.dir = d.x > 0 ? 'right' : 'left';
        else if (Math.abs(d.y) > 0) P.dir = d.y > 0 ? 'down' : 'up';
        P.moving = P.step(d.x * sp, d.y * sp) || true;
        if (P.moving && G.t - lastStep > 18) { lastStep = G.t; G.audio.sfx('step'); }
      } else P.moving = false;
      if (G.pressed('j') && !P.air) jump(P);
      if (G.pressed('a')) interact();
      else if (G.pressed('start') || G.pressed('b')) G.UI.openMenu();
      checkZone();
    } else if (!P.path) P.moving = false;
    stepJump(P);
    for (const a of E.actors) a.update();
    // la influencia del pilar: más cerca, más se tuerce la imagen y la música
    let cor = 0;
    for (const [cx, cy, k, r] of E.zone.corrupt || []) {
      const d = Math.hypot(P.x / TS - cx, (P.z / TS - cy) * 1.2);
      cor = Math.max(cor, k * G.clamp(1 - d / r, 0, 1));
    }
    G.R.look.corrupt += (cor * 0.8 - G.R.look.corrupt) * 0.05;
    G.audio.corrupt = cor;
    G.W3.update(P.x, P.z, P.y);
    stepFx();
  };

  // ── salto ──
  function jump(P) {
    P.air = true; P.vz = 2.7; P.hA = P.y;
    G.audio.sfx('jump');
  }
  function stepJump(P) {
    const Z = G.W3.zone();
    const cx = Math.floor(P.x / TS), cy = Math.floor(P.z / TS), c = Z.cells[cy] && Z.cells[cy][cx];
    if (!P.air) {
      if (c && !c.t.water && !c.t.pit) P.safe = { x: P.x, z: P.z, y: P.y };
      return;
    }
    P.hA += P.vz; P.vz -= 0.19;
    const ground = c ? c.h : 0;
    if (P.hA <= Math.max(ground, 0) && P.vz < 0) {
      P.air = false; P.jz = 0; P.vz = 0;
      if (c && (c.t.water || c.t.pit)) {
        // al agua: chapuzón y de vuelta a tierra firme
        G.fxBurst(P.x, 0, P.z, '#7affe8', 16, 0.6);
        G.audio.sfx('splash');
        const s = P.safe || { x: P.x, z: P.z, y: 0 };
        P.x = s.x; P.z = s.z; P.y = s.y;
        G.R.flash.r = 0.4; G.R.flash.g = 1; G.R.flash.b = 0.9; G.R.flash.a = 0.25;
        return;
      }
      P.y = Math.max(0, ground);
      G.fxBurst(P.x, P.y + 1, P.z, '#8a90a0', 7, 0.4);
      G.audio.sfx('land');
      return;
    }
    P.y = Math.max(0, ground);
    P.jz = Math.max(0, P.hA - P.y);
  }

  // ── hablar / examinar ──
  const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  E.target = () => {
    const P = E.player, [fx, fz] = DIRV[P.dir];
    const px = P.x + fx * 12, pz = P.z + fz * 10;
    let best = null, bd = 22;
    for (const a of E.actors) {
      if (a === P || !a.talk) continue;
      const d = Math.hypot(a.x - px, a.z - pz);
      if (d < bd + (a.o.scale ? 8 : 0)) { bd = d; best = { kind: 'npc', a }; }
    }
    for (const p of G.W3.zone().props) {
      const d = Math.hypot(p.x - px, p.z - pz);
      if (d < bd) { bd = d; best = { kind: p.kind === 'planta' ? 'planta' : 'prop', p }; }
    }
    for (const t of E.zone.things || []) {
      const d = Math.hypot(t.x * TS + 8 - px, t.y * TS + 8 - pz);
      if (d < bd) { bd = d; best = { kind: 'thing', t }; }
    }
    return best;
  };
  function interact() {
    const t = E.target();
    if (!t) return;
    const P = E.player;
    if (t.kind === 'npc') {
      const a = t.a;
      a.busy = true;
      a.goal = null; a.moving = false;
      if (!a.o.scale) a.faceTo(P.x, P.z);
      G.run(G.STORY[a.talk] || G.STORY.nada, () => { a.busy = false; });
    } else if (t.kind === 'planta') G.run(G.STORY.planta(t.p));
    else if (t.kind === 'prop') G.run(G.STORY[t.p.kind](t.p));
    else if (t.kind === 'thing') G.run(function* () { for (const l of t.t.text) yield G.say(null, l); });
  }

  // ── salidas y disparadores ──
  function checkZone() {
    const P = E.player, tx = Math.floor(P.x / TS), ty = Math.floor(P.z / TS);
    for (const tr of E.zone.triggers || []) {
      if (tx < tr.x0 || tx > tr.x1 || ty < tr.y0 || ty > tr.y1) continue;
      if (tr.once && G.flag(tr.once)) continue;
      if (tr.unless && G.flag(tr.unless)) continue;
      if (tr.once) G.setFlag(tr.once);
      G.run(G.STORY[tr.scene]);
      return;
    }
    const ex = (E.zone.exits || []).find((e) => tx >= e.x0 && tx <= e.x1 && ty >= e.y0 && ty <= e.y1);
    if (!ex) return;
    if (ex.need && !G.flag(ex.need)) {
      // se le hace retroceder un paso
      const back = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] }[ex.dir];
      P.x += back[0] * 10; P.z += back[1] * 10;
      if (ex.block) { const b = E.get(ex.block); G.run(G.STORY[b.talk]); }
      else G.run(function* () { yield G.say(null, ex.msg || 'No puedes pasar.'); });
      return;
    }
    G.go(ex.to, ex.tx, ex.ty, ex.dir === 'left' ? 'left' : ex.dir === 'right' ? 'right' : ex.dir);
  }
  // cambio de zona con fundido
  G.go = (to, tx, ty, dir) => {
    G.run(function* () {
      yield G.fade(1, 24);
      E.enter(to, tx, ty, dir);
      yield G.wait(6);
      yield G.fade(0, 24);
      if (!G.flag('visto_' + to)) { G.setFlag('visto_' + to); yield G.titleCard(G.ZONES[to].name); }
    });
  };

  // ── chispas en la maqueta (plantas, purificación) ──
  const THREE = window.THREE;
  const fxList = [];
  let fxMesh = null;
  const MAXF = 300, dummy = new THREE.Object3D(), col = new THREE.Color();
  function ensureFx() {
    if (fxMesh) return;
    fxMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }), MAXF);
    fxMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXF * 3), 3);
    fxMesh.frustumCulled = false; fxMesh.count = 0;
    G.W3.scene.add(fxMesh);
  }
  G.fxBurst = (x, y, z, c, n, sp = 1) => {
    ensureFx();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, s = G.rnd(0.2, 1.1) * sp;
      fxList.push({ x, y, z, vx: Math.cos(a) * s, vy: G.rnd(0.3, 1.4) * sp, vz: Math.sin(a) * s * 0.7, life: sp < 1 ? G.ri(12, 24) : G.ri(40, 90), col: new THREE.Color(c), g: sp < 1 ? 0.08 : 0 });
    }
  };
  function stepFx() {
    if (!fxMesh) return;
    let n = 0;
    for (let i = fxList.length - 1; i >= 0; i--) {
      const f = fxList[i];
      f.x += f.vx; f.y += f.vy; f.z += f.vz; f.vx *= 0.96; f.vz *= 0.96; f.vy = f.vy * 0.97 - f.g;
      if (--f.life <= 0) { fxList.splice(i, 1); continue; }
      if (n >= MAXF) continue;
      dummy.position.set(f.x, f.y, f.z);
      dummy.quaternion.copy(G.W3.cam.quaternion);
      dummy.scale.setScalar(Math.min(1, f.life / 20) * (f.g ? 0.8 : 1.6));
      dummy.updateMatrix();
      fxMesh.setMatrixAt(n, dummy.matrix);
      fxMesh.setColorAt(n, col.copy(f.col).multiplyScalar(2.2));
      n++;
    }
    fxMesh.count = n;
    fxMesh.instanceMatrix.needsUpdate = true;
    if (fxMesh.instanceColor) fxMesh.instanceColor.needsUpdate = true;
  }
})();
