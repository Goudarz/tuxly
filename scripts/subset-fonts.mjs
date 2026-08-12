#!/usr/bin/env node
/**
 * Subset the web fonts.
 *
 * The two font files are the largest resources on the page. The stock
 * Vazirmatn carries glyphs for scripts this site never renders, so cutting
 * it to Persian, Latin and punctuation removes about a third of the bytes
 * from the critical path.
 *
 * Shaping is preserved: --layout-features='*' keeps init/medi/fina/rlig,
 * without which Arabic letters stop joining. Verify after running:
 *
 *   python3 -c "from fontTools.ttLib import TTFont; f=TTFont('public/fonts/Vazirmatn.woff2'); \
 *     print(sorted({r.FeatureTag for r in f['GSUB'].table.FeatureList.FeatureRecord}))"
 *
 * `init`, `medi`, `fina` and `rlig` must all be present.
 *
 * Needs Python's fonttools:  pip install fonttools brotli
 * Run once after replacing a font file, then commit the result.
 */
import { execFileSync } from 'node:child_process';
import { statSync, renameSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FONTS = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'fonts');

// Persian and Arabic, Latin-1, general punctuation, ZWNJ, arrows, minus.
const UNICODES = [
  'U+0000-00FF',
  'U+0600-06FF',
  'U+200C-200E',
  'U+2000-206F',
  'U+2190-21BB',
  'U+2212',
  'U+FB8A',
  'U+FBFC-FBFD',
  'U+FE70-FEFF',
].join(',');

const kb = (p) => Math.round(statSync(p).size / 1024);

for (const name of ['Vazirmatn', 'SpaceGrotesk']) {
  const src = join(FONTS, `${name}.woff2`);
  const out = join(FONTS, `${name}.subset.woff2`);
  const before = kb(src);

  // Keep the original next to it, so a bad subset is one copy away from undone.
  copyFileSync(src, join(FONTS, `${name}.full.woff2`));

  execFileSync('pyftsubset', [
    src,
    `--unicodes=${UNICODES}`,
    '--flavor=woff2',
    '--layout-features=*',
    '--no-hinting',
    `--output-file=${out}`,
  ]);

  renameSync(out, src);
  console.log(`  ✓ ${name}: ${before} KB → ${kb(src)} KB`);
}

console.log('\n  Originals kept as *.full.woff2 — delete them once you are happy.');
