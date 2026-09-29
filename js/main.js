'use strict';
// ─── Bucle principal, pantalla de título y arranque ───
(function () {
  G.mode = 'title';

  // ── pantalla de título: la maqueta de la Senda con la cámara flotando hacia el pilar ──
  const T = (G.TITLE = { t: 0, i: 0, stage: 'press', items: [] });
  function titleItems() {
    const it = [];
    if (G.hasSave()) it.push(['Continuar', 'continuar']);
    it.push(['Nueva partida', 'nueva']);
    if (G.meta.ended && G.meta.plants.length) it.push(['Regresar a una planta-alma', 'plantas']);
    it.push(['Opciones', 'opciones']);
    return it;
  }
  G.toTitle = () => {
    G.mode = 'title';
    G.scene = null;
    for (const a of G.EX.actors) a.remove();
    G.EX.actors = []; G.EX.player = null;
    G.W3.load(G.ZONES.senda);
    Object.assign(G.R.look, { tint: [1.04, 0.97, 1.0], lift: [0.01, 0, 0.01], sat: 1.05, contrast: 1.08, bloom: 1.2, exposure: 1, corrupt: 0.12, dof: 1, tilt: 0.9 });
    G.W3.snap();
    G.W3.camOffset.x = 0; G.W3.camOffset.z = 0;
    T.t = 0; T.stage = G.audio.ctx ? 'menu' : 'press'; T.i = 0; T.items = titleItems();
    G.R.fade.a = 1;
    if (G.audio.ctx) G.audio.play('title');
    G.audio.ambient(null);
  };
  T.update = () => {
    T.t++;
    if (G.R.fade.a > 0 && !T.leaving) G.R.fade.a = Math.max(0, G.R.fade.a - 0.012);
    // la cámara sube por la senda hacia el pilar, muy despacio
    const k = (Math.sin(T.t * 0.0015 - 1.2) + 1) / 2;
    G.W3.update(15 * 16 + Math.sin(T.t * 0.002) * 30, G.lerp(24 * 16, 12 * 16, k), 0);
    G.audio.corrupt = 0.15;
    if (T.leaving) return;
    if (G.UI.menuOpen()) return;
    if (T.stage === 'press') {
      if (G.ok() || G.pressed('start')) { G.audio.unlock(); G.audio.play('title'); G.audio.sfx('ok'); T.stage = 'menu'; T.items = titleItems(); }
      return;
    }
    if (T.stage === 'plantas') {
      const L = G.meta.plants;
      if (G.pressed('up')) { T.j = (T.j + L.length - 1) % L.length; G.audio.sfx('move'); }
      if (G.pressed('down')) { T.j = (T.j + 1) % L.length; G.audio.sfx('move'); }
      if (G.pressed('b')) { T.stage = 'menu'; G.audio.sfx('back'); }
      if (G.ok()) {
        const p = G.PLANTS.find((q) => q.id === L[T.j]);
        const s = G.readSave() || G.newSave();
        Object.assign(s, { zone: p.zone, x: p.x, y: p.y + 1 });
        start(s);
      }
      return;
    }
    if (G.pressed('up')) { T.i = (T.i + T.items.length - 1) % T.items.length; G.audio.sfx('move'); }
    if (G.pressed('down')) { T.i = (T.i + 1) % T.items.length; G.audio.sfx('move'); }
    if (G.ok()) {
      const id = T.items[T.i][1];
      G.audio.sfx('ok');
      if (id === 'nueva') start(null);
      else if (id === 'continuar') start(G.readSave());
      else if (id === 'plantas') { T.stage = 'plantas'; T.j = 0; }
      else if (id === 'opciones') G.UI.openMenu(true);
    }
  };
  function start(save) {
    T.leaving = true;
    G.audio.stop(1.2);
    let t = 0;
    const a0 = G.R.fade.a;
    const iv = () => {
      t++;
      G.R.fade.a = Math.min(1, a0 + t / 50);
      if (t < 55) return requestAnimationFrame(iv);
      T.leaving = false;
      G.mode = 'explore';
      if (!save) {
        G.save = G.newSave();
        G.save.skills = ['mente', 'cuerpo'];
        G.run(G.STORY.prologo);
      } else {
        G.save = Object.assign(G.newSave(), save);
        G.EX.enter(save.zone, save.x, save.y, save.dir || 'down');
        G.run(function* () { yield G.fade(0, 50); yield G.titleCard(G.ZONES[save.zone].name); });
      }
    };
    iv();
  }
  const GOLD = '#d8bf86';
  // logotipo: letras de la fuente ampliadas ×5, con degradado y contorno fino
  let logo = null;
  function drawLogo(c) {
    const S = 5;
    if (!logo) {
      const s = 'ABISMO', w = G.textW(s) + 2, tc = G.makeCanvas(w, 10), x = tc.getContext('2d');
      G.text(x, s, 1, 0, '#fff4dc', null);
      x.globalCompositeOperation = 'source-atop';
      const gr = x.createLinearGradient(0, 0, 0, 9); gr.addColorStop(0, '#fffaf0'); gr.addColorStop(0.55, '#f0d8c8'); gr.addColorStop(1, '#ff8aa0');
      x.fillStyle = gr; x.fillRect(0, 0, w, 10);
      logo = { c: tc, o: G.tint(tc, '#1a0610'), g: G.tint(tc, '#ff3a60'), w };
    }
    const X = Math.round(240 - (logo.w * S) / 2), Y = 56;
    c.globalAlpha *= 0.35;
    for (const [dx, dy] of [[-4, 0], [4, 0], [0, -4], [0, 4]]) c.drawImage(logo.g, X + dx, Y + dy, logo.w * S, 10 * S);
    c.globalAlpha /= 0.35;
    for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [2, 2], [-2, 2], [0, 4]]) c.drawImage(logo.o, X + dx, Y + dy, logo.w * S, 10 * S);
    c.drawImage(logo.c, X, Y, logo.w * S, 10 * S);
  }
  T.draw = (c) => {
    // logotipo
    const a = Math.min(1, T.t / 120);
    c.globalAlpha = a;
    const gr = c.createLinearGradient(0, 40, 0, 130);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr; c.fillRect(0, 40, 480, 90);
    drawLogo(c);
    c.fillStyle = GOLD; c.fillRect(150, 118, 180, 1); c.fillRect(238, 116, 5, 5);
    c.fillStyle = '#1a0a10'; c.fillRect(239, 117, 3, 3);
    G.textC(c, 'Lo que la luz olvidó', 240, 124, '#e0c8b0');
    c.globalAlpha = 1;
    if (T.t < 60) return;
    if (T.stage === 'press') {
      if (Math.floor(T.t / 40) % 2) G.textC(c, G.keys('Pulsa [a]'), 240, 200, '#f4ecd8');
    } else if (T.stage === 'menu') {
      const h = T.items.length * 16 + 12, y0 = 172;
      G.frame(c, 150, y0, 180, h);
      T.items.forEach(([label], i) => {
        const sel = i === T.i;
        G.textC(c, label, 240, y0 + 8 + i * 16, sel ? '#fff4d0' : '#9a94a8');
        if (sel) { G.text(c, '>', 164 + (Math.floor(G.t / 12) % 2), y0 + 8 + i * 16, GOLD); G.text(c, '<', 312 - (Math.floor(G.t / 12) % 2), y0 + 8 + i * 16, GOLD); }
      });
    } else if (T.stage === 'plantas') {
      const L = G.meta.plants, h = L.length * 14 + 30, y0 = 150;
      G.frame(c, 140, y0, 200, h);
      G.textC(c, '¿A qué planta-alma vuelves?', 240, y0 + 8, GOLD);
      L.forEach((id, i) => {
        const p = G.PLANTS.find((q) => q.id === id), sel = i === T.j;
        G.textC(c, p.name, 240, y0 + 24 + i * 14, sel ? '#fff4d0' : '#9a94a8');
        if (sel) G.text(c, '>', 156, y0 + 24 + i * 14, GOLD);
      });
    }
    G.text(c, 'Prólogo · v0.1', 8, 258, '#5a5468', null);
  };

  // ── bucle ──
  let acc = 0, last = performance.now();
  const TURBO = +new URLSearchParams(location.search).get('turbo') || 0; // solo para pruebas automáticas
  function tick() {
    G.t++;
    G.pollInput();
    if (G.mode === 'title') T.update();
    else if (G.mode === 'explore') { G.stepScene(); G.EX.update(); }
    else if (G.mode === 'combat') { G.stepScene(); G.CB.update(); }
    G.UI.draw();
    if (G.touchUI) G.touchUI.sync();
  }
  function frame(now) {
    requestAnimationFrame(frame);
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    let n = 0;
    if (TURBO) { for (let i = 0; i < TURBO; i++) tick(); acc = 0; n = TURBO; }
    while (acc >= 1 / 60 && n < 4) { tick(); acc -= 1 / 60; n++; }
    if (!n) return;
    if (G.mode === 'combat') G.R.frame('flat');
    else G.W3.render();
  }

  // ── arranque ──
  if (!G.R.ok) {
    document.getElementById('nogl').style.display = 'flex';
    return;
  }
  G.R.resize();
  G.toTitle();
  // modo de prueba: ?zona=aldea&x=5&y=13&flags=permiso,tharn_libre&skills=mente,cuerpo,recuerdos  ·  ?combate=tharn
  const q = new URLSearchParams(location.search);
  if (q.get('zona') || q.get('combate')) {
    G.save = G.newSave();
    G.save.skills = (q.get('skills') || 'mente,cuerpo,recuerdos,alma,ser').split(',');
    for (const f of (q.get('flags') || '').split(',').filter(Boolean)) G.setFlag(f);
    G.mode = 'explore'; G.R.fade.a = 0;
    G.EX.enter(q.get('zona') || 'senda', +(q.get('x') || 15), +(q.get('y') || 16), 'up');
    if (q.get('combate')) G.run(function* () { yield G.combat(q.get('combate')); });
  }
  requestAnimationFrame(frame);
})();
