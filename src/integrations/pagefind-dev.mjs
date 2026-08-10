import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Serve the Pagefind index in `astro dev`.
 *
 * Pagefind's client is an ES module we import at runtime. In dev, Vite's
 * transform middleware sees a request for a .js file, notices it lives in
 * public/, and refuses with:
 *
 *   "This file is in /public and will be copied as-is during build ...
 *    and therefore should not be imported from source code."
 *
 * That is correct advice for source modules, but Pagefind's bundle is
 * prebuilt output that must be served verbatim — it is not ours to
 * transform.
 *
 * So we hand these paths back before Vite gets a look at them. The
 * middleware is unshifted onto the connect stack rather than appended,
 * because appending would put it *after* the transform middleware that
 * throws. Dev only; production serves the files as plain static assets.
 */

const MIME = {
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.css': 'text/css; charset=utf-8',
};

export default function pagefindDev({ prefix = '/pagefind/' } = {}) {
  return {
    name: 'tuxly:pagefind-dev',
    hooks: {
      'astro:server:setup': ({ server, logger }) => {
        const publicDir = fileURLToPath(new URL('../../public/', import.meta.url));

        const handler = async (req, res, next) => {
          const url = (req.url ?? '').split('?')[0];
          if (!url.startsWith(prefix)) return next();

          // Block traversal: the resolved path must stay under public/.
          const target = normalize(join(publicDir, decodeURIComponent(url)));
          if (!target.startsWith(normalize(publicDir))) return next();

          try {
            const info = await stat(target);
            if (!info.isFile()) return next();

            const body = await readFile(target);
            res.setHeader(
              'Content-Type',
              MIME[extname(target)] ?? 'application/octet-stream',
            );
            res.setHeader('Cache-Control', 'no-cache');
            res.end(body);
          } catch {
            // Index not built yet. Let Astro answer, so the UI shows its own
            // "run npm run build" message instead of a Vite stack trace.
            next();
          }
        };

        // Must run before Vite's transform middleware, hence unshift.
        server.middlewares.stack.unshift({ route: '', handle: handler });
        logger.info(`serving ${prefix} directly (dev only)`);
      },
    },
  };
}
