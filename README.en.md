<div align="center">

<img src="public/brand/tuxly-mark.svg" width="96" alt="Tuxly mark">

# tuxly · تاکسلی

**The free software world, in Persian**

News · Reference · Guides · Events

[tuxly.ir](https://tuxly.ir) · [RSS](https://tuxly.ir/rss.xml) · [Brand](https://tuxly.ir/brand)

[فارسی](README.md) · **English**

</div>

---

## What this is

Tuxly is a Persian-language news and reference site for free and open
source software: GNU/Linux news, guides, a reference for distributions,
desktops and projects, and a calendar of community events.

Persian-speaking readers have long had to choose between out-of-date
translations and reading everything in English. This is an attempt at a
third option — current, written by hand, and free to reuse.

The site itself is built the way it argues software should be: everything
open, no tracking, no ads.

## Getting started

```bash
git clone https://github.com/goudarz/tuxly.git
cd tuxly
npm install
npm run dev          # http://localhost:4321
```

Requires **Node 24 or newer**. With `nvm`, `nvm use` picks the right
version from `.nvmrc`.

Run this once after the first install so distribution versions are filled
in — they ship empty on purpose:

```bash
npm run update:versions
```

> Search needs a build first. Pagefind writes its index into `dist/`, and
> `npm run build` copies it into `public/` so `npm run dev` can serve it.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | development server |
| `npm run build` | OG images + static build + search index |
| `npm run preview` | preview the build output |
| `npm run check` | validate the content schema and types |
| `npm run info` | project status and every command |
| `npm run update:versions` | refresh versions from Wikidata and `endoflife.date` |
| `npm run update:versions -- --verbose` | same, with full error detail |
| `npm run brand:anniversary` | anniversary poster |
| `npm run brand:mascots` | regenerate the mascot set |
| `npm run brand:banner` | README banner |
| `npm run brand:social` | GitHub social preview image |
| `npm run brand:social-kit` | avatars and banners per platform |
| `npm run fonts:subset` | subset the fonts to the characters in use |

## Layout

```
content/                content — markdown, kept away from code
  posts/                articles
  entities/             distributions, desktops, window managers, projects, communities
  events/               events
  authors/              authors
  glossary/terms.json   technical glossary
src/
  assets/               images — optimised at build time
  components/           components
  layouts/              page layouts
  lib/                  helpers — Persian, schema.org, feeds, speakers
  integrations/         build plugins — external links, Pagefind in dev
  pages/                routes
public/brand/           logo, mascots, social images
scripts/                banner, version updates, image and font generation
```

> `pipeline/` — news collection and review — is kept local and is not
> published here.

## Writing a post

Create a file in `content/posts/`. Copy `_template.md`; every field is
documented there.

The schema in `src/content.config.ts` is deliberately strict and **fails
the build** when:

- a post has a `source` but no `sourceUrl` or `context`
- `originStatus` is `draft-review` while `draft: false`
- `originStatus` is `reviewed` with an empty `reviewedBy`
- a cover image has no `coverAlt`

A failed build beats a published page that is half finished.

## Some decisions, and why

**Speaker pages are generated, not written.** A name in an event's
`performers` is enough; `/speakers/<name>` appears on its own. A file per
speaker would mean creating one before any event that mentions a new name,
and that friction is exactly what stops people being credited. Identity
comes from `slugify`, which normalises Persian first — so «سینا بی‌مثل» and
«سینا بی مثل» resolve to one person rather than two.

**Search works in `dev` too — but only after a build.** Two obstacles had
to be cleared: `astro dev` serves `public/` and never looks at `dist/`, and
Vite refuses to hand over a `.js` file living in `public/`, answering 500.
`src/integrations/pagefind-dev.mjs` serves `/pagefind/` **before** Vite's
transform middleware. Development only; in production these are ordinary
static assets.

**The sitemap is a route, not a post-build step.** `/sitemap.xml` is built
by `src/pages/sitemap.xml.ts` straight from the content collections. A step
that runs after the build can be skipped; a route cannot. Every URL carries
a real `lastmod` taken from the content rather than the build time.

**Versions are never typed by hand.** Thirty hand-written version numbers
are largely wrong within months, because keeping them current manually is
work nobody actually does. `scripts/update-versions.mjs` pulls weekly from
`endoflife.date` and Wikidata. Where there is no data the field stays empty
and the page says "checking" — better than a guess.

**One repository, no submodules.** Code and content together, under two
licences: `AGPL-3.0-or-later` for code, `CC BY-SA 4.0` for content (see
`content/LICENSE`). Submodules mean every clone without `--recursive`
breaks and every change needs two pull requests — a poor trade anywhere,
and a worse one where connectivity is unreliable.

**Images live in the repository**, under `src/assets/`. They are converted
to AVIF and WebP in several sizes at build time. No external service, and
nothing that can become unreachable.

**Infinite scroll sits on top of real pagination.** The `/news/2` links are
in the HTML because crawlers do not scroll. JavaScript loads two pages
automatically and then shows a button — without that, nobody ever reaches
the footer.

**Dates are formatted in Tehran time**, not the build machine's. Intl
follows the host time zone unless told otherwise, and GitHub's runners are
UTC — which silently showed every event three and a half hours early.

## More documentation

| File | Topic |
|---|---|
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | GitHub Pages deployment and custom domain |
| [`docs/VERSIONS.md`](docs/VERSIONS.md) | what to do when versions fail to fetch |
| [`docs/COMMITS.md`](docs/COMMITS.md) | commit message convention |
| [`NOTICE.md`](NOTICE.md) | licensing in plain language |
| [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) | community code of conduct |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | how to contribute |

Most documentation is written in Persian, since that is the language of the
project. This file and the code comments are in English so the codebase
stays readable to anyone.

## Licence

| Part | Licence |
|---|---|
| Code | [AGPL-3.0-or-later](LICENSE) |
| Content | [CC BY-SA 4.0](content/LICENSE) |
| Mark and logotype | trademark — [rules](https://tuxly.ir/brand) |
| Vazirmatn, Space Grotesk | SIL OFL 1.1 |

Articles sourced from elsewhere keep their original licence, stated at the
foot of the page.

**What AGPL means here:** use, modify and redistribute freely — provided
you publish the source of your version, including when you only run it on
a server, and link back to the upstream repository. Plain-language summary
in [NOTICE.md](NOTICE.md).
