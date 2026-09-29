'use strict';
// ─── Vida en el aire: esporas y luciérnagas, niebla baja, gotas que caen del techo y fauna ───
// polillas de luz que rondan las lámparas, grillos que saltan (y huyen de ti), peces luminosos en el agua
// y bandadas de murciélagos que cruzan de vez en cuando. Cerca del pilar, la vida se calla.
(function () {
  const THREE = window.THREE;
  if (!G.R.ok) return;
  const AMB = (G.AMB = {});
  const TS = 16;
  let S = null;

  // ── texturas ──
  const glowTex = (() => {
    const c = G.makeCanvas(16, 16), x = c.getContext('2d');
    const g = x.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 16, 16);
    return new THREE.CanvasTexture(c);
  })();
  const mistTex = (() => {
    const c = G.makeCanvas(128, 128), x = c.getContext('2d');
    for (let i = 0; i < 26; i++) {
      const px = 20 + G.hash(i, 1, 5) * 88, py = 20 + G.hash(i, 2, 5) * 88, r = 14 + G.hash(i, 3, 5) * 26;
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(c);
  })();

  // ── luciérnagas y esporas (un solo sistema de puntos) ──
  const flyMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uTex: { value: glowTex }, uCol: { value: new THREE.Color() }, uCol2: { value: new THREE.Color() }, uScale: { value: 1 }, uLife: { value: 1 } },
    vertexShader: `uniform float uT, uScale, uLife; attribute vec4 aSeed; varying float vB; varying float vK;
      void main(){
        vec3 p = position; float s = aSeed.x * 6.28, sp = 0.5 + aSeed.y;
        vK = step(0.5, aSeed.w); // 0 = espora que sube, 1 = luciérnaga que vaga
        if (vK > 0.5) {
          p += vec3(sin(uT * 0.31 * sp + s) * 22.0 + sin(uT * 0.13 + s * 2.0) * 12.0, sin(uT * 0.47 * sp + s) * 8.0, cos(uT * 0.27 * sp + s) * 16.0);
          vB = smoothstep(0.1, 0.9, sin(uT * (0.8 + aSeed.z) + s * 3.0)) * uLife;
        } else {
          p.y = mod(p.y + uT * 3.0 * sp, 110.0) + 2.0;
          p.x += sin(uT * 0.4 * sp + s) * 6.0;
          vB = (0.35 + 0.3 * sin(uT * 2.0 + s)) * smoothstep(110.0, 70.0, p.y) * smoothstep(2.0, 12.0, p.y);
        }
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (vK > 0.5 ? 5.5 : 2.6) * (0.7 + aSeed.z * 0.6) * uScale * (700.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform sampler2D uTex; uniform vec3 uCol, uCol2; varying float vB; varying float vK;
      void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(mix(uCol2, uCol, vK) * t.a * vB * (vK > 0.5 ? 1.8 : 0.9), 1.0); }`,
  });

  // ── gotas que caen del techo ──
  const MAXD = 40;
  const dropMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.8, 7), new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }), MAXD);
  dropMesh.frustumCulled = false; dropMesh.count = 0;
  G.W3.scene.add(dropMesh);
  const dummy = new THREE.Object3D();

  // celdas de suelo transitables, agua y luces de la zona
  function cellsOf(Z, pred) {
    const out = [];
    for (let y = 1; y < Z.h - 1; y++) for (let x = 1; x < Z.w - 1; x++) if (pred(Z.cells[y][x])) out.push([x, y]);
    return out;
  }

  AMB.build = (Z) => {
    const zd = Z.def, F = Object.assign({ flies: 60, spores: 90, grillos: 7, polillas: 5, peces: 4, murcielagos: false, gotas: 0.4, niebla: 6 }, zd.fauna || {});
    S = { Z, F, crit: [], fish: [], bats: [], drops: [], mist: [], nextBats: G.ri(400, 900) };
    const floor = cellsOf(Z, (c) => c.h >= 0 && c.h <= 8 && !c.t.water && !c.front);
    const water = cellsOf(Z, (c) => c.t.water);
    // luciérnagas y esporas
    const n = F.flies + F.spores;
    if (n && floor.length) {
      const pos = new Float32Array(n * 3), seed = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) {
        const [cx, cy] = floor[Math.floor(Math.random() * floor.length)];
        pos[i * 3] = cx * TS + Math.random() * TS; pos[i * 3 + 1] = 8 + Math.random() * 50; pos[i * 3 + 2] = cy * TS + Math.random() * TS;
        seed[i * 4] = Math.random(); seed[i * 4 + 1] = Math.random(); seed[i * 4 + 2] = Math.random(); seed[i * 4 + 3] = i < F.flies ? 0.75 : 0.25;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
      const pts = new THREE.Points(g, flyMat);
      pts.frustumCulled = false;
      Z.root.add(pts);
      flyMat.uniforms.uCol.value.set(F.flyCol || '#b8ff8a');
      flyMat.uniforms.uCol2.value.set(F.sporeCol || '#7affe0');
    }
    // niebla baja
    for (let i = 0; i < F.niebla; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(220, 150), new THREE.MeshBasicMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0.5, color: new THREE.Color(F.mistCol || zd.fog || '#304050').multiplyScalar(F.mistMul || 2.4) }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(Math.random() * Z.w * TS, 5 + i * 1.5, Math.random() * Z.h * TS);
      m.renderOrder = 4;
      Z.root.add(m);
      S.mist.push({ m, vx: G.rnd(0.03, 0.09) * (i % 2 ? 1 : -1), vz: G.rnd(-0.02, 0.02) });
    }
    // grillos
    for (let i = 0; i < F.grillos && floor.length; i++) {
      const [cx, cy] = floor[Math.floor(Math.random() * floor.length)];
      const bb = G.W3.billboard(G.SPR.grillo1, { blob: false, glow: 1.2 });
      Z.root.add(bb.root);
      S.crit.push({ kind: 'grillo', bb, x: cx * TS + 8, z: cy * TS + 8, y: 0, hop: 0, wait: G.ri(60, 400) });
    }
    // polillas alrededor de las luces (no del pilar)
    const lamps = Z.lights.filter((l) => !l.always && l.col !== '#ff3a60');
    for (let i = 0; i < F.polillas && lamps.length; i++) {
      const l = lamps[Math.floor(Math.random() * lamps.length)];
      const bb = G.W3.billboard(G.SPR.polilla1, { blob: false, shadow: false, glow: 2.2 });
      Z.root.add(bb.root);
      S.crit.push({ kind: 'polilla', bb, l, ph: Math.random() * 6.28, r: G.rnd(8, 18), sp: G.rnd(0.03, 0.06) });
    }
    // peces
    for (let i = 0; i < Math.min(F.peces, Math.ceil(water.length / 6)); i++) {
      const [cx, cy] = water[Math.floor(Math.random() * water.length)];
      const m = new THREE.Mesh(new THREE.PlaneGeometry(7, 5), new THREE.MeshBasicMaterial({ map: G.R.tex(G.SPR.pez.c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8, color: new THREE.Color(F.fishCol || zd.water || '#9affe8') }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(cx * TS + 8, -5, cy * TS + 8);
      m.renderOrder = 1;
      Z.root.add(m);
      S.fish.push({ m, x: cx * TS + 8, z: cy * TS + 8, tx: 0, tz: 0, t: 0, water });
    }
  };

  function freeFloor(Z, x, z) {
    const cx = Math.floor(x / TS), cy = Math.floor(z / TS);
    if (cx < 1 || cy < 1 || cx >= Z.w - 1 || cy >= Z.h - 1) return false;
    const c = Z.cells[cy][cx];
    return c.h >= 0 && c.h <= 8 && !c.t.water && !c.front;
  }

  AMB.step = (t, cam) => {
    if (!S || S.Z !== G.W3.zone()) return;
    const Z = S.Z, F = S.F;
    const life = 1 - G.clamp((G.R.look.corrupt || 0) * 1.6, 0, 0.85); // el pilar apaga la vida
    flyMat.uniforms.uT.value = t / 60;
    flyMat.uniforms.uLife.value = life;
    flyMat.uniforms.uScale.value = G.R.renderer.getDrawingBufferSize(new THREE.Vector2()).y / 540;
    const P = G.EX.player;
    // niebla
    for (const q of S.mist) {
      q.m.position.x += q.vx; q.m.position.z += q.vz;
      if (q.m.position.x > Z.w * TS + 110) q.m.position.x = -110; else if (q.m.position.x < -110) q.m.position.x = Z.w * TS + 110;
      q.m.material.opacity = 0.35 + Math.sin(t * 0.004 + q.m.position.z) * 0.15;
    }
    // bichos
    for (const c of S.crit) {
      if (c.kind === 'grillo') {
        if (c.hop > 0) {
          c.hop--;
          const k = 1 - c.hop / 18;
          c.x += c.vx; c.z += c.vz; c.y = Math.sin(k * Math.PI) * 7;
          if (!freeFloor(Z, c.x, c.z)) { c.x -= c.vx; c.z -= c.vz; }
          c.bb.set(G.SPR.grillo2);
        } else {
          c.y = 0; c.bb.set(G.SPR.grillo1);
          const near = P && Math.hypot(P.x - c.x, P.z - c.z) < 30;
          if (--c.wait <= 0 || near) {
            const a = near ? Math.atan2(c.z - P.z, c.x - P.x) + G.rnd(-0.6, 0.6) : Math.random() * 6.28;
            c.vx = Math.cos(a) * 1.1; c.vz = Math.sin(a) * 0.8; c.hop = 18; c.wait = G.ri(90, 500);
          }
        }
        c.bb.place(c.x, c.y, c.z);
      } else if (c.kind === 'polilla') {
        c.ph += c.sp;
        const x = c.l.x + Math.cos(c.ph) * c.r + Math.sin(c.ph * 2.3) * 4, z = c.l.z + Math.sin(c.ph * 1.3) * c.r * 0.7, y = c.l.y + 6 + Math.sin(c.ph * 3.1) * 6;
        c.bb.set(Math.floor(t / 3) % 2 ? G.SPR.polilla1 : G.SPR.polilla2);
        c.bb.place(x, y, z);
      }
    }
    // peces: nadan de un punto del agua a otro
    for (const f of S.fish) {
      if (--f.t <= 0) { const [cx, cy] = f.water[Math.floor(Math.random() * f.water.length)]; f.tx = cx * TS + 8; f.tz = cy * TS + 8; f.t = G.ri(200, 500); }
      const dx = f.tx - f.x, dz = f.tz - f.z, l = Math.hypot(dx, dz);
      if (l > 2) {
        const cx = Math.floor((f.x + dx / l * 6) / TS), cy = Math.floor((f.z + dz / l * 6) / TS);
        if (Z.cells[cy] && Z.cells[cy][cx] && Z.cells[cy][cx].t.water) { f.x += dx / l * 0.35; f.z += dz / l * 0.35; } else f.t = 0;
        f.m.rotation.z = Math.atan2(-dz, dx) + Math.PI;
      }
      f.m.position.set(f.x, -5 + Math.sin(t * 0.05 + f.x) * 0.3, f.z);
      f.m.material.opacity = (0.55 + Math.sin(t * 0.07 + f.z) * 0.25) * life;
    }
    // murciélagos: una bandada cruza de vez en cuando
    if (F.murcielagos && --S.nextBats <= 0) {
      S.nextBats = G.ri(900, 1800);
      const dir = G.chance(0.5) ? 1 : -1, n = G.ri(3, 6), z0 = cam.z - G.rnd(40, 120);
      for (let i = 0; i < n; i++) {
        const bb = G.W3.billboard(G.SPR.murci1, { blob: false, shadow: false, glow: 1.5 });
        Z.root.add(bb.root);
        S.bats.push({ bb, x: cam.x - dir * (260 + i * 18 + G.rnd(0, 30)), z: z0 + G.rnd(-30, 30), y: 90 + G.rnd(0, 50), vx: dir * G.rnd(2.2, 3), ph: Math.random() * 6 });
      }
      G.audio.sfx('murcielagos');
    }
    for (let i = S.bats.length - 1; i >= 0; i--) {
      const b = S.bats[i];
      b.x += b.vx; b.ph += 0.2;
      b.bb.set(Math.floor(t / 4 + b.ph) % 2 ? G.SPR.murci1 : G.SPR.murci2);
      b.bb.place(b.x, b.y + Math.sin(b.ph) * 4, b.z);
      if (Math.abs(b.x - cam.x) > 420) { Z.root.remove(b.bb.root); S.bats.splice(i, 1); }
    }
    // gotas
    if (F.gotas && G.chance(F.gotas * 0.08)) {
      const x = cam.x + G.rnd(-220, 220), z = cam.z + G.rnd(-150, 90);
      const cx = Math.floor(x / TS), cy = Math.floor(z / TS);
      if (Z.cells[cy] && Z.cells[cy][cx] && S.drops.length < MAXD) S.drops.push({ x, z, y: 170, vy: 0.5, floor: Math.max(-3, Math.min(Z.cells[cy][cx].h, 60)), water: Z.cells[cy][cx].t.water });
    }
    let nd = 0;
    for (let i = S.drops.length - 1; i >= 0; i--) {
      const d = S.drops[i];
      d.vy += 0.12; d.y -= d.vy;
      if (d.y <= d.floor) {
        S.drops.splice(i, 1);
        if (G.fxBurst) G.fxBurst(d.x, d.floor + 1, d.z, d.water ? '#7affe8' : '#a8c0d0', d.water ? 5 : 3, 0.35);
        continue;
      }
      dummy.position.set(d.x, d.y, d.z);
      dummy.quaternion.copy(G.W3.cam.quaternion);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      dropMesh.setMatrixAt(nd++, dummy.matrix);
    }
    dropMesh.count = nd;
    dropMesh.instanceMatrix.needsUpdate = true;
  };
})();
