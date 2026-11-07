# Parent view

A read-only progress page a learner shares with a parent. The parent needs no account: the
learner makes a private link in **Profile → Parent view**, and the parent opens
`/parent#<token>` on any device.

## What it answers, in order

1. **Are they practising?** A one-line verdict (`new` / `inactive` / `light` / `steady`), the
   last 7 days against the 7 before (days, minutes, answers spoken), and a 4-week calendar.
2. **What can I do this week?** Two to four rule-based suggestions (restart, fix a rhythm,
   sit a sample exam, praise a specific improvement, ask them to say their best line, talk
   about the weakest topic). No AI call: same data, same suggestions.
3. **Are they improving?** Average Learn score (last 14 days vs the 42 before, plus 8 weekly
   bars) and speaking flow from the speaking log (pace, pauses over 2 s).
4. **How would the exam go?** The latest sample exam /40 under exam conditions, its three
   areas, and recent attempts. Coached attempts are listed but never headlined (ADR-0007).
5. Topics (strongest, weakest, common exam topics not tried yet) and the coach's recent
   "next step" notes.

## Rules

- **Honest trends only.** No trend is claimed with fewer than `MIN_TREND_SAMPLES` (3) values on
  either side; a topic is "needs the most work" only if it trails the strongest by
  `TOPIC_GAP` (0.5). Exam marks are labelled the app's own estimate: never a grade, because
  0520 grade thresholds change every series and are not in this app. `WEEKLY_DAYS_TARGET`
  (4) is a product rule, not a Cambridge figure. All constants are in
  `src/features/parentView/buildReport.ts`.
- **Effort and progress, not surveillance.** No recordings (never stored), transcripts,
  question text or saved answers reach the page: `get_parent_report` does not select them,
  and `parentView.privacy.test.ts` pins that, along with the page writing no app state,
  storage, analytics or sound.
- **The learner controls the link.** Only a sha256 of the token is stored; the raw link is
  shown once. The learner sees each link's last-opened date and view count and can turn it
  off (5 active links max). The token is in the URL **hash**, so it never reaches a server
  log, and analytics/Sentry strip hashes.
- **It is not consent.** The parent view is unrelated to under-13 guardian confirmation
  (`child-safety-consent.md`): it grants nothing and revokes nothing.

## Wiring

| Piece | Where |
|---|---|
| Table + RPCs (`create_parent_link`, `list_parent_links`, `revoke_parent_link`, `get_parent_report` (anon-callable)) | backend `supabase/migrations/20261104090000_parent_links.sql` + `20261104100000_parent_report_exam_columns.sql`, both applied to production 2026-11-04 |
| Wire shape + parser | `src/features/parentView/rawReport.ts` |
| Report builder (pure, tested) | `src/features/parentView/buildReport.ts` |
| Email tokens (`parent_link_tokens`, `mint_parent_digest_token`) | backend `20261107100000_parent_digest_dashboard_link.sql` (applied to production 2026-11-07); sender `scripts/scheduledJobs/sendNotifications.ts`, copy `retention/weeklyReport.ts`'s `dashboardSection` |
| RPC client, link/hash helpers | `src/features/parentView/parentLinkService.ts` |
| Profile card | `src/features/parentView/ParentLinksCard.tsx`, flag `parentView` |
| Page | `src/screens/ParentView.tsx`, rendered by `App.tsx`'s `AppShell` before every auth/onboarding gate (route kind `unregistered`) |

Data comes from the cloud `sessions` rows (last 120 days, at most 1,000) and
`speaking_samples` (first answers only, at most 600). Exam rows read `sessions.practice_only` / `exam_marks`
(migration `20261103140000`; RPC updated in `20261104100000`); an exam row without them shows as
"Sample exam" with conditions unknown.

## The weekly parent email links here

The Sunday parent copy of the weekly progress email (`retention-notifications.md` §4) ends with
"See the full progress page". The link token is never stored, so the sender can't reuse one:
for each email it calls the service-role `mint_parent_digest_token(user, parent_email)` (backend
`20261107100000_parent_digest_dashboard_link.sql`), which returns a fresh token in
`parent_link_tokens`, valid 35 days, hanging off one `source = 'weekly_email'` parent link per
(learner, address). The learner sees that link in Profile → Parent view as "Weekly email to your
parent", with its last-opened date, and it doesn't count toward the 5-link cap.

- **Turning it off wins.** The learner's "Turn off" (`revoked_by_learner`) kills every email
  token for that address at once, and the sender stops adding the link for that address.
- **A new address revokes the old one** automatically (not the learner's choice), so last
  week's email to the old address stops opening the page.
- The token is minted only after the send is claimed; no token (turned off, or the RPC failed)
  means the email goes out without the link.

## Not built yet
- Junior-track accounts: Junior writes no `Session`, so the Profile card is hidden for them.
