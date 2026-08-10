import rss from '@astrojs/rss';
import type { CollectionEntry } from 'astro:content';
import { SITE } from '../consts';

/**
 * Feed builder.
 *
 * Every standalone page — distribution, desktop, project, community, tag,
 * author — gets its own feed so readers can follow one topic only.
 */
export function buildFeed(opts: {
  title: string;
  description: string;
  site: string | URL | undefined;
  posts: CollectionEntry<'posts'>[];
  selfUrl: string;
}) {
  return rss({
    title: opts.title,
    description: opts.description,
    site: opts.site ?? SITE.url,
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    customData:
      `<language>fa-ir</language>` +
      `<atom:link href="${new URL(opts.selfUrl, SITE.url).href}" rel="self" type="application/rss+xml"/>`,
    items: opts.posts.map((post) => ({
      title: post.data.title,
      description: post.data.summary,
      pubDate: post.data.publishedAt,
      link: `/news/${post.id}/`,
      categories: post.data.tags,
    })),
  });
}
