import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';

/**
 * Rewrite external links, at build time.
 *
 * Build time rather than client-side JS: Googlebot only sees rel="nofollow"
 * when it is in the served HTML. Adding it after load has no effect. This
 * runs over the final output, so it catches links in Markdown and in
 * components alike.
 *
 * Each external link gets:
 *   rel="nofollow noopener noreferrer"  no link equity + tab safety
 *   target="_blank"                     opens in a new tab
 *   ?utm_source=tuxly.ir                tells the destination who referred
 *   an ↗ marker plus hidden screen-reader text
 *
 * noopener is not optional: without it the destination can reach our tab
 * through window.opener and change its location (tabnabbing).
 */

/** Protocols that take neither a parameter nor a new tab. */
const SKIP_PROTOCOLS = new Set(['mailto:', 'tel:', 'sms:', 'javascript:', 'data:']);

/** Hosts that must not get the ref parameter — they mishandle the query. */
const NO_PARAM_HOSTS = new Set(['www.wikidata.org', 'wikidata.org']);

/**
 * Links that must survive untouched.
 *
 * A rel="me" link is an identity claim: Mastodon fetches this page and
 * compares the href with the URL on the profile. Appending a tracking
 * parameter makes the two differ and verification silently fails.
 */
const isIdentityLink = (rel) => rel.has('me');

export default function externalLinks(options = {}) {
  const {
    siteHost,
    refParam = 'utm_source',
    refValue = 'tuxly.ir',
    /** External hosts exempt from nofollow. Empty for now. */
    followHosts = [],
    icon = true,
  } = options;

  const follow = new Set(followHosts);

  return {
    name: 'tuxly:external-links',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const host = siteHost.replace(/^www\./, '');
        let files = 0;
        let links = 0;

        async function walk(current) {
          for (const entry of await readdir(current, { withFileTypes: true })) {
            const path = join(current, entry.name);
            if (entry.isDirectory()) {
              await walk(path);
              continue;
            }
            if (extname(entry.name) !== '.html') continue;

            const html = await readFile(path, 'utf8');
            const doc = parse(html, { comment: true });
            let touched = 0;

            for (const a of doc.querySelectorAll('a[href]')) {
              const href = a.getAttribute('href') ?? '';
              if (!href || href.startsWith('#') || href.startsWith('/') || href.startsWith('.')) continue;

              let url;
              try {
                url = new URL(href, `https://${host}`);
              } catch {
                continue;
              }
              if (SKIP_PROTOCOLS.has(url.protocol)) continue;
              if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;

              const target = url.hostname.replace(/^www\./, '');
              if (target === host || target.endsWith(`.${host}`)) continue;

              // Referral parameter — leave any existing value alone.
              const relNow = new Set((a.getAttribute('rel') ?? '').split(/\s+/).filter(Boolean));
              if (
                !isIdentityLink(relNow) &&
                !NO_PARAM_HOSTS.has(url.hostname) &&
                !url.searchParams.has(refParam)
              ) {
                url.searchParams.set(refParam, refValue);
                a.setAttribute('href', url.toString());
              }

              const rel = new Set((a.getAttribute('rel') ?? '').split(/\s+/).filter(Boolean));
              rel.add('noopener');
              rel.add('noreferrer');
              if (!follow.has(target)) rel.add('nofollow');
              a.setAttribute('rel', [...rel].join(' '));
              a.setAttribute('target', '_blank');

              /**
               * A tab opening unannounced is disorienting for screen-reader
               * users (WCAG 3.2.5), so add both a visual and a hidden cue.
               */
              if (icon && !a.classList.contains('btn') && !a.hasAttribute('data-no-ext')) {
                a.classList.add('ext');
                if (!a.querySelector('.ext-note')) {
                  a.insertAdjacentHTML(
                    'beforeend',
                    '<span class="ext-note visually-hidden"> (پیوند بیرونی، در تب تازه باز می‌شود)</span>',
                  );
                }
              }

              touched++;
            }

            if (touched) {
              await writeFile(path, doc.toString(), 'utf8');
              files++;
              links += touched;
            }
          }
        }

        await walk(root);
        logger.info(`rewrote ${links} external links across ${files} pages`);
      },
    },
  };
}
