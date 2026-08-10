import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ROUTES, type RouteEntry } from '../../src/config/routes';
import { PAGE_SEO } from '../../src/config/seo';
import { SITE_URL } from '../../src/config/site';
import { Landing } from '../../src/screens/Landing';
import { AboutPublic } from '../../src/screens/AboutPublic';
import { IgcseFrenchSpeaking } from '../../src/screens/IgcseFrenchSpeaking';
import { FrenchRoleplayPractice } from '../../src/screens/FrenchRoleplayPractice';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, '../../dist');
const TEMPLATE_PATH = join(DIST_DIR, 'index.html');

// The only routes with real prerendered markup — everyone else (app routes)
// gets the shared shell with an empty #root and a noindex head, matching
// what the client renders anyway (login gate / app chrome needs JS).
const PUBLIC_PAGE_COMPONENTS: Record<string, () => import('react').ReactElement> = {
  '/': () => createElement(Landing),
  '/about': () => createElement(AboutPublic),
  '/igcse-french-speaking': () => createElement(IgcseFrenchSpeaking),
  '/french-roleplay-practice': () => createElement(FrenchRoleplayPractice),
};

function readTemplate(): string {
  return readFileSync(TEMPLATE_PATH, 'utf-8');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHead(route: RouteEntry, template: string): string {
  const seo = PAGE_SEO[route.path];
  const title = seo?.title ?? 'FrenchCoach';
  const description = seo?.description ?? '';
  const canonical = `${SITE_URL}${seo?.canonicalPath ?? route.path}`;
  const robots = seo?.robots ?? 'noindex, nofollow';

  let html = template;

  html = html.replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${escapeHtml(description)}" />`,
  );

  // robots + canonical don't exist in the template — insert once, right
  // after <meta name="description">, so every generated shell carries them.
  const robotsAndCanonical =
    `<meta name="robots" content="${robots}" />\n` +
    `    <link rel="canonical" href="${escapeHtml(canonical)}" />`;
  html = html.replace(
    /(<meta name="description" content="[^"]*" \/>)/,
    `$1\n    ${robotsAndCanonical}`,
  );

  if (seo) {
    html = html.replace(
      /<meta property="og:title" content="[^"]*" \/>/,
      `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    );
    html = html.replace(
      /<meta property="og:description" content="[^"]*" \/>/,
      `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    );
    html = html.replace(
      /<meta name="twitter:title" content="[^"]*" \/>/,
      `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    );
    html = html.replace(
      /<meta name="twitter:description" content="[^"]*" \/>/,
      `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    );
    html = html.replace(
      /<meta property="og:image" content="[^"]*" \/>/,
      `<meta property="og:url" content="${escapeHtml(canonical)}" />\n    $&`,
    );
  }

  if (seo?.jsonLd?.length) {
    const scripts = seo.jsonLd
      .map((block) => `<script type="application/ld+json">${JSON.stringify(block)}</script>`)
      .join('\n    ');
    html = html.replace('</head>', `    ${scripts}\n  </head>`);
  }

  return html;
}

function buildBody(route: RouteEntry, html: string): string {
  const componentFactory = PUBLIC_PAGE_COMPONENTS[route.path];
  if (!componentFactory) {
    // App route: keep the empty #root shell, client hydrates and decides
    // (auth gate / dashboard / onboarding) — nothing to prerender.
    return html;
  }
  const markup = renderToStaticMarkup(componentFactory());
  return html.replace('<div id="root"></div>', `<div id="root">${markup}</div>`);
}

function outputPathFor(routePath: string): string {
  if (routePath === '/') return join(DIST_DIR, 'index.html');
  return join(DIST_DIR, routePath.replace(/^\//, ''), 'index.html');
}

function writeShell(route: RouteEntry, template: string) {
  const withHead = buildHead(route, template);
  const withBody = buildBody(route, withHead);
  const outPath = outputPathFor(route.path);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, withBody, 'utf-8');
}

function main() {
  if (!existsSync(TEMPLATE_PATH)) {
    throw new Error(`Expected Vite build output at ${TEMPLATE_PATH} — run "vite build" first.`);
  }
  const template = readTemplate();

  // Only non-dynamic, non-dev-only routes get a static shell. Dynamic admin
  // routes (:id) can't be enumerated at build time and stay served by the
  // client-side app once a real path is known; dev-only routes are
  // tree-shaken out of production builds and must never ship a prod shell.
  const shellable = ROUTES.filter((r) => r.kind !== 'dynamic' && r.kind !== 'dev-only');

  for (const route of shellable) {
    writeShell(route, template);
  }

  console.log(`[prerender] wrote ${shellable.length} static shells to ${DIST_DIR}`);
}

main();
