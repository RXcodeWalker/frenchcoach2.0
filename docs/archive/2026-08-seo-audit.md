# SEO Audit — Français AI (french.beyondthebasics.me)

> **ARCHIVED — NOT AUTHORITATIVE.** A retrospective of work already completed. Its several
> `docs/architecture/*.md` and `docs/seo-implementation-report.md` § citations point at
> documents that are deleted or since reorganized — see `docs/README.md`'s citation decoder.
> They are historical (recording that a check was made at the time), not live rules.

Pre-work state as of `e731f97` (last commit before SEO Stage A), and the reasoning behind the index/noindex decisions implemented across Stages A–C (`a220608`, `4e8443f`, `9c70c71`).

## Pre-work state

Verified against the live origin and the source at the time:

- **Every URL rendered a login form.** `AppShell` returned `<Auth />` whenever Supabase was configured and there was no session and no guest flag, so all routes served byte-identical content to a crawler.
- **No server rendering.** `dist/index.html` shipped an empty `<div id="root">` plus a single ~2 MB JS chunk. Script-blind consumers (social link-unfurlers, most crawlers on first pass) saw nothing.
- **No `public/` directory.** No `robots.txt` at origin, no `sitemap.xml`, no favicon — the icon referenced in `index.html` never existed as a file.
- **Soft-200 on everything.** `vercel.json` rewrote `/(.*)` → `/index.html`, so any unknown path — `/sitemap.xml`, a typo, anything — returned `200 OK` with the app shell and rendered blank.
- **Foreign branding.** `index.html` pointed `og:image`/`twitter:image` at `https://bolt.new/static/og_default.png` (scaffolding artifact). No `og:title`, `og:description`, `og:url`, meta description, canonical, or JSON-LD anywhere in the source.
- **robots.txt was Cloudflare's**, not the app's — Cloudflare Managed Content allowing all crawlers except AI bots (GPTBot, ClaudeBot, CCBot, Google-Extended), with no app-specific directives appended.
- **Fabricated content in `About.tsx`**: two invented testimonials, a "10k+ Words Practiced" tile, and an unsupported "fine-tuned on the 0520 mark scheme" claim, contradicted by the roadmap (scorer was still mid-implementation, S0–S17).

## Issues by severity

**Critical — blocks indexing entirely**
- No prerendered content: crawlers that don't execute JS see nothing at any URL.
- No `robots.txt` served by the app (Cloudflare's generic one doesn't declare a sitemap or any app-specific policy).
- No `sitemap.xml`.

**High — actively misleading or wrong**
- Soft-200 catch-all: no URL can ever 404, so junk/typo URLs can accumulate as indexed 200s.
- Fabricated testimonials and unverifiable claims in `About.tsx` — an honesty/trust risk independent of SEO.
- Foreign OG image (bolt.new) — any link share shows someone else's scaffolding branding.

**Medium**
- No canonical tags anywhere — irrelevant while nothing is indexed, but would cause duplicate-content risk once pages exist (e.g. trailing-slash variants).
- `Auth.tsx` tagline claims "IGCSE & A-Level Speaking Practice" — broader than what the product (or its scoring engine, per `docs/architecture/roadmap.md`) actually covers.

**Low**
- No web analytics or Search Console verification (not a defect pre-launch, since there was nothing to measure).

## What was already good

- The app itself has real, substantive content once authenticated: 30 roleplay scenario state machines (`src/data/scenarios/`), a working timed exam simulator (`/exam`), and an accurate Cambridge 0520 Paper 3 format documented in `docs/architecture/01-cambridge-rubric-source.md` — none of this needed to be invented, only surfaced.
- `useGuestMode` already had a correct `getServerSnapshot`, and neither it nor `storage.ts` touched browser globals at module scope — both were already SSR-safe without modification.
- Cloudflare's own `robots.txt` block was not hostile to search engines — it already allowed Googlebot; the gap was the missing app-level policy underneath it, not an active block to remove.

## Index / noindex decisions, with reasoning

A route can only be usefully `noindex`d if a crawler can actually fetch and read the directive. The pre-work state made this impossible (everything was either invisible via JS-only rendering or, after a naive fix, would have been `Disallow`d — which prevents Google from ever seeing the `noindex` tag it's supposed to obey, letting a URL persist as a bare URL-only index entry).

The implemented policy avoids that trap: nothing that carries a `noindex` is also `Disallow`d.

| Category | Routes | Policy | Why |
|---|---|---|---|
| Public marketing | `/`, `/igcse-french-speaking`, `/french-roleplay-practice`, `/about` | Crawlable, indexable, in sitemap | Real, verifiable content (exam format, real scenario list, real product description); each serves a distinct search intent |
| App routes | `/learn`, `/exam`, `/explore`, `/progress`, `/profile`, `/shop`, `/rankings`, `/onboarding`, game routes, `/login` | Crawlable + `noindex, nofollow`, never `Disallow`d | Requires auth/guest session to be meaningful; nothing here is a distinct public search intent, but the directive must be readable |
| Admin / dev | `/admin/*`, `/debug/*` | `noindex, nofollow` | `AdminRoute` already access-gates them client-side; the meta tag is a second layer in case one ever leaked to a crawler |
| Non-content | `/api/` | `Disallow` only | A proxy to the Render backend — nothing to index, nothing that benefits from a readable `noindex` either |

4 of 41 known routes ended up indexable. See `docs/seo-implementation-report.md` for the exact route inventory and measured counts.

## Per-page search intent

| Route | Primary intent | Secondary | Why this page and not another |
|---|---|---|---|
| `/` | "AI French speaking practice" | "French speaking practice app/online" | Hub explaining the actual product loop (record → transcript → structured feedback), linking to the two content pages below |
| `/igcse-french-speaking` | "IGCSE French speaking practice" | "Cambridge 0520 speaking exam", "IGCSE French oral exam", "IGCSE French role play" | Flagship page — the one exam format the scoring engine is actually built for; content is sourced directly from `docs/architecture/01-cambridge-rubric-source.md` §1.1, not invented |
| `/french-roleplay-practice` | "French roleplay practice" | "French conversation practice", "French speaking scenarios" | Backed by 30 real scenario state machines, listed by name, not a generic feature description |
| `/about` | Brand / trust | "Français AI" | Now carries only verifiable claims after the fabricated testimonials and stats tile were removed |

**Deliberately not created**: `/gcse-french`, `/a-level-french`, `/delf-speaking`, `/french-speaking-exam`, `/french-pronunciation-practice`. The first three would market qualifications the product doesn't cover (`CLAUDE.md` and `docs/architecture/00-overview-and-rationale.md` both scope this to Cambridge IGCSE French 0520 only). `/french-pronunciation-practice` was drafted but dropped in Stage C — see `docs/seo-implementation-report.md` § Remaining limitations for why.

**Exam items are not published on any of these pages.** `docs/architecture/04-frontend-pipeline.md` records a copyright constraint on the original question bank; the marketing pages describe exam *format*, not content, and never reproduce items or mark-scheme descriptor text verbatim.

## Architectural limitations

- **No true SSR.** The app is a client-rendered SPA; "prerendering" here means generating static HTML shells at build time from a fixed route list, not a request-time server render. New routes only get a shell if they're added to `src/config/routes.ts` and, for content-bearing public pages, to `PUBLIC_PAGE_COMPONENTS` in `scripts/seo/prerender.ts`.
- **Only 4 routes get real prerendered body content.** Every other shellable route gets an empty `#root` with correct `<head>` metadata only — sufficient for a `noindex` directive to be readable, insufficient for any app route to ever rank.
- **Dynamic admin routes (`/admin/*/:id/edit`, `/admin/*/:id/history`) cannot be prerendered** — they're excluded from the shell generator and served by Vercel rewrites straight to `/admin/index.html`, a separate SPA entry point outside this pipeline.
- **`About.tsx` (signed-in) and `AboutPublic.tsx` cannot share one component tree** — the signed-in version depends on `TopContextBar`/`PageShell` (context + framer-motion), which can't run in the Node prerender step. Both wrap a shared, presentation-only `AboutContent` component instead, so prose is defined once even though the two chromes differ.
- **The route-parity test is a static-analysis regex check**, not a runtime crawl — it guards against `routes.ts` and `App.tsx` drifting apart, not against the prerender script silently failing to shell a route it should.

## Implementation order actually followed

1. **Stage A** (`a220608`) — additive foundation only, nothing wired into the running app: `src/config/site.ts`, `src/config/routes.ts`, `src/config/seo.ts` skeleton, `public/robots.txt`, `public/favicon.svg`, `public/site.webmanifest`, `public/og-image.png`.
2. **Stage B** (`4e8443f`) — public marketing screens and routing wired into `App.tsx`/`PublicRoutes.tsx`, reachable in the running app, but **not yet prerendered** — still client-rendered-only at this point.
3. *(interleaved)* `a9eaf30` — unrelated onboarding UX fix (skip-for-now shortcut); touches only the authenticated `/onboarding` flow, no SEO surface.
4. **Stage C** (`9c70c71`) — `scripts/seo/prerender.ts`, `scripts/seo/sitemap.ts`, build script wiring (`vite build && prerender && sitemap`), the `vercel.json` catch-all rewrite removed (real 404s), and JSON-LD structured data added to `seo.ts`/`structuredData.ts`.

Docs (this file and `docs/seo-implementation-report.md`) were written last, against the actual shipped state at `9c70c71`, not against the original plan draft — several details diverged from that plan during implementation; see the implementation report's "Remaining limitations" section.
