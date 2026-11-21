# Public SEO pages

Free, crawlable study pages for people searching for IGCSE French speaking help: sixteen **topic pages** with model answers, six **role-play example pages**, the two hubs that list them, and two guide pages (how the exam is marked, common mistakes). They exist to feed the free tier: every page ends in "Start practising free", which enters guest mode and lands on the matching Learn topic. Cite as `public-seo-pages §N` — do not renumber.

## §1 The pages

| Path | What it is |
|---|---|
| `/igcse-french-speaking/topics` | Hub: the 16 topics, with how the two topic conversations work |
| `/igcse-french-speaking/topics/<slug>` | One topic: four model answers (describe, opinion, past, future), "why it earns marks" notes, 8 key words, 3 tips, more real Learn questions |
| `/igcse-french-speaking/role-play` | Hub: what the role play is (5 tasks, 2 marks each, 10 in all) and the six examples |
| `/igcse-french-speaking/role-play/<slug>` | One practice role play: the examiner's lines and English task instructions, a short model reply and note per task, phrases to reuse |
| `/igcse-french-speaking/marking` | How the 40 marks are earned: the sourced mark counts, four worked role-play marks, what Communication and Quality of Language reward, in the exam guide's plain English |
| `/igcse-french-speaking/common-mistakes` | Four themes (agreement you can hear, être/avoir, tense choice, answers that stop too soon): slips with corrections, what to do, and examples taken from the topic pages' highlights |

They sit under `/igcse-french-speaking` (the exam guide page) so the guide, the hubs, the two guide pages and the leaf pages form one topical cluster. Each leaf links to its siblings, its hub, the other hub and the guide; the guide, both hubs and the footer link down to the marking and common-mistakes pages, and the guide, the footer, the site header and the landing page's exam section link to the hubs. The two guide pages link to each other, to the hubs and to the topic pages for examples (a test checks the links exist).

## §2 Where the content comes from — and where it must never come from

- **Topic and role-play content is hand-written data in `src/data/seo/`** (`topics/*.ts`, `rolePlays.ts`), shaped by `types.ts`. It is not read from the Learn question bank (≈ 2 MB: it would land in every visitor's download) and not generated.
- **Never the exam bank, a past paper or an Exam Sim set.** Exam Sim must not reveal sets, role-play cards or topics before the candidate starts (exam-conduct §4), and past-paper cards are Cambridge's. The role-play examples read only the six original practice cards in `src/data/roleplayCards.ts` (ids `rp_*`) — the French lines and English instructions come from the card, and only the model replies and notes are written here. `publicContent.test.ts` fails on any other card id.
- **The marking page states no figure the engine data does not.** Mark counts and band ranges are read from `domain/igcse/rubric.ts` and the exam guide's `guideContent.ts`; no descriptor line is quoted (a test scans for every descriptor), and the paper's share of the qualification (25%) is omitted because the notes we hold do not state it (`domain/igcse/unsourced.ts`; `guideContent.test.ts` already forbids it). The role-play marks it shows are French Coach's own reading, and the page says so.
- **Common-mistakes slips are hand-written French about French, not exam content.** Only agreement that changes the sound (feminine adjectives, `pris`/`prise`) is presented as audible: `allé`/`allée` and `parti`/`partie` sound the same, so the page says so rather than implying a listener hears them. Each example repeats a topic highlight's text and note (so the page does not download the topic data); `mistakes.test.ts` holds the copy equal to the topic page.
- **The "more questions" lists are real Learn questions** of the same topic (checked verbatim against the bank), so "practise these in Learn" is true. The model answers are *not* the Learn bank's: they are written for the page, one per question shape, at the level the IGCSE asks for (A2 with elements of B1).
- **Exam facts come from the sourced engine data, never retyped.** Mark counts are `ROLE_PLAY`, `COMMUNICATION`, `QUALITY_OF_LANGUAGE` from `domain/igcse/rubric.ts`; topic-area names and the closed sub-topic list are Syl p.14 (`data/exam/bank/types.ts`, `data/seo/syllabus.ts` — copied from the exam guide and held equal by a test). No Cambridge descriptor text is quoted and no script wording from the Teacher's Notes is reproduced.
- **Learn topics are French Coach's own names.** Each topic page shows the syllabus area and sub-topic it matches most closely and says so; shopping has no syllabus heading of its own and says that too. A page never claims the examiner will choose its topic.

## §3 Authoring rules (all pinned by tests)

1. One model answer of every `AnswerKind` per topic — `describe`, `opinion`, `past`, `future` — 45–100 words, first person, tense-correct, gender-neutral where French allows (`(e)`).
2. Every `Highlight.fr` is a verbatim fragment of its answer, and its note says what the fragment does for the examiner. A note states a fact about French or about the marking, never a promise ("will earn a mark").
3. Role-play replies are 5–30 words and complete: they communicate every part of the task. Registers: examiner staff and strangers → *vous* (no *tu* forms in a reply).
4. No claim the product cannot back: no "guarantee", no "past paper", no "real exam question", no hidden-feature names (`publicContent.screens.test.tsx` scans every page's text).
5. Adding or renaming a page is a data change only: a topic or example added to `src/data/seo` is picked up by the route table, the prerender, the sitemap and the tests. Slugs are permanent once published (they are URLs); a retired slug needs a redirect.

## §4 How a page reaches search engines

- `src/config/routes.ts` lists every page: the two hubs as ordinary `public` routes, each leaf as a `generated` route (one concrete path per piece of content, enumerated from `src/data/seo/paths.ts`). `routes.test.ts` requires a parameterised `<Route>` in **both** `App.tsx` and `PublicRoutes.tsx` for every generated path — without the second, a signed-out visitor is shown the sign-in page.
- `scripts/seo/prerender.ts` writes each page to `dist/<path>/index.html` with its own `<title>`, description, canonical, Open Graph tags and JSON-LD (`getPageSeo`, `src/config/publicContentSeo.ts`); `renderToStaticMarkup` renders the same views the lazy routes use (`screens/publicContent/registry.ts`). `scripts/seo/sitemap.ts` lists every `indexable` route, so these pages are in `sitemap.xml` automatically.
- In the app the lazy routes (`routing/screens.ts`) pass the same entry to `<Seo entry>`; `getPublicContentSeo` builds each entry once so its identity is stable.
- Page weight: the path constants (`data/seo/pathConstants.ts`) and the two guide pages' heads (`config/publicGuideSeo.ts`) are kept free of the topic and role-play content, so a page that only links (the marking guide, About, common mistakes) does not download it (~29 KB gzipped). `paths.ts` and `publicContentSeo.ts` import the content; import from them only where the content is needed.
- JSON-LD: `BreadcrumbList` (mirrors the visible breadcrumb), `LearningResource` (free, `educationalLevel: IGCSE`), `FAQPage` on topic pages (built from the four questions and answers the page shows) and `ItemList` on hubs. No rating, review, offer, author or date is asserted — none is established.
- French text is wrapped in `lang="fr"` (`Fr` in `screens/publicContent/parts.tsx`).

## §5 The call to action

Every page ends in `PracticePanel`: `startPractisingFree(cta, to)` records the click (`landing_cta_clicked`, cta `topic_page_start` / `topics_hub_start` / `roleplay_example_start` / `roleplay_examples_hub_start` / `marking_page_start` / `mistakes_page_start`), enters guest mode and goes to `to` — a topic page goes to `/learn?topic=<learnKey>` (a first-time guest passes through onboarding, which returns them there), the others to `/learn` or `/`. Nothing on these pages reads or writes learner data.

## §6 Not done, deliberately

- **No per-question pages** (≈ 1,400 near-duplicate thin pages would hurt more than help) and no pages for the advanced Learn topics.
- **No translations of the model answers.** The questions have English glosses and the notes explain the French; a full English translation of each answer would let a reader skip the French.
- **No `lastmod`** in the sitemap: there is no trustworthy per-page date, and a wrong one is worse than none.
- **No per-page Open Graph images.** Every page shares `public/og-image.png`. A per-page PNG needs an image renderer at build time; the repo has none (no sharp, satori or resvg), the only one available is Playwright's Chromium (`scripts/seo/renderOgImage.ts`, a manual step) which a Vercel build does not install, and social crawlers do not accept SVG. Adding one means adding a dependency, which is the owner's call.
- Search Console submission and any index-coverage check are the owner's, after deploy.

## §7 Redirect protection

A slug is a URL: once published it must keep working. `src/data/seo/publishedPaths.ts` records every indexable path shipped (append-only), `src/data/seo/redirects.ts` holds `REDIRECTS` (`{ from, to }`, empty until a page is first renamed) and `__tests__/redirects.test.ts` fails when a recorded path is no longer a live page and has no redirect, when a live indexable page is not recorded yet (append it), when a redirect is a chain, loop, duplicate or points at a page that is not live, and when `vercel.json`'s `redirects` differs from `REDIRECTS`. To rename a page: change the slug, keep the old path in `PUBLISHED_PATHS`, add `{ from: oldPath, to: newPath }` to `REDIRECTS` and `{ "source": oldPath, "destination": newPath, "permanent": true }` to a `redirects` array in vercel.json (the key is absent while the list is empty). Redirects are never removed.

## §8 The older public pages

`/story`, `/french-roleplay-practice` and `/igcse-french-speaking` are hand-written components (not in `src/data/seo`). `src/screens/__tests__/marketingPages.test.tsx` holds them to the same bar as the content pages (one `h1`, no skipped levels, breadcrumb equal to its JSON-LD, links only to real pages, more than a stub) plus two rules: no `25%` (unsourced) and no count that can drift (the scenario count in `/french-roleplay-practice`'s title and the topic count on the guide and About are tested against the data). `/story` ("Our story") is also the public About page: the founder narrative, then "The app, in short" (what it is, what it is not, free to start, where to start). The old public `/about` is retired and redirects to it (`REDIRECTS`, vercel.json); the in-app About (hidden at launch) keeps `AboutContent.tsx` in the app's tokens.

Every public page shares one header (`components/marketing/siteNav.ts`'s `SITE_NAV`: How it works, Why it works, The exam, Our story, FAQ). On the landing page the section items are same-page anchors with scroll-spy; elsewhere they link to `/#section` (the landing page scrolls to the hash after it renders, `useScrollToHash`), and `Our story` is marked `aria-current="page"` on `/story`. A new header item goes in `SITE_NAV` only (`siteNav.test.tsx` pins the list and that every page renders it); the guide, topic and role-play hubs are reached from the landing page's exam section, breadcrumbs and the footer, not the header.

