'use strict';
// ─── Controles táctiles: joystick a la izquierda, botones a la derecha ───
// En combate aparecen los cinco botones de habilidad. Solo se muestran en pantallas táctiles.
(function () {
  const root = document.getElementById('touch');
  const inp = G.input;
  const TU = (G.touchUI = {});
  const el = (tag, cls, txt) => { const e = document.createElement(tag); e.className = cls; if (txt) e.textContent = txt; return e; };

  // joystick flotante
  const zone = el('div', 't-stick-zone'), base = el('div', 't-stick'), knob = el('div', 't-knob');
  base.appendChild(knob); zone.appendChild(base); root.appendChild(zone);
  let sid = null, sx = 0, sy = 0;
  const R = 44;
  zone.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.changedTouches[0]; sid = t.identifier; sx = t.clientX; sy = t.clientY;
    const zr = zone.getBoundingClientRect();
    base.style.left = sx - zr.left - 55 + 'px'; base.style.top = sy - zr.top - 55 + 'px';
    base.classList.add('on');
    G.device = 'touch'; G.audio.unlock();
  }, { passive: false });
  const move = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier !== sid) continue;
      e.preventDefault();
      let dx = t.clientX - sx, dy = t.clientY - sy;
      const l = Math.hypot(dx, dy);
      if (l > R) { dx *= R / l; dy *= R / l; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const nx = dx / R, ny = dy / R;
      inp.stick.x = Math.abs(nx) > 0.15 ? nx : 0; inp.stick.y = Math.abs(ny) > 0.15 ? ny : 0;
      // también como cruceta (para los menús)
      inp.touch.left = nx < -0.55; inp.touch.right = nx > 0.55; inp.touch.up = ny < -0.55; inp.touch.down = ny > 0.55;
    }
  };
  const end = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier !== sid) continue;
      sid = null; inp.stick.x = inp.stick.y = 0;
      inp.touch.left = inp.touch.right = inp.touch.up = inp.touch.down = false;
      knob.style.transform = ''; base.classList.remove('on');
    }
  };
  zone.addEventListener('touchmove', move, { passive: false });
  zone.addEventListener('touchend', end); zone.addEventListener('touchcancel', end);

  // botones
  const pad = el('div', 't-pad');
  root.appendChild(pad);
  const btn = (k, label, cls) => {
    const b = el('div', 't-btn ' + (cls || ''), label);
    b.addEventListener('touchstart', (e) => { e.preventDefault(); G.device = 'touch'; G.audio.unlock(); if (!inp.touch[k]) inp.tap[k] = true; inp.touch[k] = true; b.classList.add('on'); }, { passive: false });
    const up = (e) => { e.preventDefault(); inp.touch[k] = false; b.classList.remove('on'); };
    b.addEventListener('touchend', up, { passive: false }); b.addEventListener('touchcancel', up, { passive: false });
    return b;
  };
  const bA = btn('a', 'A', 't-a'), bB = btn('b', 'B', 't-b'), bX = btn('x', 'ESQ', 't-x'), bJ = btn('j', 'SALTO', 't-y t-j');
  pad.append(bA, bB, bX, bJ);
  const menu = btn('start', '≡', 't-menu');
  root.appendChild(menu);
  const skills = el('div', 't-skills');
  const SK = [['s1', 'Mente', '#8ad8ff'], ['s2', 'Recuerdos', '#ffd070'], ['s3', 'Cuerpo', '#ff8a7a'], ['s4', 'Alma', '#c8a0ff'], ['s5', 'Ser', '#ffffff']];
  const sBtns = SK.map(([k, n, c]) => { const b = btn(k, n, 't-skill'); b.style.setProperty('--c', c); skills.appendChild(b); return b; });
  root.appendChild(skills);

  const rot = el('div', 't-rotate', 'Gira el móvil para jugar mejor');
  root.appendChild(rot);
  let lastKey = '';
  TU.refresh = () => { lastKey = ''; TU.sync(); };
  const IDS = ['mente', 'recuerdos', 'cuerpo', 'alma', 'ser'];
  TU.sync = () => {
    const show = G.device === 'touch';
    // recarga de cada habilidad y la que pide el sello actual
    if (show && G.mode === 'combat' && G.CB.cdFrac) {
      const want = G.CB.sealSkill();
      IDS.forEach((id, i) => {
        const f = G.CB.cdFrac(id);
        sBtns[i].style.setProperty('--cd', Math.round(f * 100) + '%');
        sBtns[i].classList.toggle('want', want === id);
      });
    }
    const combat = G.mode === 'combat';
    const key = show + ':' + combat + ':' + (G.save ? G.save.skills.join() : '');
    if (key === lastKey) return;
    lastKey = key;
    root.style.display = show ? 'block' : 'none';
    skills.style.display = combat ? 'flex' : 'none';
    bX.style.display = combat ? '' : 'none';
    SK.forEach(([, , ], i) => { sBtns[i].style.display = G.save && G.save.skills.includes(['mente', 'recuerdos', 'cuerpo', 'alma', 'ser'][i]) ? '' : 'none'; });
  };
  TU.sync();
})();
