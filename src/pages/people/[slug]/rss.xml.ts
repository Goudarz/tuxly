import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { getPublishedPosts } from '../../../lib/entities';
import { buildFeed } from '../../../lib/feed';
import { SITE } from '../../../consts';

export async function getStaticPaths() {
  const authors = await getCollection('authors');
  return authors.map((author) => ({ params: { slug: author.id }, props: { author } }));
}

export async function GET(context: APIContext) {
  const slug = context.params.slug!;
  const author = (await getCollection('authors')).find((a) => a.id === slug)!;
  const posts = (await getPublishedPosts()).filter((p) => p.data.author.id === slug);
  return buildFeed({
    title: `${SITE.name} — ${author.data.name}`,
    description: author.data.bio,
    site: context.site,
    posts,
    selfUrl: `/people/${slug}/rss.xml`,
  });
}
