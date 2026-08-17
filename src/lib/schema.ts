import type { CollectionEntry } from 'astro:content';
import { SITE, SOCIAL } from '../consts';

type Post = CollectionEntry<'posts'>;
type Entity = CollectionEntry<'entities'>;
type Author = CollectionEntry<'authors'>;
type EventEntry = CollectionEntry<'events'>;

const BUILD_TIME = new Date();

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

export function breadcrumb(trail: Array<{ name: string; url: string }>) {
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
  // Community links are other profiles of the same entity, which is exactly
  // what sameAs is for.
  for (const link of entity.data.links) sameAs.push(link.url);

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

export function eventSchema(
  event: EventEntry,
  url: string,
  opts: { organizerName?: string; organizerUrl?: string; imageUrl?: string } = {},
) {
  const d = event.data;

  const mode = {
    'in-person': 'https://schema.org/OfflineEventAttendanceMode',
    online: 'https://schema.org/OnlineEventAttendanceMode',
    hybrid: 'https://schema.org/MixedEventAttendanceMode',
  }[d.mode];

  const location: unknown[] = [];
  if (d.mode !== 'online') {
    location.push({
      '@type': 'Place',
      name: d.venue ?? d.city,
      address: {
        '@type': 'PostalAddress',
        addressLocality: d.city,
        addressCountry: d.country,
        ...(d.address ? { streetAddress: d.address } : {}),
      },
    });
  }
  if (d.mode !== 'in-person' && d.onlineUrl) {
    location.push({ '@type': 'VirtualLocation', url: d.onlineUrl });
  }

  /*
   * Offer.price must be a bare number. Free text such as "رایگان" is
   * rejected outright, so the human-readable wording lives in `priceNote`
   * and never reaches the structured data.
   */
  const offers = d.registerUrl
    ? {
        '@type': 'Offer',
        url: d.registerUrl,
        price: d.price ?? 0,
        priceCurrency: d.priceCurrency,
        availability: 'https://schema.org/InStock',
        validFrom: (d.registerOpensAt ?? BUILD_TIME).toISOString(),
      }
    : undefined;

  const organizer = opts.organizerName
    ? {
        '@type': 'Organization',
        name: opts.organizerName,
        ...(opts.organizerUrl ? { url: opts.organizerUrl } : {}),
      }
    : undefined;

  return graph(
    {
      '@type': 'Event',
      '@id': `${url}#event`,
      name: d.title,
      description: d.summary,
      startDate: d.startsAt.toISOString(),
      ...(d.endsAt ? { endDate: d.endsAt.toISOString() } : {}),
      eventAttendanceMode: mode,
      eventStatus: d.cancelled
        ? 'https://schema.org/EventCancelled'
        : 'https://schema.org/EventScheduled',
      inLanguage: SITE.lang,
      location: location.length === 1 ? location[0] : location,
      // Every event needs an image; without a cover we fall back to the
      // site's own card, which is better than omitting the field.
      image: [opts.imageUrl ?? `${SITE.url}/og/default.png`],
      ...(organizer ? { organizer } : {}),
      ...(d.performers.length
        ? {
            performer: d.performers.map((p) => ({
              '@type': 'Person',
              name: p.name,
              ...(p.role ? { jobTitle: p.role } : {}),
              ...(p.url ? { url: p.url } : {}),
            })),
          }
        : // No named speakers: the organiser is the one presenting.
          organizer
          ? { performer: organizer }
          : {}),
      ...(offers ? { offers } : {}),
    },
    breadcrumb([
      { name: 'خانه', url: '/' },
      { name: 'رویدادها', url: '/events' },
      { name: d.title, url: new URL(url).pathname },
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
