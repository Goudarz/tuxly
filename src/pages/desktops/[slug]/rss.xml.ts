import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { getPostsForEntity, entityLabel } from '../../../lib/entities';
import { buildFeed } from '../../../lib/feed';
import { SITE } from '../../../consts';

export async function getStaticPaths() {
  const entities = await getCollection('entities', ({ data }) => data.type === 'desktop' && !data.draft);
  return entities.map((entity) => ({ params: { slug: entity.id.split('/').pop()! }, props: { entity } }));
}

export async function GET(context: APIContext) {
  const { entity } = context.props as { entity: Awaited<ReturnType<typeof getCollection<'entities'>>>[number] };
  const label = entityLabel(entity);
  return buildFeed({
    title: `${SITE.name} — ${label}`,
    description: entity.data.summary,
    site: context.site,
    posts: await getPostsForEntity(entity.id),
    selfUrl: `/desktops/${entity.id.split('/').pop()}/rss.xml`,
  });
}
