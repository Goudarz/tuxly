#!/usr/bin/env node
/**
 * GitHub social preview image.
 *
 * GitHub renders this at 1280x640 in link previews on Twitter, Slack,
 * Discord and its own repository page. It crops the edges on some
 * surfaces, so everything important stays inside a generous margin.
 *
 * Built as SVG then rasterised with sharp — no headless browser needed.
 * The font is inlined as base64, otherwise sharp falls back to a system
 * font and the Persian letterforms break.
 *
 * Run:  node scripts/build-social-preview.mjs
 * Then: GitHub → Settings → Social preview → Upload an image
 */

import { readFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'og');

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
const faFont = `data:font/woff2;base64,${vazir.toString('base64')}`;
const enFont = `data:font/woff2;base64,${grotesk.toString('base64')}`;

/** Small feature pills along the bottom. */
const PILLS = ['اخبار', 'توزیع‌ها', 'میزکارها', 'آموزش', 'رویدادها'];

function pillRow(y) {
  let x = 1180; // right edge, laid out RTL
  return PILLS.map((label) => {
    const w = label.length * 21 + 46;
    x -= w;
    const box = `<rect x="${x}" y="${y}" width="${w}" height="52" rx="26"
        fill="none" stroke="${MUTED}" stroke-opacity="0.45" stroke-width="1.5"/>`;
    const text = `<text class="fa" x="${x + w / 2}" y="${y + 34}" font-size="24"
        fill="${MUTED}" text-anchor="middle">${label}</text>`;
    x -= 16;
    return box + text;
  }).join('');
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="640" viewBox="0 0 1280 640">
  <defs>
    <style>
      @font-face { font-family: 'Vazirmatn'; src: url('${faFont}') format('woff2'); }
      @font-face { font-family: 'Grotesk'; src: url('${enFont}') format('woff2'); }
      .fa { font-family: 'Vazirmatn'; }
      .en { font-family: 'Grotesk'; }
    </style>
    <radialGradient id="glow" cx="88%" cy="6%" r="70%">
      <stop offset="0%" stop-color="${AMBER}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${AMBER}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1280" height="640" fill="${INK}"/>
  <rect width="1280" height="640" fill="url(#glow)"/>
  <rect width="1280" height="10" fill="${AMBER}"/>

  <!-- mark + wordmark, top right (this is an RTL brand) -->
  <g transform="translate(1088,74) scale(0.68) translate(-21,-26)">
    <path d="${MARK_BODY}" fill="${SNOW}" fill-rule="evenodd"/>
    <path d="${MARK_BEAK}" fill="${AMBER}"/>
  </g>
  <text class="fa" x="1060" y="152" font-size="54" font-weight="800"
        fill="${SNOW}" text-anchor="end">تاکسلی</text>
  <text class="en" x="1060" y="192" font-size="26" font-weight="500"
        fill="${MUTED}" text-anchor="end" letter-spacing="6">TUXLY</text>

  <!-- headline -->
  <text class="fa" x="1180" y="330" font-size="68" font-weight="800"
        fill="${SNOW}" text-anchor="end">دنیای نرم‌افزار آزاد، به فارسی</text>
  <text class="fa" x="1180" y="396" font-size="32" font-weight="500"
        fill="${MUTED}" text-anchor="end">اخبار، معرفی، آموزش و رویدادهای متن‌باز</text>

  ${pillRow(452)}

  <!-- footer strip -->
  <rect x="100" y="556" width="1080" height="1.5" fill="${MUTED}" opacity="0.3"/>
  <text class="en" x="100" y="604" font-size="26" font-weight="600" fill="${SNOW}">tuxly.ir</text>
  <text class="en" x="1180" y="604" font-size="22" font-weight="500"
        fill="${MUTED}" text-anchor="end">AGPL-3.0  ·  CC BY-SA 4.0</text>
</svg>`;

await mkdir(OUT, { recursive: true });
const file = join(OUT, 'github-social-preview.png');
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(file);
console.log('  ✓ public/og/github-social-preview.png  (1280×640)');
console.log('    Upload at: Settings → Social preview → Upload an image');
