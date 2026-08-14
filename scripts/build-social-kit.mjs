#!/usr/bin/env node
/**
 * Profile pictures and header banners for every social platform.
 *
 * Each network crops differently, so one image does not fit all:
 *   - avatars are cropped to a circle almost everywhere, so nothing
 *     important may sit near the corners
 *   - banners crop hardest on mobile, and each platform picks a different
 *     safe strip, so the wordmark stays dead centre
 *
 * Built as SVG then rasterised with sharp, no headless browser. The fonts
 * are inlined as base64, otherwise sharp falls back to a system font and
 * the Persian letterforms break.
 *
 * Run:  node scripts/build-social-kit.mjs
 */

import { readFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'brand', 'social');

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

const fonts = `
  @font-face { font-family: 'Vazirmatn'; src: url('data:font/woff2;base64,${vazir.toString('base64')}') format('woff2'); }
  @font-face { font-family: 'Grotesk'; src: url('data:font/woff2;base64,${grotesk.toString('base64')}') format('woff2'); }
  .fa { font-family: 'Vazirmatn'; }
  .en { font-family: 'Grotesk'; }
`;

/** The mark, scaled and centred on a given point. */
function mark(cx, cy, size, body = SNOW) {
  const s = size / 200;
  return (
    `<g transform="translate(${cx},${cy}) scale(${s}) translate(-100,-101)">` +
    `<path d="${MARK_BODY}" fill="${body}" fill-rule="evenodd"/>` +
    `<path d="${MARK_BEAK}" fill="${AMBER}"/>` +
    `</g>`
  );
}

/**
 * Avatar. Square, but every platform masks it to a circle, so the mark is
 * kept well inside the inscribed circle — roughly 70% of the width.
 */
function avatar(size, bg = INK, body = SNOW) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 400 400">
    <defs><style>${fonts}</style>
      <radialGradient id="g" cx="76%" cy="14%" r="86%">
        <stop offset="0%" stop-color="${AMBER}" stop-opacity="0.20"/>
        <stop offset="100%" stop-color="${AMBER}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="400" height="400" fill="${bg}"/>
    <rect width="400" height="400" fill="url(#g)"/>
    ${mark(200, 196, 232, body)}
  </svg>`;
}

/**
 * Banner. The wordmark sits centred because each platform crops a
 * different strip, and the centre is the only region all of them keep.
 */
function banner(w, h, opts = {}) {
  const { tagline = true, scale = 1 } = opts;
  const cy = h / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><style>${fonts}</style>
      <radialGradient id="g" cx="80%" cy="0%" r="90%">
        <stop offset="0%" stop-color="${AMBER}" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="${AMBER}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="${INK}"/>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <rect width="${w}" height="${Math.max(5, Math.round(h * 0.022))}" fill="${AMBER}"/>

    ${mark(w / 2 - 210 * scale, cy, 128 * scale)}
    <text class="en" x="${w / 2 - 120 * scale}" y="${cy - 4 * scale}" font-size="${76 * scale}"
          font-weight="700" fill="${SNOW}">tuxly</text>
    ${
      tagline
        ? `<text class="fa" x="${w / 2 - 120 * scale}" y="${cy + 46 * scale}" font-size="${30 * scale}"
             font-weight="600" fill="${MUTED}">دنیای نرم‌افزار آزاد، به فارسی</text>`
        : ''
    }
    <text class="en" x="${w - 44}" y="${h - 30}" font-size="${22 * scale}" font-weight="500"
          fill="${AMBER}" text-anchor="end" letter-spacing="2">tuxly.ir</text>
  </svg>`;
}

/*
 * Sizes come from each platform's own guidance. Where a network crops the
 * banner differently on mobile than on desktop, the safe area is the middle
 * — which is why nothing but the URL sits near an edge.
 */
const FILES = [
  // avatars
  ['avatar-400.png', avatar(400)],
  ['avatar-512.png', avatar(512)],
  ['avatar-1000.png', avatar(1000)],
  ['avatar-light-400.png', avatar(400, SNOW, INK)],

  // banners, per platform
  ['banner-x-1500x500.png', banner(1500, 500)],
  ['banner-linkedin-page-1128x191.png', banner(1128, 191, { tagline: false, scale: 0.62 })],
  ['banner-linkedin-profile-1584x396.png', banner(1584, 396, { scale: 0.92 })],
  ['banner-mastodon-1500x500.png', banner(1500, 500)],
  ['banner-bluesky-3000x1000.png', banner(3000, 1000, { scale: 2 })],
  ['banner-github-1280x640.png', banner(1280, 640, { scale: 1.1 })],
];

await mkdir(OUT, { recursive: true });
for (const [name, svg] of FILES) {
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(join(OUT, name));
  console.log(`  ✓ public/brand/social/${name}`);
}
console.log(`\n  ${FILES.length} files. See public/brand/social/README.md for where each goes.`);
