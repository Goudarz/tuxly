import type { CollectionEntry } from 'astro:content';
import { SITE, SOCIAL } from '../consts';

type Post = CollectionEntry<'posts'>;
type Entity = CollectionEntry<'entities'>;
type Author = CollectionEntry<'authors'>;
type EventEntry = CollectionEntry<'events'>;

const ORG_ID = `${SITE.url}/#organization`;
const SITE_ID = `${SITE.url}/#website`;

export const organizationNode = {
  '@type': 'Organization',
  '@id': ORG_ID,
  name: SITE.name,
  alternateName: SITE.nameLatin,
  url: SITE.url,
  email: SITE.email,
  description: SITE.description,
  logo: { '@type': 'ImageObject', url: `${SITE.url}/brand/tuxly-mark.svg` },
  sameAs: SOCIAL.filter((s) => s.href.startsWith('http')).map((s) => s.href),
};

export const websiteNode = {
  '@type': 'WebSite',
  '@id': SITE_ID,
  url: SITE.url,
  name: SITE.name,
  inLanguage: SITE.lang,
  publisher: { '@id': ORG_ID },
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE.url}/search?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
};

function breadcrumb(trail: Array<{ name: string; url: string }>) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: new URL(t.url, SITE.url).href,
    })),
  };
}

export function graph(...nodes: unknown[]) {
  return { '@context': 'https://schema.org', '@graph': [organizationNode, websiteNode, ...nodes.filter(Boolean)] };
}

export function personNode(author: Author, url: string) {
  const sameAs = [...author.data.sameAs];
  if (author.data.website) sameAs.push(author.data.website);
  if (author.data.github) sameAs.push(`https://github.com/${author.data.github}`);
  if (author.data.mastodon) sameAs.push(author.data.mastodon);
  if (author.data.linkedin) sameAs.push(author.data.linkedin);
  if (author.data.peertube) sameAs.push(author.data.peertube);
  if (author.data.x) sameAs.push(`https://x.com/${author.data.x.replace(/^@/, '')}`);
  return {
    '@type': 'Person',
    '@id': `${SITE.url}/#person-${author.id}`,
    name: author.data.name,
    alternateName: author.data.nameLatin,
    description: author.data.bio,
    url,
    ...(author.data.role ? { jobTitle: author.data.role } : {}),
    ...(author.data.email ? { email: author.data.email } : {}),
    ...(sameAs.length ? { sameAs: [...new Set(sameAs)] } : {}),
  };
}

/**
 * Canonical points at our own Persian page, not the external source: the
 * content genuinely differs once the Persian context is added. The link to
 * the original is declared via isBasedOn instead.
 */
export function articleSchema(
  post: Post,
  url: string,
  opts: { author?: Author; sourceName?: string; entities?: Entity[]; imageUrl?: string } = {},
) {
  const node: Record<string, unknown> = {
    '@type': post.data.type === 'news' ? 'NewsArticle' : post.data.type === 'guide' ? 'HowTo' : 'Article',
    '@id': `${url}#article`,
    headline: post.data.title,
    description: post.data.summary,
    datePublished: post.data.publishedAt.toISOString(),
    dateModified: (post.data.updatedAt ?? post.data.publishedAt).toISOString(),
    inLanguage: SITE.lang,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    publisher: { '@id': ORG_ID },
    isPartOf: { '@id': SITE_ID },
    isAccessibleForFree: true,
    ...(post.data.tags.length ? { keywords: post.data.tags.join(', ') } : {}),
    ...(opts.imageUrl ? { image: [opts.imageUrl] } : {}),
  };
  if (opts.author) node.author = { '@id': `${SITE.url}/#person-${opts.author.id}` };
  if (post.data.sourceUrl) {
    node.isBasedOn = post.data.sourceUrl;
    node.citation = {
      '@type': 'CreativeWork',
      url: post.data.sourceUrl,
      ...(post.data.sourceTitle ? { name: post.data.sourceTitle } : {}),
      ...(opts.sourceName ? { publisher: { '@type': 'Organization', name: opts.sourceName } } : {}),
    };
  }
  if (opts.entities?.length) node.about = opts.entities.map((e) => ({ '@id': `${SITE.url}/#entity-${e.id}` }));

  const nodes: unknown[] = [node];
  if (opts.author) nodes.push(personNode(opts.author, `${SITE.url}/people/${opts.author.id}`));
  nodes.push(
    breadcrumb([
      { name: 'خانه', url: '/' },
      { name: 'اخبار', url: '/news' },
      { name: post.data.title, url: new URL(url).pathname },
    ]),
  );
  return graph(...nodes);
}

const ENTITY_SCHEMA_TYPE: Record<string, string> = {
  person: 'Person',
  company: 'Organization',
  organization: 'Organization',
  community: 'Organization',
  license: 'CreativeWork',
  hardware: 'Product',
};

export function entitySchema(entity: Entity, url: string, relatedUrls: string[] = []) {
  const type = ENTITY_SCHEMA_TYPE[entity.data.type] ?? 'SoftwareApplication';
  const sameAs = [...entity.data.sameAs];
  if (entity.data.wikidata) sameAs.push(`https://www.wikidata.org/wiki/${entity.data.wikidata}`);
  if (entity.data.website) sameAs.push(entity.data.website);
  if (entity.data.repo) sameAs.push(entity.data.repo);

  const node: Record<string, unknown> = {
    '@type': type,
    '@id': `${SITE.url}/#entity-${entity.id}`,
    name: entity.data.name,
    ...(entity.data.nameFa ? { alternateName: entity.data.nameFa } : {}),
    description: entity.data.summary,
    url,
    inLanguage: SITE.lang,
    ...(sameAs.length ? { sameAs: [...new Set(sameAs)] } : {}),
  };
  if (type === 'SoftwareApplication') {
    node.applicationCategory =
      entity.data.type === 'distribution' ? 'OperatingSystem' : 'DeveloperApplication';
    node.operatingSystem = entity.data.type === 'distribution' ? 'Linux' : 'Linux, Unix';
    node.offers = { '@type': 'Offer', price: '0', priceCurrency: 'USD' };
    if (entity.data.license) node.license = entity.data.license;
    if (entity.data.currentVersion) node.softwareVersion = entity.data.currentVersion;
    if (entity.data.releasedAt) node.datePublished = entity.data.releasedAt.toISOString();
  }
  if (relatedUrls.length) node.subjectOf = relatedUrls.map((u) => ({ '@id': `${u}#article` }));

  return graph(
    node,
    breadcrumb([
      { name: 'خانه', url: '/' },
      { name: entity.data.type, url: url.replace(/\/[^/]+$/, '') },
      { name: entity.data.name, url: new URL(url).pathname },
    ]),
  );
}

export function eventSchema(event: EventEntry, url: string, organizerName?: string) {
  const mode = {
    'in-person': 'https://schema.org/OfflineEventAttendanceMode',
    online: 'https://schema.org/OnlineEventAttendanceMode',
    hybrid: 'https://schema.org/MixedEventAttendanceMode',
  }[event.data.mode];

  const location: unknown[] = [];
  if (event.data.mode !== 'online') {
    location.push({
      '@type': 'Place',
      name: event.data.venue ?? event.data.city,
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.data.city,
        addressCountry: event.data.country,
        ...(event.data.address ? { streetAddress: event.data.address } : {}),
      },
    });
  }
  if (event.data.mode !== 'in-person' && event.data.onlineUrl) {
    location.push({ '@type': 'VirtualLocation', url: event.data.onlineUrl });
  }

  return graph(
    {
      '@type': 'Event',
      '@id': `${url}#event`,
      name: event.data.title,
      description: event.data.summary,
      startDate: event.data.startsAt.toISOString(),
      ...(event.data.endsAt ? { endDate: event.data.endsAt.toISOString() } : {}),
      eventAttendanceMode: mode,
      eventStatus: event.data.cancelled
        ? 'https://schema.org/EventCancelled'
        : 'https://schema.org/EventScheduled',
      inLanguage: SITE.lang,
      location: location.length === 1 ? location[0] : location,
      ...(organizerName ? { organizer: { '@type': 'Organization', name: organizerName } } : {}),
      ...(event.data.registerUrl
        ? {
            offers: {
              '@type': 'Offer',
              url: event.data.registerUrl,
              price: event.data.price ?? '0',
              priceCurrency: 'IRR',
              availability: 'https://schema.org/InStock',
            },
          }
        : {}),
    },
    breadcrumb([
      { name: 'خانه', url: '/' },
      { name: 'رویدادها', url: '/events' },
      { name: event.data.title, url: new URL(url).pathname },
    ]),
  );
}

export function collectionSchema(name: string, url: string, description: string, count: number) {
  return graph({
    '@type': 'CollectionPage',
    '@id': `${url}#collection`,
    name,
    description,
    url,
    inLanguage: SITE.lang,
    isPartOf: { '@id': SITE_ID },
    mainEntity: { '@type': 'ItemList', numberOfItems: count },
  });
}

export function profileSchema(author: Author, url: string, postCount: number) {
  return graph(
    {
      '@type': 'ProfilePage',
      '@id': `${url}#profile`,
      url,
      inLanguage: SITE.lang,
      mainEntity: { '@id': `${SITE.url}/#person-${author.id}` },
      ...(postCount ? { interactionStatistic: { '@type': 'InteractionCounter', interactionType: 'https://schema.org/WriteAction', userInteractionCount: postCount } } : {}),
    },
    personNode(author, url),
  );
}
