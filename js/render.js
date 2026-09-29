'use strict';
// ─── Render: WebGL (three.js) + cadena de post-proceso propia ───
// escena 3D → desenfoque de profundidad (tilt-shift) → bloom → gradación de color → interfaz → efectos retro
// El combate 2D y el título pasan por la misma cadena: bloom, viñeta y CRT les sientan igual de bien.
(function () {
  const THREE = window.THREE;
  const R = (G.R = { ok: false });
  if (!THREE) return;
  const cv = document.getElementById('gl');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'high-performance', alpha: false }); } catch (e) { return; }
  R.ok = true;
  R.renderer = renderer;
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.autoClear = true;
  const isGL2 = renderer.capabilities.isWebGL2;
  const HDR = isGL2 || renderer.extensions.get('OES_texture_half_float') ? THREE.HalfFloatType : THREE.UnsignedByteType;

  // ── opciones visuales (se guardan) ──
  const OKEY = 'abismo-opciones';
  R.opt = { retro: false, crt: true, scan: 0.35, dither: false, pixel: false, dof: true, bloom: true, quality: G.device === 'touch' ? 1 : 2 };
  try { Object.assign(R.opt, JSON.parse(localStorage.getItem(OKEY) || '{}')); } catch (e) { /* sin almacenamiento */ }
  R.saveOpt = () => { try { localStorage.setItem(OKEY, JSON.stringify(R.opt)); } catch (e) { /* nada */ } };

  // ── interfaz 2D (480×270) ──
  R.ui = G.makeCanvas(G.W, G.H);
  R.uictx = R.ui.getContext('2d');
  const uiTex = new THREE.CanvasTexture(R.ui);
  uiTex.magFilter = uiTex.minFilter = THREE.NearestFilter; uiTex.generateMipmaps = false;
  // lienzo del combate / pantallas 2D (320×180)
  R.flat = G.makeCanvas(320, 180);
  R.flatctx = R.flat.getContext('2d');
  const flatTex = new THREE.CanvasTexture(R.flat);
  flatTex.magFilter = flatTex.minFilter = THREE.NearestFilter; flatTex.generateMipmaps = false;

  // ── objetivos de render ──
  let W = 0, H = 0, rtScene, rtHalfA, rtHalfB, rtQA, rtQB;
  const mk = (w, h, depth) => {
    const rt = new THREE.WebGLRenderTarget(w, h, { type: HDR, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: !!depth });
    if (depth) { rt.depthTexture = new THREE.DepthTexture(w, h); rt.depthTexture.type = THREE.UnsignedIntType; }
    return rt;
  };
  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    // el juego ocupa el mayor rectángulo 16:9 posible; en móvil vertical queda arriba
    let cw = vw, ch = Math.round(vw * 9 / 16);
    if (ch > vh) { ch = vh; cw = Math.round(vh * 16 / 9); }
    const portrait = vh > vw * 1.2;
    Object.assign(cv.style, { width: cw + 'px', height: ch + 'px', left: Math.round((vw - cw) / 2) + 'px', top: (portrait ? Math.round(Math.min((vh - ch) / 2, vh * 0.12)) : Math.round((vh - ch) / 2)) + 'px' });
    R.view = { x: (vw - cw) / 2, y: parseFloat(cv.style.top), w: cw, h: ch, portrait };
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cap = [960, 1280, 1920][R.opt.quality] || 1280;
    const ow = Math.min(cap, Math.round(cw * dpr)), oh = Math.round(ow * 9 / 16);
    renderer.setSize(ow, oh, false);
    const sw = R.opt.pixel || R.opt.retro ? 640 : ow, sh = Math.round(sw * 9 / 16);
    if (sw === W && sh === H) return;
    W = sw; H = sh;
    for (const rt of [rtScene, rtHalfA, rtHalfB, rtQA, rtQB]) if (rt) { if (rt.depthTexture) rt.depthTexture.dispose(); rt.dispose(); }
    rtScene = mk(W, H, true);
    rtHalfA = mk(W >> 1, H >> 1); rtHalfB = mk(W >> 1, H >> 1);
    rtQA = mk(W >> 2, H >> 2); rtQB = mk(W >> 2, H >> 2);
    if (R.onResize) R.onResize();
  }
  R.resize = resize;
  addEventListener('resize', () => setTimeout(resize, 30));
  addEventListener('orientationchange', () => setTimeout(resize, 250));

  // ── pasadas a pantalla completa ──
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadScene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  quadScene.add(quad);
  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const pass = (fs, uniforms) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false });
  const copyDown = pass(`uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tSrc, vUv + uTexel*vec2(-0.5,-0.5)).rgb + texture2D(tSrc, vUv + uTexel*vec2(0.5,-0.5)).rgb
      + texture2D(tSrc, vUv + uTexel*vec2(-0.5,0.5)).rgb + texture2D(tSrc, vUv + uTexel*vec2(0.5,0.5)).rgb; gl_FragColor = vec4(c*0.25, 1.0); }`,
    { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });
  const bright = pass(`uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThr; varying vec2 vUv;
    void main(){ vec3 c = vec3(0.0);
      for(int i=0;i<4;i++){ vec2 o = vec2(float(i-(i/2)*2)-0.5, float(i/2)-0.5)*uTexel*2.0; c += texture2D(tSrc, vUv+o).rgb; }
      c *= 0.25; float l = max(c.r, max(c.g, c.b)); float k = max(l - uThr, 0.0) / max(l, 0.0001);
      gl_FragColor = vec4(c * k, 1.0); }`,
    { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThr: { value: 0.72 } });
  const blur = pass(`uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tSrc, vUv).rgb * 0.227;
      c += (texture2D(tSrc, vUv + uDir*1.385).rgb + texture2D(tSrc, vUv - uDir*1.385).rgb) * 0.316;
      c += (texture2D(tSrc, vUv + uDir*3.23).rgb + texture2D(tSrc, vUv - uDir*3.23).rgb) * 0.070;
      gl_FragColor = vec4(c, 1.0); }`,
    { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });

  const finalMat = pass(`
    uniform sampler2D tScene, tDepth, tBlur, tBloom, tUI;
    uniform vec2 uSrc, uOut; uniform float uTime, uNear, uFar, uFocus, uDof, uDofRange, uTilt, uTiltY, uDepthOn;
    uniform float uBloom, uVig, uSat, uContrast, uExposure, uCorrupt, uGrain;
    uniform vec3 uTint, uLift;
    uniform vec4 uFade, uFlash;
    uniform float uScan, uCurve, uDither, uPix, uChroma, uUI;
    varying vec2 vUv;
    float lin(float d){ return (uNear*uFar) / (uFar - d*(uFar-uNear)); }
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    float bayer(vec2 p){ vec2 q = mod(floor(p), 4.0); int i = int(q.x + q.y*4.0);
      float m[16]; m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
      for(int k=0;k<16;k++){ if(k==i) return m[k]/16.0; } return 0.0; }
    vec2 curve(vec2 uv){ uv = uv*2.0-1.0; vec2 o = abs(uv.yx)/vec2(6.0, 4.5); uv = uv + uv*o*o*uCurve*3.0; return uv*0.5+0.5; }
    vec3 sceneAt(vec2 uv){
      vec3 c = texture2D(tScene, uv).rgb;
      if (uDof > 0.0) {
        float k = 0.0;
        if (uDepthOn > 0.5) { float z = lin(texture2D(tDepth, uv).x); k = smoothstep(0.0, uDofRange, abs(z - uFocus)); }
        float ty = abs(uv.y - uTiltY) * 2.0; k = max(k * uDof, smoothstep(0.35, 1.05, ty) * uTilt);
        c = mix(c, texture2D(tBlur, uv).rgb, clamp(k, 0.0, 1.0));
      }
      return c;
    }
    void main(){
      vec2 uv = vUv;
      if (uCurve > 0.0) uv = curve(uv);
      // la influencia del pilar tuerce la imagen
      if (uCorrupt > 0.0) uv.x += sin(uv.y*40.0 + uTime*3.0) * 0.0018 * uCorrupt;
      vec2 suv = uv;
      if (uPix > 0.0) suv = (floor(uv * vec2(uPix, uPix*0.5625)) + 0.5) / vec2(uPix, uPix*0.5625);
      vec3 c;
      float ch = uChroma + uCorrupt * 0.004;
      if (ch > 0.0) { vec2 d = (suv - 0.5) * ch; c = vec3(sceneAt(suv + d).r, sceneAt(suv).g, sceneAt(suv - d).b); }
      else c = sceneAt(suv);
      c += texture2D(tBloom, suv).rgb * uBloom;
      // gradación: exposición, tono, curva suave
      c *= uExposure;
      c = c * uTint + uLift;
      c = c / (1.0 + max(c - 0.85, 0.0) * 1.4);
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, uSat);
      c = (c - 0.5) * uContrast + 0.5;
      if (uCorrupt > 0.0) c = mix(c, c * vec3(1.25, 0.72, 0.8), uCorrupt * (0.35 + 0.15 * sin(uTime * 2.0)));
      // viñeta
      vec2 v = vUv - 0.5; c *= 1.0 - dot(v, v) * uVig;
      c += (hash(vUv * uOut + uTime) - 0.5) * uGrain;
      c = mix(c, uFlash.rgb, uFlash.a);
      // fundido y, encima, la interfaz (los textos se leen aunque la escena esté a negro)
      c = mix(c, uFade.rgb, uFade.a);
      if (uUI > 0.0) { vec2 iu = (floor(uv * vec2(480.0, 270.0)) + 0.5) / vec2(480.0, 270.0); vec4 u = texture2D(tUI, iu); c = mix(c, u.rgb, u.a); }
      // retro: tramado, líneas de barrido y bordes del tubo
      if (uDither > 0.0) { float b = bayer(uv * vec2(uPix > 0.0 ? uPix : uSrc.x, (uPix > 0.0 ? uPix : uSrc.x) * 0.5625)) - 0.5; c = floor(c * uDither + 0.5 + b) / uDither; }
      if (uScan > 0.0) { float s = sin(uv.y * 270.0 * 3.14159); c *= 1.0 - uScan * 0.5 * s * s; c *= 1.0 - uScan * 0.08 * sin(uv.x * uOut.x * 2.094); }
      if (uCurve > 0.0) { vec2 e = smoothstep(0.0, 0.012, uv) * smoothstep(0.0, 0.012, 1.0 - uv); c *= e.x * e.y; }
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`, {
    tScene: { value: null }, tDepth: { value: null }, tBlur: { value: null }, tBloom: { value: null }, tUI: { value: uiTex },
    uSrc: { value: new THREE.Vector2() }, uOut: { value: new THREE.Vector2() }, uTime: { value: 0 },
    uNear: { value: 1 }, uFar: { value: 1000 }, uFocus: { value: 500 }, uDof: { value: 0 }, uDofRange: { value: 260 }, uTilt: { value: 0 }, uTiltY: { value: 0.5 }, uDepthOn: { value: 1 },
    uBloom: { value: 0.9 }, uVig: { value: 1.1 }, uSat: { value: 1.05 }, uContrast: { value: 1.05 }, uExposure: { value: 1 }, uCorrupt: { value: 0 }, uGrain: { value: 0.025 },
    uTint: { value: new THREE.Vector3(1, 1, 1) }, uLift: { value: new THREE.Vector3(0, 0, 0) },
    uFade: { value: new THREE.Vector4(0, 0, 0, 0) }, uFlash: { value: new THREE.Vector4(1, 1, 1, 0) },
    uScan: { value: 0 }, uCurve: { value: 0 }, uDither: { value: 0 }, uPix: { value: 0 }, uChroma: { value: 0 }, uUI: { value: 1 },
  });
  const U = finalMat.uniforms;
  R.U = U;

  function run(mat, target) {
    quad.material = mat;
    renderer.setRenderTarget(target);
    renderer.render(quadScene, quadCam);
  }
  function blurPair(a, b, w, h, times, spread) {
    for (let i = 0; i < times; i++) {
      blur.uniforms.tSrc.value = a.texture; blur.uniforms.uDir.value.set(spread / w, 0); run(blur, b);
      blur.uniforms.tSrc.value = b.texture; blur.uniforms.uDir.value.set(0, spread / h); run(blur, a);
    }
  }

  // ── ajustes de imagen que cambian con la zona / la escena ──
  R.look = { exposure: 1, tint: [1, 1, 1], lift: [0, 0, 0], sat: 1.05, contrast: 1.06, vig: 1.15, bloom: 0.9, thr: 0.72, dof: 1, tilt: 0.75, dofRange: 240, corrupt: 0 };
  R.fade = { r: 0, g: 0, b: 0, a: 0 };
  R.flash = { r: 1, g: 1, b: 1, a: 0 };

  // src: 'scene' (3D) o 'flat' (lienzo 2D)
  R.frame = (src, scene3, cam) => {
    if (!W) resize();
    const o = R.opt, L = R.look;
    let srcTex, depth = null, sw = W, sh = H;
    if (src === 'scene') {
      renderer.setRenderTarget(rtScene);
      renderer.render(scene3, cam);
      srcTex = rtScene.texture; depth = rtScene.depthTexture;
    } else {
      flatTex.needsUpdate = true;
      srcTex = flatTex; sw = 320; sh = 180;
    }
    // desenfoque para la profundidad de campo
    const useDof = src === 'scene' && o.dof && L.dof > 0;
    if (useDof) {
      copyDown.uniforms.tSrc.value = srcTex; copyDown.uniforms.uTexel.value.set(1 / W, 1 / H); run(copyDown, rtHalfA);
      blurPair(rtHalfA, rtHalfB, W >> 1, H >> 1, 2, 1.2);
    }
    // bloom
    const useBloom = o.bloom && L.bloom > 0;
    if (useBloom) {
      bright.uniforms.tSrc.value = srcTex; bright.uniforms.uTexel.value.set(1 / sw, 1 / sh); bright.uniforms.uThr.value = L.thr;
      run(bright, rtQA);
      blurPair(rtQA, rtQB, W >> 2, H >> 2, 3, 1.4);
    }
    uiTex.needsUpdate = true;
    U.tScene.value = srcTex; U.tDepth.value = depth; U.tBlur.value = rtHalfA.texture; U.tBloom.value = rtQA.texture;
    const ds = renderer.getDrawingBufferSize(new THREE.Vector2());
    U.uSrc.value.set(sw, sh); U.uOut.value.copy(ds);
    U.uTime.value = G.t / 60;
    if (cam) { U.uNear.value = cam.near; U.uFar.value = cam.far; }
    U.uDof.value = useDof ? L.dof : 0; U.uTilt.value = useDof ? L.tilt : 0; U.uDofRange.value = L.dofRange; U.uDepthOn.value = depth ? 1 : 0;
    U.uFocus.value = R.focus || 500; U.uTiltY.value = R.tiltY != null ? R.tiltY : 0.5;
    U.uBloom.value = useBloom ? L.bloom : 0;
    U.uVig.value = L.vig; U.uSat.value = L.sat; U.uContrast.value = L.contrast; U.uExposure.value = L.exposure * (o.retro ? 1.2 : 1);
    U.uTint.value.set(...L.tint); U.uLift.value.set(...L.lift);
    U.uCorrupt.value = L.corrupt;
    U.uFade.value.set(R.fade.r, R.fade.g, R.fade.b, R.fade.a);
    U.uFlash.value.set(R.flash.r, R.flash.g, R.flash.b, R.flash.a);
    const retro = o.retro;
    U.uScan.value = retro ? Math.max(0.45, o.scan) : o.crt ? o.scan * 0.5 : 0;
    U.uCurve.value = retro && o.crt ? 1 : 0;
    U.uDither.value = retro || o.dither ? (retro ? 10 : 24) : 0;
    U.uPix.value = retro || o.pixel ? 320 : 0;
    U.uChroma.value = retro ? 0.006 : 0.0012;
    U.uGrain.value = retro ? 0.04 : 0.022;
    run(finalMat, null);
  };

  // ── utilidades de texturas ──
  const texCache = new WeakMap();
  R.tex = (canvas) => {
    if (!canvas) return null;
    let t = texCache.get(canvas);
    if (!t) {
      t = new THREE.CanvasTexture(canvas);
      t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
      texCache.set(canvas, t);
    }
    return t;
  };
})();
