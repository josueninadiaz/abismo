'use strict';
// ─── Audio: orquesta sintetizada con WebAudio (arpa, cuerdas, flauta, coro, campanas, taiko) ───
// Todo se genera en vivo. En modo retro los instrumentos pasan a ondas de pulso (chiptune).
// La corrupción del pilar desafina la música poco a poco.
(function () {
  const A = (G.audio = { ctx: null, song: null, musicVol: 0.7, sfxVol: 0.8, retro: false, corrupt: 0 });
  let ctx, master, musicBus, sfxBus, revIn, noiseBuf, ambBus;
  const waves = {};

  function impulse(sec, decay) {
    const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
    }
    return b;
  }
  A.unlock = () => {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = A.ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3;
    master = ctx.createGain(); master.gain.value = 0.85;
    master.connect(comp); comp.connect(ctx.destination);
    const rev = ctx.createConvolver(); rev.buffer = impulse(3.2, 2.6);
    revIn = ctx.createGain(); revIn.gain.value = 0.9;
    const revOut = ctx.createGain(); revOut.gain.value = 0.55;
    revIn.connect(rev); rev.connect(revOut); revOut.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = A.musicVol; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = A.sfxVol; sfxBus.connect(master);
    ambBus = ctx.createGain(); ambBus.gain.value = 0.5; ambBus.connect(master);
    const musicRev = ctx.createGain(); musicRev.gain.value = 0.5; musicBus.connect(musicRev); musicRev.connect(revIn);
    const sfxRev = ctx.createGain(); sfxRev.gain.value = 0.3; sfxBus.connect(sfxRev); sfxRev.connect(revIn);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const pulse = (duty) => {
      const n = 48, re = new Float32Array(n), im = new Float32Array(n);
      for (let i = 1; i < n; i++) im[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
      return ctx.createPeriodicWave(re, im);
    };
    waves.p12 = pulse(0.125); waves.p25 = pulse(0.25); waves.p50 = pulse(0.5);
    setInterval(tick, 25);
    if (A.pending) { const p = A.pending; A.pending = null; A.play(p); }
    if (A.pendingAmb) { const p = A.pendingAmb; A.pendingAmb = null; A.ambient(p); }
  };
  A.setVol = (m, s) => {
    if (m != null) A.musicVol = m;
    if (s != null) A.sfxVol = s;
    if (musicBus) { musicBus.gain.value = A.musicVol; sfxBus.gain.value = A.sfxVol; }
  };

  // ── notas ──
  const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const freq = (n) => {
    const m = /^([A-G](?:#|b)?)(-?\d)$/.exec(n);
    if (!m) return 0;
    return 440 * Math.pow(2, (12 * (+m[2] + 1) + NOTE[m[1]] - 69) / 12);
  };
  // "[a:2 b:2]x3 c:4 (C4,E4,G4):8" -> [{n:[..], len}]
  function parse(str) {
    while (/\[[^[\]]*\]x\d+/.test(str)) str = str.replace(/\[([^[\]]*)\]x(\d+)/g, (_, b, k) => Array(+k).fill(b).join(' '));
    return str.trim().split(/\s+/).filter(Boolean).map((tok) => {
      const i = tok.lastIndexOf(':');
      const n = i < 0 ? tok : tok.slice(0, i), len = i < 0 ? 1 : +tok.slice(i + 1);
      return { n: n.replace(/[()]/g, '').split(','), len };
    });
  }

  // ── instrumentos ──
  const env = (g, t, a, peak, d, sus, rel, end) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setTargetAtTime(peak * sus, t + a, d);
    g.gain.setTargetAtTime(0.0001, end, rel);
  };
  function osc(type, f, t, end, dest, detune = 0) {
    const o = ctx.createOscillator();
    if (waves[type]) o.setPeriodicWave(waves[type]); else o.type = type;
    o.frequency.value = f; o.detune.value = detune + (A.corrupt ? (Math.random() - 0.5) * 70 * A.corrupt : 0);
    o.connect(dest); o.start(t); o.stop(end + 1.2);
    if (A.corrupt > 0.3) { // la luz del pilar hace temblar el tono
      const l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = 3 + Math.random() * 4; lg.gain.value = 18 * A.corrupt;
      l.connect(lg); lg.connect(o.detune); l.start(t); l.stop(end + 1.2);
    }
    return o;
  }
  function noise(t, end, dest) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    s.connect(dest); s.start(t, Math.random()); s.stop(end + 0.5);
    return s;
  }
  function filt(type, f, q, dest) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q || 0.7; b.connect(dest); return b; }
  function gainTo(v, dest) { const g = ctx.createGain(); g.gain.value = v; g.connect(dest); return g; }

  const INST = {
    harp(f, t, dur, v, out) {
      const g = gainTo(0, out); env(g, t, 0.004, v, 0.35, 0.25, 0.5, t + dur + 0.6);
      const lp = filt('lowpass', 3200, 0.5, g); lp.frequency.setTargetAtTime(900, t, 0.3);
      osc('triangle', f, t, t + dur + 2, lp); osc('sine', f * 2, t, t + dur + 2, gainTo(0.25, lp));
    },
    pad(f, t, dur, v, out) {
      const g = gainTo(0, out); env(g, t, 0.6, v, 1, 1, 0.8, t + dur);
      const lp = filt('lowpass', 900, 0.6, g);
      for (const dt of [-9, 0, 8]) osc('sawtooth', f, t, t + dur + 3, gainTo(0.33, lp), dt);
    },
    strings(f, t, dur, v, out) {
      const g = gainTo(0, out); env(g, t, 0.12, v, 0.5, 0.85, 0.25, t + dur);
      const lp = filt('lowpass', 2000, 0.5, g);
      const a = osc('sawtooth', f, t, t + dur + 1, gainTo(0.5, lp), -6), b = osc('sawtooth', f, t, t + dur + 1, gainTo(0.5, lp), 6);
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5.2; lg.gain.value = 7;
      l.connect(lg); lg.connect(a.detune); lg.connect(b.detune); l.start(t); l.stop(t + dur + 1);
    },
    flute(f, t, dur, v, out) {
      const g = gainTo(0, out); env(g, t, 0.07, v, 0.3, 0.8, 0.15, t + dur);
      const o = osc('sine', f, t, t + dur + 1, g); osc('triangle', f * 2, t, t + dur + 1, gainTo(0.12, g));
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(12, t + 0.35);
      l.connect(lg); lg.connect(o.detune); l.start(t); l.stop(t + dur + 1);
      const bn = gainTo(0, filt('bandpass', f * 2, 2, out)); env(bn, t, 0.03, v * 0.25, 0.08, 0.2, 0.1, t + dur);
      noise(t, t + dur + 0.4, bn);
    },
    bell(f, t, dur, v, out) {
      const g = gainTo(0, out); env(g, t, 0.003, v, 1.2, 0.001, 0.8, t + dur + 2);
      const c = osc('sine', f, t, t + 3, g);
      const m = ctx.createOscillator(), mg = ctx.createGain(); m.frequency.value = f * 3.5;
      mg.gain.setValueAtTime(f * 2.2, t); mg.gain.setTargetAtTime(0, t, 0.5);
      m.connect(mg); mg.connect(c.frequency); m.start(t); m.stop(t + 3);
    },
    choir(f, t, dur, v, out) {
      const g = gainTo(0, out); env(g, t, 0.35, v, 0.8, 0.9, 0.5, t + dur);
      const f1 = filt('bandpass', 750, 5, g), f2 = filt('bandpass', 1150, 6, gainTo(0.6, g));
      for (const dt of [-7, 5]) { osc('sawtooth', f, t, t + dur + 2, f1, dt); osc('sawtooth', f, t, t + dur + 2, f2, dt); }
    },
    brass(f, t, dur, v, out) {
      const g = gainTo(0, out); env(g, t, 0.05, v, 0.3, 0.7, 0.12, t + dur);
      const lp = filt('lowpass', 600, 1, g); lp.frequency.setValueAtTime(600, t); lp.frequency.linearRampToValueAtTime(2400, t + 0.08); lp.frequency.setTargetAtTime(1300, t + 0.1, 0.2);
      osc('sawtooth', f, t, t + dur + 1, lp); osc('square', f / 2, t, t + dur + 1, gainTo(0.2, lp));
    },
    bass(f, t, dur, v, out) {
      const g = gainTo(0, out); env(g, t, 0.01, v, 0.4, 0.6, 0.1, t + dur);
      const lp = filt('lowpass', 500, 0.7, g);
      osc('triangle', f, t, t + dur + 1, lp); osc('sine', f / 2, t, t + dur + 1, gainTo(0.5, lp));
    },
    // percusión: n = t (taiko), T (taiko fuerte), s (shaker), h (hat), c (címbalo), k (bombo seco)
    drum(n, t, v, out) {
      if (n === 't' || n === 'T' || n === 'k') {
        const big = n === 'T', g = gainTo(0, out);
        g.gain.setValueAtTime(v * (big ? 1.3 : 1), t); g.gain.exponentialRampToValueAtTime(0.001, t + (big ? 0.9 : 0.45));
        const o = osc('sine', 110, t, t + 1, g); o.frequency.setValueAtTime(n === 'k' ? 140 : 120, t); o.frequency.exponentialRampToValueAtTime(big ? 42 : 55, t + 0.25);
        const ng = gainTo(0, filt('lowpass', 900, 0.7, out)); ng.gain.setValueAtTime(v * 0.6, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        noise(t, t + 0.2, ng);
      } else {
        const hp = filt(n === 's' ? 'bandpass' : 'highpass', n === 's' ? 6000 : 7000, 1, out), g = gainTo(0, hp);
        const len = n === 'c' ? 1.4 : n === 's' ? 0.09 : 0.05;
        g.gain.setValueAtTime(v * (n === 'c' ? 0.5 : 0.35), t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
        noise(t, t + len + 0.1, g);
      }
    },
    // modo retro
    chip(f, t, dur, v, out, w) {
      const g = gainTo(0, out); env(g, t, 0.005, v * 0.55, 0.12, 0.6, 0.04, t + dur * 0.92);
      osc(w, f, t, t + dur + 0.4, g);
    },
  };
  const RETRO = { harp: 'p25', flute: 'p50', strings: 'p12', pad: 'p12', choir: 'p25', brass: 'p50', bell: 'p25', bass: 'triangle' };

  // ── canciones ──
  // ch: { i: instrumento, v: volumen, n: notas } · pasos de semicorchea
  const S = (A.SONGS = {});
  const arp = (chords, per = 16, len = 1, pat = [0, 1, 2, 1]) =>
    chords.map((c) => Array.from({ length: per / len }, (_, i) => c[pat[i % pat.length] % c.length] + ':' + len).join(' ')).join(' ');
  const held = (chords, len = 16) => chords.map((c) => '(' + c.join(',') + '):' + len).join(' ');

  // Tema principal: «Lo que la luz olvidó» (re menor)
  const DM = [['D3', 'A3', 'F4', 'A3'], ['A#2', 'F3', 'D4', 'F3'], ['F2', 'C3', 'A3', 'C3'], ['C3', 'G3', 'E4', 'G3'], ['D3', 'A3', 'F4', 'A3'], ['G2', 'D3', 'A#3', 'D3'], ['A2', 'E3', 'C#4', 'E3'], ['A2', 'E3', 'C#4', 'A3']];
  S.title = { bpm: 72, ch: [
    { i: 'harp', v: 0.2, n: arp(DM, 16, 2, [0, 1, 2, 3]) },
    { i: 'flute', v: 0.13, n: 'r:16 A4:6 G4:2 F4:4 E4:4 D4:12 C4:4 F4:6 G4:2 A4:4 C5:4 A#4:8 A4:8 r:16 D5:6 C5:2 A#4:4 A4:4 G4:8 F4:4 E4:4 E4:16' },
    { i: 'pad', v: 0.07, n: held([['D3', 'F3', 'A3'], ['A#2', 'D3', 'F3'], ['F2', 'A2', 'C3'], ['C3', 'E3', 'G3'], ['D3', 'F3', 'A3'], ['G2', 'A#2', 'D3'], ['A2', 'C#3', 'E3'], ['A2', 'C#3', 'E3']]) },
    { i: 'bass', v: 0.16, n: 'D2:16 A#1:16 F2:16 C2:16 D2:16 G1:16 A1:16 A1:16' },
    { i: 'bell', v: 0.05, n: '[r:14 A5:2]x2 r:16 r:14 C6:2 r:16 [r:14 D6:2]x2 r:16 r:14 E6:2' },
  ] };
  // Gruta del despertar: casi solo aire
  S.gruta = { bpm: 60, ch: [
    { i: 'pad', v: 0.06, n: held([['D3', 'A3', 'E4'], ['A#2', 'F3', 'D4'], ['G2', 'D3', 'A3'], ['A2', 'E3', 'C#4']], 32) },
    { i: 'bell', v: 0.06, n: 'r:8 A5:8 r:12 E5:4 r:16 D5:8 r:8 F5:8 r:16 r:8 C#5:8 r:16 A4:16' },
    { i: 'harp', v: 0.08, n: 'r:28 D4:2 E4:2 r:28 F4:2 A4:2 r:28 G4:2 D4:2 r:28 E4:2 C#4:2' },
  ] };
  // Aldea Nhar: arpa y flauta, cálida pero triste (la menor dórico)
  const AM = [['A2', 'E3', 'A3', 'C4'], ['G2', 'D3', 'G3', 'B3'], ['F2', 'C3', 'F3', 'A3'], ['D3', 'A3', 'D4', 'F#4'], ['A2', 'E3', 'A3', 'C4'], ['G2', 'D3', 'G3', 'B3'], ['F2', 'C3', 'A3', 'C4'], ['E2', 'B2', 'E3', 'G#3']];
  S.aldea = { bpm: 88, ch: [
    { i: 'harp', v: 0.17, n: arp(AM, 16, 2, [0, 1, 2, 3, 2, 1, 3, 1]) },
    { i: 'flute', v: 0.12, n: 'E5:4 D5:2 C5:2 D5:4 E5:4 D5:6 B4:2 G4:8 C5:4 A4:2 G4:2 A4:4 C5:4 D5:8 F#5:8 E5:4 D5:2 C5:2 D5:4 E5:4 G5:6 E5:2 D5:8 C5:4 B4:4 A4:4 C5:4 B4:8 G#4:8' },
    { i: 'bass', v: 0.15, n: 'A1:8 E2:8 G1:8 D2:8 F1:8 C2:8 D2:8 A1:8 A1:8 E2:8 G1:8 D2:8 F1:8 C2:8 E2:8 B1:8' },
    { i: 'drum', v: 0.1, n: '[t:4 s:2 s:2 k:4 s:2 s:2]x8' },
  ] };
  // Senda de las Raíces: la luz del pilar se oye (se desafina con la corrupción)
  S.senda = { bpm: 66, ch: [
    { i: 'pad', v: 0.07, n: held([['E3', 'B3', 'G4'], ['F3', 'C4', 'A4'], ['E3', 'B3', 'G4'], ['D#3', 'A#3', 'F#4']], 32) },
    { i: 'bell', v: 0.07, n: 'B5:4 r:4 F5:4 r:20 C6:4 r:4 G5:4 r:20 B5:4 r:4 E5:4 r:20 A#5:4 r:4 F#5:4 r:20' },
    { i: 'choir', v: 0.04, n: 'r:32 E4:32 r:32 D#4:32' },
    { i: 'bass', v: 0.12, n: 'E1:32 F1:32 E1:32 D#1:32' },
  ] };
  // Combate: taiko y cuerdas en ostinato (re menor)
  S.combate = { bpm: 138, ch: [
    { i: 'strings', v: 0.09, n: '[D4:1 D4:1 F4:1 D4:1 A4:1 D4:1 F4:1 D4:1]x4 [A#3:1 A#3:1 D4:1 A#3:1 F4:1 A#3:1 D4:1 A#3:1]x2 [C4:1 C4:1 E4:1 C4:1 G4:1 C4:1 E4:1 C4:1]x2 [D4:1 D4:1 F4:1 D4:1 A4:1 D4:1 F4:1 D4:1]x4 [G3:1 G3:1 A#3:1 G3:1 D4:1 G3:1 A#3:1 G3:1]x2 [A3:1 A3:1 C#4:1 A3:1 E4:1 A3:1 C#4:1 A3:1]x2' },
    { i: 'brass', v: 0.1, n: 'D4:6 A4:2 F4:4 E4:4 D4:6 C4:2 A#3:4 C4:4 D4:6 F4:2 A4:4 C5:4 A#4:8 A4:8 D5:6 C5:2 A#4:4 A4:4 G4:6 F4:2 E4:4 F4:4 G4:8 A4:4 C#5:4 D5:16' },
    { i: 'bass', v: 0.17, n: '[D2:2 D2:1 D2:1 r:2 D2:2]x4 [A#1:2 A#1:1 A#1:1 r:2 A#1:2]x2 [C2:2 C2:1 C2:1 r:2 C2:2]x2 [D2:2 D2:1 D2:1 r:2 D2:2]x4 [G1:2 G1:1 G1:1 r:2 G1:2]x2 [A1:2 A1:1 A1:1 r:2 A1:2]x2' },
    { i: 'drum', v: 0.16, n: '[T:4 t:2 t:2 k:2 t:2 t:2 h:1 h:1 T:4 t:2 k:2 t:4 t:2 h:2]x8' },
    { i: 'choir', v: 0.035, n: 'D4:32 A#3:16 C4:16 D4:32 G3:16 A3:16' },
  ] };
  // El antiguo líder: coro y cuerdas lentas, luego taiko (mi menor)
  S.lider = { bpm: 120, ch: [
    { i: 'choir', v: 0.07, n: 'E4:16 G4:16 F#4:16 D4:16 E4:16 C4:16 B3:16 D#4:16' },
    { i: 'strings', v: 0.08, n: '[E3:2 B3:2 G4:2 B3:2]x4 [D3:2 A3:2 F#4:2 A3:2]x4 [C3:2 G3:2 E4:2 G3:2]x4 [B2:2 F#3:2 D#4:2 F#3:2]x4' },
    { i: 'bass', v: 0.17, n: '[E2:4 E2:2 E2:2 r:4 E2:4]x2 [D2:4 D2:2 D2:2 r:4 D2:4]x2 [C2:4 C2:2 C2:2 r:4 C2:4]x2 [B1:4 B1:2 B1:2 r:4 B1:4]x2' },
    { i: 'drum', v: 0.14, n: '[T:6 t:2 t:4 t:2 t:2 k:4 t:4 T:4 h:2 h:2]x4' },
    { i: 'bell', v: 0.05, n: 'B5:8 r:24 A5:8 r:24 G5:8 r:24 F#5:8 r:24' },
  ] };
  // Recuerdo: campanas y arpa en mayor
  S.recuerdo = { bpm: 76, ch: [
    { i: 'harp', v: 0.16, n: arp([['F3', 'C4', 'A4', 'C4'], ['C3', 'G3', 'E4', 'G3'], ['D3', 'A3', 'F4', 'A3'], ['A#2', 'F3', 'D4', 'F3']], 16, 2, [0, 1, 2, 3]) },
    { i: 'bell', v: 0.07, n: 'C6:8 A5:8 G5:8 E5:8 F5:8 D5:8 A#5:8 A5:8' },
    { i: 'pad', v: 0.05, n: held([['F3', 'A3', 'C4'], ['C3', 'E3', 'G3'], ['D3', 'F3', 'A3'], ['A#2', 'D3', 'F3']]) },
  ] };
  // Combate «a la Cuphead»: swing con bajo que camina, golpes de piano a contratiempo y metales (do menor)
  S.tiro = { bpm: 152, ch: [
    { i: 'brass', v: 0.11, n: 'C5:3 Eb5:1 G5:4 F5:3 Eb5:1 C5:4 Bb4:3 C5:1 Eb5:4 r:8 C5:3 Eb5:1 G5:4 Bb5:3 A5:1 G5:4 F5:3 Eb5:1 F5:4 r:8 Ab5:3 G5:1 F5:4 Eb5:3 D5:1 C5:4 D5:3 Eb5:1 F5:2 G5:2 Eb5:4 r:4 C5:3 Eb5:1 G5:4 F#5:3 G5:1 C6:4 B5:2 G5:2 D5:4 C5:4 r:4' },
    { i: 'harp', v: 0.09, n: '[r:2 (C4,Eb4,G4,Bb4):2 r:2 (C4,Eb4,G4,Bb4):2]x4 [r:2 (Bb3,D4,F4,Ab4):2 r:2 (Bb3,D4,F4,Ab4):2]x4 [r:2 (Ab3,C4,Eb4,G4):2 r:2 (Ab3,C4,Eb4,G4):2]x4 [r:2 (G3,B3,D4,F4):2 r:2 (G3,B3,D4,F4):2]x4' },
    { i: 'bass', v: 0.17, n: 'C2:4 E2:4 G2:4 A2:4 Bb1:4 D2:4 F2:4 G2:4 C2:4 Eb2:4 G2:4 Bb2:4 A2:4 G2:4 F2:4 Eb2:4 Ab1:4 C2:4 Eb2:4 F2:4 G1:4 B1:4 D2:4 F2:4 Ab1:4 C2:4 D2:4 Eb2:4 G1:4 A1:4 B1:4 D2:4' },
    { i: 'drum', v: 0.12, n: '[k:3 h:1 s:3 h:1 k:3 h:1 s:3 h:1]x16' },
  ] };
  // Vals para Oren (re menor, 3/4): bajo en el primer tiempo, acordes en el segundo y el tercero
  S.vals = { bpm: 156, ch: [
    { i: 'strings', v: 0.1, n: 'A4:6 F4:2 E4:2 F4:2 D5:8 C5:2 A#4:2 A4:6 G4:2 F4:2 A4:2 E4:12 A4:6 D5:2 E5:2 F5:2 G5:8 F5:2 E5:2 D5:4 C#5:4 E5:4 A4:12' },
    { i: 'harp', v: 0.1, n: 'r:4 (F3,A3,D4):4 (F3,A3,D4):4 r:4 (F3,A#3,D4):4 (F3,A#3,D4):4 r:4 (F3,A3,C4):4 (F3,A3,C4):4 r:4 (E3,A3,C#4):4 (E3,A3,C#4):4 r:4 (F3,A3,D4):4 (F3,A3,D4):4 r:4 (G3,A#3,D4):4 (G3,A#3,D4):4 r:4 (E3,A3,C#4):4 (E3,A3,C#4):4 r:4 (E3,G3,C#4):4 (E3,G3,C#4):4' },
    { i: 'bass', v: 0.15, n: 'D2:12 A#1:12 F2:12 A1:12 D2:12 G1:12 A1:12 A1:12' },
    { i: 'choir', v: 0.035, n: 'D4:24 C4:24 D4:24 C#4:24' },
    { i: 'bell', v: 0.04, n: 'r:84 A5:12' },
  ] };
  S.victoria = { bpm: 100, loop: false, ch: [
    { i: 'harp', v: 0.2, n: 'D4:1 F4:1 A4:1 D5:1 F5:1 A5:1 D6:10' },
    { i: 'brass', v: 0.12, n: 'r:6 (D4,F#4,A4):10' },
    { i: 'bell', v: 0.08, n: 'r:6 D6:10' },
  ] };

  // ── secuenciador con anticipación ──
  let cur = null;
  A.play = (name, opts = {}) => {
    if (!ctx) { A.pending = name; return; }
    if (A.song === name && !opts.restart) return;
    A.song = name;
    stopCur(opts.fade != null ? opts.fade : 0.8);
    if (!name || !S[name]) { cur = null; return; }
    const song = S[name];
    const bus = ctx.createGain(); bus.gain.value = 0.0001; bus.connect(musicBus);
    bus.gain.setTargetAtTime(1, ctx.currentTime, 0.4);
    cur = { song, bus, t0: ctx.currentTime + 0.1, tracks: song.ch.map((c) => ({ c, notes: parse(c.n), i: 0, at: 0 })), step: 60 / song.bpm / 4 };
  };
  function stopCur(fade) {
    if (!cur) return;
    const b = cur.bus;
    b.gain.cancelScheduledValues(ctx.currentTime);
    b.gain.setTargetAtTime(0.0001, ctx.currentTime, Math.max(0.02, fade / 4));
    setTimeout(() => b.disconnect(), fade * 1000 + 1500);
    cur = null;
  }
  A.stop = (fade = 0.8) => { if (ctx) stopCur(fade); A.song = null; };
  // cada pista se repite por su cuenta (las de la misma longitud van juntas)
  function tick() {
    if (!cur) return;
    const ahead = ctx.currentTime + 0.18;
    for (const tr of cur.tracks) {
      for (;;) {
        if (tr.i >= tr.notes.length) { if (cur.song.loop === false) break; tr.i = 0; }
        const t = cur.t0 + tr.at * cur.step;
        if (t > ahead) break;
        const nt = tr.notes[tr.i];
        if (nt.n[0] !== 'r' && t > ctx.currentTime - 0.05) playNote(tr.c, nt, t, nt.len * cur.step);
        tr.at += nt.len; tr.i++;
      }
    }
  }
  function playNote(c, nt, t, dur) {
    const out = gainTo(1, cur.bus);
    if (c.i === 'drum') { for (const n of nt.n) (A.retro ? chipDrum : INST.drum)(n, t, c.v, out); return; }
    for (const n of nt.n) {
      const f = freq(n);
      if (!f) continue;
      if (A.retro) INST.chip(f, t, dur, c.v, out, RETRO[c.i] || 'p50');
      else INST[c.i](f, t, dur, c.v, out);
    }
  }
  function chipDrum(n, t, v, out) {
    const hp = filt(n === 't' || n === 'T' || n === 'k' ? 'lowpass' : 'highpass', n === 't' || n === 'T' || n === 'k' ? 1200 : 5000, 0.7, out);
    const g = gainTo(0, hp); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + (n === 'T' ? 0.3 : 0.1));
    noise(t, t + 0.4, g);
  }

  // ── ambiente: viento, gotas, grillos, ranas, criaturas lejanas, murciélagos y el zumbido del cuarzo ──
  // Cada zona tiene su mezcla. Los grillos y las ranas se callan cuanto más cerca estás del pilar.
  const AMBP = {
    cueva: { wind: 320, windV: 0.35, drips: 0.5, crickets: 0.25, frogs: 0, creature: 0.05, bats: 0.03, hum: 0 },
    aldea: { wind: 280, windV: 0.25, drips: 0.2, crickets: 0.9, frogs: 0.35, creature: 0.02, bats: 0, hum: 0 },
    pilar: { wind: 500, windV: 0.45, drips: 0.2, crickets: 0.35, frogs: 0, creature: 0.04, bats: 0, hum: 1 },
    santuario: { wind: 380, windV: 0.35, drips: 0.45, crickets: 0.1, frogs: 0, creature: 0.05, bats: 0.04, hum: 0.6 },
  };
  let amb = null;
  const pan = (dest, p) => {
    if (!ctx.createStereoPanner) return dest;
    const n = ctx.createStereoPanner(); n.pan.value = p; n.connect(dest); return n;
  };
  A.ambient = (kind) => {
    if (!ctx) { A.pendingAmb = kind; return; }
    if (amb && amb.kind === kind) return;
    if (amb) {
      const a = amb;
      a.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.5);
      clearInterval(a.iv);
      setTimeout(() => { try { a.src.stop(); a.lfo.stop(); for (const o of a.hum) o.stop(); } catch (e) { /* ya parado */ } a.g.disconnect(); }, 2500);
    }
    amb = null;
    if (!kind) return;
    const P = AMBP[kind] || AMBP.cueva;
    const g = gainTo(0.0001, ambBus); g.gain.setTargetAtTime(1, ctx.currentTime, 1);
    // viento
    const wg = gainTo(P.windV, g);
    const lp = filt('lowpass', P.wind, 0.8, wg);
    const src = noise(ctx.currentTime, ctx.currentTime + 3600, lp);
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 140;
    lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    // zumbido del cuarzo: acorde agudo y trémulo
    const hum = [], humG = gainTo(0, g);
    if (P.hum) {
      for (const f of [1318.5, 1975.5, 2793]) {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.004);
        const og = gainTo(0.33, humG); o.connect(og); o.start(); hum.push(o);
        const tl = ctx.createOscillator(), tg = ctx.createGain(); tl.frequency.value = 0.3 + Math.random() * 0.5; tg.gain.value = 0.25;
        tl.connect(tg); tg.connect(og.gain); tl.start(); hum.push(tl);
      }
    }
    const ev = { g, P, humG };
    const iv = setInterval(() => ambTick(ev), 250);
    amb = { kind, g, src, iv, hum, lfo };
  };
  function ambTick(ev) {
    if (!ctx || ctx.state !== 'running') return;
    const P = ev.P, life = Math.max(0, 1 - A.corrupt * 1.8), now = ctx.currentTime;
    if (P.hum) ev.humG.gain.setTargetAtTime((0.004 + A.corrupt * 0.03) * P.hum, now, 0.5);
    if (G.chance(P.drips * 0.28)) drip(now + Math.random() * 0.2, ev.g);
    if (G.chance(P.crickets * 0.22 * life)) cricket(now + Math.random() * 0.2, ev.g);
    if (G.chance(P.frogs * 0.07 * life)) frog(now + Math.random() * 0.2, ev.g);
    if (G.chance(P.creature * 0.05)) creature(now + Math.random() * 0.2, ev.g);
    if (G.chance(P.bats * 0.05)) bats(now, ev.g);
  }
  function drip(t, out) {
    const d = gainTo(0, pan(out, (Math.random() - 0.5) * 1.4)); d.connect(revIn);
    d.gain.setValueAtTime(0.05 + Math.random() * 0.05, t); d.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    const o = osc('sine', 900 + Math.random() * 900, t, t + 0.3, d); o.frequency.exponentialRampToValueAtTime(1800 + Math.random() * 800, t + 0.08);
  }
  // un grillo: tres o cuatro pulsos muy agudos
  function cricket(t, out) {
    const p = pan(out, (Math.random() - 0.5) * 1.6), f = 4200 + Math.random() * 900, v = 0.012 + Math.random() * 0.018, n = 3 + Math.floor(Math.random() * 3);
    for (let r = 0; r < (Math.random() < 0.5 ? 1 : 2); r++) for (let i = 0; i < n; i++) {
      const s = t + r * 0.4 + i * 0.05, gg = gainTo(0, p);
      gg.gain.setValueAtTime(0, s); gg.gain.linearRampToValueAtTime(v, s + 0.006); gg.gain.linearRampToValueAtTime(0, s + 0.03);
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(gg); o.start(s); o.stop(s + 0.04);
    }
  }
  function frog(t, out) {
    const p = pan(out, (Math.random() - 0.5) * 1.2), f = 110 + Math.random() * 60;
    for (let i = 0; i < 2; i++) {
      const s = t + i * 0.14, bp = filt('bandpass', 420, 3, p), gg = gainTo(0, bp);
      gg.gain.setValueAtTime(0, s); gg.gain.linearRampToValueAtTime(0.09, s + 0.02); gg.gain.exponentialRampToValueAtTime(0.001, s + 0.1);
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(f, s); o.frequency.linearRampToValueAtTime(f * 0.8, s + 0.1); o.connect(gg); o.start(s); o.stop(s + 0.12);
    }
  }
  // una criatura muy lejos, con mucho eco
  function creature(t, out) {
    const p = pan(out, (Math.random() - 0.5) * 1.6), lp = filt('lowpass', 900, 0.7, p), gg = gainTo(0, lp);
    gg.connect(revIn);
    const f = 260 + Math.random() * 180, d = 1 + Math.random() * 0.8;
    gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(0.035, t + 0.3); gg.gain.exponentialRampToValueAtTime(0.001, t + d);
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.62, t + d); o.connect(gg); o.start(t); o.stop(t + d + 0.1);
    const l = ctx.createOscillator(), lgn = ctx.createGain(); l.frequency.value = 5 + Math.random() * 2; lgn.gain.value = 12; l.connect(lgn); lgn.connect(o.detune); l.start(t); l.stop(t + d + 0.1);
  }
  function bats(t, out) {
    const p = pan(out, (Math.random() - 0.5) * 1.8);
    for (let i = 0; i < 3 + Math.floor(Math.random() * 4); i++) {
      const s = t + i * (0.05 + Math.random() * 0.08), gg = gainTo(0, p);
      gg.gain.setValueAtTime(0, s); gg.gain.linearRampToValueAtTime(0.02, s + 0.004); gg.gain.exponentialRampToValueAtTime(0.001, s + 0.03);
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(7500 + Math.random() * 1500, s); o.frequency.exponentialRampToValueAtTime(5500, s + 0.03); o.connect(gg); o.start(s); o.stop(s + 0.04);
    }
  }
  A.batsNow = () => { if (ctx && amb) bats(ctx.currentTime, amb.g); };

  // ── efectos ──
  const SFX = {
    blip() { tone('sine', 1200, 0.03, 0.05); },
    move() { tone('triangle', 880, 0.04, 0.08); },
    ok() { tone('triangle', 988, 0.06, 0.12); tone('triangle', 1318, 0.12, 0.12, 0.06); },
    back() { tone('triangle', 660, 0.08, 0.1); tone('triangle', 494, 0.1, 0.1, 0.05); },
    step() { const t = ctx.currentTime, g = gainTo(0, filt('lowpass', 700, 0.7, sfxBus)); g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06); noise(t, t + 0.1, g); },
    save() { [0, 4, 7, 12, 16].forEach((s, i) => tone('sine', 523.25 * Math.pow(2, s / 12), 1.4, 0.09, i * 0.09, true)); },
    fragment() { [0, 7, 12, 19, 24].forEach((s, i) => tone('sine', 392 * Math.pow(2, s / 12), 2, 0.08, i * 0.12, true)); },
    dodge() { sweep(1800, 400, 0.18, 0.12); },
    swing() { sweep(500, 2400, 0.1, 0.1); },
    hit() { thump(160, 0.2); crunch(0.12, 0.15); },
    hurt() { thump(90, 0.3); tone('square', 180, 0.15, 0.06); },
    block() { tone('triangle', 1600, 0.08, 0.08); tone('triangle', 2400, 0.06, 0.05); },
    warn() { tone('sine', 740, 0.12, 0.1); tone('sine', 740, 0.12, 0.1, 0.15); },
    crystal() { for (let i = 0; i < 5; i++) tone('sine', 1800 + Math.random() * 2400, 0.4, 0.05, i * 0.03, true); },
    shatter() { crunch(0.4, 0.25); for (let i = 0; i < 8; i++) tone('sine', 2000 + Math.random() * 3000, 0.5, 0.04, i * 0.02, true); },
    mente() { sweep(300, 1400, 0.35, 0.12, 'sine'); tone('sine', 1400, 0.4, 0.06, 0.2, true); },
    recuerdos() { [0, 5, 9, 14].forEach((s, i) => tone('triangle', 660 * Math.pow(2, s / 12), 0.7, 0.07, i * 0.06, true)); },
    cuerpo() { thump(220, 0.25); tone('sawtooth', 330, 0.2, 0.05); },
    alma() { [0, 7, 12].forEach((s) => tone('sine', 440 * Math.pow(2, s / 12), 1.4, 0.07, 0, true)); sweep(200, 900, 0.8, 0.05, 'sine'); },
    ser() { [0, 4, 7, 11, 14, 19].forEach((s, i) => tone('sine', 293.66 * Math.pow(2, s / 12), 2.5, 0.07, i * 0.05, true)); thump(60, 0.5); },
    purify() { [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone('triangle', 392 * Math.pow(2, s / 12), 1.6, 0.08, i * 0.07, true)); },
    boom() { thump(50, 0.8); crunch(0.5, 0.3); },
    heart() { thump(70, 0.35); thump(60, 0.3, 0.18); },
    murcielagos() { A.batsNow(); },
    // respiración: inspirar y soltar el aire (ruido filtrado)
    breath() { for (const [d, len, f, v] of [[0, 1.1, 700, 0.09], [1.3, 1.6, 480, 0.07]]) { const t = ctx.currentTime + d, bp = filt('bandpass', f, 1.2, sfxBus), gg = gainTo(0, bp); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(v, t + len * 0.4); gg.gain.linearRampToValueAtTime(0, t + len); bp.frequency.linearRampToValueAtTime(f * (d ? 0.8 : 1.25), t + len); noise(t, t + len + 0.1, gg); } },
    pew() { tone('square', 1400 + Math.random() * 200, 0.04, 0.025); },
    parry() { tone('sine', 1568, 0.25, 0.1, 0, true); tone('sine', 2349, 0.35, 0.08, 0.05, true); },
    tick() { tone('triangle', 2200, 0.03, 0.06); },
    jump() { sweep(260, 700, 0.12, 0.08, 'triangle'); },
    land() { thump(120, 0.12); crunch(0.05, 0.05); },
    splash() { crunch(0.3, 0.2); for (let i = 0; i < 4; i++) tone('sine', 600 + Math.random() * 900, 0.2, 0.04, i * 0.04, true); },
  };
  function tone(type, f, dur, v, delay = 0, rev = false) {
    const t = ctx.currentTime + delay, g = gainTo(0, sfxBus);
    if (rev) g.connect(revIn);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + dur + 0.05);
  }
  function sweep(f0, f1, dur, v, type) {
    const t = ctx.currentTime;
    if (type) {
      const g = gainTo(0, sfxBus); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); o.connect(g); o.start(t); o.stop(t + dur);
      return;
    }
    const bp = filt('bandpass', f0, 2, sfxBus); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = gainTo(0, bp); g.gain.setValueAtTime(v * 3, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noise(t, t + dur + 0.1, g);
  }
  function thump(f, v, delay = 0) {
    const t = ctx.currentTime + delay, g = gainTo(0, sfxBus);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(f * 2, t); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.2); o.connect(g); o.start(t); o.stop(t + 0.4);
  }
  function crunch(dur, v) {
    const t = ctx.currentTime, g = gainTo(0, filt('highpass', 1200, 0.7, sfxBus));
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noise(t, t + dur + 0.1, g);
  }
  A.sfx = (name) => { if (!ctx || !SFX[name]) return; try { SFX[name](); } catch (e) { /* sin audio */ } };
})();
