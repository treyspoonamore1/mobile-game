#!/usr/bin/env node
// Generates the pixel-art app icons (no dependencies): a glowing heart with a healer's cross
// on a deep navy/teal backdrop, drawn at 32x32 and upscaled with nearest-neighbour.
//   node tools/make-icons.mjs
// Writes public/icons/icon-192.png, icon-512.png, icon-maskable-512.png and public/favicon.png.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// ------------------------------------------------------------------ PNG writer
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------ art (32x32)
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 255];
const C = {
  out: hex('#181425'), navy: hex('#1a1c2c'), deep: hex('#262b44'), t1: hex('#193c3e'), t2: hex('#1f4d4f'),
  t3: hex('#265c5a'), red: hex('#e43b44'), redHi: hex('#f6757a'), redLo: hex('#a22633'), white: hex('#ffffff'),
  gold: hex('#feae34'), yellow: hex('#fee761'), pink: hex('#ffd0d0'),
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const N = 32;

function heartMask(x, y) {
  // classic implicit heart, centred, ~24px wide
  const u = (x + 0.5 - 16) / 10.2, v = -(y + 0.5 - 17) / 10.2;
  const a = u * u + v * v - 1;
  return a * a * a - u * u * v * v * v <= 0;
}

/** Returns a 32x32 array of RGBA (or null = transparent). */
function art({ background, rounded, heart = true }) {
  const px = Array.from({ length: N * N }, () => null);
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < N && y < N) px[y * N + x] = c; };
  // backdrop with a dithered teal glow
  if (background) {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 16) / 16;
      const lv = (1 - d) * 5.2 + (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.6;
      const ramp = [C.navy, C.deep, C.t1, C.t2, C.t3];
      set(x, y, ramp[Math.max(0, Math.min(4, Math.floor(lv)))]);
    }
    if (rounded) {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const cx = Math.min(x, N - 1 - x), cy = Math.min(y, N - 1 - y);
        if (cx < 4 && cy < 4 && Math.hypot(3.5 - cx, 3.5 - cy) > 4) px[y * N + x] = null;
      }
    }
  }
  if (!heart) return px;
  // heart with top-left light
  const inH = (x, y) => x >= 0 && y >= 0 && x < N && y < N && heartMask(x, y);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (inH(x, y)) {
      const edgeTL = !inH(x - 1, y) || !inH(x, y - 1);
      const edgeBR = !inH(x + 1, y) || !inH(x, y + 1) || !inH(x + 2, y + 1);
      const lobeHi = Math.hypot(x - 10, y - 11) < 1.6;
      set(x, y, lobeHi ? C.pink : edgeTL ? C.redHi : edgeBR ? C.redLo : C.red);
    } else if (inH(x - 1, y) || inH(x + 1, y) || inH(x, y - 1) || inH(x, y + 1)) {
      set(x, y, C.out);
    }
  }
  // healer's cross
  for (let y = 11; y <= 22; y++) for (let x = 14; x <= 17; x++) set(x, y, C.white);
  for (let y = 14; y <= 17; y++) for (let x = 10; x <= 21; x++) set(x, y, C.white);
  for (let y = 11; y <= 22; y++) { set(13, y, y >= 14 && y <= 17 ? C.white : C.redLo); set(18, y, y >= 14 && y <= 17 ? C.white : C.redLo); }
  for (let x = 10; x <= 21; x++) { if (x < 14 || x > 17) { set(x, 13, C.redLo); set(x, 18, C.redLo); } }
  for (let y = 11; y <= 22; y++) set(17, y, y >= 14 && y <= 17 ? C.white : C.pink);
  // sparkles
  const sparkle = (x, y, big) => {
    set(x, y, C.yellow);
    set(x - 1, y, C.gold); set(x + 1, y, C.gold); set(x, y - 1, C.gold); set(x, y + 1, C.gold);
    if (big) { set(x - 2, y, C.gold); set(x + 2, y, C.gold); set(x, y - 2, C.gold); set(x, y + 2, C.gold); set(x, y, C.white); }
  };
  sparkle(25, 6, true);
  sparkle(5, 24, false);
  sparkle(26, 26, false);
  return px;
}

function render(art32, size, artSize, bgArt) {
  const buf = Buffer.alloc(size * size * 4);
  const off = Math.floor((size - artSize) / 2);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let c = null;
      if (bgArt) c = bgArt[Math.floor((y / size) * N) * N + Math.floor((x / size) * N)];
      const ax = x - off, ay = y - off;
      if (ax >= 0 && ay >= 0 && ax < artSize && ay < artSize) {
        const a = art32[Math.floor((ay / artSize) * N) * N + Math.floor((ax / artSize) * N)];
        if (a) c = a;
      }
      if (c) buf.set(c, (y * size + x) * 4);
    }
  }
  return buf;
}

const icons = join(root, 'public', 'icons');
mkdirSync(icons, { recursive: true });
const full = art({ background: true, rounded: true });
const square = art({ background: true, rounded: false, heart: false });
const fg = art({ background: false });
const out = [
  ['icons/icon-192.png', 192, render(full, 192, 192)],
  ['icons/icon-512.png', 512, render(full, 512, 512)],
  // maskable: full-bleed backdrop, heart scaled into the central safe zone
  ['icons/icon-maskable-512.png', 512, render(fg, 512, 384, square)],
  ['favicon.png', 64, render(full, 64, 64)],
];
for (const [name, size, buf] of out) {
  writeFileSync(join(root, 'public', name), png(size, size, buf));
  console.log('wrote public/' + name);
}
