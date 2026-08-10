#!/usr/bin/env node
/**
 * Terminal banner, shown after install and on `npm run dev`.
 *
 * Not decoration: someone who just cloned the repo should see at a glance
 * whether their Node version is right, how much content exists, and what to
 * run next.
 */

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const FULL = args.includes('--full');
const INSTALLED = args.includes('--installed');

// In CI the banner is just noise.
if (process.env.CI && !FULL) process.exit(0);

const color = process.stdout.isTTY && process.env.TERM !== 'dumb' && !process.env.NO_COLOR;
const paint = (code) => (s) => (color ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const amber = paint('38;5;214');
const ember = paint('38;5;172');
const dim = paint('2');
const bold = paint('1');
const green = paint('32');
const red = paint('31');
const white = paint('97');

/** The Tuxly mark, drawn in block characters. */
const MARK = [
  '    ▄▄█████▄▄     ',
  '  ▄███████████▄   ',
  ' ███  ▀   ▀  ███  ',
  ' ███    ▄    ███  ',
  ' ████▄▄▄▄▄▄▄████  ',
  '████▀       ▀████ ',
  '███▘  ▄▄▄▄▄▄▄  ▝██',
  '██▘  █████████  ▝█',
  '█▘  ███████████  ▝',
  '    ▀▀▀     ▀▀▀   ',
];

/** Block logotype, in the spirit of the NeoVim splash screen. */
const WORDMARK = [
  '████████╗██╗   ██╗██╗  ██╗██╗    ██╗   ██╗',
  '╚══██╔══╝██║   ██║╚██╗██╔╝██║    ╚██╗ ██╔╝',
  '   ██║   ██║   ██║ ╚███╔╝ ██║     ╚████╔╝ ',
  '   ██║   ██║   ██║ ██╔██╗ ██║      ╚██╔╝  ',
  '   ██║   ╚██████╔╝██╔╝ ██╗███████╗  ██║   ',
  '   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝  ╚═╝   ',
];

async function countFiles(dir, ext = '.md') {
  const full = join(ROOT, dir);
  if (!existsSync(full)) return 0;
  let n = 0;
  for (const entry of await readdir(full, { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && entry.name.endsWith(ext) && !entry.name.startsWith('_')) n++;
  }
  return n;
}

const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));

const majorRequired = Number((pkg.engines?.node ?? '>=24').replace(/[^\d.]/g, '').split('.')[0] || 24);
const majorCurrent = Number(process.versions.node.split('.')[0]);
const nodeOk = majorCurrent >= majorRequired;

const [posts, events, distros, desktops, wms, projects, communities] = await Promise.all([
  countFiles('content/posts'),
  countFiles('content/events'),
  countFiles('content/entities/distributions'),
  countFiles('content/entities/desktops'),
  countFiles('content/entities/window-managers'),
  countFiles('content/entities/projects'),
  countFiles('content/entities/communities'),
]);

const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
const pad = (s, n) => s + ' '.repeat(Math.max(0, n - strip(s).length));

const artWidth = Math.max(...MARK.map((l) => l.length));
const GUTTER = '   ';

const right = [
  ...WORDMARK.map((l) => amber(l)),
  '',
  dim('  Persian home of free and open source software'),
  '',
];

const stats = [
  ['version', amber(`v${pkg.version}`)],
  ['node', nodeOk ? green(`v${process.versions.node}`) : red(`v${process.versions.node}  (needs v${majorRequired}+)`)],
  ['astro', amber(String(pkg.dependencies?.astro ?? '').replace(/^\^/, ''))],
  ['license', dim('AGPL-3.0-or-later')],
  ['', ''],
  ['posts', String(posts)],
  ['events', String(events)],
  ['distributions', String(distros)],
  ['desktops', String(desktops)],
  ['window managers', String(wms)],
  ['projects', String(projects)],
  ['communities', String(communities)],
];

const keyWidth = Math.max(...stats.map(([k]) => k.length));
for (const [k, v] of stats) right.push(k ? `  ${dim(pad(k, keyWidth))}   ${v}` : '');

console.log();
for (let i = 0; i < Math.max(MARK.length, right.length); i++) {
  console.log(` ${ember(pad(MARK[i] ?? '', artWidth))}${GUTTER}${right[i] ?? ''}`);
}

console.log();
console.log(` ${dim('made by')} ${white('Goudarz Jafari')} ${dim('·')} ${dim('tuxly.ir')}`);
console.log();

if (!nodeOk) {
  console.log(` ${red('!')} Node is too old. With nvm: ${bold('nvm use')}`);
  console.log();
}

if (INSTALLED) {
  console.log(` ${dim('next')}`);
  console.log(`   ${amber(pad('npm run dev', 26))}${dim('start the dev server')}`);
  console.log(`   ${amber(pad('npm run update:versions', 26))}${dim('fill in distro versions')}`);
  console.log(`   ${amber(pad('npm run build', 26))}${dim('build + search index')}`);
  console.log();
} else if (FULL) {
  console.log(` ${dim('commands')}`);
  for (const [name, desc] of [
    ['dev', 'start the dev server'],
    ['build', 'static build + Pagefind index'],
    ['preview', 'preview the build output'],
    ['check', 'validate content schema and types'],
    ['update:versions', 'refresh versions from Wikidata + endoflife.date'],
    /** ['ingest', 'collect drafts from source feeds'],
    ['ingest:dry', 'same, without writing files'], **/
  ]) {
    console.log(`   ${amber(pad(`npm run ${name}`, 26))}${dim(desc)}`);
  }
  console.log();
  console.log(` ${dim('repo')}   ${pkg.repository?.url?.replace(/\.git$/, '') ?? ''}`);
  console.log(` ${dim('site')}   ${pkg.homepage ?? ''}`);
  console.log();
}
