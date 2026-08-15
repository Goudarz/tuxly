import { defineCollection, reference } from 'astro:content';
// `import { z } from 'astro:content'` is deprecated in Astro 7. This is the
// same zod v4 instance, just imported from where Astro now exposes it.
import { z } from 'astro/zod';
import { glob, file } from 'astro/loaders';
import { POST_TYPES, ENTITY_TYPES, PACKAGE_MANAGERS } from './consts';

/** How the text relates to its source. Shown in the UI as source + review. */
const originStatus = z.enum(['original', 'draft-review', 'reviewed']);

const sources = defineCollection({
  loader: file('content/sources.json', { parser: (t) => JSON.parse(t).sources }),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    nameFa: z.string(),
    home: z.url(),
    feed: z.url(),
    license: z.string(),
    licenseUrl: z.url(),
    policy: z.enum(['full-translate', 'summary-only']),
    shareAlike: z.boolean(),
    attribution: z.string(),
    note: z.string().optional(),
  }),
});

const media = z.object({
  /** YouTube, PeerTube, Aparat, Vimeo, or a full embed URL. */
  provider: z.enum(['youtube', 'peertube', 'aparat', 'vimeo', 'audio', 'iframe']),
  id: z.string(),
  title: z.string(),
  /** For PeerTube and Aparat, which have no fixed host. */
  host: z.string().optional(),
  poster: z.string().optional(),
  duration: z.string().optional(),
  kind: z.enum(['video', 'podcast']).default('video'),
});

const posts = defineCollection({
  loader: glob({ base: 'content/posts', pattern: '**/[^_]*.{md,mdx}' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().max(120),
        summary: z.string().min(40).max(320),
        publishedAt: z.coerce.date(),
        updatedAt: z.coerce.date().optional(),
        type: z.enum(POST_TYPES).default('news'),

        author: reference('authors'),
        tags: z.array(z.string()).default([]),
        entities: z.array(reference('entities')).default([]),
        series: z.string().optional(),

        cover: image().optional(),
        coverAlt: z.string().optional(),
        /** Gallery: first image large, the rest as thumbnails. */
        gallery: z
          .array(z.object({ src: image(), alt: z.string(), caption: z.string().optional() }))
          .default([]),
        media: z.array(media).default([]),

        source: reference('sources').optional(),
        sourceUrl: z.url().optional(),
        sourceTitle: z.string().optional(),
        originStatus: originStatus.default('original'),
        reviewedBy: reference('authors').optional(),

        /**
          * Persian context — why this matters to our reader. Required for
          * anything sourced from outside.
          */
        context: z.string().min(60).max(600).optional(),

        draft: z.boolean().default(true),
        featured: z.boolean().default(false),

        /** Table of contents. Set false to hide it on a specific post. */
        toc: z.boolean().default(true),
      })
      .superRefine((d, ctx) => {
        if (d.source && !d.sourceUrl) {
          ctx.addIssue({ code: 'custom', path: ['sourceUrl'], message: 'مطلبی که منبع دارد باید sourceUrl هم داشته باشد.' });
        }
        if (d.source && !d.context) {
          ctx.addIssue({
            code: 'custom',
            path: ['context'],
            message: 'مطلبی که از منبع بیرونی می‌آید باید بخش زمینهٔ فارسی داشته باشد.',
          });
        }
        if (d.originStatus === 'draft-review' && !d.draft) {
          ctx.addIssue({ code: 'custom', path: ['draft'], message: 'متن بازبینی‌نشده منتشر نمی‌شود.' });
        }
        if (d.originStatus === 'reviewed' && !d.reviewedBy) {
          ctx.addIssue({ code: 'custom', path: ['reviewedBy'], message: 'متن بازبینی‌شده باید بازبین داشته باشد.' });
        }
        if (d.cover && !d.coverAlt) {
          ctx.addIssue({ code: 'custom', path: ['coverAlt'], message: 'تصویر شاخص باید متن جایگزین داشته باشد.' });
        }
      }),
});

const entities = defineCollection({
  loader: glob({ base: 'content/entities', pattern: '**/[^_]*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      nameFa: z.string().optional(),
      aliases: z.array(z.string()).default([]),
      type: z.enum(ENTITY_TYPES),
      summary: z.string().max(400),
      logo: image().optional(),
      website: z.url().optional(),
      repo: z.url().optional(),
      docs: z.url().optional(),
      wikidata: z.string().regex(/^Q\d+$/).optional(),
      sameAs: z.array(z.url()).default([]),

      /**
       * Community links, shown as buttons next to the website and repo.
       * `kind` picks the icon and the default label; `label` overrides it
       * when one entity has several of the same kind (channel vs group).
       */
      links: z
        .array(
          z.object({
            kind: z.enum([
              'telegram-channel',
              'telegram-group',
              'mastodon',
              'matrix',
              'discord',
              'slack',
              'zulip',
              'irc',
              'forum',
              'mailing-list',
              'stackoverflow',
              'youtube',
              'peertube',
              'x',
              'linkedin',
              'bluesky',
              'wiki',
              'blog',
              'calendar',
              'other',
            ]),
            url: z.url(),
            label: z.string().optional(),
            note: z.string().optional(),
          }),
        )
        .default([]),
      license: z.string().optional(),
      firstRelease: z.coerce.date().optional(),
      related: z.array(reference('entities')).default([]),
      tags: z.array(z.string()).default([]),

      /** Lower sorts first. Use for pinning; default keeps alphabetical order. */
      priority: z.number().default(100),

      // ---- distribution ----
      family: z.string().optional(),
      basedOn: z.array(reference('entities')).default([]),
      packageManager: z.enum(PACKAGE_MANAGERS).optional(),
      releaseModel: z.enum(['fixed', 'rolling', 'semi-rolling', 'lts']).optional(),
      defaultDesktop: z.array(z.string()).default([]),
      architectures: z.array(z.string()).default([]),

      /**
       * Do not edit versions by hand — the weekly script fills these from
       * Wikidata and endoflife.date. Empty renders as "checking" in the UI.
       */
      currentVersion: z.string().optional(),
      releasedAt: z.coerce.date().optional(),
      eolAt: z.coerce.date().optional(),
      eolId: z.string().optional(),
      versionCheckedAt: z.coerce.date().optional(),

      // ---- desktop and window manager ----
      toolkit: z.string().optional(),
      display: z.array(z.enum(['x11', 'wayland'])).default([]),
      tiling: z.boolean().optional(),

      draft: z.boolean().default(false),
    }),
});

const authors = defineCollection({
  loader: glob({ base: 'content/authors', pattern: '**/[^_]*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      nameLatin: z.string().optional(),
      role: z.string().optional(),
      bio: z.string().max(500),
      /** Square 512x512. Falls back to the Tuxly mark when absent. */
      avatar: image().optional(),
      email: z.email().optional(),
      website: z.url().optional(),
      github: z.string().optional(),
      telegram: z.string().optional(),
      mastodon: z.url().optional(),
      peertube: z.url().optional(),
      linkedin: z.url().optional(),
      x: z.string().optional(),
      sameAs: z.array(z.url()).default([]),
      roles: z.array(z.enum(['author', 'translator', 'reviewer', 'editor', 'founder'])).default(['author']),
      featured: z.boolean().default(false),
    }),
});

const events = defineCollection({
  loader: glob({ base: 'content/events', pattern: '**/[^_]*.{md,mdx}' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().max(140),
        summary: z.string().max(400),
        startsAt: z.coerce.date(),
        endsAt: z.coerce.date().optional(),
        timezone: z.string().default('Asia/Tehran'),
        mode: z.enum(['in-person', 'online', 'hybrid']),
        /** Organiser — references a community or organization entity. */
        organizer: reference('entities').optional(),
        organizerName: z.string().optional(),
        venue: z.string().optional(),
        city: z.string().optional(),
        country: z.string().default('ایران'),
        address: z.string().optional(),
        mapUrl: z.url().optional(),
        onlineUrl: z.url().optional(),
        registerUrl: z.url().optional(),
        /** Overrides the "نام‌نویسی" button label when it is not registration. */
        registerLabel: z.string().optional(),
        price: z.number().nonnegative().optional(),
        priceCurrency: z.string().length(3).default('IRR'),
        /** Human-readable note shown in the UI, e.g. "رایگان" or "با نام‌نویسی". */
        priceNote: z.string().optional(),
        registerOpensAt: z.coerce.date().optional(),
        /** Speakers or hosts. Fills schema.org `performer`. */
        /**
         * Speakers or hosts. Shown on the page and used for schema.org
         * `performer`.
         *
         * Accepts a bare name or an object — a plain name should stay a
         * one-liner:
         *
         *   performers:
         *     - گودرز جعفری
         *     - name: ساناز کوهپایه
         *       talk: چطور درایور برای توزیع‌های مختلف گنو/لینوکس توسعه بدهیم؟
         *       role: توسعه‌دهندهٔ وب
         *       url: https://example.org
         *       author: goudarz-jafari
         */
        performers: z
          .array(
            z.union([
              z.string(),
              z.object({
                name: z.string(),
                /** Title of this person's talk, if the event has several. */
                talk: z.string().optional(),
                /** Short descriptor: job, affiliation, whatever fits. */
                role: z.string().optional(),
                url: z.url().optional(),
                /**
                 * Link to an author profile instead of the generated
                 * speaker page. Use it when the speaker also writes here,
                 * so one person does not end up with two pages.
                 */
                author: reference('authors').optional(),
              }),
            ]),
          )
          .default([])
          // Normalise here so every consumer sees the same shape.
          .transform((list) => list.map((p) => (typeof p === 'string' ? { name: p } : p))),
        language: z.string().default('فارسی'),
        topics: z.array(z.string()).default([]),
        entities: z.array(reference('entities')).default([]),
        cover: image().optional(),
        coverAlt: z.string().optional(),
        cancelled: z.boolean().default(false),
        draft: z.boolean().default(false),
      })
      .superRefine((d, ctx) => {
        if (d.mode !== 'online' && !d.city) {
          ctx.addIssue({ code: 'custom', path: ['city'], message: 'رویداد حضوری باید شهر داشته باشد.' });
        }
        if (d.mode !== 'in-person' && !d.onlineUrl) {
          ctx.addIssue({ code: 'custom', path: ['onlineUrl'], message: 'رویداد آنلاین باید نشانی اتصال داشته باشد.' });
        }
        if (d.endsAt && d.endsAt < d.startsAt) {
          ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'زمان پایان نمی‌تواند قبل از شروع باشد.' });
        }
      }),
});

const glossary = defineCollection({
  loader: file('content/glossary/terms.json'),
  schema: z.object({
    id: z.string(),
    en: z.string(),
    fa: z.string(),
    avoid: z.array(z.string()).default([]),
    note: z.string().optional(),
    keepLatin: z.boolean().default(false),
  }),
});

export const collections = { posts, entities, authors, events, sources, glossary };
