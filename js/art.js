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

// ── escena 1: plantas de luz de colores, hongos rojos, el mapa, la inscripción y el artefacto de viaje ──
const PLANTA_LUZ = [
  '....kk..kk..',
  '...kcCk.kCk.',
  '..kcxcCkkcCk',
  '..kCcCk.kCk.',
  '.kk.kCkkkk..',
  'kCk..kgk.kk.',
  'kcCk.kgk.kCk',
  '.kCCkkgkkCck',
  '..kkgkgkgkk.',
  '...kgGgGgk..',
  '..kgGggGgk..',
  '...kkkkkk...',
];
G.ART.planta_azul = { pal: { k: '#08101c', c: '#7ab8ff', C: '#3a6ad8', x: '#e0f0ff', g: '#1e3a4a', G: '#2e5a6a' }, rows: PLANTA_LUZ };
G.ART.planta_verde = { pal: { k: '#08140c', c: '#8aff8a', C: '#3ab85a', x: '#eaffe0', g: '#1e3a2a', G: '#2e5a3a' }, rows: PLANTA_LUZ };
G.ART.planta_morada = { pal: { k: '#120818', c: '#d08aff', C: '#8a3ad8', x: '#f6e6ff', g: '#2a1a3a', G: '#3e2a5a' }, rows: PLANTA_LUZ };
G.ART.hongo_rojo = { pal: { k: '#14040a', c: '#ff6a7a', C: '#c02a44', x: '#ffd0d8', s: '#a8909a', S: '#6a5058' }, rows: [
  '..kkkkkk....',
  '.kCccxcCk...',
  'kCcxccccCk..',
  'kccccxcccCk.',
  'kkCCCCCCCkk.',
  '...ksSk.kkk.',
  '...ksSkkcCk.',
  '..kssSSkCCk.',
  '..kssSSk.sk.',
] };
G.ART.mapa_pared = { pal: { k: '#140c08', p: '#d8c090', P: '#a8905a', l: '#6a5030', r: '#c03040', n: '#3a2a1a', m: '#8a7a50' }, rows: [
  '......kk......',
  '.....krrk.....',
  '.kkkkkrrkkkkk.',
  'kpppPpkkpPpppk',
  'kpmmppllppmppk',
  'kpplmmpplmmPpk',
  'kPpppnlmppplpk',
  'kpmmpplppnpppk',
  'kpplppmmplmmPk',
  'kppnnppppppPpk',
  'kPppmmpplppppk',
  '.kPpppPkpppPk.',
  '..kkkkk.kkkk..',
] };
G.ART.inscripcion = { pal: { k: '#0c0608', s: '#3a3440', S: '#4a4452', x: '#ff4a5a', X: '#a02030' }, rows: [
  'kkkkkkkkkkkk',
  'kSsSsSsSsSSk',
  'ksxX.xXx.xsk',
  'kS.xXx.Xx.Sk',
  'ksxX.x.xXxsk',
  'kS.X.xXx..Sk',
  'ksxXx.x.xXsk',
  'kSsSsSsSsSSk',
  'kkkkkkkkkkkk',
] };
const ARTEFACTO = [
  '....kkkkk.....',
  '...kCcccCk....',
  '..kCcxxxcCk...',
  '..kcx...xck...',
  '..kCcxxxcCk...',
  '...kCcccCk....',
  '....kkkkk.....',
  '.....kCk......',
  '......k.......',
  '...kkkkkkk....',
  '..kSssssSSk...',
  '..kkSSSSSkk...',
  '...ksSssSk....',
  '...ksCcsSk....',
  '...ksSssSk....',
  '...kscCsSk....',
  '...ksSssSk....',
  '..kkSSSSSkk...',
  '.kSssssssSSk..',
  '.kkkkkkkkkkk..',
];
G.ART.artefacto = { pal: { k: '#0a0c14', s: '#5a5e6e', S: '#3a3e4c', c: '#9affe8', C: '#3ac8b0', x: '#ffffff' }, rows: ARTEFACTO };
G.ART.artefacto_off = { pal: { k: '#0a0c14', s: '#4a4e5a', S: '#30333e', c: '#4a5a60', C: '#2e3a40', x: '#6a7a80' }, rows: ARTEFACTO };
