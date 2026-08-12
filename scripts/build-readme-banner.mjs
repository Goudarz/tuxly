#!/usr/bin/env node
/**
 * README banner.
 *
 * GitHub renders the README on both a light and a dark background, and our
 * mark is a solid shape — the dark variant vanishes on dark mode, the light
 * one vanishes on light mode. A banner with its own background sidesteps
 * that entirely: one file, correct everywhere, including the places that
 * ignore `prefers-color-scheme` (npm, packagist, RSS readers, mirrors).
 *
 * 1280x320 keeps it wide but short, so it does not push the first
 * paragraph below the fold.
 *
 * Run:  node scripts/build-readme-banner.mjs
 */

import { readFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'brand');

const INK = '#0F141C';
const AMBER = '#FFB020';
const SNOW = '#FAFAF7';
const MUTED = '#98A1AF';

const MARK_BODY =
  'M 100 26 A 45 45 0 0 0 60 92 C 52 114, 24 136, 21 158 C 18 170, 26 177, 40 177 ' +
  'L 160 177 C 174 177, 182 170, 179 158 C 176 136, 148 114, 140 92 A 45 45 0 0 0 100 26 Z ' +
  'M 64 150 C 64 124, 80 108, 100 108 C 120 108, 136 124, 136 150 C 136 162, 134 171, 132 177 ' +
  'L 68 177 C 66 171, 64 162, 64 150 Z ' +
  'M 83 68 m -8.5 0 a 8.5 8.5 0 1 0 17 0 a 8.5 8.5 0 1 0 -17 0 Z ' +
  'M 117 68 m -8.5 0 a 8.5 8.5 0 1 0 17 0 a 8.5 8.5 0 1 0 -17 0 Z';
const MARK_BEAK = 'M 100 76 Q 111 81 114 90 Q 109 100 100 103 Q 91 100 86 90 Q 89 81 100 76 Z';

const [vazir, grotesk] = await Promise.all([
  readFile(join(ROOT, 'public/fonts/Vazirmatn.woff2')),
  readFile(join(ROOT, 'public/fonts/SpaceGrotesk.woff2')),
]);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="320" viewBox="0 0 1280 320">
  <defs>
    <style>
      @font-face { font-family: 'Vazirmatn'; src: url('data:font/woff2;base64,${vazir.toString('base64')}') format('woff2'); }
      @font-face { font-family: 'Grotesk'; src: url('data:font/woff2;base64,${grotesk.toString('base64')}') format('woff2'); }
      .fa { font-family: 'Vazirmatn'; }
      .en { font-family: 'Grotesk'; }
    </style>
    <radialGradient id="glow" cx="82%" cy="0%" r="80%">
      <stop offset="0%" stop-color="${AMBER}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${AMBER}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1280" height="320" fill="${INK}"/>
  <rect width="1280" height="320" fill="url(#glow)"/>
  <rect width="1280" height="8" fill="${AMBER}"/>

  <!-- mark, left -->
  <g transform="translate(150,160) scale(0.72) translate(-100,-101)">
    <path d="${MARK_BODY}" fill="${SNOW}" fill-rule="evenodd"/>
    <path d="${MARK_BEAK}" fill="${AMBER}"/>
  </g>

  <text class="en" x="250" y="150" font-size="72" font-weight="700" fill="${SNOW}">tuxly</text>
  <text class="fa" x="250" y="212" font-size="34" font-weight="600" fill="${MUTED}">دنیای نرم‌افزار آزاد، به فارسی</text>

  <text class="fa" x="1200" y="140" font-size="27" font-weight="500"
        fill="${MUTED}" text-anchor="end">اخبار · معرفی · آموزش · رویدادها</text>
  <text class="en" x="1200" y="190" font-size="22" font-weight="500"
        fill="${AMBER}" text-anchor="end" letter-spacing="2">tuxly.ir</text>
</svg>`;

await mkdir(OUT, { recursive: true });
const file = join(OUT, 'readme-banner.png');
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(file);
console.log('  ✓ public/brand/readme-banner.png  (1280×320)');
