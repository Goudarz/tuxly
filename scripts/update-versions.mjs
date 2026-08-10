#!/usr/bin/env node
/**
 * Refresh version data from endoflife.date and Wikidata.
 *
 * Why this exists: thirty hand-typed version numbers are largely wrong
 * within months. Descriptions are stable and written by hand; volatile data
 * comes from upstream.
 *
 * When nothing is found the field stays empty and the UI shows "checking" —
 * better than a guess.
 *
 * Usage:
 *   node scripts/update-versions.mjs [--dry-run] [--only=<slug>] [--verbose]
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTITIES = join(ROOT, 'content/entities');

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose') || args.includes('-v');
const ONLY = args.find((a) => a.startsWith('--only='))?.split('=')[1];

const UA = { 'user-agent': 'tuxly-bot/0.1 (+https://tuxly.ir; hi@tuxly.ir)' };
const TIMEOUT_MS = 15000;
const RETRIES = 3;

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (c) => (s) => (color ? `\x1b[${c}m${s}\x1b[0m` : String(s));
const dim = paint('2');
const red = paint('31');
const yellow = paint('33');
const green = paint('32');
const amber = paint('38;5;214');
const bold = paint('1');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Network failures are the norm here, so retry with backoff before giving up. */
async function get(url, { json = true } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    const abort = AbortSignal.timeout(TIMEOUT_MS);
    try {
      const res = await fetch(url, { headers: UA, signal: abort, redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return json ? await res.json() : await res.text();
    } catch (err) {
      lastError = err;
      if (VERBOSE) console.log(dim(`      attempt ${attempt}/${RETRIES}: ${describe(err)}`));
      if (attempt < RETRIES) await sleep(600 * attempt);
    }
  }
  throw lastError;
}

/**
 * `fetch failed` on its own tells you nothing. Unwrap the cause so the user
 * can see whether it is DNS, TLS, a timeout or a blocked connection.
 */
function describe(err) {
  if (err?.name === 'TimeoutError') return `timed out after ${TIMEOUT_MS / 1000}s`;
  const code = err?.cause?.code ?? err?.code;
  const map = {
    ENOTFOUND: 'DNS lookup failed (host not resolving)',
    EAI_AGAIN: 'DNS temporarily unavailable',
    ECONNREFUSED: 'connection refused',
    ECONNRESET: 'connection reset by peer',
    ETIMEDOUT: 'connection timed out',
    UND_ERR_CONNECT_TIMEOUT: 'connect timed out',
    CERT_HAS_EXPIRED: 'TLS certificate expired',
    UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'TLS verification failed',
  };
  if (code && map[code]) return `${map[code]} (${code})`;
  if (code) return `${err.message} (${code})`;
  return err?.message ?? String(err);
}

// ─────────────────────────────────────────── frontmatter (minimal)
function splitFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  return m ? { yaml: m[1], body: m[2] } : null;
}

function readField(yaml, key) {
  const m = yaml.match(new RegExp(`^${key}:[ \\t]*(.*)$`, 'm'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : undefined;
}

/** Replace or append a top-level field, preserving the order of the rest. */
function setField(yaml, key, value) {
  const line = `${key}: ${value}`;
  const re = new RegExp(`^${key}:[ \\t]*.*$`, 'm');
  return re.test(yaml) ? yaml.replace(re, line) : `${yaml}\n${line}`;
}

// ─────────────────────────────────────────── endoflife.date
async function fetchEol(id) {
  const cycles = await get(`https://endoflife.date/api/${encodeURIComponent(id)}.json`);
  if (!Array.isArray(cycles) || !cycles.length) throw new Error('empty response');

  const today = new Date().toISOString().slice(0, 10);
  // Newest cycle actually released — not future ones.
  const released = cycles.filter((c) => typeof c.releaseDate === 'string' && c.releaseDate <= today);
  const latest = released[0] ?? cycles[0];

  return {
    version: String(latest.latest ?? latest.cycle ?? '').trim() || undefined,
    releasedAt: latest.latestReleaseDate ?? latest.releaseDate ?? undefined,
    eolAt: typeof latest.eol === 'string' ? latest.eol : undefined,
  };
}

// ─────────────────────────────────────────── Wikidata
const WD_TYPES = {
  distribution: 'Q131669',   // Linux distribution
  desktop: 'Q782007',        // desktop environment
  windowmanager: 'Q1077784', // window manager
};

/**
 * Resolve a Wikidata ID by name and confirm it via the entity type.
 * The type check matters: otherwise "Void" resolves to a film, not a distro.
 */
async function resolveWikidata(name, type) {
  const expected = WD_TYPES[type];
  if (!expected) return undefined;

  const url = new URL('https://www.wikidata.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'wbsearchentities',
    search: name,
    language: 'en',
    format: 'json',
    limit: '5',
    origin: '*',
  }).toString();

  const { search: hits = [] } = await get(url);

  for (const hit of hits.slice(0, 3)) {
    const data = await get(`https://www.wikidata.org/wiki/Special:EntityData/${hit.id}.json`);
    const claims = data.entities?.[hit.id]?.claims?.P31 ?? []; // instance of
    const types = claims.map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
    if (types.includes(expected)) return hit.id;
    await sleep(150);
  }
  return undefined;
}

// ─────────────────────────────────────────── main
async function collect(dir) {
  const out = [];
  for (const name of await readdir(join(ENTITIES, dir))) {
    if (!name.endsWith('.md') || name.startsWith('_')) continue;
    out.push({ slug: name.replace(/\.md$/, ''), path: join(ENTITIES, dir, name) });
  }
  return out;
}

const files = [
  ...(await collect('distributions')),
  ...(await collect('desktops')),
  ...(await collect('window-managers')),
];

const targets = ONLY ? files.filter((f) => f.slug === ONLY) : files;
if (!targets.length) {
  console.error(red(`No entity found with slug "${ONLY}".`));
  process.exit(1);
}

console.log(amber(`\n  Updating ${targets.length} entities${DRY ? '  (dry run)' : ''}\n`));

let updated = 0;
let unchanged = 0;
const problems = [];
let networkFailures = 0;

for (const file of targets) {
  const raw = await readFile(file.path, 'utf8');
  const parts = splitFrontmatter(raw);
  if (!parts) {
    problems.push({ slug: file.slug, what: 'frontmatter', why: 'could not parse' });
    continue;
  }

  let { yaml } = parts;
  const name = readField(yaml, 'name') ?? file.slug;
  const type = readField(yaml, 'type');
  const eolId = readField(yaml, 'eolId');
  const changes = [];

  if (eolId) {
    try {
      const info = await fetchEol(eolId);
      if (info.version) {
        yaml = setField(yaml, 'currentVersion', `'${info.version}'`);
        changes.push(`version ${info.version}`);
      }
      if (info.releasedAt) yaml = setField(yaml, 'releasedAt', info.releasedAt);
      if (info.eolAt) yaml = setField(yaml, 'eolAt', info.eolAt);
    } catch (err) {
      problems.push({ slug: file.slug, what: `endoflife.date/${eolId}`, why: describe(err) });
      networkFailures++;
    }
    await sleep(200);
  }

  if (!readField(yaml, 'wikidata') && WD_TYPES[type]) {
    try {
      const qid = await resolveWikidata(name, type);
      if (qid) {
        yaml = setField(yaml, 'wikidata', qid);
        changes.push(`wikidata ${qid}`);
      } else if (VERBOSE) {
        console.log(dim(`  · ${name}: no Wikidata match of the right type`));
      }
    } catch (err) {
      // Previously swallowed silently, which made a total network outage
      // look like "nothing to update".
      problems.push({ slug: file.slug, what: 'wikidata', why: describe(err) });
      networkFailures++;
    }
    await sleep(200);
  }

  if (!changes.length) {
    unchanged++;
    continue;
  }

  yaml = setField(yaml, 'versionCheckedAt', new Date().toISOString().slice(0, 10));
  if (!DRY) await writeFile(file.path, `---\n${yaml}\n---\n${parts.body}`, 'utf8');
  console.log(`  ${green('✓')} ${name} ${dim('— ' + changes.join(', '))}`);
  updated++;
}

console.log(`\n  ${green(String(updated))} updated · ${dim(`${unchanged} unchanged`)}`);

if (problems.length) {
  console.log(yellow(`\n  ${problems.length} need attention:`));
  for (const p of problems.slice(0, 20)) {
    console.log(`    ${dim(p.slug.padEnd(22))} ${p.what}  ${red(p.why)}`);
  }
  if (problems.length > 20) console.log(dim(`    …and ${problems.length - 20} more`));
}

// A handful of failures is normal. Everything failing means the network is
// the problem, not the data — say so plainly instead of leaving the user to
// guess from a wall of "fetch failed".
const attempted = targets.length;
if (networkFailures >= Math.min(3, attempted) && networkFailures >= attempted * 0.5) {
  console.log(red(`\n  ${bold('Almost every request failed — this looks like a network issue.')}`));
  console.log(`
  Both endpoints sit behind CDNs that are frequently unreachable from some
  regions, Iran included. Check by hand:

    ${dim('curl -sS -m 10 https://endoflife.date/api/debian.json | head -c 120')}
    ${dim('curl -sS -m 10 "https://www.wikidata.org/w/api.php?action=wbsearchentities&search=Debian&language=en&format=json" | head -c 120')}

  If those fail too, the script cannot help. Options, best first:

    1. Let CI do it. The weekly workflow runs on GitHub's runners, which are
       not affected, and opens a pull request with the results:
       ${dim('Actions → "Update versions" → Run workflow')}

    2. Run behind a proxy:
       ${dim('HTTPS_PROXY=http://127.0.0.1:8080 npm run update:versions')}

    3. Fill the fields by hand — see docs/VERSIONS.md.
`);
  process.exitCode = 1;
}

console.log();
