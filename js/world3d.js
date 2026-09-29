'use strict';
// ─── El mundo en 2.5D: el mapa de casillas convertido en maqueta 3D ───
// Suelo y rocas con textura de píxel, agua luminosa, cristales, el pilar, focos de luz con sombra,
// rayos de luz que bajan de la superficie, polvo que brilla al cruzarlos y sprites de pie.
(function () {
  const THREE = window.THREE;
  if (!G.R.ok) return;
  const W3 = (G.W3 = {});
  const TS = 16;
  const ELEV = 36 * Math.PI / 180; // inclinación de la cámara
  const LEAN = 12 * Math.PI / 180; // los sprites se inclinan un poco hacia atrás
  const SY = 1 / Math.cos(ELEV - LEAN); // y se estiran para no verse aplastados
  W3.ELEV = ELEV;

  const scene = (W3.scene = new THREE.Scene());
  const cam = (W3.cam = new THREE.PerspectiveCamera(22, 16 / 9, 60, 1800));
  const hemi = new THREE.HemisphereLight(0x8090c0, 0x201820, 0.5);
  scene.add(hemi);
  scene.fog = new THREE.Fog(0x05060c, 560, 1200);

  // ── atlas de casillas (16×16), color y brillo ──
  const TILES = ['roca', 'musgo', 'roja', 'senda', 'pared', 'acantilado', 'madera', 'pared_roja', 'cuarzo', 'fondo', 'cima', 'arena'];
  const TI = {}; TILES.forEach((n, i) => (TI[n] = i));
  const AT = 8; // casillas por fila del atlas
  const atlasC = G.makeCanvas(AT * TS, Math.ceil(TILES.length / AT) * TS);
  const atlasE = G.makeCanvas(atlasC.width, atlasC.height);
  {
    const x = atlasC.getContext('2d'), e = atlasE.getContext('2d');
    e.fillStyle = '#000'; e.fillRect(0, 0, atlasE.width, atlasE.height);
    const H = (i, j, s) => G.hash(i, j, s);
    const ramp = (cols, v) => cols[Math.max(0, Math.min(cols.length - 1, Math.floor(v * cols.length)))];
    TILES.forEach((name, k) => {
      const ox = (k % AT) * TS, oy = Math.floor(k / AT) * TS;
      const put = (i, j, c) => { x.fillStyle = c; x.fillRect(ox + i, oy + j, 1, 1); };
      const glow = (i, j, c) => { e.fillStyle = c; e.fillRect(ox + i, oy + j, 1, 1); };
      for (let j = 0; j < TS; j++) for (let i = 0; i < TS; i++) {
        const n = H(i, j, k) * 0.6 + H(i >> 1, j >> 1, k + 9) * 0.4;
        if (name === 'roca' || name === 'cima') {
          const cols = name === 'cima' ? ['#1c2230', '#232a3a', '#2a3244', '#323c50'] : ['#1a1e2a', '#222838', '#2a3042', '#343c52'];
          let c = ramp(cols, n);
          if ((i + j * 3) % 11 === 0 && H(i, j, 77) > 0.6) c = '#12141e'; // grietas
          if (name === 'cima' && j < 2 && H(i, 0, 5) > 0.3) c = '#2e4a4a';
          put(i, j, c);
        } else if (name === 'musgo') {
          put(i, j, ramp(['#0e2226', '#143036', '#1a3a3e', '#20484a'], n));
          if (H(i, j, 31) > 0.975) { put(i, j, '#6affe0'); glow(i, j, '#2ad8b0'); }
          else if (H(i, j, 32) > 0.9) put(i, j, '#2a5a58');
        } else if (name === 'roja') {
          put(i, j, ramp(['#2a0a14', '#3a0e1a', '#4a1422', '#5a1a2a'], n));
          if (H(i, j, 41) > 0.965) { put(i, j, '#ff6a80'); glow(i, j, '#ff2a4a'); }
          else if (H(i, j, 42) > 0.8 && j % 2) put(i, j, '#a83040');
        } else if (name === 'senda') {
          put(i, j, ramp(['#2a2226', '#342a2c', '#3e3232', '#4a3c38'], n));
          if (H(i, j, 51) > 0.92) put(i, j, '#5a4c48');
        } else if (name === 'pared' || name === 'acantilado') {
          const band = Math.floor((j + (H(i >> 2, 0, k) * 3 | 0)) / 4) % 2;
          const cols = name === 'pared' ? ['#161a26', '#1e2432', '#262e3e', '#2e384a'] : ['#0c0e16', '#12141e', '#181c28', '#1e2432'];
          put(i, j, ramp(cols, n * 0.8 + band * 0.25));
          if (j % 4 === 3 && H(i, j, 61) > 0.4) put(i, j, '#0a0c12');
        } else if (name === 'pared_roja') {
          put(i, j, ramp(['#1e0c14', '#2a1018', '#361420', '#44182a'], n));
          if (Math.abs(((i + j * 0.6) % 7) - 3) < 0.6 && H(i, j, 71) > 0.3) { put(i, j, '#ff4a6a'); glow(i, j, '#c01a3a'); }
        } else if (name === 'madera') {
          const plank = j % 5 === 4;
          put(i, j, plank ? '#1a120e' : ramp(['#3a281c', '#4a3222', '#563c28'], n));
          if (!plank && (i * 7 + j) % 13 === 0) put(i, j, '#2a1c14');
        } else if (name === 'cuarzo') {
          put(i, j, ramp(['#3a2230', '#482a3a', '#563246', '#643a52'], n));
          if (H(i, j, 81) > 0.88) { put(i, j, '#ffc0d4'); glow(i, j, '#ff6a8a'); }
        } else if (name === 'fondo') {
          put(i, j, ramp(['#06141a', '#081a22', '#0a2028'], n));
        } else if (name === 'arena') {
          put(i, j, ramp(['#2a2a30', '#34343a', '#3e3e44'], n));
        }
      }
    });
  }
  const atlasT = G.R.tex(atlasC), atlasET = G.R.tex(atlasE);
  const tileUV = (k, flip) => {
    const u0 = ((k % AT) * TS + 0.02) / atlasC.width, u1 = ((k % AT) * TS + TS - 0.02) / atlasC.width;
    const v1 = 1 - (Math.floor(k / AT) * TS + 0.02) / atlasC.height, v0 = 1 - (Math.floor(k / AT) * TS + TS - 0.02) / atlasC.height;
    return flip ? [u1, v0, u0, v1] : [u0, v0, u1, v1];
  };

  // ── tipos de casilla ──
  const TERR = {
    '#': { h: 110, top: 'cima', side: 'acantilado' },
    '=': { h: 44, top: 'cima', side: 'pared' },
    '-': { h: 14, top: 'roca', side: 'pared' },
    '.': { h: 0, top: 'roca' },
    ',': { h: 0, top: 'musgo' },
    ':': { h: 0, top: 'senda' },
    'r': { h: 0, top: 'roja' },
    'q': { h: 0, top: 'cuarzo' },
    's': { h: 0, top: 'arena' },
    '~': { h: -14, top: 'fondo', side: 'acantilado', water: true },
    '_': { h: -200, top: 'acantilado', side: 'acantilado', pit: true },
    'w': { h: 6, top: 'madera', side: 'madera' },
    '^': { h: 26, top: 'roja', side: 'pared_roja' },
    'x': { h: 50, top: 'cuarzo', side: 'pared_roja' },
  };
  // objetos: letra -> [suelo que va debajo, tipo]
  const OBJ = {
    H: [',', 'hongo'], K: [',', 'hongos'], V: ['r', 'roja'], F: ['r', 'roja_flor'], L: [null, 'farol'], A: [null, 'estalagmita'],
    C: ['r', 'cristal'], T: [null, 'tienda'], S: [null, 'planta'], P: ['q', 'pilar'], B: [null, 'roca'], M: [',', 'hongo_grande'],
  };
  W3.TERR = TERR;

  // ── geometría acumulada ──
  function Geo() { this.p = []; this.u = []; this.n = []; this.c = []; }
  Geo.prototype.quad = function (a, b, c, d, uv, nrm, cols) {
    // a b c d: abajo-izq, abajo-der, arriba-der, arriba-izq
    const [u0, v0, u1, v1] = uv;
    const V = [[a, u0, v0, cols[0]], [b, u1, v0, cols[1]], [c, u1, v1, cols[2]], [a, u0, v0, cols[0]], [c, u1, v1, cols[2]], [d, u0, v1, cols[3]]];
    for (const [p, u, v, k] of V) { this.p.push(p[0], p[1], p[2]); this.u.push(u, v); this.n.push(nrm[0], nrm[1], nrm[2]); this.c.push(k, k, k); }
  };
  Geo.prototype.build = function () {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    return g;
  };

  // ── sprites de pie ──
  const blackTex = G.R.tex(G.pix(1, 1, () => '#000'));
  const shadowTex = (() => {
    const c = G.makeCanvas(32, 16), x = c.getContext('2d');
    const g = x.createRadialGradient(16, 8, 1, 16, 8, 16);
    g.addColorStop(0, 'rgba(0,0,0,0.75)'); g.addColorStop(0.6, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.setTransform(1, 0, 0, 0.5, 0, 4); x.fillStyle = g; x.beginPath(); x.arc(16, 8, 16, 0, 7); x.fill();
    const t = new THREE.CanvasTexture(c); return t;
  })();
  W3.billboard = (spr, o = {}) => {
    const pivot = new THREE.Object3D();
    pivot.rotation.x = -LEAN;
    const mat = new THREE.MeshLambertMaterial({ map: G.R.tex(spr.c), emissiveMap: spr.e ? G.R.tex(spr.e) : blackTex, emissive: new THREE.Color(0xffffff), emissiveIntensity: o.glow != null ? o.glow : 1.6, alphaTest: 0.5, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    mesh.castShadow = o.shadow !== false; mesh.receiveShadow = false;
    pivot.add(mesh);
    const root = new THREE.Group();
    root.add(pivot);
    let blob = null;
    if (o.blob !== false) {
      blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.8 }));
      blob.rotation.x = -Math.PI / 2; blob.position.y = 0.4; blob.renderOrder = 1;
      root.add(blob);
    }
    const bb = { root, pivot, mesh, mat, blob, spr: null, scale: o.scale || 1, w: 0, h: 0 };
    bb.set = (s) => {
      if (s === bb.spr) return;
      bb.spr = s;
      mat.map = G.R.tex(s.c); mat.emissiveMap = s.e ? G.R.tex(s.e) : blackTex;
      if (s.w !== bb.w || s.h !== bb.h) {
        bb.w = s.w; bb.h = s.h;
        const k = bb.scale;
        mesh.scale.set(s.w * k, s.h * SY * k, 1);
        mesh.position.set(0, (s.h * SY * k) / 2, 0);
        if (blob) blob.scale.set(Math.max(12, s.w * 0.9) * k, Math.max(6, s.w * 0.45) * k, 1);
      }
    };
    bb.set(spr);
    bb.place = (x, y, z) => root.position.set(x, y, z);
    return bb;
  };

  // ── agua luminosa ──
  function waterMesh(zone, mask) {
    const mt = new THREE.CanvasTexture(mask); mt.magFilter = THREE.LinearFilter; mt.minFilter = THREE.LinearFilter;
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uT: { value: 0 }, uMask: { value: null }, uCol: { value: new THREE.Color(zone.water || '#1ac8b0') }, uSize: { value: new THREE.Vector2(zone.w * TS, zone.h * TS) } }]),
      vertexShader: [
        'varying vec2 vW; varying vec2 vUv;',
        '#include <fog_pars_vertex>',
        'void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xz; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;',
        '#include <fog_vertex>',
        '}'].join('\n'),
      fragmentShader: `uniform float uT; uniform sampler2D uMask; uniform vec3 uCol; uniform vec2 uSize; varying vec2 vW; varying vec2 vUv;
        #include <fog_pars_fragment>
        float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
        void main(){
          float m = texture2D(uMask, vUv).r; if (m < 0.02) discard;
          vec2 p = floor(vW / 2.0) * 2.0; // ondas en píxeles gruesos
          float w = n(p * 0.05 + vec2(uT*0.25, uT*0.18)) * 0.6 + n(p * 0.11 - vec2(uT*0.3, -uT*0.2)) * 0.4;
          float caust = smoothstep(0.62, 0.7, w) * 0.9;
          float edge = smoothstep(0.35, 0.9, 1.0 - m) * 1.2;
          vec3 c = uCol * (0.18 + w * 0.25) + uCol * caust * 1.4 + uCol * edge * 0.6;
          float spark = step(0.985, h(floor(vW / 2.0) + floor(uT * 3.0)));
          c += vec3(0.8, 1.0, 0.95) * spark * 1.5;
          gl_FragColor = vec4(c, (0.55 + caust * 0.3) * min(1.0, m * 1.6));
          #include <fog_fragment>
        }`,
    });
    m.uniforms.uMask.value = mt;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(zone.w * TS, zone.h * TS), m);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(zone.w * TS / 2, -3, zone.h * TS / 2);
    mesh.renderOrder = 2;
    return mesh;
  }

  // ── rayos de luz de la superficie ──
  const rayMat = () => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 }, uCol: { value: new THREE.Color('#fff0d0') }, uI: { value: 1 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uT; uniform vec3 uCol; uniform float uI; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){
        float f = pow(abs(dot(vN, vV)), 2.2);
        float s = 0.55 + 0.25 * sin(vUv.x * 37.7 + uT * 0.4) + 0.2 * sin(vUv.x * 91.1 - uT * 0.7);
        float fade = smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.7, 1.0, vUv.y));
        gl_FragColor = vec4(uCol * f * s * fade * uI * 0.34, 1.0);
      }`,
  });
  const poolTex = (() => {
    const c = G.makeCanvas(64, 64), x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 2, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();

  // ── polvo en suspensión (brilla dentro de los rayos) ──
  const DUST_N = 900;
  const dustGeo = new THREE.BufferGeometry();
  {
    const p = new Float32Array(DUST_N * 3), s = new Float32Array(DUST_N * 4);
    for (let i = 0; i < DUST_N; i++) {
      p[i * 3] = Math.random() * 520; p[i * 3 + 1] = Math.random() * 170; p[i * 3 + 2] = Math.random() * 360;
      s[i * 4] = Math.random(); s[i * 4 + 1] = Math.random(); s[i * 4 + 2] = Math.random(); s[i * 4 + 3] = Math.random();
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(s, 4));
  }
  const dustMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uT: { value: 0 }, uC: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(520, 170, 360) },
      uShaft: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
      uCol: { value: new THREE.Color('#8aa0b0') }, uSCol: { value: new THREE.Color('#fff4d8') }, uEmb: { value: new THREE.Color('#ff4a6a') },
      uEmbers: { value: 0 }, uSize: { value: 1 }, uScale: { value: 1 }, uAmt: { value: 1 },
    },
    vertexShader: `uniform float uT, uSize, uScale, uAmt, uEmbers; uniform vec3 uC, uBox; uniform vec4 uShaft[3];
      attribute vec4 aSeed; varying float vB; varying float vS; varying float vE;
      void main(){
        vE = step(1.0 - uEmbers, aSeed.w);
        vec3 p = position;
        float sp = 0.4 + aSeed.x;
        p += vec3(sin(uT * 0.3 * sp + aSeed.y * 6.28) * 10.0 + uT * 3.0 * sp, uT * (vE > 0.5 ? 9.0 : 1.5) * sp, cos(uT * 0.25 * sp + aSeed.z * 6.28) * 8.0);
        p = mod(p - uC + uBox * 0.5, uBox) - uBox * 0.5 + uC;
        p.y = mod(position.y + uT * (vE > 0.5 ? 9.0 : 1.5) * sp, uBox.y) - 8.0;
        float s = 0.0;
        for (int i = 0; i < 3; i++) { vec4 sh = uShaft[i]; if (sh.w > 0.0) s += (1.0 - smoothstep(sh.z * 0.5, sh.z * 1.15, distance(p.xz, sh.xy))) * sh.w; }
        vS = clamp(s, 0.0, 1.0);
        float tw = 0.55 + 0.45 * sin(uT * 2.0 * sp + aSeed.w * 30.0);
        vB = (0.18 + vS * 1.9 + vE * 1.2) * tw * step(aSeed.z, uAmt);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * uScale * (0.7 + aSeed.y * 1.1 + vS * 0.6) * (700.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 uCol, uSCol, uEmb; varying float vB; varying float vS; varying float vE;
      void main(){
        vec2 q = abs(gl_PointCoord - 0.5); if (max(q.x, q.y) > 0.5) discard;
        vec3 c = mix(mix(uCol, uSCol, vS), uEmb, vE);
        gl_FragColor = vec4(c * vB, 1.0);
      }`,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);

  // ── luces puntuales: un grupo fijo que se reparte entre las fuentes más cercanas ──
  const NPL = 8;
  const plights = [];
  for (let i = 0; i < NPL; i++) { const l = new THREE.PointLight(0xffffff, 0, 120, 1.6); scene.add(l); plights.push(l); }
  // foco principal (la luz que llega de la superficie), con sombras
  const spot = new THREE.SpotLight(0xfff0d0, 0, 900, 0.3, 0.7, 1);
  spot.castShadow = true;
  spot.shadow.mapSize.setScalar(G.device === 'touch' ? 1024 : 2048);
  spot.shadow.camera.near = 100; spot.shadow.camera.far = 900;
  spot.shadow.bias = -0.0004;
  scene.add(spot, spot.target);
  // luz suave general para que los sprites se lean fuera de las luces
  const fill = new THREE.DirectionalLight(0x6070a0, 0.25);
  fill.position.set(-0.4, 1, 0.8);
  scene.add(fill);

  // ── construir una zona ──
  let Z = null; // zona cargada
  W3.zone = () => Z;
  W3.load = (zone) => {
    if (Z) unload();
    const root = new THREE.Group();
    scene.add(root);
    const rows = zone.map, h = rows.length, w = rows[0].length;
    zone.w = w; zone.h = h;
    const cells = [];
    const objs = [];
    for (let y = 0; y < h; y++) {
      cells[y] = [];
      for (let x = 0; x < w; x++) {
        let ch = rows[y][x] || '#';
        if (OBJ[ch]) { objs.push({ kind: OBJ[ch][1], x, y }); ch = OBJ[ch][0] || zone.base || '.'; }
        const t = TERR[ch] || TERR['.'];
        cells[y][x] = { ch, t, h: t.h };
      }
    }
    // las rocas del borde delantero se recortan para no tapar la vista (quedan como un reborde bajo)
    for (let x = 0; x < w; x++) {
      let last = -1;
      for (let y = 0; y < h; y++) if (cells[y][x].h <= 14) last = y;
      for (let y = last + 1; y < h; y++) if (cells[y][x].h > 14) { cells[y][x].h = 8; cells[y][x].front = true; }
    }
    Z = { def: zone, root, cells, w, h, lights: [], shafts: [], anim: [], props: [], solids: [] };
    const hAt = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 110 : cells[y][x].h);
    Z.hAt = hAt;
    // suelo y paredes
    const geo = new Geo();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = cells[y][x], hh = c.h, X0 = x * TS, X1 = X0 + TS, Z0 = y * TS, Z1 = Z0 + TS;
      const flip = G.hash(x, y, 3) > 0.5;
      // oclusión ambiental: cada esquina se oscurece con las casillas más altas que la rodean
      const aoc = (dx, dy) => {
        let k = 0;
        const sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1;
        if (hAt(x + sx, y) > hh + 4) k++;
        if (hAt(x, y + sy) > hh + 4) k++;
        if (hAt(x + sx, y + sy) > hh + 4) k++;
        return 1 - k * 0.2;
      };
      const top = c.t.pit ? 0.05 : 1;
      geo.quad([X0, hh, Z1], [X1, hh, Z1], [X1, hh, Z0], [X0, hh, Z0], tileUV(TI[c.front ? 'acantilado' : c.t.top], flip), [0, 1, 0],
        [aoc(-1, 1) * top, aoc(1, 1) * top, aoc(1, -1) * top, aoc(-1, -1) * top]);
      const sideT = TI[c.t.side || 'pared'];
      for (const [dx, dy, ax, az, bx, bz, nx, nz] of [[0, 1, X0, Z1, X1, Z1, 0, 1], [0, -1, X1, Z0, X0, Z0, 0, -1], [1, 0, X1, Z1, X1, Z0, 1, 0], [-1, 0, X0, Z0, X0, Z1, -1, 0]]) {
        const nh = hAt(x + dx, y + dy);
        if (nh >= hh) continue;
        for (let yb = nh; yb < hh; yb += TS) {
          const yt = Math.min(hh, yb + TS);
          const [u0, v0, u1, v1] = tileUV(sideT, (x + y) % 2 === 0);
          const frac = (yt - yb) / TS;
          // más oscuro abajo (y casi negro en los abismos)
          const shade = (yy) => { const k = G.clamp((yy - nh) / 40, 0, 1); const base = nh < -100 ? G.clamp((yy + 200) / 200, 0, 1) * 0.8 : 0.45 + k * 0.55; return base; };
          geo.quad([ax, yb, az], [bx, yb, bz], [bx, yt, bz], [ax, yt, az], [u0, v1 - (v1 - v0) * frac, u1, v1], [nx, 0, nz], [shade(yb), shade(yb), shade(yt), shade(yt)]);
        }
      }
    }
    const groundMat = new THREE.MeshLambertMaterial({ map: atlasT, vertexColors: true, emissiveMap: atlasET, emissive: new THREE.Color(0xffffff), emissiveIntensity: zone.moss != null ? zone.moss : 1.2 });
    const ground = new THREE.Mesh(geo.build(), groundMat);
    ground.receiveShadow = true; ground.castShadow = true;
    root.add(ground);
    // agua
    const mask = G.makeCanvas(w * 4, h * 4), mx = mask.getContext('2d');
    let anyWater = false;
    mx.fillStyle = '#000'; mx.fillRect(0, 0, w * 4, h * 4);
    mx.fillStyle = '#fff';
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (cells[y][x].t.water) { mx.fillRect(x * 4, y * 4, 4, 4); anyWater = true; }
    if (anyWater) {
      // borde suave: se difumina la máscara
      const m2 = G.makeCanvas(w * 4, h * 4), m2x = m2.getContext('2d');
      m2x.filter = 'blur(1.5px)'; m2x.drawImage(mask, 0, 0);
      const wm = waterMesh(zone, m2);
      root.add(wm); Z.water = wm;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (cells[y][x].t.water && G.hash(x, y, 9) > 0.8) Z.lights.push({ x: x * TS + 8, y: 2, z: y * TS + 8, col: zone.water || '#1ac8b0', i: 0.5, d: 70 });
    }
    // objetos
    for (const o of objs) addProp(o.kind, o.x * TS + 8, o.y * TS + 8, hAt(o.x, o.y));
    for (const o of zone.lights || []) Z.lights.push({ x: o[0] * TS + 8, y: o[2] || 24, z: o[1] * TS + 8, col: o[3], i: o[4] || 1, d: o[5] || 120, flick: o[6] });
    // rayos de luz
    for (const s of zone.shafts || []) {
      const [sx, sz, r, col, inten] = s;
      const X = sx * TS + 8, Zc = sz * TS + 8;
      const ray = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.35, r, 420, 32, 1, true), rayMat());
      ray.position.set(X - 60, 210, Zc - 50); // inclinado: la luz viene de arriba y un poco de atrás
      ray.rotation.set(-0.24, 0, 0.28);
      ray.material.uniforms.uCol.value.set(col || '#fff0d0');
      ray.material.uniforms.uI.value = inten || 1;
      root.add(ray);
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(r * 2.6, r * 2.6), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(col || '#fff0d0').multiplyScalar(0.28 * (inten || 1)) }));
      pool.rotation.x = -Math.PI / 2; pool.position.set(X, hAt(sx, sz) + 0.6, Zc); pool.renderOrder = 3;
      root.add(pool);
      Z.shafts.push({ x: X, z: Zc, r, col, i: inten || 1, ray, pool });
    }
    // foco con sombras sobre el rayo principal
    if (Z.shafts.length) {
      const s = Z.shafts[0];
      spot.position.set(s.x - 110, 440, s.z - 90);
      spot.target.position.set(s.x, 0, s.z);
      spot.color.set(s.col || '#fff0d0');
      spot.intensity = (zone.spot || 1.6) * s.i;
      spot.angle = Math.atan((s.r * 1.6) / 470);
      spot.penumbra = 0.75;
    } else spot.intensity = 0;
    // ambiente
    hemi.color.set(zone.sky || '#6a7ab0'); hemi.groundColor.set(zone.gnd || '#1a1420'); hemi.intensity = (zone.amb != null ? zone.amb : 0.45) * 2.1;
    fill.color.set(zone.fill || '#6070a0'); fill.intensity = (zone.fillI != null ? zone.fillI : 0.25) * 2.4;
    scene.fog.color.set(zone.fog || '#05060c'); scene.fog.near = zone.fogNear || 560; scene.fog.far = zone.fogFar || 1200;
    scene.background = new THREE.Color(zone.fog || '#05060c');
    // polvo
    const D = zone.dust || {};
    dustMat.uniforms.uCol.value.set(D.col || '#8aa0b0');
    dustMat.uniforms.uSCol.value.set(D.shaft || '#fff4d8');
    dustMat.uniforms.uEmb.value.set(D.ember || '#ff4a6a');
    dustMat.uniforms.uEmbers.value = D.embers || 0;
    dustMat.uniforms.uAmt.value = D.amount != null ? D.amount : 1;
    for (let i = 0; i < 3; i++) {
      const s = Z.shafts[i];
      dustMat.uniforms.uShaft.value[i].set(s ? s.x : 0, s ? s.z : 0, s ? s.r : 0, s ? s.i : 0);
    }
    return Z;
  };
  function unload() {
    Z.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); });
    scene.remove(Z.root);
    Z = null;
  }

  // ── objetos de la maqueta ──
  const flat = (col, emi, ei) => new THREE.MeshLambertMaterial({ color: col, flatShading: true, emissive: emi ? new THREE.Color(emi) : new THREE.Color(0), emissiveIntensity: ei || 0 });
  function jitter(geo, k) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      p.setX(i, p.getX(i) + (G.hash(i, 1, Math.round(y)) - 0.5) * k);
      p.setZ(i, p.getZ(i) + (G.hash(i, 2, Math.round(y)) - 0.5) * k);
    }
    geo.computeVertexNormals();
    return geo;
  }
  function crystal(root, x, y, z, s, col, emi, ei, lean) {
    const g = new THREE.OctahedronGeometry(1, 0);
    const m = new THREE.Mesh(g, flat(col, emi, ei));
    m.scale.set(3 * s, 11 * s, 3 * s);
    m.position.set(x, y + 6 * s, z);
    m.rotation.set(lean[0], lean[1], lean[2]);
    m.castShadow = true;
    root.add(m);
    return m;
  }
  function addProp(kind, x, z, y) {
    const root = Z.root;
    const rnd = (k) => G.hash(Math.round(x), Math.round(z), k);
    const sprite = (name, o) => { const bb = W3.billboard(G.SPR[name], o); bb.place(x + (rnd(1) - 0.5) * 6, y, z + (rnd(2) - 0.5) * 4); root.add(bb.root); return bb; };
    if (kind === 'hongo' || kind === 'hongos') {
      sprite(kind, { glow: 2.2, blob: false });
      Z.lights.push({ x, y: y + 10, z, col: '#3affd8', i: kind === 'hongos' ? 0.9 : 0.6, d: 70, flick: 0.1 });
    } else if (kind === 'hongo_grande') {
      const bb = sprite('hongo', { glow: 2.4, scale: 2.2, blob: false });
      bb.mesh.castShadow = true;
      Z.lights.push({ x, y: y + 20, z, col: '#3affd8', i: 1.3, d: 110, flick: 0.1 });
      Z.solids.push({ x, z, r: 8 });
    } else if (kind === 'roja' || kind === 'roja_flor') {
      const bb = sprite(kind, { glow: 1.8, blob: false });
      Z.anim.push((t) => { bb.pivot.rotation.z = Math.sin(t * 0.03 + x) * 0.05; });
      if (kind === 'roja_flor') Z.lights.push({ x, y: y + 10, z, col: '#ff3a5a', i: 0.5, d: 60, flick: 0.2 });
    } else if (kind === 'farol') {
      sprite('farol', { glow: 2.6 });
      Z.lights.push({ x, y: y + 22, z: z + 2, col: '#ffb060', i: 1.5, d: 150, flick: 0.35 });
      Z.solids.push({ x, z, r: 4 });
    } else if (kind === 'planta') {
      const bb = sprite('planta_off', { glow: 2.2 });
      Z.solids.push({ x, z, r: 6 });
      const L = { x, y: y + 18, z, col: '#7affd8', i: 0.35, d: 90, flick: 0.1 };
      Z.lights.push(L);
      Z.props.push({ kind: 'planta', x, z, bb, light: L });
    } else if (kind === 'estalagmita') {
      const hgt = 26 + rnd(3) * 30, r = 6 + rnd(4) * 5;
      const m = new THREE.Mesh(jitter(new THREE.ConeGeometry(r, hgt, 6, 3), 2.5), flat('#2a3040'));
      m.position.set(x, y + hgt / 2, z); m.castShadow = true; m.receiveShadow = true;
      root.add(m);
      Z.solids.push({ x, z, r: r * 0.8 });
    } else if (kind === 'roca') {
      const m = new THREE.Mesh(jitter(new THREE.DodecahedronGeometry(8, 0), 3), flat('#2a303e'));
      m.scale.set(1.2, 0.8, 1); m.position.set(x, y + 5, z); m.castShadow = true; m.receiveShadow = true;
      root.add(m);
      Z.solids.push({ x, z, r: 9 });
    } else if (kind === 'cristal') {
      const n = 2 + Math.floor(rnd(5) * 3);
      for (let i = 0; i < n; i++) crystal(root, x + (rnd(10 + i) - 0.5) * 10, y, z + (rnd(20 + i) - 0.5) * 8, 0.6 + rnd(30 + i) * 0.7, '#ff9ab0', '#ff2a50', 0.5, [(rnd(40 + i) - 0.5) * 0.7, rnd(50 + i) * 3, (rnd(60 + i) - 0.5) * 0.7]);
      Z.lights.push({ x, y: y + 12, z, col: '#ff3a60', i: 0.8, d: 80, flick: 0.15 });
      Z.solids.push({ x, z, r: 7 });
    } else if (kind === 'tienda') {
      const c = G.makeCanvas(32, 16), cx = c.getContext('2d');
      for (let j = 0; j < 16; j++) for (let i = 0; i < 32; i++) { cx.fillStyle = ['#5a4232', '#6a4e3a', '#4a3428'][(i + (j >> 2)) % 3 === 0 ? 2 : G.hash(i, j, 4) > 0.5 ? 1 : 0]; cx.fillRect(i, j, 1, 1); }
      for (let i = 0; i < 32; i += 8) { cx.fillStyle = '#7ac8b8'; cx.fillRect(i + 3, 10, 2, 1); }
      const tx = G.R.tex(c); tx.wrapS = THREE.RepeatWrapping;
      const g = new THREE.ConeGeometry(22, 40, 7, 1, true);
      const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: tx, flatShading: true, side: THREE.DoubleSide }));
      m.position.set(x, y + 20, z); m.castShadow = true; m.receiveShadow = true;
      root.add(m);
      const door = new THREE.Mesh(new THREE.PlaneGeometry(10, 16), new THREE.MeshBasicMaterial({ color: 0x06040a }));
      door.position.set(x, y + 8, z + 13); door.rotation.x = -0.5;
      root.add(door);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 12, 4), flat('#3a2a20'));
      pole.position.set(x, y + 44, z); root.add(pole);
      Z.solids.push({ x, z, r: 20 });
    } else if (kind === 'pilar') {
      // el pilar de cuarzo: prisma de seis caras, punta y cristales satélite
      const g = new THREE.Group();
      const mat = flat('#ffc4d4', '#ff3060', 0.85);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(15, 19, 150, 6), mat);
      body.position.y = 75; body.castShadow = true; g.add(body);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(15, 42, 6), mat);
      tip.position.y = 171; tip.castShadow = true; g.add(tip);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + 0.3;
        crystal(g, Math.cos(a) * 22, 0, Math.sin(a) * 22, 1.1 + (i % 3) * 0.5, '#ffb0c4', '#ff2a50', 0.7, [Math.sin(a) * 0.5, a, -Math.cos(a) * 0.5]);
      }
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(20, 25, 160, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xff3a6a, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
      shell.position.y = 80; g.add(shell);
      g.position.set(x, y, z);
      root.add(g);
      Z.anim.push((t) => { shell.material.opacity = 0.1 + Math.sin(t * 0.04) * 0.05; mat.emissiveIntensity = 0.75 + Math.sin(t * 0.04) * 0.2; g.rotation.y = Math.sin(t * 0.004) * 0.05; });
      Z.lights.push({ x, y: 90, z: z + 24, col: '#ff3a64', i: 1.5, d: 260, flick: 0.1, pulse: true, always: true });
      Z.solids.push({ x, z, r: 30 });
      Z.pillar = { x, z };
    }
  }

  // ── cámara y luces cada fotograma ──
  const tgt = new THREE.Vector3(), now = new THREE.Vector3();
  let snap = true;
  W3.snap = () => { snap = true; };
  W3.camDist = 640;
  W3.camOffset = { x: 0, z: 0 };
  W3.update = (fx, fz, fy) => {
    if (!Z) return;
    const zd = Z.def;
    const dist = W3.camDist * (zd.zoom || 1);
    // la cámara no se sale del mapa por los lados
    const visW = Math.tan(cam.fov * Math.PI / 360) * dist * cam.aspect;
    const minX = visW * 0.78, maxX = Z.w * TS - visW * 0.78;
    let tx = fx + W3.camOffset.x;
    tx = minX < maxX ? G.clamp(tx, minX, maxX) : Z.w * TS / 2;
    const tz = G.clamp(fz + W3.camOffset.z, 60, Math.max(60, Z.h * TS - 150));
    tgt.set(tx, fy || 0, tz);
    if (snap) { now.copy(tgt); snap = false; } else now.lerp(tgt, 0.09);
    const sh = G.shake || 0;
    cam.position.set(now.x + (sh ? G.rnd(-sh, sh) : 0), now.y + Math.sin(ELEV) * dist, now.z + Math.cos(ELEV) * dist + (sh ? G.rnd(-sh, sh) * 0.5 : 0));
    cam.lookAt(now.x, now.y, now.z);
    cam.aspect = 16 / 9; cam.updateProjectionMatrix();
    // enfoque en el protagonista
    G.R.focus = cam.position.distanceTo(new THREE.Vector3(fx, (fy || 0) + 16, fz));
    // reparto de luces puntuales
    const t = G.t;
    const cands = Z.lights.map((l) => ({ l, d: l.always ? -1 : Math.hypot(l.x - now.x, (l.z - now.z) * 1.3) - l.i * 30 })).sort((a, b) => a.d - b.d);
    for (let i = 0; i < NPL; i++) {
      const pl = plights[i], c = cands[i];
      if (!c || c.d > 420) { pl.intensity = 0; continue; }
      const l = c.l;
      pl.position.set(l.x, l.y, l.z);
      pl.color.set(l.col);
      let k = l.i;
      if (l.flick) k *= 1 - l.flick * 0.5 + Math.sin(t * 0.23 + l.x) * l.flick * 0.25 + Math.sin(t * 0.61 + l.z) * l.flick * 0.25;
      if (l.pulse) k *= 0.85 + Math.sin(t * 0.04) * 0.15;
      pl.intensity = k * (Z.lightMul || 1); pl.distance = l.d;
    }
    for (const a of Z.anim) a(t);
    for (const s of Z.shafts) { s.ray.material.uniforms.uT.value = t / 60; }
    if (Z.water) Z.water.material.uniforms.uT.value = t / 60;
    dustMat.uniforms.uT.value = t / 60;
    dustMat.uniforms.uC.value.set(now.x, 0, now.z - 30);
    dustMat.uniforms.uScale.value = G.R.renderer.getDrawingBufferSize(new THREE.Vector2()).y / 540;
  };
  // proyecta un punto del mundo a la interfaz (480×270)
  const tmp = new THREE.Vector3();
  W3.project = (x, y, z) => { tmp.set(x, y, z).project(cam); return [(tmp.x + 1) * 240, (1 - tmp.y) * 135, tmp.z]; };
  W3.render = () => G.R.frame('scene', scene, cam);
  W3.TS = TS;
})();
