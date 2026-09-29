'use strict';
// ─── Arte: todos los sprites escritos como texto (un carácter = un píxel) ───
// Cada sprite tiene su paleta. Las letras de G.GLOW brillan en la oscuridad (mapa emisivo).
G.ART = {};
G.GLOW = 'cCxXeE';

// El protagonista y los habitantes están en js/prota.js (esqueleto de piezas animadas).

// ── la planta-alma (punto de guardado): dormida y despierta ──
const PAL_PLANTA = {
  k: '#0a1418', g: '#1e4a3c', G: '#2f7a5a', l: '#4fae7a', p: '#b8c8d8', P: '#e6eef6', v: '#6a5a8a',
  c: '#dcfff4', C: '#7affd8', x: '#a8fff0',
};
G.ART.planta = { pal: PAL_PLANTA, rows: [
  '......kk......',
  '....kkPPkk....',
  '...kPpCCpPk...',
  '..kPpCccCpPk..',
  '..kpCcxxcCpk..',
  '..kpCcxxcCpk..',
  '..kPpCccCpPk..',
  '...kPpCCpPk...',
  '..kvkPppPkvk..',
  '.kvpvkkkkvpvk.',
  '.kvvk.kGk.kvvk',
  '..kk..kGk..kk.',
  '.kk...kGk...kk',
  'klGk..kGk..kGl',
  'kGlGk.kgk.kGlk',
  '.kGlGkkgkkGlk.',
  '..kkGGkgkGGk..',
  '....kkggGkk...',
  '...kgGlGGgk...',
  '..kkkkkkkkkk..',
] };
G.ART.planta_off = { pal: Object.assign({}, PAL_PLANTA, { c: '#6a7a88', C: '#4a5a68', x: '#8a9aa8' }), rows: G.ART.planta.rows };

// ── hongo luminoso ──
G.ART.hongo = { pal: { k: '#08121a', c: '#8afff0', C: '#3ac8c0', x: '#e0fffa', s: '#9aa8b0', S: '#5a6870' }, rows: [
  '...kkkk...',
  '..kCccCk..',
  '.kCcxxcCk.',
  'kCccxcccCk',
  'kkkCCCCkkk',
  '...ksSk...',
  '...ksSk...',
  '..kssSSk..',
] };
G.ART.hongos = { pal: G.ART.hongo.pal, rows: [
  '........kkk.....',
  '..kkkk.kCcCk....',
  '.kCccCkkcxcCk...',
  'kCcxxcCkCCCkk...',
  'kccxcccCksk.kkk.',
  'kkCCCCkk.sk.kcCk',
  '..ksSk...sk.kCCk',
  '..ksSk..kssk.sk.',
  '.kssSSk.kssk.sk.',
] };

// ── vegetación roja del pilar ──
G.ART.roja = { pal: { k: '#1a0610', r: '#c02a3a', R: '#7a1628', p: '#ff6a78', x: '#ff9aa8' }, rows: [
  '.....k......k...',
  '....kpk....kpk..',
  '..k.kpRk..kpRk..',
  '.kpkkRpk.kRpk.k.',
  '.kRpkRrkkrRk.kpk',
  '..kRrkRrrRk.kpRk',
  '.k.kRrrRrrkkpRk.',
  'kpk.kRrrRrkRrk..',
  'kRpkkRRrrrRrk...',
  '.kRrrkRRrRRk....',
  '..kkRRrRRkk.....',
  '....kkkkk.......',
] };
G.ART.roja_flor = { pal: { k: '#1a0610', r: '#c02a3a', R: '#7a1628', x: '#ffb0c0', X: '#ff5a78', g: '#5a1a28' }, rows: [
  '..kkk...',
  '.kXxXk..',
  'kXxxxXk.',
  'kXxxxXk.',
  '.kXXXk..',
  '..kgk...',
  '.kkgkk..',
  'kRkgkRk.',
  '.kRgRk..',
  '..kgk...',
] };

// ── farol de la tribu ──
G.ART.farol = { pal: { k: '#0c0a0e', b: '#5a4030', B: '#3a2a20', x: '#ffd88a', X: '#ffa850', o: '#c07a3a' }, rows: [
  '..kkkk..',
  '.kbbbbk.',
  '..kxxk..',
  '.kxXXxk.',
  '.kXxxXk.',
  '.kxXXxk.',
  '..kook..',
  '...kk...',
  '...bk...',
  '...bk...',
  '...bk...',
  '...bk...',
  '...bk...',
  '...bk...',
  '...bk...',
  '...Bk...',
  '...Bk...',
  '..kBBk..',
  '.kBBBBk.',
] };

// ── fragmento de memoria (objeto que flota) ──
G.ART.memoria = { pal: { k: '#1a1030', c: '#fff4d0', C: '#ffd070', x: '#ffffff' }, rows: [
  '...k...',
  '..kCk..',
  '.kCxCk.',
  'kCxcxCk',
  '.kCxCk.',
  '..kCk..',
  '...k...',
] };

// ── fauna del Abismo ──
// polilla de luz (dos aleteos)
const PAL_POLILLA = { k: '#10141c', w: '#c8f0ff', c: '#a8fff0', C: '#5ad8c8' };
G.ART.polilla1 = { pal: PAL_POLILLA, rows: [
  'C.....C',
  'cC.k.Cc',
  '.cCcCc.',
  '..kck..',
] };
G.ART.polilla2 = { pal: PAL_POLILLA, rows: [
  '.......',
  '..Ckc..',
  'cCCcCCc',
  '..kck..',
] };
// grillo de cueva
const PAL_GRILLO = { k: '#0a0a0e', g: '#4a4a3a', G: '#6a6a52', x: '#d8ff9a' };
G.ART.grillo1 = { pal: PAL_GRILLO, rows: [
  'k.....',
  '.kGGk.',
  'kgGGgx',
  'k.k.k.',
] };
G.ART.grillo2 = { pal: PAL_GRILLO, rows: [
  '.k....',
  'k.GGk.',
  '.gGGgx',
  'k...kk',
] };
// pez luminoso (se ve bajo el agua)
G.ART.pez = { pal: { c: '#9affe8', C: '#3ac8b0', x: '#ffffff' }, rows: [
  '..CC..C',
  '.CccCCC',
  'CxcccC.',
  '.CccCCC',
  '..CC..C',
] };
// murciélago (dos aleteos)
const PAL_MURCI = { k: '#06040a', n: '#1a1422', e: '#ff6a7a' };
G.ART.murci1 = { pal: PAL_MURCI, rows: [
  'k.........k',
  'nk.......kn',
  '.nnk.k.knn.',
  '..nnnennn..',
  '....kkk....',
] };
G.ART.murci2 = { pal: PAL_MURCI, rows: [
  '...........',
  '....k.k....',
  '..nnnennn..',
  '.nnk.k.knn.',
  'nk.......kn',
] };
