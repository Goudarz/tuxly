import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { getSpeakers } from '../lib/speakers';
import { SITE, ENTITY_ROUTES } from '../consts';

/**
 * Sitemap, generated from the content collections directly.
 *
 * Written by hand rather than via @astrojs/sitemap, which only emits
 * sitemap-index.xml and needed a post-build copy step to appear at
 * /sitemap.xml. A step that runs after the build can be skipped; a route
 * cannot. This one is part of the build itself, so it can never go missing
 * or drift out of sync with the content.
 *
 * Every URL carries a real lastmod taken from the content, not the build
 * time — telling Google a page changed when it did not just wastes crawl
 * budget.
 */

interface Entry {
  path: string;
  lastmod?: Date;
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: number;
}

const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const iso = (d: Date) => d.toISOString().split('T')[0];

export async function GET(context: APIContext) {
  const base = (context.site ?? new URL(SITE.url)).origin;
  const live = <T extends { data: { draft?: boolean } }>(e: T) => !e.data.draft;

  const posts = await getCollection('posts', live);
  const entities = await getCollection('entities', live);
  const events = await getCollection('events', live);
  const authors = await getCollection('authors');

  const newest = posts.length
    ? posts.reduce((a, p) => (p.data.publishedAt > a ? p.data.publishedAt : a), posts[0].data.publishedAt)
    : undefined;

  const entries: Entry[] = [
    { path: '/', lastmod: newest, changefreq: 'daily', priority: 1.0 },
    { path: '/news', lastmod: newest, changefreq: 'daily', priority: 0.9 },
    { path: '/events', changefreq: 'weekly', priority: 0.8 },
    { path: '/about', changefreq: 'monthly', priority: 0.5 },
    { path: '/brand', changefreq: 'monthly', priority: 0.4 },
    { path: '/glossary', changefreq: 'monthly', priority: 0.6 },
    { path: '/people', changefreq: 'monthly', priority: 0.4 },
  ];

  // Entity index pages, one per type that actually has entries.
  const usedTypes = new Set(entities.map((e) => e.data.type));
  for (const type of usedTypes) {
    entries.push({ path: `/${ENTITY_ROUTES[type]}`, changefreq: 'weekly', priority: 0.8 });
  }

  // Paginated news pages. Page 1 lives at /news and is already listed.
  const totalPages = Math.max(1, Math.ceil(posts.length / SITE.postsPerPage));
  for (let page = 2; page <= totalPages; page++) {
    entries.push({ path: `/news/${page}`, changefreq: 'weekly', priority: 0.5 });
  }

  for (const post of posts) {
    entries.push({
      path: `/news/${post.id}`,
      lastmod: post.data.updatedAt ?? post.data.publishedAt,
      changefreq: 'monthly',
      priority: post.data.featured ? 0.9 : 0.8,
    });
  }

  for (const entity of entities) {
    entries.push({
      path: `/${ENTITY_ROUTES[entity.data.type]}/${entity.id.split('/').pop()}`,
      lastmod: entity.data.versionCheckedAt,
      changefreq: 'weekly',
      priority: 0.7,
    });
  }

  for (const event of events) {
    entries.push({
      path: `/events/${event.id.split('/').pop()}`,
      lastmod: event.data.startsAt,
      // Past events stop changing; upcoming ones may still move.
      changefreq: (event.data.endsAt ?? event.data.startsAt) < new Date() ? 'yearly' : 'weekly',
      priority: 0.6,
    });
  }

  for (const author of authors) {
    entries.push({ path: `/people/${author.id}`, changefreq: 'monthly', priority: 0.5 });
  }

  // Speaker pages are generated from events, so they belong here exactly
  // like any other route.
  entries.push({ path: '/speakers', changefreq: 'weekly', priority: 0.5 });
  for (const speaker of await getSpeakers()) {
    if (speaker.authorId) continue;
    entries.push({
      path: `/speakers/${encodeURIComponent(speaker.slug)}`,
      lastmod: speaker.talks[0]?.event.data.startsAt,
      changefreq: 'monthly',
      priority: 0.4,
    });
  }

  // Tag pages, including their own pagination.
  const byTag = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) byTag.set(tag, (byTag.get(tag) ?? 0) + 1);
  }
  for (const [tag, count] of byTag) {
    const encoded = encodeURIComponent(tag);
    entries.push({ path: `/tags/${encoded}`, changefreq: 'weekly', priority: 0.4 });
    const pages = Math.max(1, Math.ceil(count / SITE.postsPerPage));
    for (let page = 2; page <= pages; page++) {
      entries.push({ path: `/tags/${encoded}/${page}`, changefreq: 'weekly', priority: 0.3 });
    }
  }

  // /search is deliberately excluded: it has no content of its own.

  const seen = new Set<string>();
  const body = entries
    .filter((e) => (seen.has(e.path) ? false : seen.add(e.path)))
    .map((e) => {
      const loc = xmlEscape(new URL(e.path, base).href);
      return (
        '  <url>\n' +
        `    <loc>${loc}</loc>\n` +
        (e.lastmod ? `    <lastmod>${iso(e.lastmod)}</lastmod>\n` : '') +
        `    <changefreq>${e.changefreq}</changefreq>\n` +
        `    <priority>${e.priority.toFixed(1)}</priority>\n` +
        '  </url>'
      );
    })
    .join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
}
