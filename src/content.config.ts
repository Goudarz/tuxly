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
          * Persian context - why this matters to our reader. Required for
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
       * Do not edit versions by hand - the weekly script fills these from
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
        /** Organiser - references a community or organization entity. */
        organizer: reference('entities').optional(),
        organizerName: z.string().optional(),
        /**
         * Co-organisers, for events several communities put on together.
         * `organizer` stays the host; these are listed beside it, linked,
         * and the event shows up on each partner's own page as well.
         */
        partners: z.array(reference('entities')).default([]),
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
         * Accepts a bare name or an object - a plain name should stay a
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

        /**
         * Where the organisers published their own notes. Shown as a link
         * after the event, so a reader can go to the source rather than
         * relying on our summary.
         */
        notesUrl: z.url().optional(),

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

/**
 * People who appear at the conferences we cover - speakers, keynoters,
 * the names a reader comes looking for. Each gets a profile page with its
 * own structured data, and every talk and conference links to it.
 *
 * Separate from `authors` (people who write here) and from the generated
 * event speakers (names only, no profile to maintain): these are public
 * figures worth a real page.
 */
const figures = defineCollection({
  loader: glob({ base: 'content/figures', pattern: '**/[^_]*.{md,mdx}' }),
  schema: ({ image }) =>
    z
      .object({
        /** The name as the world knows it, usually Latin. */
        name: z.string(),
        nameFa: z.string(),
        /** Full name when `name` is a nickname, e.g. DHH. */
        fullName: z.string().optional(),
        aliases: z.array(z.string()).default([]),
        /** Short Persian descriptor, shown under the name. */
        role: z.string().max(120),
        summary: z.string().min(40).max(300),
        /** What they are known for, e.g. "Ruby on Rails". */
        knownFor: z.array(z.string()).default([]),
        affiliation: z.string().optional(),
        /** Square, at least 400px. Falls back to a monogram. */
        photo: image().optional(),
        photoAlt: z.string().optional(),
        website: z.url().optional(),
        github: z.string().optional(),
        x: z.string().optional(),
        mastodon: z.url().optional(),
        wikipedia: z.url().optional(),
        sameAs: z.array(z.url()).default([]),
        entities: z.array(reference('entities')).default([]),
        draft: z.boolean().default(false),
      })
      .superRefine((d, ctx) => {
        if (d.photo && !d.photoAlt) {
          ctx.addIssue({ code: 'custom', path: ['photoAlt'], message: 'عکس باید متن جایگزین داشته باشد.' });
        }
      }),
});

/** A figure's part in one conference or talk; `role` overrides the profile's. */
const appearance = z.object({
  person: reference('figures'),
  role: z.string().optional(),
});

/**
 * Conference coverage - international conferences we follow in depth.
 *
 * An event page announces a meetup; a conference page is where we keep up
 * with one after the fact: its recorded talks, each with Persian subtitles
 * where we have them. Every conference carries its own accent colour so a
 * reader can tell at a glance they are inside a coverage section, not on
 * an ordinary event page.
 */
const conferences = defineCollection({
  loader: glob({ base: 'content/conferences', pattern: '**/[^_]*.{md,mdx}' }),
  schema: ({ image }) =>
    z
      .object({
        name: z.string(),
        nameFa: z.string().optional(),
        /** One line under the name, e.g. "Austin, two days, two tracks". */
        tagline: z.string().max(160),
        summary: z.string().min(40).max(320),
        startsAt: z.coerce.date(),
        endsAt: z.coerce.date().optional(),
        timezone: z.string().default('UTC'),
        venue: z.string().optional(),
        city: z.string(),
        country: z.string(),
        website: z.url(),
        /** Where the recordings are published, e.g. a YouTube playlist. */
        videosUrl: z.url().optional(),
        organizer: reference('entities').optional(),
        language: z.string().default('انگلیسی'),
        /** Why this conference matters to a Persian-speaking reader. */
        context: z.string().min(60).max(600).optional(),

        /**
         * The conference's own colours. `accent` must read on the dark hero;
         * `ink` is the text colour placed on top of it (buttons, badges).
         */
        theme: z
          .object({
            accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
            ink: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#FFFFFF'),
          })
          .default({ accent: '#FFB020', ink: '#0F141C' }),

        cover: image().optional(),
        coverAlt: z.string().optional(),

        /** Notable speakers, for the hub page before all talks are out. */
        /**
         * Notable people at this edition, before or beyond the talks that
         * are out. Each one points at a profile in content/figures/.
         */
        highlights: z.array(appearance).default([]),

        talks: z
          .array(
            z.object({
              /** URL segment: /conferences/<conference>/<slug>. */
              slug: z.string().regex(/^[a-z0-9-]+$/),
              title: z.string(),
              titleFa: z.string(),
              speakers: z.array(appearance).min(1),
              summary: z.string().min(40).max(600),
              youtube: z.string().regex(/^[\w-]{11}$/),
              /**
               * Direct MP4/WebM of the same video (own host, PeerTube, …).
               * Offered as "پخش مستقیم" so readers who cannot reach YouTube,
               * or get its bot check, can still watch with subtitles.
               */
              mirror: z.url().optional(),
              publishedAt: z.coerce.date(),
              /** h:mm:ss, shown on the card and in the player. */
              duration: z.string().regex(/^\d+:\d{2}(:\d{2})?$/).optional(),
              keynote: z.boolean().default(false),
              chapters: z.array(z.object({ at: z.string().regex(/^\d{1,2}:\d{2}:\d{2}$/), title: z.string() })).default([]),
              /**
               * Subtitle files under public/, e.g.
               * /subtitles/rails-world-2026/opening-keynote.fa.srt
               */
              subtitles: z
                .array(
                  z.object({
                    lang: z.string(),
                    label: z.string(),
                    src: z.string().regex(/^\/subtitles\/.+\.srt$/),
                    translator: reference('authors').optional(),
                  }),
                )
                .default([]),
              /** Credit line for the video itself, e.g. the post-production sponsor. */
              credit: z.string().optional(),
            }),
          )
          .default([]),

        draft: z.boolean().default(false),
      })
      .superRefine((d, ctx) => {
        if (d.cover && !d.coverAlt) {
          ctx.addIssue({ code: 'custom', path: ['coverAlt'], message: 'تصویر شاخص باید متن جایگزین داشته باشد.' });
        }
        if (d.endsAt && d.endsAt < d.startsAt) {
          ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'زمان پایان نمی‌تواند قبل از شروع باشد.' });
        }
        const slugs = d.talks.map((t) => t.slug);
        slugs.forEach((s, i) => {
          if (slugs.indexOf(s) !== i) {
            ctx.addIssue({ code: 'custom', path: ['talks', i, 'slug'], message: `اسلاگ ارائه تکراری است: ${s}` });
          }
        });
      }),
});

/**
 * Dated moments in free software history.
 *
 * Only for things that have no natural home elsewhere. Anything that is a
 * project's own birth is better expressed as `firstRelease` on its entity,
 * which the anniversaries page already reads - one fact, one place.
 */
const milestones = defineCollection({
  loader: file('content/milestones.json'),
  schema: z.object({
    id: z.string(),
    date: z.coerce.date(),
    titleFa: z.string(),
    kind: z.enum(['founded', 'release', 'milestone', 'person']),
    /** Optional link to the entity this moment belongs to. */
    entity: reference('entities').optional(),
    note: z.string().optional(),
    source: z.url().optional(),
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

export const collections = { posts, entities, authors, events, figures, conferences, sources, glossary, milestones };
