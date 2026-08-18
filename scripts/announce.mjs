#!/usr/bin/env node
/**
 * Post announcements to Telegram and Mastodon.
 *
 * Two modes, because the two things being announced work differently:
 *
 *   --posts         articles published by the push being deployed
 *   --anniversaries anniversaries falling on today's date
 *
 * Posts are decided by diffing two commits rather than keeping a state
 * file. A state file needs its own commit on every run, which turns the
 * history into noise and can loop back into the deploy workflow.
 *
 * Anniversaries need no state at all: an anniversary is announced when
 * today's month and day match, and the workflow runs once a day.
 *
 * Usage:
 *   node scripts/announce.mjs --posts --before=<sha> --after=<sha>
 *   node scripts/announce.mjs --anniversaries
 *   ...plus --dry-run to print without sending
 */

import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const arg = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];

const DO_POSTS = args.includes('--posts');
const DO_ANNIVERSARIES = args.includes('--anniversaries');
const SITE = 'https://tuxly.ir';

const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();

const faDigits = (n) =>
  String(n).replace(/[0-9]/g, (d) => String.fromCharCode(0x06f0 + Number(d)));

/** Read just the frontmatter fields we need, without a YAML parser. */
function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const yaml = m[1];
  const field = (key) => {
    const hit = yaml.match(new RegExp(`^${key}:[ \\t]*(.*)$`, 'm'));
    return hit ? hit[1].trim().replace(/^['"]|['"]$/g, '') : undefined;
  };
  const list = (key) => {
    const hit = yaml.match(new RegExp(`^${key}:[ \\t]*\\[(.*)\\]`, 'm'));
    return hit ? hit[1].split(',').map((s) => s.trim()).filter(Boolean) : [];
  };
  return {
    title: field('title'),
    summary: field('summary'),
    draft: field('draft') === 'true',
    tags: list('tags'),
  };
}

// ───────────────────────────────────────────────────────── posts

async function collectPosts() {
  const before = arg('before');
  const after = arg('after') ?? 'HEAD';

  // Without a previous sha there is nothing to diff against, so treat the
  // run as a no-op rather than announcing the whole archive.
  if (!before || /^0+$/.test(before)) {
    console.log('  no previous commit to compare against');
    return [];
  }

  const diff = git('diff', '--name-status', before, after, '--', 'content/posts/');
  if (!diff) return [];

  const out = [];
  for (const line of diff.split('\n')) {
    const [status, path] = line.split('\t');
    if (!path?.endsWith('.md') || basename(path).startsWith('_')) continue;
    if (status !== 'A' && status !== 'M') continue;

    const now = frontmatter(await readFile(join(ROOT, path), 'utf8'));
    if (!now || now.draft) continue;

    if (status === 'M') {
      // Only announce when this push is what published it — otherwise
      // fixing a typo would re-blast the channel.
      let was;
      try {
        was = frontmatter(git('show', `${before}:${path}`));
      } catch {
        was = null; // did not exist before
      }
      if (was && !was.draft) continue;
    }

    out.push({
      title: now.title,
      body: now.summary,
      url: `${SITE}/news/${basename(path, '.md')}`,
      tags: now.tags,
    });
  }
  return out;
}

// anniversaries

const KIND = {
  founded: 'آغاز',
  release: 'انتشار',
  milestone: 'نقطهٔ عطف',
  person: 'زادروز',
};

/**
 * Anniversaries falling today.
 *
 * Reads the content files directly rather than importing the site's own
 * helpers — those run inside Astro and are not available to a plain Node
 * script.
 */
async function collectAnniversaries() {
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  const year = now.getUTCFullYear();

  const out = [];

  // 1. milestones.json
  const milestones = JSON.parse(
    await readFile(join(ROOT, 'content/milestones.json'), 'utf8'),
  );
  const covered = new Set();
  for (const m of milestones) {
    const d = new Date(m.date);
    if (d.getUTCMonth() + 1 !== month || d.getUTCDate() !== day) continue;
    if (m.entity) covered.add(m.entity);
    out.push({
      title: m.titleFa,
      age: year - d.getUTCFullYear(),
      kind: m.kind,
      note: m.note,
      fromEntity: false,
      url: `${SITE}/anniversaries`,
    });
  }

  // 2. firstRelease on entities
  const routes = {
    distributions: 'distributions',
    desktops: 'desktops',
    'window-managers': 'window-managers',
    projects: 'projects',
    communities: 'communities',
  };
  for (const [dir, route] of Object.entries(routes)) {
    let files = [];
    try {
      files = await readdir(join(ROOT, 'content/entities', dir));
    } catch {
      continue;
    }
    for (const file of files) {
      if (!file.endsWith('.md') || file.startsWith('_')) continue;
      const slug = file.replace(/\.md$/, '');
      if (covered.has(`${dir}/${slug}`)) continue;

      const text = await readFile(join(ROOT, 'content/entities', dir, file), 'utf8');
      const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
      if (!fm) continue;

      const date = fm.match(/^firstRelease:[ \t]*(\S+)/m)?.[1];
      if (!date) continue;
      const d = new Date(date);
      if (d.getUTCMonth() + 1 !== month || d.getUTCDate() !== day) continue;

      const name =
        fm.match(/^nameFa:[ \t]*(.*)$/m)?.[1]?.trim() ??
        fm.match(/^name:[ \t]*(.*)$/m)?.[1]?.trim();

      out.push({
        title: name,
        age: year - d.getUTCFullYear(),
        kind: 'founded',
        fromEntity: true,
        url: `${SITE}/${route}/${slug}`,
      });
    }
  }

  return out;
}

// platforms

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const hashtags = (tags) =>
  tags.map((t) => `#${t.replace(/[\s\u200c]/g, '_')}`).join(' ');

async function toTelegram({ text, url }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return { skipped: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing' };

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chat,
      text,
      parse_mode: 'HTML',
      link_preview_options: { url, prefer_large_media: true },
    }),
  });
  if (!res.ok) throw new Error(`telegram: ${res.status} ${await res.text()}`);
  return { ok: true };
}

async function toMastodon({ plain, key }) {
  const token = process.env.MASTODON_TOKEN;
  const host = process.env.MASTODON_HOST;
  if (!token || !host) return { skipped: 'MASTODON_TOKEN or MASTODON_HOST missing' };

  const res = await fetch(`https://${host}/api/v1/statuses`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      // Stops a retried workflow run from double-posting.
      'Idempotency-Key': key,
    },
    body: JSON.stringify({ status: plain, language: 'fa', visibility: 'public' }),
  });
  if (!res.ok) throw new Error(`mastodon: ${res.status} ${await res.text()}`);
  return { ok: true };
}

async function send(message) {
  if (DRY) {
    console.log('    ─ dry run ─');
    console.log(message.plain.split('\n').map((l) => `    ${l}`).join('\n'));
    return 0;
  }
  let failed = 0;
  for (const [name, fn] of [['telegram', toTelegram], ['mastodon', toMastodon]]) {
    try {
      const r = await fn(message);
      console.log(r.skipped ? `    - ${name}: ${r.skipped}` : `    ✓ ${name}`);
    } catch (err) {
      // One platform failing must not stop the others.
      console.error(`    ! ${name}: ${err.message}`);
      failed++;
    }
  }
  return failed;
}

// main

if (!DO_POSTS && !DO_ANNIVERSARIES) {
  console.error('Nothing to do. Pass --posts or --anniversaries.');
  process.exit(1);
}

let failures = 0;

if (DO_POSTS) {
  const posts = await collectPosts();
  console.log(`\n  posts: ${posts.length}`);
  for (const p of posts) {
    console.log(`\n  ${p.title}`);
    const tags = hashtags(p.tags);
    failures += await send({
      url: p.url,
      text: `<b>${esc(p.title)}</b>\n\n${esc(p.body)}\n\n${p.url}${tags ? `\n\n${esc(tags)}` : ''}`,
      plain: `${p.title}\n\n${p.body}\n\n${p.url}${tags ? `\n\n${tags}` : ''}`,
      key: `post-${p.url}`,
    });
  }
}

if (DO_ANNIVERSARIES) {
  const items = await collectAnniversaries();
  console.log(`\n  anniversaries today: ${items.length}`);

  for (const a of items) {
    const age = faDigits(a.age);
    /*
     * Milestone titles usually already say what happened — «آغاز پروژهٔ
     * هایکو» — so prefixing the kind gives «آغاز آغاز پروژهٔ…». Entity
     * birthdays are just a name and do need the prefix.
     */
    const label = KIND[a.kind] ?? 'سالگرد';
    const needsLabel = a.fromEntity || !a.title.startsWith(label);
    const subject = needsLabel ? `${label} ${a.title}` : a.title;
    const headline = `🎂 امروز ${age} سال از ${subject} می‌گذرد.`;
    console.log(`\n  ${a.title} — ${a.age}`);

    failures += await send({
      url: a.url,
      text:
        `<b>${esc(headline)}</b>` +
        (a.note ? `\n\n${esc(a.note)}` : '') +
        `\n\n${a.url}\n\n#سالگرد #نرم‌افزار_آزاد`,
      plain:
        headline +
        (a.note ? `\n\n${a.note}` : '') +
        `\n\n${a.url}\n\n#سالگرد #نرم‌افزار_آزاد`,
      // Date in the key, so a rerun on the same day is a no-op but next
      // year's announcement still goes out.
      key: `anniv-${a.title}-${new Date().toISOString().slice(0, 10)}`,
    });
  }
}

console.log();
if (failures) process.exitCode = 1;
