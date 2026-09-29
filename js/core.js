'use strict';
// ─── Núcleo: utilidades, entrada (teclado, táctil, mando) y reloj ───
const G = (window.G = {});
G.W = 480; G.H = 270; // resolución lógica de la interfaz
G.t = 0;

G.makeCanvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').imageSmoothingEnabled = false;
  return c;
};

// ── utilidades ──
G.rnd = (a, b) => a + Math.random() * (b - a);
G.ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
G.chance = (p) => Math.random() < p;
G.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
G.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
G.lerp = (a, b, t) => a + (b - a) * t;
G.approach = (v, to, d) => (v < to ? Math.min(to, v + d) : Math.max(to, v - d));
G.ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
G.hash = (x, y, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
G.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

// ── entrada ──
// botones lógicos: up down left right a b x y l r start  (y 1..5 = habilidades)
const BTNS = ['up', 'down', 'left', 'right', 'a', 'b', 'x', 'y', 'start', 's1', 's2', 's3', 's4', 's5'];
const inp = (G.input = { held: {}, pressed: {}, kb: {}, tap: {}, touch: {}, stick: { x: 0, y: 0 } });
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  KeyZ: 'a', Space: 'a', Enter: 'a', KeyJ: 'a',
  KeyX: 'b', Backspace: 'b', KeyK: 'b',
  ShiftLeft: 'x', ShiftRight: 'x', KeyC: 'x', KeyL: 'x',
  KeyQ: 'y', KeyI: 'y',
  Escape: 'start', KeyP: 'start', Tab: 'start',
  Digit1: 's1', Digit2: 's2', Digit3: 's3', Digit4: 's4', Digit5: 's5',
  Numpad1: 's1', Numpad2: 's2', Numpad3: 's3', Numpad4: 's4', Numpad5: 's5',
};
G.device = matchMedia('(pointer: coarse)').matches ? 'touch' : 'kb';
addEventListener('keydown', (e) => {
  if (G.audio) G.audio.unlock();
  const b = KEYMAP[e.code];
  if (!b) return;
  if (G.device !== 'kb') { G.device = 'kb'; if (G.touchUI) G.touchUI.refresh(); }
  e.preventDefault();
  if (!inp.kb[b]) inp.tap[b] = true;
  inp.kb[b] = true;
});
addEventListener('keyup', (e) => { const b = KEYMAP[e.code]; if (b) { inp.kb[b] = false; e.preventDefault(); } });
addEventListener('blur', () => { inp.kb = {}; inp.touch = {}; inp.stick.x = inp.stick.y = 0; });

// nombre del botón según el dispositivo, para los textos de ayuda
G.BTN_LABEL = {
  kb: { a: 'Z', b: 'X', x: 'Shift', y: 'Q', start: 'Esc', move: 'WASD', s: '1-5' },
  touch: { a: 'A', b: 'B', x: 'ESQ', y: 'Y', start: '≡', move: 'el joystick', s: 'los botones' },
  pad: { a: 'A', b: 'B', x: 'RB', y: 'Y', start: 'Start', move: 'el stick', s: 'LB+botón' },
};
G.btn = (k) => G.BTN_LABEL[G.device][k] || k;
G.keys = (s) => s.replace(/\[(a|b|x|y|start|move|s)\]/g, (_, k) => G.btn(k));

let padLB = false;
G.pollInput = () => {
  const pad = {};
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let sx = 0, sy = 0;
  for (const p of pads) {
    if (!p) continue;
    const b = (i) => p.buttons[i] && p.buttons[i].pressed;
    const ax = p.axes || [];
    // con LB pulsado, A B X Y = habilidades 1 2 3 4, RB = 5
    padLB = b(4);
    if (padLB) { pad.s1 = b(0); pad.s2 = b(1); pad.s3 = b(2); pad.s4 = b(3); pad.s5 = b(5); }
    else { pad.a = b(0); pad.b = b(1); pad.y = b(3); pad.x = b(5) || b(2) || b(7); }
    pad.start = pad.start || b(9);
    pad.up = pad.up || b(12) || ax[1] < -0.45;
    pad.down = pad.down || b(13) || ax[1] > 0.45;
    pad.left = pad.left || b(14) || ax[0] < -0.45;
    pad.right = pad.right || b(15) || ax[0] > 0.45;
    if (Math.hypot(ax[0] || 0, ax[1] || 0) > 0.2) { sx = ax[0]; sy = ax[1]; }
  }
  if (Object.values(pad).some(Boolean) && G.device !== 'pad') { G.device = 'pad'; if (G.touchUI) G.touchUI.refresh(); }
  for (const k of BTNS) {
    const h = !!(inp.kb[k] || inp.touch[k] || pad[k]);
    inp.pressed[k] = (h || inp.tap[k]) && (!inp.held[k] || inp.tap[k]);
    inp.held[k] = h || !!inp.tap[k];
    inp.tap[k] = false;
  }
  // dirección analógica combinada (teclado, joystick táctil y mando)
  let dx = (inp.held.right ? 1 : 0) - (inp.held.left ? 1 : 0), dy = (inp.held.down ? 1 : 0) - (inp.held.up ? 1 : 0);
  if (inp.stick.x || inp.stick.y) { dx = inp.stick.x; dy = inp.stick.y; }
  else if (sx || sy) { dx = sx; dy = sy; }
  const l = Math.hypot(dx, dy);
  if (l > 1) { dx /= l; dy /= l; }
  G.dir = { x: dx, y: dy };
};
G.dir = { x: 0, y: 0 };
G.pressed = (k) => inp.pressed[k];
G.held = (k) => inp.held[k];
G.consume = () => { for (const k of BTNS) inp.pressed[k] = false; };
