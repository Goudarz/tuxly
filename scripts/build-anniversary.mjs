#!/usr/bin/env node
/**
 * Anniversary poster.
 *
 * Reusable: pass a name, a year and a label and it renders a square card
 * for social feeds. Square because that is what Telegram, Mastodon and
 * Instagram all crop least — a 16:9 banner loses its edges on every one
 * of them.
 *
 * Built as SVG then rasterised with sharp, no headless browser. The fonts
 * are inlined as base64, otherwise sharp falls back to a system font and
 * the Persian letterforms break.
 *
 * Usage:
 *   node scripts/build-anniversary.mjs \
 *     --name=گنوم --latin=GNOME --since=1997 --out=gnome-29
 *
 * Add --until=2016 only for something that has ended; leaving it off
 * prints an open range and the words "تا امروز".
 */

import { readFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (k, fallback) => args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? fallback;

const name = arg('name', 'گنوم');
const latin = arg('latin', 'GNOME');
const since = Number(arg('since', '1997'));
const year = Number(arg('year', String(new Date().getUTCFullYear())));
/**
 * When it ended. Omit for anything still going — the card then prints an
 * open range, which is how "and still running" is normally written. A
 * closing year would quietly say the opposite.
 */
const until = arg('until');
const out = arg('out', 'anniversary');
const outDir = arg('dir', 'src/assets/posts');

/*
 * Age today for something ongoing; the span it lasted for something that
 * ended. Printing 53 for a person who died at 42 would be counting years
 * that did not happen.
 */
const age = (until ? Number(until) : year) - since;

const INK = '#0F141C';
const AMBER = '#FFB020';
const EMBER = '#E07C10';
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

/** Persian digits, so the big number matches the rest of the card. */
const faDigits = (n) =>
  String(n).replace(/[0-9]/g, (d) => String.fromCharCode(0x06f0 + Number(d)));

/** Confetti, laid out deterministically so reruns produce the same card. */
function confetti() {
  const pieces = [
    [140, 300, 14, -20, AMBER],
    [1060, 250, 11, 35, EMBER],
    [190, 780, 10, 15, MUTED],
    [1010, 830, 13, -40, AMBER],
    [300, 180, 8, 50, EMBER],
    [900, 160, 9, -15, AMBER],
    [120, 560, 9, 25, EMBER],
    [1080, 570, 8, -30, MUTED],
  ];
  return pieces
    .map(
      ([x, y, s, r, fill]) =>
        `<rect x="${x}" y="${y}" width="${s}" height="${s * 2.2}" rx="${s / 2}" ` +
        `fill="${fill}" opacity="0.55" transform="rotate(${r} ${x} ${y})"/>`,
    )
    .join('');
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <defs>
    <style>
      @font-face { font-family: 'Vazirmatn'; src: url('data:font/woff2;base64,${vazir.toString('base64')}') format('woff2'); }
      @font-face { font-family: 'Grotesk'; src: url('data:font/woff2;base64,${grotesk.toString('base64')}') format('woff2'); }
      .fa { font-family: 'Vazirmatn'; }
      .en { font-family: 'Grotesk'; }
    </style>
    <radialGradient id="glow" cx="50%" cy="38%" r="62%">
      <stop offset="0%" stop-color="${AMBER}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${AMBER}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="num" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${AMBER}"/>
      <stop offset="100%" stop-color="${EMBER}"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="1200" fill="${INK}"/>
  <rect width="1200" height="1200" fill="url(#glow)"/>
  <rect width="1200" height="12" fill="${AMBER}"/>
  ${confetti()}

  <text class="fa" x="600" y="300" font-size="44" font-weight="600"
        fill="${MUTED}" text-anchor="middle">${age === 1 ? 'یک سالگی' : 'سالگرد'}</text>

  <!-- The number is the whole point of the card, so it carries the weight. -->
  <text class="fa" x="600" y="620" font-size="300" font-weight="800"
        fill="url(#num)" text-anchor="middle">${faDigits(age)}</text>

  <text class="fa" x="600" y="740" font-size="88" font-weight="800"
        fill="${SNOW}" text-anchor="middle">${name}</text>
  <text class="en" x="600" y="806" font-size="34" font-weight="500"
        fill="${MUTED}" text-anchor="middle" letter-spacing="8">${latin}</text>

  ${
    until
      ? `<text class="en" x="600" y="900" font-size="30" font-weight="500"
             fill="${MUTED}" text-anchor="middle">${since} – ${until}</text>`
      : /*
         * Open range on one line: `1997 — تا امروز`. A bare trailing dash
         * reads as a year that failed to render, and putting the words on a
         * second line splits the date into two things the eye has to join
         * back together.
         *
         * One <text> with tspans rather than three elements, so the range
         * centres as a unit whatever the numbers are.
         */
        `<text class="en" x="600" y="900" font-size="30" font-weight="500"
             fill="${MUTED}" text-anchor="middle">${since}<tspan fill="${AMBER}"
             font-size="36" font-weight="700" dx="16">—</tspan><tspan
             font-family="Vazirmatn" fill="${AMBER}" font-size="27"
             font-weight="600" dx="16">تا امروز</tspan></text>`
  }

  <!-- footer -->
  <rect x="140" y="1010" width="920" height="1.5" fill="${MUTED}" opacity="0.3"/>
  <g transform="translate(600,1090) scale(0.34) translate(-100,-101)">
    <path d="${MARK_BODY}" fill="${SNOW}" fill-rule="evenodd"/>
    <path d="${MARK_BEAK}" fill="${AMBER}"/>
  </g>
  <text class="en" x="600" y="1160" font-size="26" font-weight="600"
        fill="${AMBER}" text-anchor="middle" letter-spacing="2">tuxly.ir</text>
</svg>`;

const dir = join(ROOT, outDir);
await mkdir(dir, { recursive: true });
const file = join(dir, `${out}.png`);
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(file);
console.log(`  ✓ ${outDir}/${out}.png  (1200×1200)  ${name} — ${age}`);
