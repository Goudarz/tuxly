import { getCollection, type CollectionEntry } from 'astro:content';
import { ENTITY_ROUTES, ENTITY_TYPES } from '../consts';

export type Post = CollectionEntry<'posts'>;
export type Entity = CollectionEntry<'entities'>;
export type Event = CollectionEntry<'events'>;

const live = <T extends { data: { draft?: boolean } }>(e: T) =>
  import.meta.env.PROD ? !e.data.draft : true;

export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', live);
  return posts.sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());
}

export async function getEntities(type?: (typeof ENTITY_TYPES)[number]): Promise<Entity[]> {
  const all = await getCollection('entities', live);
  const list = type ? all.filter((e) => e.data.type === type) : all;
  // Pinned entries first (lower priority wins), then alphabetical.
  return list.sort(
    (a, b) =>
      a.data.priority - b.data.priority ||
      a.data.name.localeCompare(b.data.name, 'en'),
  );
}

export async function getPostsForEntity(entityId: string): Promise<Post[]> {
  const posts = await getPublishedPosts();
  return posts.filter((p) => p.data.entities.some((e) => e.id === entityId));
}

export async function getEventsForEntity(entityId: string): Promise<Event[]> {
  const events = await getCollection('events', live);
  return events
    .filter((e) => e.data.organizer?.id === entityId || e.data.entities.some((x) => x.id === entityId))
    .sort((a, b) => b.data.startsAt.valueOf() - a.data.startsAt.valueOf());
}

export async function getUpcomingEvents(): Promise<Event[]> {
  const events = await getCollection('events', live);
  const now = Date.now();
  return events
    .filter((e) => (e.data.endsAt ?? e.data.startsAt).valueOf() >= now)
    .sort((a, b) => a.data.startsAt.valueOf() - b.data.startsAt.valueOf());
}

export async function getPastEvents(): Promise<Event[]> {
  const events = await getCollection('events', live);
  const now = Date.now();
  return events
    .filter((e) => (e.data.endsAt ?? e.data.startsAt).valueOf() < now)
    .sort((a, b) => b.data.startsAt.valueOf() - a.data.startsAt.valueOf());
}

export function slugOf(entry: { id: string }): string {
  return entry.id.split('/').pop()!;
}

export function entityUrl(entity: Entity): string {
  return `/${ENTITY_ROUTES[entity.data.type]}/${slugOf(entity)}`;
}

/** Per-page feed, alongside the site-wide one. */
export function entityFeedUrl(entity: Entity): string {
  return `${entityUrl(entity)}/rss.xml`;
}

export function entityLabel(entity: Entity): string {
  return entity.data.nameFa ?? entity.data.name;
}

/** Simple pagination over any array. */
export function paginate<T>(items: T[], page: number, perPage: number) {
  const total = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(Math.max(1, page), total);
  return {
    items: items.slice((current - 1) * perPage, current * perPage),
    current,
    total,
    hasPrev: current > 1,
    hasNext: current < total,
  };
}
