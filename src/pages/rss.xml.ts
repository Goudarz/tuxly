import type { APIContext } from 'astro';
import { getPublishedPosts } from '../lib/entities';
import { buildFeed } from '../lib/feed';
import { SITE } from '../consts';

export async function GET(context: APIContext) {
  return buildFeed({
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    site: context.site,
    posts: await getPublishedPosts(),
    selfUrl: '/rss.xml',
  });
}
