import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROUTES } from '../../src/config/routes';
import { SITE_URL } from '../../src/config/site';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, '../../dist');

function buildSitemap(): string {
  const urls = ROUTES.filter((r) => r.indexable)
    .map((r) => `  <url>\n    <loc>${SITE_URL}${r.path}</loc>\n  </url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

// Minimal, noindex — the real 404 status comes from Vercel's filesystem
// fallback once the catch-all rewrite is gone; this file is the body Vercel
// serves alongside that 404 status.
function build404(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Page not found | Français AI</title>
  </head>
  <body>
    <h1>Page not found</h1>
    <p><a href="/">Go home</a></p>
  </body>
</html>
`;
}

function main() {
  if (!existsSync(DIST_DIR)) {
    throw new Error(`Expected build output at ${DIST_DIR} — run "vite build" first.`);
  }
  mkdirSync(DIST_DIR, { recursive: true });
  writeFileSync(join(DIST_DIR, 'sitemap.xml'), buildSitemap(), 'utf-8');
  writeFileSync(join(DIST_DIR, '404.html'), build404(), 'utf-8');
  console.log('[sitemap] wrote dist/sitemap.xml and dist/404.html');
}

main();
