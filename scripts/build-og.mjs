#!/usr/bin/env node
/**
 * Default social sharing image.
 *
 * Without it, links look lifeless on Telegram and Mastodon — and Telegram
 * is the main channel for a Persian audience. Built as SVG and converted
 * to PNG with sharp, so no headless browser is needed.
 *
 * The font is inlined as base64, otherwise sharp renders Persian with a
 * system fallback and the letterforms break.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public/og');

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

const fontData = await readFile(join(ROOT, 'public/fonts/Vazirmatn.woff2'));
const fontUri = `data:font/woff2;base64,${fontData.toString('base64')}`;

function svg({ bg, fg, title, subtitle, kicker }) {
  const s = 0.62; // مقیاس نشان: 158×151 → ~98×94
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <style>
      @font-face { font-family: 'Vazirmatn'; src: url('${fontUri}') format('woff2'); }
      .t { font-family: 'Vazirmatn'; fill: ${fg}; }
    </style>
  </defs>
  <rect width="1200" height="630" fill="${bg}"/>
  <rect width="1200" height="9" fill="${AMBER}"/>

  <g transform="translate(72,64) scale(${s}) translate(-21,-26)">
    <path d="${MARK_BODY}" fill="${fg}" fill-rule="evenodd"/>
    <path d="${MARK_BEAK}" fill="${AMBER}"/>
  </g>
  <text class="t" x="192" y="132" font-size="58" font-weight="800">تاکسلی</text>

  <text class="t" x="1128" y="120" font-size="22" font-weight="700" fill="${AMBER}"
        text-anchor="end" letter-spacing="3">${kicker}</text>

  <text class="t" x="1128" y="348" font-size="62" font-weight="800" text-anchor="end">${title}</text>
  <text class="t" x="1128" y="428" font-size="34" font-weight="500" fill="${MUTED}"
        text-anchor="end">${subtitle}</text>

  <rect x="72" y="512" width="1056" height="1.5" fill="${MUTED}" opacity="0.35"/>
  <text class="t" x="72" y="572" font-size="26" font-weight="700">tuxly.ir</text>
  <text class="t" x="1128" y="572" font-size="26" font-weight="500" fill="${MUTED}"
        text-anchor="end">نرم‌افزار آزاد و متن‌باز</text>
</svg>`;
}

await mkdir(OUT, { recursive: true });

const variants = [
  {
    name: 'default',
    bg: INK,
    fg: SNOW,
    kicker: 'FREE &amp; OPEN SOURCE',
    title: 'دنیای نرم‌افزار آزاد',
    subtitle: 'اخبار، معرفی، آموزش و رویدادها — به فارسی',
  },
  {
    name: 'default-light',
    bg: SNOW,
    fg: INK,
    kicker: 'FREE &amp; OPEN SOURCE',
    title: 'دنیای نرم‌افزار آزاد',
    subtitle: 'اخبار، معرفی، آموزش و رویدادها — به فارسی',
  },
];

for (const v of variants) {
  const png = await sharp(Buffer.from(svg(v))).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(join(OUT, `${v.name}.png`), png);
  console.log(`  ✓ public/og/${v.name}.png`);
}
