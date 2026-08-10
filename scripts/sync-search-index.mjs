#!/usr/bin/env node
/**
 * Copy the Pagefind index into public/ after a build.
 *
 * Pagefind writes its index into dist/, but `astro dev` serves public/ and
 * never looks at dist/. Without this copy, search 404s in development —
 * which reads like a broken feature, when in fact the index simply is not
 * built yet.
 *
 * public/pagefind is generated output and is gitignored.
 */
import { cp, rm, access, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(ROOT, 'dist', 'pagefind');
const to = join(ROOT, 'public', 'pagefind');

try {
  await access(from);
} catch {
  console.error('  ! dist/pagefind not found — run the full `npm run build`.');
  process.exit(1);
}

await rm(to, { recursive: true, force: true });
await mkdir(dirname(to), { recursive: true });
await cp(from, to, { recursive: true });

console.log('  ✓ search index copied to public/ — search now works in `npm run dev`');
