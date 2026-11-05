# Plan: French Coach on Android (Google Play)

Status (2026-11-03): **Phases 1–3 built** — the Back-button
guard and screen wake lock, the `android/` TWA shell and its build workflow. Not done: everything
that needs the owner (Phase 0, signing key, Play Console, device testing). Deliberately not done: §4.5's
`interactive-widget=resizes-content` viewport change — it moves fixed-bottom UI on every Android
browser and can't be checked without a real keyboard; decide it during device testing. How to release:
`docs/guides/android-release.md`. The manifest, icons and offline support came from the separate "Offline support and
installable app" work on `main` (2026-11-03), which replaced this plan's simpler offline page (§3.2).
Owner decisions are marked **D1…D6**.

## 1. The decision: a Trusted Web Activity, not a rewrite or a WebView wrapper

There are three ways to put this app on Play. Only one fits this codebase.

| Option | What it is | Verdict |
|---|---|---|
| **Trusted Web Activity (TWA)** — Bubblewrap / PWABuilder | A thin Android shell that opens `https://french.beyondthebasics.me` full-screen **in the user's real Chrome** | **Do this.** ~1–2 weeks of work. Almost no app code changes. |
| Capacitor (WebView wrapper) | Bundles the built `dist/` into an Android WebView | Not now — see §7. The WebView has **no `SpeechRecognition`**. |
| React Native / Kotlin rewrite | New app | No. Months of work to rebuild what already works. |

**Why the WebView route breaks this app.** `src/features/recording/useRecording.ts` uses
`webkitSpeechRecognition`, and the exam's turn-taking, relevance checks and ConductLog run on those
live captions (ADR 0011: Whisper reads the *marks*, captions *run the exam*). Android System WebView
does not provide `SpeechRecognition`, so the exam would fall into its Firefox-style "no captions"
path everywhere. Capacitor would also break, in the same release:

- every `API_BASE = import.meta.env.PROD ? '' : …` (10 files: `apiClient.ts`, `contentService.ts`,
  `pronunciationClient.ts`, `sentenceVoice.ts`, …) — `''` relies on Vercel's same-origin `/api/*`
  proxy, which a bundled app doesn't have;
- Web Push (`pushService.ts`, `public/sw.js`) — WebView has no push; it would need Firebase Cloud
  Messaging and a second sender in `scripts/scheduledJobs/sendNotifications.ts`;
- Google sign-in (`AuthContext.tsx` redirects to `window.location.origin/auth/callback`) — needs
  deep links and Supabase redirect changes; Google blocks OAuth inside WebViews.

A TWA *is* Chrome on the real domain, so speech recognition, the `/api` proxy, Web Push, the service
worker, OAuth, recorded voices and MediaRecorder all work unchanged. And because the app loads from
the website, **every push to `main` reaches Android users immediately** — no store review per change.
The Android package only changes when the shell itself does.

## 2. Phase 0 — start the clocks today (owner, not code)

These have lead times longer than the build, so they go first.

1. **Google Play developer account** — US$25 one-off, identity verification (can take days).
2. **D1 — personal or organisation account?** A *personal* account created after Nov 2023 must run
   a **closed test with at least 12 testers opted in for 14 consecutive days** before it can publish
   to production. That is the longest item on this plan. Line up 12+ real testers (classmates, a
   study group) now. An organisation account (needs a D-U-N-S number) skips this rule.
3. **D2 — package name**, e.g. `french.beyondthebasics.me`. Permanent: it can never change after the
   first upload.
4. **D3 — app name: decided — "French Coach"** (owner, 2026-11-05) for the Android app. The website still says "Français AI".
5. **Store gates that are not optional** (these are Play requirements, not the deferred legal work —
   the owner directive defers privacy *engineering*, but Play will not accept a listing without them):
   - a privacy-policy URL;
   - the **Data safety** form — declare honestly: email, voice recordings sent to Groq/Azure for
     transcription and feedback, analytics (PostHog), crash reports (Sentry), no ads, no selling data;
   - an **account-deletion** path both in-app (`deleteMyAccount()` exists) and on a web page;
   - the content-rating questionnaire.
6. **D4 — target audience: declare 13+.** The Junior track (Grades 4–7) is already not selectable
   (`launchScope.ts`). Declaring an under-13 audience pulls the app into Play's **Families policy**,
   which restricts which SDKs may ship (PostHog and Sentry would need review) and adds teacher/family
   requirements. Keep Junior unselectable on Android until that is a deliberate project.

## 3. Phase 1 — make the PWA store-grade (frontend, small)

1. **`public/site.webmanifest`**: PNG icons at 192 and 512 (plus a `maskable` 512), `id`, `scope`,
   `orientation: "portrait"`, and `theme_color`/`background_color` matching Design System v2's light
   theme — the current `#0D0D0F` is from the old dark design and will show as a black splash screen.
2. **Offline fallback**: `public/sw.js` handles push only. Offline, a TWA shows Chrome's error page,
   which looks broken. Add a navigation-only fallback (network first, cached `offline.html` on
   failure). **Never cache `index.html` or the JS bundles** — a stale bundle after a deploy is far
   worse than an offline page.
3. **`public/.well-known/assetlinks.json`**: the Digital Asset Links file that proves the app and the
   domain belong together. Without it the TWA shows a URL bar and looks like a browser tab. It holds
   the SHA-256 fingerprint of the **Play App Signing** key (from Play Console, after the first upload)
   plus the upload key. Check Vercel serves it as `application/json` and that `cleanUrls`/rewrites
   don't touch it.

## 4. Phase 2 — fix what phones do differently (frontend; these help mobile web too)

Ordered by how badly each breaks the core loop.

1. **Hardware Back button (high).** Android Back calls `history.back()`. The app's "back" handling is
   built on Escape (`useBackHandler`, `LeaveSessionDialog`), and `main.tsx` uses `BrowserRouter`, so
   React Router's `useBlocker` isn't available. Today a Back press **mid-exam or mid-Learn-session
   leaves the attempt without asking.** Fix: while a session is running, push a sentinel history entry
   and route `popstate` through the same `useBackHandler` stack Escape uses — one code path for both.
   (Moving to a data router for `useBlocker` is the bigger alternative; not needed for this.)
2. **Screen sleep (high).** Nothing calls `navigator.wakeLock`. The Exam Sim 10-minute prep countdown
   and a long answer will hit the phone's 30 s–2 min screen timeout; the page is hidden and the mic and
   recogniser stop. Hold a screen wake lock during exam prep, the running exam and any recording;
   re-acquire it on `visibilitychange` (the browser drops it when hidden).
3. **Chrome-on-Android speech recognition (high, needs device testing).** Chrome's recogniser behaves
   differently on Android than on desktop: `continuous` sessions end after short pauses, some devices
   play a start/stop beep, and interim results can arrive duplicated or cumulative. `useRecording`'s
   generation guard protects against stale callbacks, but the exam's turn-taking timing was tuned on
   desktop. Run full exams on two real phones before anything else in Phase 4.
4. **Interruptions mid-exam.** A phone call or app switch kills the mic. The resume snapshot path
   (`localTranscriptStore.ts`, marked practice-only via `resumed`) should handle it — verify on device.
5. **Soft keyboard.** Coached mode's typed composer can sit under the keyboard. Add
   `interactive-widget=resizes-content` to the viewport meta and check the composer stays visible.
6. **Audio routing.** Test speaker vs earpiece vs Bluetooth headset: examiner lines through the
   speaker must not be picked up by the mic (the existing "no cue while a mic is open" rules cover
   sound effects, not the examiner voice).
7. **Notifications.** Android 13+ needs the `POST_NOTIFICATIONS` permission (Bubblewrap adds it and
   delegates Web Push to the app). Check a tapped notification opens the app, not a Chrome tab
   (`sw.js`'s `notificationclick` matches on origin, which should hold).
8. **Email links.** Password-reset and sign-in emails should open the app. Bubblewrap registers the
   domain as a verified App Link once `assetlinks.json` is live.

Keyboard shortcuts and Space-to-record simply do nothing on a phone — every action they cover must
also have an on-screen control (check Learn's hint / skip / undo / continue).

## 5. Phase 3 — build the Android shell

1. Generate the project with **Bubblewrap** (`npx @bubblewrap/cli init --manifest
   https://french.beyondthebasics.me/site.webmanifest`). Commit only its config (`android/twa-manifest.json`
   and the generated Gradle project) in a new `android/` folder of this repo.
2. **Signing key = a credential.** The upload keystore and its passwords go into GitHub Actions
   secrets, never into git. Enrol in Play App Signing so a lost upload key is recoverable.
3. A manual GitHub Actions workflow (`android-release.yml`) that builds a signed `.aab` and uploads it
   as an artifact. Bump `appVersionCode` on every upload.
4. Splash screen colour and status-bar colour from the v2 tokens; `orientation: portrait`.

## 6. Phase 4 — test, list, release

**Device matrix (minimum):** one low-end phone (Android 10–11, ~3 GB RAM) and one recent Pixel or
Samsung. **D5:** check what happens when the user's default browser is Samsung Internet — the TWA
opens in the default TWA-capable browser, and its speech-recognition support must be verified on a
device, not assumed. If it fails, Bubblewrap can be configured to prefer Chrome.

**Checklist per device:** install → guest flow → sign up (email) → Google sign-in → placement check
→ one Learn session with recording (Whisper transcript shown) → a full Exam Sim with the screen left
alone for 2 min during prep → hardware Back mid-session → app switch mid-exam → push notification
→ airplane mode (offline page) → account deletion.

Add a Playwright project with Pixel emulation to `playwright.config.ts` for layout regressions (it
cannot test real speech — that stays manual).

**Listing:** phone screenshots (6–8), a 1024×500 feature graphic, short and full descriptions, the
Data safety form and content rating from Phase 0. Then the **closed test (12 testers × 14 days)**,
fix what they find, apply for production, staged rollout (20 % → 100 %).

## 7. When to escalate to Capacitor (and what it costs)

Only if one of these becomes true:

- Play rejects the TWA under its minimum-functionality policy (unlikely for an app with this much
  real functionality, but possible);
- you need features Chrome can't give: home-screen widgets, true offline exams, background audio;
- **D6** — you want iOS too. iOS has no TWA, so iOS means Capacitor (or a PWA), and that's when the
  whole cost below is paid once for both platforms.

The cost: replace the recogniser in `useRecording.ts` with a native speech plugin (this touches the
exam's caption path — ADR 0011 and the conduct engine's turn-taking, an Assessment-Engine-adjacent
change), make all 10 `API_BASE` values absolute, add FCM alongside Web Push, deep-link OAuth, native
mic permissions, and a store release for every frontend change.

## 8. Effort and order

| Step | Who | Elapsed |
|---|---|---|
| Phase 0: account, testers, name, policy URL, Data safety | owner | start day 1 |
| Phase 1: manifest, offline page, assetlinks | code | 1 day |
| Phase 2: Back button, wake lock, keyboard, audio checks | code + device | 3–5 days |
| Phase 3: Bubblewrap shell + release workflow | code | 1 day |
| Phase 4: device testing, listing, first internal upload | owner + code | 2–3 days |
| Closed test (personal account) | 12 testers | 14 days, fixed |
| Production + staged rollout | owner | ~1 week incl. review |

Realistic: **first internal-testing build in about 2 weeks; public on Play in about 4–5 weeks**,
dominated by the 14-day closed test. Phase 2 is worth doing first regardless — it fixes the mobile
website for every phone user today.
