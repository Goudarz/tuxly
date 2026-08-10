import type { APIContext } from 'astro';
import { getPublishedPosts } from '../../../lib/entities';
import { buildFeed } from '../../../lib/feed';
import { SITE } from '../../../consts';

export async function getStaticPaths() {
  const posts = await getPublishedPosts();
  const tags = new Set(posts.flatMap((p) => p.data.tags));
  return [...tags].map((tag) => ({ params: { tag } }));
}

export async function GET(context: APIContext) {
  const tag = context.params.tag!;
  const posts = (await getPublishedPosts()).filter((p) => p.data.tags.includes(tag));
  return buildFeed({
    title: `${SITE.name} — ${tag}`,
    description: `مطالب مرتبط با ${tag}`,
    site: context.site,
    posts,
    selfUrl: `/tags/${encodeURIComponent(tag)}/rss.xml`,
  });
}
