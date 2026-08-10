// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import externalLinks from './src/integrations/external-links.mjs';
import pagefindDev from './src/integrations/pagefind-dev.mjs';
import { SITE } from './src/consts.js';

export default defineConfig({
  site: SITE.url,

  /**
   * Static output. The whole site is prerendered so one build can be mirrored
   * to several hosts, which is what keeps it reachable from inside Iran.
   */
  output: 'static',
  trailingSlash: 'ignore',

  integrations: [
    mdx(),

    /**
     * Every off-domain link: nofollow, new tab, and a utm_source=tuxly.ir
     * parameter so the destination knows where the referral came from.
     * Runs at build time because nofollow must be in the served HTML.
     */
    externalLinks({ siteHost: new URL(SITE.url).hostname }),

    /**
     * Serve the prebuilt Pagefind index in dev. Without this, Vite refuses
     * to hand over a .js file that lives in public/, and search 500s.
     */
    pagefindDev(),
  ],

  image: {
    // Images are converted to AVIF and WebP at build time, in several sizes.
    responsiveStyles: true,
    layout: 'constrained',
  },

  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: true,
    },
  },

  build: { format: 'directory', inlineStylesheets: 'auto' },

  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
});
