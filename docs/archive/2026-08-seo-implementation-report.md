# SEO Implementation Report — Français AI (french.beyondthebasics.me)

> **ARCHIVED — NOT AUTHORITATIVE.** A retrospective of work already completed. Its
> `docs/architecture/01-cambridge-rubric-source.md` citation points at a document that no
> longer exists — see `docs/README.md`'s citation decoder. It is historical, not a live rule.

What shipped across Stages A–C (`a220608`, `4e8443f`, `9c70c71`), measured against the codebase at `9c70c71` (clean tree). See `docs/seo-audit.md` for the pre-work state and reasoning; this report covers what was built.

## 1. What was wrong

The site was a client-only SPA that showed a login form at every URL to anyone without a session — including crawlers, which don't authenticate. Combined with no `robots.txt`, no `sitemap.xml`, a soft-200 catch-all (every unknown URL returned the app shell with `200 OK`), and OG tags pointing at `bolt.new` scaffolding, the app was structurally invisible to search engines and would misrepresent itself on any link share. Full detail in `docs/seo-audit.md`.

## 2. What was implemented

- A route registry (`src/config/routes.ts`) as the single source of truth for indexability, consumed by the prerender script, the sitemap generator, and a route-parity test.
- Four public marketing pages, wired into the router and reachable pre-auth.
- A build-time static-shell generator (`scripts/seo/prerender.ts`) producing real HTML for crawlers, no server required.
- A generated `sitemap.xml` and a real `dist/404.html`.
- Structured data (JSON-LD) on all 4 public pages.
- Removal of the `vercel.json` catch-all rewrite, so unknown URLs 404 for real.
- Removal of fabricated content from `About.tsx`.

## 3. Pages created

4 indexable public pages (source: `src/config/routes.ts`, cross-checked against `dist/sitemap.xml`):

| Route | h1 | Real content basis |
|---|---|---|
| `/` | "Practise the IGCSE French speaking exam by speaking, not by reading." | Hub page; 3 feature sections + links to the two content pages |
| `/igcse-french-speaking` | "The IGCSE French Speaking Exam" | Cambridge 0520 Paper 3 facts sourced from `docs/architecture/01-cambridge-rubric-source.md` §1.1 — 25% of qualification, 40 marks, ~10 min assessed + 10 min prep + unassessed 30s greeting, role play (5 tasks × 2 marks = 10), two topic conversations (Communication /15, Quality of Language /15 combined), CEFR A2 with elements of B1. Explicit non-affiliation statement with Cambridge Assessment. |
| `/french-roleplay-practice` | "French Roleplay Practice" | Renders `SCENARIOS.length` (30) real scenario titles sourced from the actual scenario data, not invented copy |
| `/about` | (shared `AboutContent`) | Fabricated testimonials and the "10k+ Words Practiced" tile removed; "fine-tuned on the 0520 mark scheme" reworded, non-affiliation stated |

37 other known routes (app + `/login`) get a static shell with correct `<head>` metadata but no body content — see § Crawlability. 4 dynamic admin routes (`/admin/{questions,scenarios}/:id/{edit,history}`) and 1 dev-only route (`/debug/beliefs`) are excluded from shelling entirely.

**Dropped from the original plan**: `/french-pronunciation-practice`. Confirmed absent from `routes.ts`, `App.tsx`, `PublicRoutes.tsx`, and `PAGE_SEO` — never implemented. See § Remaining limitations for why.

## 4. Metadata strategy

`src/config/seo.ts` defines `PAGE_SEO`, keyed by path, with `title`, `description`, `canonicalPath`, `robots`, and optional `jsonLd` blocks — one entry per indexable route (4 entries, enforced 1:1 against `routes.ts` by `src/config/__tests__/seo.test.ts`). There is no separate OG/Twitter override field; those tags are derived from `title`/`description` wherever they're consumed.

Metadata is applied through **two independent mechanisms reading the same source of truth**, not one shared render path:

1. **Build-time** (`scripts/seo/prerender.ts`): for each of the 4 public routes, does a string-replace into the `dist/index.html` template — title, meta description, `<link rel="canonical">`, `<meta name="robots">`, OG/Twitter title+description+url, and JSON-LD `<script>` tags. For the other 36 shellable routes, only the head tags are rewritten (title/description/robots/canonical) onto an otherwise-empty `#root` shell.
2. **Runtime** (`src/components/SEO.tsx`, `<Seo route="…" />`): imperatively upserts the same fields into `document.head` via `useEffect`, tagging its nodes `data-seo-managed="true"` so they can be replaced on route change. Used by `MarketingLayout` (all 4 public pages) and directly by the signed-in `About.tsx`. Fails closed to `noindex, nofollow` / title `"FrenchCoach"` if a route has no `PAGE_SEO` entry (e.g. `/login`, `/404`).

Both paths are necessary: the build-time shell is what a crawler or link-unfurler sees without executing JS; the runtime component keeps tags correct as a user navigates client-side after hydration (a SPA route change wouldn't otherwise update `document.title` or canonical).

`src/config/site.ts` derives `SITE_URL` from `VITE_SITE_URL` (Vite) with a `process.env` fallback guarded by `typeof process !== 'undefined'`, defaulting to `https://french.beyondthebasics.me` — safe under both the Vite browser bundle and the Node-based `tsx` script runtime, since neither `import.meta.env` nor `process` is assumed to exist.

## 5. Structured data

Builders live in `src/utils/structuredData.ts`: `buildOrganizationSchema`, `buildWebSiteSchema`, `buildSoftwareApplicationSchema`, `buildBreadcrumbListSchema`, and `buildFAQPageSchema` (defined but intentionally unused — no real FAQ content exists on any page to back it, per an explicit comment in `seo.ts`).

Assigned per page:

- `/` — `Organization`, `WebSite` (no `SearchAction` — no site search exists), `SoftwareApplication`
- `/about` — `BreadcrumbList` (Home → About)
- `/igcse-french-speaking` — `BreadcrumbList` (Home → IGCSE French Speaking Exam)
- `/french-roleplay-practice` — `BreadcrumbList` (Home → French Roleplay Practice)

No `aggregateRating`, `review`, or `offers`/price on any page — none of that data exists in the product, so none is asserted. Every block is rendered by both the prerender step (static `<script type="application/ld+json">` in the shipped HTML) and `SEO.tsx` (same blocks, injected client-side).

## 6. Internal linking

`MarketingLayout` (`src/components/layout/MarketingLayout.tsx`) provides a consistent header (logo → `/`, "Log in" → `/login`) and a 3-column footer linking `/igcse-french-speaking`, `/french-roleplay-practice`, `/about`, plus `/login`, on every public page. `Landing.tsx` additionally links directly to both content pages from its "Two ways to practise" section; `IgcseFrenchSpeaking.tsx` links to `/learn`, `/exam`, and `/french-roleplay-practice`; `FrenchRoleplayPractice.tsx` links back to `/igcse-french-speaking`. Breadcrumb `<nav>` (visible, `aria-label="Breadcrumb"`) renders on `/about`, `/igcse-french-speaking`, and `/french-roleplay-practice`, mirroring the `BreadcrumbList` JSON-LD on those pages exactly. All internal links use plain `<a href>`, not React Router's `<Link>` — deliberate, since `MarketingLayout` has to stay router-free and context-free to prerender in Node.

## 7. Crawlability

- **`public/robots.txt`** (verified content):
  ```
  User-agent: *
  Disallow: /api/

  Sitemap: https://french.beyondthebasics.me/sitemap.xml
  ```
  Only `/api/` is `Disallow`d — the backend proxy, nothing to index or de-index. Every app/admin route is left crawlable so its `noindex, nofollow` meta tag is actually readable, rather than blocked at the robots layer (which would prevent Google from ever seeing the tag).
- **`scripts/seo/sitemap.ts`** emits `dist/sitemap.xml` from `ROUTES.filter(r => r.indexable)` — **4 entries**, matching the 4 public pages exactly, no `<lastmod>`/`<priority>`/`<changefreq>`.
- **Real 404s**: `vercel.json`'s `/(.*)` catch-all rewrite has been removed. Current `vercel.json` rewrites are limited to `/api/(.*)` (proxy to the Render backend) and 4 explicit admin `:id` rewrites to `/admin/index.html` (a separate SPA entry point outside this pipeline, unaffected by the marketing prerender). An unknown hard-loaded URL now reaches Vercel's filesystem 404 fallback and is served `dist/404.html` with a genuine `404` HTTP status.
- **`dist/404.html`** is a hand-written static string produced by `build404()` in `scripts/seo/sitemap.ts` — 352 bytes measured, plain HTML with `<meta name="robots" content="noindex, nofollow">`, title "Page not found | Français AI," and a single link home. It is **not** derived from `src/screens/NotFound.tsx`.
- **Route-parity test** (`src/config/__tests__/routes.test.ts`): regex-extracts every `<Route path="…">` from `src/App.tsx` and asserts it matches an entry in `routes.ts` (and vice versa, with an explicit exception for `/login`, which is intentionally unregistered as a `<Route>` but still needs a shell). Fails the build on drift between the two files.

## 8. Performance

Measured directly from a fresh `dist/` build at `9c70c71` (git tree clean, so this reflects the current committed state):

- **Files in `dist/`**: 50.
- **Main JS bundle**: single chunk, `dist/assets/index-*.js`, **~2.09 MB** (2,092,280 bytes). No code-splitting — measured and deliberately deferred, not implemented in this phase.
- **Sourcemap**: `vite.config.ts` has `build.sourcemap: true`; one `.map` file emitted at **~6.63 MB** (6,634,040 bytes), publicly present in `dist/`.
- **`dist/index.html`**: 8,299 bytes.
- **`dist/igcse-french-speaking/index.html`**: 7,528 bytes.
- **`dist/french-roleplay-practice/index.html`**: 11,870 bytes.
- **`dist/about/index.html`**: 15,351 bytes.
- **`dist/sitemap.xml`**: 4 entries.
- **`dist/404.html`**: 352 bytes.
- **Shells written**: 36 (every route except the 4 dynamic admin routes and 1 dev-only route), per the `[prerender] wrote 36 static shells to dist` log the script emits.

No Lighthouse/Core Web Vitals numbers were captured as part of this work — not measured, not claimed here.

## 9. Accessibility

Not separately audited as part of this work beyond what the existing Tailwind design system and semantic HTML choices in the new marketing pages provide (single `<h1>` per page, logical `<h2>`/`<h3>` nesting, `<nav aria-label="Breadcrumb">` on the 3 non-home public pages). No axe/Lighthouse accessibility scan was run — not measured, not claimed.

## 10. Remaining limitations

- **`NotFound.tsx` produces no real HTTP 404.** It's wired only as the client-side `*` catch-all inside the authenticated/guest app tree (`App.tsx`), reached solely when a signed-in or guest user navigates client-side to an unmatched path — it renders inside `MarketingLayout` with its own copy (3 links: home, IGCSE guide, roleplay practice), distinct from and disconnected from `dist/404.html`. A genuinely unknown URL hit from a fresh/unauthenticated load 404s at the Vercel filesystem layer instead, serving the separately hand-written `dist/404.html`. These are two different 404 experiences for two different audiences (logged-in user vs. anonymous/crawler), and they don't share content.
- **Single 2.09 MB JS chunk, no code-splitting.** Measured above. Deliberately deferred — out of scope for this phase, flagged here rather than fixed.
- **`build.sourcemap: true` publishes a 6.63 MB `.map` file** alongside the JS in `dist/`, publicly fetchable. Not changed in this work because the Sentry sourcemap-upload path in `vite.config.ts` depends on it; disabling it needs its own review.
- **`/french-pronunciation-practice` was dropped.** `AZURE_SPEECH_KEY` has zero references anywhere in `src/` or `scripts/` — not gated, not checked, not confirmed configured in production. `PronunciationSourceBadge` (used in-app by `AccentAnalyzer`) explicitly describes the no-Azure fallback as a "word-alignment guess with no real acoustic signal." Building a landing page whose central promise might be running in that degraded, uncaveated state was judged dishonest; the page can be added once Azure is confirmed configured in production.
- **`Auth.tsx:86` claims "IGCSE & A-Level Speaking Practice,"** inconsistent with every marketing page shipped here (all scoped to IGCSE 0520 only) and with `CLAUDE.md`'s explicit Cambridge-IGCSE-only scope. Not corrected as part of this work — flagged for a product decision, not a copy fix, since it's unclear whether A-Level is a near-term roadmap item or simply stale copy.
- **A stale in-code comment**: `App.tsx`'s `*` route (inside the gated tree) still says "vercel.json's rewrite is what makes a hard load of an unknown URL reach React at all" — no longer true after the Stage C rewrite removal. Worth a follow-up comment fix; does not affect behavior.

## 11. Search Console setup

Not performed as part of this work — requires domain ownership actions outside the repo. See § Manual steps.

## 12. Analytics

**Nothing was added.** Grepped `index.html` and all of `src/` for Google Analytics (`gtag`, `G-` measurement IDs), Plausible, `google-site-verification`, and generic analytics/tracking script tags — zero matches. The existing `analyticsService.ts` in the codebase is an unrelated, pre-existing in-app learning-progress tracker (session counts, streaks — local/Supabase-backed), not web analytics, and was not touched. No search traffic or ranking measurement exists yet; none is claimed.

## 13. Future opportunities

Not implemented, not scheduled — listed for whoever picks this up next:

- Route-based code splitting to reduce the 2.09 MB single chunk.
- A real prerendered or server-rendered 404 that unifies the two current implementations.
- `/french-pronunciation-practice` once Azure Speech is confirmed configured in production.
- Web analytics + Search Console verification, so the manual steps below actually produce measurable data.
- Resolving the `Auth.tsx` "IGCSE & A-Level" claim.

## 14. Manual steps (for whoever has deploy/DNS/Console access)

- Set `VITE_SITE_URL=https://french.beyondthebasics.me` in Vercel project settings (the code falls back to this value if unset, but an explicit env var is more robust to future domain changes).
- **Post-deploy, verify two things that can't be checked locally:**
  - `https://french.beyondthebasics.me/robots.txt` shows Cloudflare's managed block *followed by* the app's `Disallow: /api/` + `Sitemap:` directives — not raw HTML (this was the original bug: Cloudflare appends the origin body after its own managed block, and the origin body used to be `index.html`).
  - An unknown URL (e.g. `https://french.beyondthebasics.me/does-not-exist`) returns a real HTTP `404`, not a `200` with app-shell content.
- Verify domain ownership in Google Search Console and submit `/sitemap.xml`.
- Optionally add `apple-touch-icon.png` — Apple ignores SVG icons, and no PNG image toolchain is wired into this repo to generate one.

## Rollback

Restoring the `/(.*)` catch-all rewrite in `vercel.json` (`{ "source": "/(.*)", "destination": "/index.html" }`, placed after the existing `/api/(.*)` and admin rewrites) reverts the Stage C routing change and returns to soft-200-everything behavior. The symptom that would prompt this: a **known, real app route returning a 404 on a hard reload** — meaning a route exists in the running app (reachable via client-side navigation) but has no static shell on disk, so Vercel's filesystem check finds nothing and falls through to the 404 page instead of serving `index.html` for the client router to handle.

The route-parity test (`src/config/__tests__/routes.test.ts`) is what's supposed to prevent this from happening in the first place — it fails the build if a route is added to `App.tsx` without a corresponding `routes.ts` entry (or vice versa), which is the only way a route could end up unshelled. If that symptom appears despite the test passing, the bug is in `scripts/seo/prerender.ts`'s shell-writing logic itself, not in the route registry — check there before reaching for rollback.
