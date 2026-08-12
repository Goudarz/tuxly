#!/usr/bin/env node
/**
 * App icons, generated from the brand mark.
 *
 * The manifest declared three icons that were never produced, so browsers
 * logged a download error on every visit and the install prompt had nothing
 * to show. Generating them from the same geometry as the mark keeps them in
 * step with the logo — no exported PNG to forget to update.
 *
 * Maskable icons need the mark inside a safe circle covering the middle 80%
 * of the canvas: Android crops the rest to whatever shape the launcher uses.
 *
 * Run:  node scripts/build-icons.mjs
 */

import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public');

const INK = '#0F141C';
const AMBER = '#FFB020';
const SNOW = '#FAFAF7';

const MARK_BODY =
  'M 100 26 A 45 45 0 0 0 60 92 C 52 114, 24 136, 21 158 C 18 170, 26 177, 40 177 ' +
  'L 160 177 C 174 177, 182 170, 179 158 C 176 136, 148 114, 140 92 A 45 45 0 0 0 100 26 Z ' +
  'M 64 150 C 64 124, 80 108, 100 108 C 120 108, 136 124, 136 150 C 136 162, 134 171, 132 177 ' +
  'L 68 177 C 66 171, 64 162, 64 150 Z ' +
  'M 83 68 m -8.5 0 a 8.5 8.5 0 1 0 17 0 a 8.5 8.5 0 1 0 -17 0 Z ' +
  'M 117 68 m -8.5 0 a 8.5 8.5 0 1 0 17 0 a 8.5 8.5 0 1 0 -17 0 Z';
const MARK_BEAK = 'M 100 76 Q 111 81 114 90 Q 109 100 100 103 Q 91 100 86 90 Q 89 81 100 76 Z';

/**
 * @param scale fraction of the canvas the mark occupies. Small for maskable,
 *              where the launcher crops the edges away.
 */
function icon({ size, scale = 0.72, bg = INK, fg = SNOW, radius = 0 }) {
  const markW = 158;
  const markH = 151;
  const s = (size * scale) / Math.max(markW, markH);
  const x = size / 2 - (markW * s) / 2 - 21 * s;
  const y = size / 2 - (markH * s) / 2 - 26 * s;

  const background =
    radius > 0
      ? `<rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>`
      : `<rect width="${size}" height="${size}" fill="${bg}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${background}
  <g transform="translate(${x},${y}) scale(${s})">
    <path d="${MARK_BODY}" fill="${fg}" fill-rule="evenodd"/>
    <path d="${MARK_BEAK}" fill="${AMBER}"/>
  </g>
</svg>`;
}

const ICONS = [
  { file: 'favicon-32.png', size: 32, scale: 0.82 },
  { file: 'favicon-192.png', size: 192, scale: 0.72 },
  { file: 'favicon-512.png', size: 512, scale: 0.72 },
  { file: 'icon-512.png', size: 512, scale: 0.72 },
  // iOS applies its own rounding, so ship a square with generous padding.
  { file: 'apple-touch-icon.png', size: 180, scale: 0.64 },
  // Maskable: mark well inside the 80% safe zone.
  { file: 'maskable-1024.png', size: 1024, scale: 0.5 },
];

await mkdir(OUT, { recursive: true });

for (const spec of ICONS) {
  const svg = icon(spec);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(join(OUT, spec.file));
  console.log(`  ✓ public/${spec.file}  (${spec.size}×${spec.size})`);
}
