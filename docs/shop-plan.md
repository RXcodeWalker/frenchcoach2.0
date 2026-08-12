# Shop Experience — Product, UX & Technical Plan (Rev. 2)

> Saved to the repo during Phase 2 implementation so amendments (deferrals, scope notes discovered during implementation) have a durable, versioned home instead of living only in chat history or code comments.

## What changed in Rev. 2, and why

Review of Rev. 1 against the actual schema found **two plan-breaking bugs** and several material security gaps. Classified as requested.

### A. Direct changes — confirmed by inspection, must be made

| # | Finding | Change |
|---|---|---|
| A1 | `profiles.sessions_count`, `streak_days`, `longest_streak` are **never written by anything**. `pushProgressionToCloud` writes exactly `id, total_xp, gems, achievements, inventory, active_boosters`. Streak lives only in `localStorage` (`frenchCoach_analytics`). | Requirements **must not** reference those columns — they'd evaluate false for every user forever. Requirements are enforced against `profiles.achievements` only (the one client-written field that actually functions). |
| A2 | `polyglotte` is **unreachable**: `Learn.tsx:311` passes `topicsUsed: [selectedTopic.key]`; rule needs `length >= 8`. | Removed as a gate. Was gating a 600-gem nameplate that could never be bought. |
| A3 | `Session` = **one answer**, not one sitting (`Learn.tsx:289`), and retries/follow-ups each emit their own. `SESSION_TARGET.standard = 10`. | Earn rate is **~2× Rev. 1's estimate**. Session-count achievements (`cinq_sessions`=5 answers, `marathonien`=50) are ~1 and ~5 sittings — worthless as prestige gates. Full catalogue re-laddered and repriced (§6). |
| A4 | `profiles` UPDATE policy has **no column scope** (`20260503093957:43-47`). Rev. 1 revoked only `gems/inventory/active_boosters`. | Revoke must also cover `avatar_emoji`, `equipped_frame`, `equipped_nameplate` — otherwise cosmetic ownership is bypassed with one `.update()`. |
| A5 | `scoring_envelopes` and `session_transcripts` INSERT policies have **no `TO` clause** (= `TO PUBLIC`) plus `GRANT INSERT TO anon, authenticated` (`20260717120000`). The partial unique index means a forged row *wins* and is read back as authoritative by `saveOriginal`'s 23505 branch. | Restrict both to `service_role`. Not strictly Shop scope, but it is the only server-computed record of graded work and it's 4 lines. |
| A6 | Rev. 1 left `awardXP`/`awardGemsForXP` writing gems to localStorage + `profiles.gems` while declaring `gem_events` the authority. | **Incomplete as written.** §14 now defines exactly one balance authority and one path for every gem in/out, per phase. |
| A7 | Second Take: each attempt already creates its own Session + XP award + evidence event, so "better one counts" needs retroactive XP adjustment — and it *buys XP*, violating the plan's own rule. Free retries already exist (`isRetry`, `attemptIndex: 2`). | **Cut.** |
| A8 | Gem Doubler is a gem faucet bought with gems; with client-influenced minting it is a net-positive loop. | **Cut.** |
| A9 | `consumeItem` never calls `markNeedsSync()`, and `mergeProgressionData` takes per-key `Math.max` on inventory — **a consumed streak freeze is restored by the next cloud pull**. `consumeStreakFreeze()`'s return value is also discarded (`analyticsService:97`), so a failed decrement still grants the streak. | Inventory must come from server `user_inventory`, never the merged JSONB. Consumption goes through an RPC. |
| A10 | Guest gem grant is exploitable: `hasMeaningfulLocalData()` is trivially satisfied, localStorage is editable, and repeated account creation replays it. A cap does not fix it. | Replaced with minting from already-synced `xp_events` under the same daily cap (§14). |
| A11 | Rev. 1's SECURITY DEFINER sketch omitted `REVOKE EXECUTE ... FROM PUBLIC` (Postgres grants it by default) and used a global `gem_events.id` PK, allowing cross-user idempotency-key collision/griefing. | Hardening spec in §14.3, incl. server-side key namespacing. |

### B. Codebase-dependent — verify at implementation time before acting

| # | Check | If confirmed |
|---|---|---|
| B1 | Which `profiles` columns clients legitimately UPDATE. Known: `privacyService.ts:16` writes `leaderboard_visibility/discoverable/friend_requests_from`; `migrationService.ts:57` writes `migration_version`; `rename_username`/`claim_username` are **SECURITY INVOKER** so they need caller-held UPDATE on `username, username_changed_at`. | Column-level REVOKE must exclude all of the above, or those flows break. Verify with a smoke test on each after the migration. |
| B2 | Function ownership. Supabase CLI migrations normally run as `postgres`, so `SECURITY DEFINER` functions are owned by `postgres` and bypass RLS as intended. | Verify with `\df+ purchase_shop_item` that owner is not a role that is also grantable to end users. If ownership differs, set it explicitly. |
| B3 | Whether `profiles.gems` should be dropped from the client write path immediately or shadowed for one release. | If any unshipped code still reads `profiles.gems`, shadow-write it from the RPC for one release, then stop. |
| B4 | `exam_results` is written by `backend/exam_controller.py:801` but **has no migration in this repo**. | Out of Shop scope — but do not build any requirement on it until its existence is confirmed. |

### Accepted risks (your explicit decisions)

- **Cosmetics are socially visible from day one on forgeable gates.** `profiles.achievements` is browser-written with the anon key, has no CHECK, and `mergeProgressionData` *unions* it — so a forged achievement is permanent and irrevocable, and unlocks any cosmetic. This is accepted for launch and closed in Phase 7.
- **Gems remain forgeable-but-bounded until Phase 7.** Nothing about user work is server-observed: `sessions`, `xp_events`, `coach_evidence`, `pronunciation_attempts` and all of `profiles` are client-asserted. The 450/day mint cap bounds the blast radius; it does not eliminate it.
- **Do not enable real-money gem purchases before Phase 7.** Stated again in §10 because it is the one hard gate in this plan.

---

## Context

The Shop exists ([src/screens/Shop.tsx](../src/screens/Shop.tsx), 465 LOC) but is unreachable — `FEATURE_FLAGS.shop = 'coming-soon'` ([featureFlags.ts:6](../src/config/featureFlags.ts#L6)). It is a generic storefront: 16 SKUs of which **14 do nothing**, a fake countdown, a hardcoded "GET FOR 2,000" button.

Three forces require redesign rather than polish:

1. **The economy leaks.** `purchaseItem()` writes localStorage while `dispatch(PURCHASE_ITEM)` separately mutates React state; `purchaseItem` never calls `markNeedsSync()`; `mergeProgressionData` merges gems with `Math.max` ([progressionSync.ts:93-134](../src/services/sync/progressionSync.ts#L93-L134)). **A cloud pull refunds your purchase while you keep the item.** Repeatable.
2. **It is pay-to-win on a live surface.** `rankings` is `live` and sums `xp_events`. `xp_boost` and `perfect_shield` inflate XP ([Learn.tsx:277-283](../src/screens/Learn.tsx#L277-L283)). (Verified they do *not* corrupt `Session.score` or the coach evidence stream — `orchestrateAttempt` receives `finalScore`. Damage is confined to the XP ledger, which is exactly what ranks you.)
3. **Gems will be sold for money.** Today `gems` is a plain column on `profiles`, which has an unrestricted self-UPDATE policy — **any user can set their own balance from the browser console.**

And an unused asset: **`profiles.avatar_emoji` already exists, already syncs, and is already rendered in 5 places** (`leaderboardService`, `friendsService`, `searchService`, `blockService`, `Rankings.tsx`) — and nothing has ever written it. Every user shows `🤖`.

**Outcome:** a Shop where earned currency buys identity and agency — never XP, score, or learning content — on an economy with exactly one balance authority.

---

## 1. Current Shop audit

| Layer | Reality |
|---|---|
| Screen | 4 tabs, Daily Deal hero, rarity cards, 2 confetti cannons, `layoutId` tab pill |
| Catalogue | [shopItems.ts](../src/data/shopItems.ts) — 16 items, 100–5000 gems |
| Currency | Gems. `computeXPGain` ([xp.ts:11](../src/domain/xp.ts#L11)) — **3–8 gems per answer** |
| Spend | One function: `purchaseItem(itemId, cost)` |
| Inventory | `Record<string, number>`. No equipped state, no cosmetics, no themes |
| Cloud | `profiles.gems` + `inventory` JSONB, merged by `Math.max` |
| Working items | **2 of 16** — `streak_freeze` (`analyticsService:96`) and `perfect_shield` (`Learn.tsx:280`). Three more activate a booster whose duration/multiplier are hardcoded *in the screen* ([Shop.tsx:107-119](../src/screens/Shop.tsx#L107-L119)); `time_warp`'s multiplier is `1` — a literal no-op |

**Reusable:** `PageShell`, `fadeUp`/`stagger`, `.glass*`, `StatPill` (already navigates to `/shop`), `Card`, `CollapsibleCard`, `animate-shake`, `shimmer-bar`, the `layoutId` tab pattern, and the entire `xpLedger` sync architecture — the correct model for a currency ledger.

**Missing:** any equipped-cosmetic concept; any connection between Shop and progress; any coach connection despite `DailyPlan.urgency` already computing `streak_at_risk` / `exam_soon`; any transaction record. Insufficient funds is a **silent no-op** ([Shop.tsx:90-93](../src/screens/Shop.tsx#L90-L93), with a comment admitting it).

**Dangerous:** purchase-refund exploit · client-writable balance · pay-to-win on the leaderboard · selling learning content (`flashcard_pack_idioms` — content that doesn't exist; `premium_voice` — the real Azure/Whisper assessment tier) · `fast_pass` "Skip Exam" in an exam-prep product · fabricated countdown · a loot box duplicating the free `MysteryBox` · 14 placebo SKUs · 5000 gems for an item with no effect.

---

## 2. Product thesis

> **The Shop is where proof of practice becomes something other people can see, and where earned currency buys agency over your own learning — never advantage over other learners, and never access to learning itself.**

**Two keys:** nearly every cosmetic requires *both* gems (time) *and* a learning milestone (skill). Gems alone buy nothing prestigious. This kills grinding as a strategy, makes the Shop a second progress dashboard, gives goals that survive a broken streak, and is what lets a game-like economy coexist with a serious IGCSE identity.

**Ranked purposes:** (1) give gems utility — nothing else works without it; (2) make progress visible to others; (3) long-horizon goals that outlive the streak; (4) reinforce learning via requirements, not boosters; (5) session frequency, as a second-order effect only; (6) personalization; (7) delight; (8) premium — deliberately last (§10).

---

## 3–4. Experience & information architecture

Opening the Shop should feel like a **trophy case with a small supply cupboard attached**. First 3 seconds: your balance → one contextual line → your collection, with locked items as silhouettes showing real progress. Never a carousel, countdown, sale badge, or gem upsell.

**Persistent header** (not a tab): balance, lifetime earned, one contextual line (coach urgency → nearest unlock → collapses), and your equipped cosmetics rendered exactly as others see them.

| Tab | Contents | Currency | Frequency |
|---|---|---|---|
| **Gear** | Consumables: streak safety + practice direction. No requirements. | Gems | High |
| **Identity** | Avatars, frames, nameplates. One-time, achievement-gated. Locked cards show live progress. | Gems + requirement | Low, high emotion |
| **Locker** | Owned / equipped / active-with-countdown, collection grid with silhouettes, and full transaction history. | Free | Medium |

**Rejected sections:** Featured/Daily Deal (fabricated urgency) · Bundles (implies inflated list prices) · Seasonal/limited-time (FOMO at teenagers; breaks the collection) · Mystery boxes (gambling for minors; `MysteryBox` already exists free) · Premium tab (§10) · Gem top-up (not before Phase 7, never on the earnable surface).

---

## 5. Economy design

**One currency — gems. XP is never spendable.** XP drives `level`, `weekly_leaderboard.weekly_xp`, and public `current_level`. Anything purchasable that touches XP makes the leaderboard a fiction. This single rule is what keeps Phases 0–6 defensible.

| Gems may buy | Gems may **never** buy |
|---|---|
| Streak safety | XP, level, or leaderboard position |
| Session direction / focus | Assessment score or feedback quality |
| Cosmetic identity (with a requirement) | Learning content — questions, vocab, drills, scenarios |
| | Pronunciation assessment tier (Azure/Whisper) |
| | Exam skips or time extensions |

### Corrected earning math (A3)

`Session` = one **answer**. `SESSION_TARGET` ([sessionBuilder.ts:23](../src/utils/sessionBuilder.ts#L23)): `quick:5, standard:10, deep_dive:20`. Retries and follow-ups each emit their own Session + XP award.

| Unit | Gems |
|---|--:|
| One answer (avg, score ~7, streak ≥7) | ~5 |
| `quick` sitting (5 Q) | ~25 |
| `standard` sitting (10 Q) | ~50 |
| `deep_dive` sitting (20 Q) | ~100 |
| Daily learner (1 standard/day) | ~350/week, **~1,500/month** |

**Mint cap: 450 gems/day**, enforced server-side, applied to `kind='earn'` only. Purchased gems (`kind='purchase'`, real money) are **uncapped** — the cap is an anti-forgery bound on minting, and paid gems are already paid for. 450 is 1.5× the heaviest realistic legitimate day (3 deep sittings + retries ≈ 300), so no real learner reaches it, while a forger needs ~34 days to buy the full catalogue instead of one write.

---

## 6. Catalogue — 19 launch items (re-laddered per A1/A2/A3)

Every requirement is an existing achievement id from [achievements.ts](../src/data/achievements.ts), enforced server-side against `profiles.achievements` — **the only client-written progression field that actually functions**. Session-count and streak-count *columns* are unusable (A1); the corresponding *achievements* are fine because they're computed locally and synced as an array.

Dropped as gates: `polyglotte` (unreachable, A2), `cinq_sessions` / `dix_sessions` / `marathonien` (1–5 sittings — no prestige value once you know sessions are answers, A3).

### Gear — consumables, no requirement

| Item | Price | Effect | Phase |
|---|--:|---|---|
| ❄️ Streak Freeze | 200 | Covers one missed day | 4 |
| 🎯 Focus Token | 150 | Override the coach's Today's Focus for one session | 5 |
| 🧵 Streak Repair | 600 | Restore a streak lost <48h ago | 5 |

### Identity — avatars (writes `profiles.avatar_emoji`)

| Item | Price | Requirement | Signals |
|---|--:|---|---|
| 🥐 Le Croissant | 150 | — | Starter |
| 🦊 Le Renard | 400 | `triple_jour` | 3-day streak |
| 📖 L'Examinateur | 500 | `examinateur` | Completed an exam |
| 🎙️ Le Micro | 800 | `causeur` | 5 roleplays |
| 🖋️ La Plume | 900 | `grammaire_maitrisee` | A grammar skill ≥0.8 mastery |
| 🔥 Le Phénix | 1400 | `probleme_resolu` | Fixed a recurring grammar problem |
| 🦉 Le Hibou | 1800 | `niveau_b2` | Avg mastery ≥0.6 (requires `expert`) |
| 👑 La Couronne | 2500 | `bete_de_mode` | 7000 XP |

### Identity — frames (ring around the avatar)

| Item | Price | Requirement |
|---|--:|---|
| Ardoise | 250 | — |
| Émeraude | 450 | `semaine_parfaite` (7-day streak) |
| Améthyste | 1000 | `expert` (1500 XP) |
| Or | 1600 | `grand_oral` (IGCSE mock) |

### Identity — nameplates (username treatment on leaderboard rows)

| Item | Price | Requirement |
|---|--:|---|
| Encre | 250 | — |
| Cobalt | 600 | `fluent` (any score ≥8) |
| Aurore | 1200 | `perfectionniste` (a perfect 10) |
| Tricolore | 1200 | `drill_master` (5 interventions) |

**Rarity is derived, not authored:** `common` (no req) → `rare` (req, <900) → `epic` (<1600) → `legendary` (≥1600).

**Totals:** Gear 950 · Avatars 8,450 · Frames 3,300 · Nameplates 3,250 — **15,950 gems ≈ 10.5 months** at 1,500/month. First purchase in sitting 1; mid-tier ~3 weeks; top ~7 weeks.

### Rejected

| Item | Why |
|---|---|
| `xp_boost`, `perfect_shield` | Buys leaderboard rank and public level. Delete + refund. |
| `time_warp` | ×1 no-op; undermines timed-exam realism. |
| `fast_pass` "Skip Exam" | Sells not-learning in an exam-prep product. |
| `premium_voice` | Maps to the real Azure/Whisper assessment tier. Never sellable. |
| `flashcard_pack_idioms` | Never sell learning content; the 50 idioms don't exist. |
| `mystery_key` | Loot box; duplicates free `MysteryBox`. |
| `retro_theme` | A second design system for one SKU. |
| `streak_shield_mega` | Redundant with stacking freezes. |
| **Second Take** | **A7** — buys XP; needs retroactive XP adjustment; free retries already exist. |
| **Gem Doubler** | **A8** — a gem faucet bought with gems; net-positive loop under client-influenced minting. |
| `linguist_cape`, `legendary_avatar`, `gold_border`, `diamond_badge` | Ids retired; intent absorbed into the avatar/frame lines. |
| Any XP multiplier | Permanently. §5. |

---

## 7. Visual design

Reuse, don't invent. **Principles:** restraint = premium (rarity is a hairline ring and one word, not a glow storm) · content over chrome · locked ≠ hidden (full-opacity silhouettes with real progress bars — they advertise *learning*) · one purposeful animation per interaction · never casino.

**Reuse directly:** `PageShell maxWidth="xl"` (already clears the mobile dock via `pb-24 md:pb-8`) · `.glass-elevated` + `rounded-2xl` + `border-{c}-500/20` + `bg-{c}-500/10` chips + the `w-32 h-32 blur-3xl` corner glow · `text-[10px] font-black uppercase tracking-widest` eyebrows · `fadeUp`/`stagger` (the only variants that exist) · `whileHover={{ scale: 1.01, y: -2 }}` (Home's value, **not** the current Shop's `y: -8`) · `layoutId` tab pill · `animate-shake` · `shimmer-bar` · `Profile.tsx`'s segmented control for Locker filters.

**New, minimal:** `RarityRing` (1px gradient ring, 4 values) · `CosmeticPreview` (renders avatar+frame+nameplate exactly as `Rankings.tsx` rows do, so the preview *is* the shipping component) · `GemBalance` (animated count).

**Corrections:** `rounded-[2rem]` → `rounded-2xl` · remove both confetti cannons · remove the 500px `animate-pulse` blur and the floating-emoji loop. **Note:** `.glass` sets `border: 1px solid transparent` plus a gradient `background-image`, so Tailwind `border-*` color utilities are overridden in dark mode — put rarity color on an inner ring element, never on the glass container's border.

---

## 8. Interaction design

| Moment | Behavior |
|---|---|
| Open | `PageShell` stagger, ~400ms |
| Browse | `y:-2` lift. Locked cards show requirement + live progress. Affordable-and-unlocked get a subtle ring |
| Hover | Price → "you have 340 / need 400". Owned → "Owned · Equip" |
| Click | Desktop: expands in place via `layoutId` with `CosmeticPreview` on your real leaderboard row. Mobile: bottom sheet |
| Purchase | Inline spinner (server round-trip) → gem counter rolls down digit-by-digit → card flips to Owned. **No confetti.** ~600ms |
| Insufficient | Balance `animate-shake`, button shows `+140 more`, plus "≈2 more sessions". Never a top-up prompt |
| Locked | Not purchasable. Shows requirement, live progress, and a deep link to the practice that advances it |
| Equip | Animates card → header → persists; `TopContextBar` updates immediately |
| Failure | Visible rollback with a plain reason. Never a silent no-op |
| Return | Freshness from *your* progress: newly-unlocked items get a "Now available" ribbon. Nothing expires |

Sound is out of scope — there is no audio system; `soundEnabled` currently controls nothing.

---

## 9. Coach integration

**One slot, read-only, inside the Shop.** Resolution order, all reading the existing `getDailyPlan()`:

| State | Line |
|---|---|
| `streak_at_risk` **and** owns 0 freezes | "Your 12-day streak is at risk today. A Streak Freeze covers it." → inline buy |
| `exam_soon` | "Exam in 9 days. A Focus Token lets you drill your weakest topic instead of today's plan." |
| `overdue_review` | Focus Token, framed as review |
| otherwise | Nearest unlock: "2 more sessions until Le Renard." |

**Hard rules:** the coach never recommends a purchase outside `/shop` — no interstitials, no Home nudges, no post-session upsell. One line maximum; collapses when nothing applies. If the item is already owned the line becomes *help*, not sale (the existing Home `EngagementHooks` "Streak at Risk" card may gain a "Use Freeze" action **only when a freeze is owned**). Never claim an item improves learning outcomes.

---

## 10. Free vs Premium

No payment infrastructure exists — no Stripe, no subscription, no entitlement column anywhere.

| Tier | Contains |
|---|---|
| **Earnable — all 19 Shop items** | Permanently, entirely, with gems only |
| **Premium (future, outside the Shop)** | Capacity and quality of the *learning product*: AI-graded session volume, authoritative Azure pronunciation, full IGCSE mocks, weekly coach reports, cloud history depth |
| **Hybrid** | None. Hybrids are where premium/free confusion is born |

**Two constraints on selling gems:**
1. **Requirements stay.** Money can buy the *time* half of the two keys, never the *skill* half. Without this the collection stops signalling anything.
2. **Selling gems requires Phase 7.** Phases 0–6 make *spending* authoritative — enough for the Shop, and it closes the exploit. Minting stays client-asserted-but-capped. `xp_events` lets any authenticated client insert amounts up to 500 for itself; `profiles.achievements` is unvalidated and union-merged. **Do not enable real-money gem purchases before Phase 7.**

---

## 11. User journeys

| # | Scenario | Experience |
|---|---|---|
| A | New user | ~50 gems after one sitting. Header shows nearest unlock, not a sale. Mostly locked-but-visible with progress bars. Le Croissant (150) reads "≈2 sittings away". A goal board, not a store |
| B | 500 gems | 2 Gear affordable; Identity shows 3 affordable-and-unlocked plus 🖋️ La Plume at "Grammar mastery 0.72 / 0.80" — a reason to practice, priced honestly out of reach |
| C | Can't afford | `+140 more` and "≈2 more sessions". Balance shakes. No top-up path exists |
| D | Just earned enough | On return the item carries a "Now available" ribbon. No push, no nag |
| E | Purchases | Spinner → roll-down → Owned → Equip → avatar animates into the header |
| F | One week later | Progress bars moved, 2 items newly ribboned, Locker shows the freeze that was consumed and why |
| G | Premium (future) | Shop looks **identical**. No premium tab, no exclusives, no discount |
| H | Empty inventory | Locker isn't blank — the full collection in silhouette with requirements. The empty state *is* the roadmap |
| I | Many items | Equipped (hero preview) · Consumables (counts + active timers) · Collection (`12/19`), segmented filter reused from Profile |

---

## 12. WOW moments

1. **Your avatar appears on the live leaderboard** — `avatar_emoji` already renders in 5 places. Near-zero build cost, highest emotional payoff.
2. **Locked cards show real mastery** — "Grammar mastery 0.72 / 0.80" from the actual belief snapshot.
3. **The gem counter rolls down** instead of confetti. Restraint reads as expensive.
4. **"≈2 more sessions"** — turning a price into a practice quantity is the highest-leverage copy change here.
5. **Streak saved** — the next session after a freeze auto-consumes opens with "Your 12-day streak was protected."
6. **The silhouette grid** — `12/19` collected, requirements visible. Collection psychology, zero dark patterns.
7. **Equip flies home** into `TopContextBar` and stays.
8. **The transaction ledger** — every gem in and out, plainly listed. Almost no consumer app does this, and it is what makes a monetizable currency trustworthy.

---

## 13. Responsive

| Breakpoint | Layout |
|---|---|
| ≥1024px | 3-col. Header horizontal. Detail expands in place via `layoutId`. Sticky tabs |
| 768–1023 | 2-col. Header wraps to two rows |
| <768px | 1-col. Header stacks (balance + preview, then coach line). Tabs `overflow-x-auto no-scrollbar` (already present). Detail = **bottom sheet**, drag-to-dismiss |

`TopContextBar` already renders a gems pill on mobile — **give it the desktop `onClick={() => navigate('/shop')}`**, currently missing ([TopContextBar.tsx:97](../src/components/TopContextBar.tsx#L97)). Sticky purchase CTA inside the sheet; 44px minimum targets.

---

## 14. Technical architecture

### 14.1 Balance authority, per phase (fixes A6)

**After Phase 1, `gem_events` is the sole balance authority. Nothing else.**

| Store | Before | After Phase 1 |
|---|---|---|
| `gem_events` | — | **Authority.** `balance = SUM(delta)` |
| `profiles.gems` | authority | Read-only cache, written by RPC only; client UPDATE revoked (B3) |
| localStorage `progression.gems` | authority | Display cache; reconciled from server on hydrate |
| `profiles.inventory` JSONB | authority | Frozen; superseded by `user_inventory`. Client UPDATE revoked |
| `xp_events` | XP ledger | Unchanged. **Not** a gem source |

**Every gem in:** `earn` (mint RPC, capped 450/day) · `purchase` (real money, Phase 7, uncapped) · `refund` (deleted-SKU migration) · `grant` (one-time opening balance).
**Every gem out:** `spend`, via `purchase_shop_item` only.

**Minting.** `awardXP`/`awardParticipationXP`/`awardGemsForXP` stop being gem authorities. They compute the award and enqueue a mint call; the local number shown is a provisional display value reconciled on the next successful mint. Offline awards queue and flush on reconnect, reusing the `pendingSyncXpEventIds` pattern ([syncQueue.ts](../src/services/sync/syncQueue.ts)).

```
mint_gems(p_idempotency_key text, p_amount int, p_occurred_at timestamptz) RETURNS jsonb
  - amount bounded 1..20 (real range is 1–8; headroom for future award types)
  - occurred_at bounded to [now() - 30 days, now() + 1 day]  (same CHECK shape as xp_events)
  - rolling cap: SUM(delta) for kind='earn' on that occurred_at::date < 450
    → over cap: insert nothing, return {ok:true, capped:true, balance}  (never an error;
      a legitimate user must never see a failure for practicing)
  - purchases (kind='purchase') are NOT counted toward the cap
```

### 14.2 Schema (in `backend/` — a **separate git repo**; confirm `git -C backend status` is clean first, `git -C backend push` after)

House pattern ([xp_events migration](../backend/supabase/migrations/20260808064748_add_xp_events_ledger.sql) is the model): table + inline CHECKs → indexes → `ENABLE ROW LEVEL SECURITY` → **per-verb policies with an explicit `TO` clause** → **`GRANT` inline in the same migration** (this has 42501'd twice in this project).

| Object | Shape | RLS |
|---|---|---|
| `shop_items` | `id, kind, price_gems, consumable, max_owned, requirement jsonb, active, sort_order` — **server-side price list** | Public SELECT; no write policy |
| `gem_events` | `id text PK, user_id, delta, kind, item_id, metadata, created_at`, `CHECK (delta <> 0)` | SELECT own only. **No INSERT/UPDATE/DELETE policy** — writable only by SECURITY DEFINER fns + service_role |
| `user_inventory` | `(user_id, item_id) PK, qty CHECK (qty >= 0), acquired_at` | SELECT own only; no write policy |
| `profiles` +2 | `equipped_frame text`, `equipped_nameplate text` | existing |

**Index:** `gem_events (user_id, kind, created_at)` for balance and cap queries.

**A4 — column-level lockdown** (verify B1 first; do not revoke `username`, `username_changed_at`, `leaderboard_visibility`, `discoverable`, `friend_requests_from`, `migration_version`, and — per the accepted-risk decision — **not** `total_xp` or `achievements`):
```sql
REVOKE UPDATE (gems, inventory, active_boosters,
               avatar_emoji, equipped_frame, equipped_nameplate)
  ON public.profiles FROM authenticated, anon;
```
`progressionSync.pushProgressionToCloud` must stop writing `gems`/`inventory`/`active_boosters` or it will 42501.

**A5 — close the forged-envelope hole** (separate migration, not Shop scope but 4 lines):
```sql
DROP POLICY "scoring_envelopes owner write" ON public.scoring_envelopes;
DROP POLICY "session_transcripts owner write" ON public.session_transcripts;
REVOKE INSERT, UPDATE, DELETE ON public.scoring_envelopes, public.session_transcripts
  FROM anon, authenticated;
```
(Reads stay; `server/index.ts` writes with `SUPABASE_SERVICE_KEY` and is unaffected.)

**Views:** `public_profile` and `weekly_leaderboard` must be DROPped and recreated to add `equipped_frame`/`equipped_nameplate` (and to `weekly_leaderboard`'s `GROUP BY`). **Do not add `security_invoker`** — the migration header explains why these two deliberately run as owner.

### 14.3 SECURITY DEFINER hardening (A11)

Applies to `purchase_shop_item`, `equip_cosmetic`, `consume_item`, `mint_gems`. Every point below is required.

- `SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp`, with all objects schema-qualified (`public.gem_events`).
- Owned by `postgres` — **verify with `\df+` (B2)**, since a function owned by a user-grantable role defeats the purpose.
- `REVOKE EXECUTE ON FUNCTION … FROM PUBLIC;` **then** `GRANT EXECUTE … TO authenticated;` — Postgres grants EXECUTE to PUBLIC by default, so the revoke is not optional.
- `me := auth.uid(); IF me IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000'; END IF;`
- **Every client identifier validated**: `p_item_id` must resolve in `shop_items` where `active`; `p_slot` must be in `('avatar','frame','nameplate')`. No dynamic SQL anywhere.
- **Cross-user idempotency-key abuse (A11):** `gem_events.id` is global, so a client could pre-claim another user's key. The function **never accepts the key as the row id** — it stores `me || ':' || p_idempotency_key`. Collision across users becomes impossible by construction, and the replay lookup is `WHERE id = me || ':' || p_idempotency_key` so it can never read another user's row.
- **Atomicity:** the function body is one transaction — `INSERT gem_events` + `UPSERT user_inventory` commit or roll back together. **No `EXCEPTION WHEN OTHERS`** blocks (they would swallow a failed insert and leave inventory granted without payment).
- **Serialization:** `PERFORM 1 FROM public.profiles WHERE id = me FOR UPDATE;` before reading the balance — the repo's existing idiom (`friendships` RPCs). This makes concurrent purchases and last-gem races correct.
- Errors are `RAISE EXCEPTION … USING ERRCODE` with stable codes: `not_authenticated` 28000 · `unknown_item` / `insufficient_gems` / `requirement_not_met` / `already_owned` 22023. No internal state in messages.

```
purchase_shop_item(p_item_id text, p_idempotency_key text) RETURNS jsonb
  1. auth guard
  2. key := me || ':' || p_idempotency_key
     replay: SELECT FROM gem_events WHERE id = key → FOUND: return {ok, replayed:true, balance}
  3. PERFORM 1 FROM profiles WHERE id = me FOR UPDATE
  4. item + PRICE read from shop_items (the client never sends a price)
  5. requirement check: requirement->>'achievement' = ANY(profiles.achievements)
  6. balance := coalesce(sum(delta),0) FROM gem_events WHERE user_id = me
     < price → insufficient_gems
  7. max_owned check against user_inventory
  8. INSERT gem_events(id=key, delta=-price, kind='spend', item_id)
     INSERT user_inventory ON CONFLICT (user_id,item_id) DO UPDATE SET qty = qty + 1
  9. RETURN {ok:true, balance, qty}

equip_cosmetic(p_slot text, p_item_id text) RETURNS void
  auth guard → validate slot → require ownership in user_inventory
  → UPDATE profiles SET <slot column>. Passing NULL unequips.

consume_item(p_item_id text, p_idempotency_key text) RETURNS jsonb
  Same key namespacing + replay guard, scoped to the USE not the item:
  the client generates a FRESH uuid per consumption. Decrements qty with
  a guard (qty > 0), writes a metadata-only gem_events row (delta is not
  used for consumption — consumption is inventory-only).
```

### 14.4 Consumable contracts (concern 7 — tightened)

| Item | Consumed by | When | State change | Survives reload/device | Double-consume | Touches XP/score/evidence |
|---|---|---|---|---|---|---|
| **Streak Freeze** | `analyticsService.updateStreak` | Automatically, on the first answer of a day that follows a 1-day gap | `user_inventory.qty − 1` (server) + local streak count +1 | Inventory yes (server); streak is **localStorage-only** and diverges per device | Prevented by RPC + `qty > 0` guard. **A9 fixed:** must call the RPC and check its result before incrementing the streak — today `consumeStreakFreeze()`'s return is discarded (`analyticsService:97`) | No |
| **Focus Token** | `Learn` at session start | On explicit user action ("use token") | `qty − 1` + `DailyPlan` override for that sitting | Inventory yes; override held in `ActiveSession`, lost on reload (acceptable — refund not required, the sitting continues) | RPC-guarded; fresh key per use | No |
| **Streak Repair** | Shop/Locker | On explicit user action, only when `lastDate` is within 48h | `qty − 1` + local streak restore | Inventory yes; streak local-only | RPC-guarded | No |

Streak lives only in localStorage (`profiles.streak_days` is never written, A1), so both streak items have local effects with server-enforced *payment*. That asymmetry is acceptable and is stated here so it isn't rediscovered later.

> **Phase 2 implementation note (added, not part of the original Rev. 2 text):** the "A9 fixed" row above describes the Phase 4 end state, not Phase 2. See the Phase 4 entry in §15 for what Phase 2 actually shipped for Streak Freeze (still local-only) and why.

### 14.5 Refund migration (concern 9)

Pure SQL, no client flag, idempotent by primary key:
```
For each row in profiles where inventory ?| ARRAY[<deleted ids>]:
  INSERT INTO gem_events(id, user_id, delta, kind, item_id, metadata)
  VALUES ('refund:v1:' || id || ':' || item_id, id, qty * original_price, 'refund', item_id, ...)
  ON CONFLICT (id) DO NOTHING;
```
Deterministic ids make re-running a no-op. Fully auditable in `gem_events`. **Ordering matters:** the opening-balance grant (`'opening:v1:' || id`, `delta = profiles.gems`, `kind='grant'`) must run *before* refunds in the same migration, so no user is transiently negative. The opening grant imports an already-client-asserted number — noted as an accepted, one-time, audited import.

### 14.6 Frontend

**New:** `src/services/shop/shopService.ts` (the single writer — `purchase/equip/consume/getBalance/getInventory`, following the `.rpc()` shape used across `src/services/social/`) · `src/services/shop/shopCatalogue.ts` (**presentation only** — name, icon, copy, requirement label; keyed by id) · `src/types/shop.ts` · components `ShopHeader`, `ShopItemCard`, `ItemDetailSheet`, `LockerGrid`, `CosmeticPreview`, `GemBalance`, `RarityRing`, `TransactionList`.

**Ownership model (concern 16):** server = economic truth (`shop_items` owns id/price/kind/max_owned/requirement) · client = presentation/cache (`shopCatalogue.ts` owns copy only) · service = behavior. A unit test asserts the two id sets match exactly, so drift fails CI. `cosmetics.ts` folds into `shopCatalogue.ts` — no separate module.

**Changed:** `AppContext` — add `equipped` to `UserProfile`; **replace `PURCHASE_ITEM` with `SET_ECONOMY`** applying the server's returned balance and inventory rather than mutating locally (this kills the double-write at the root); delete the dead `ADD_GEMS` action; add the missing `REMOVE_XP_ANIMATION`/`REMOVE_GEM_ANIMATION` cases (currently no-ops leaking arrays) · `progressionService` — remove `purchaseItem`/`activateBooster`, route `consumeStreakFreeze` through the RPC · `progressionSync` — stop pushing `gems`/`inventory`/`active_boosters` · `Learn.tsx` — remove the `perfect_shield` block (277-283) · `TopContextBar` — equipped avatar + the missing mobile `onClick` · `Rankings`/friends/search — render frame + nameplate · `src/lib/supabase.ts` `Database` type — add new tables (already stale).

**Deleted:** `src/data/shopItems.ts`.

### 14.7 Offline, guests, concurrency (concern 14)

- **Purchases require auth + network.** Offline the Shop is fully browsable; buy buttons read "Reconnect to purchase". This is a real property of a monetizable currency and is shown, not hidden.
- **Guests (A10):** no client-asserted grant. Guests browse and earn a *provisional local* balance. On sign-in, the existing `backfillXpEventsToCloud` uploads their `xp_events`, and mint runs over them under the same 450/day cap keyed on `occurred_at` — so a genuine guest keeps their earnings, and repeated-account-creation gains nothing beyond the cap.
- **No optimistic currency mutation.** Pending state shows immediately; the balance changes only when the RPC returns. Timeout → retry with the *same* key.
- **Two tabs:** the existing `storage` listener in `AppContext` covers progression; add a balance refetch on `visibilitychange`.
- **Two devices / simultaneous purchases / last-gem race:** serialized by the `FOR UPDATE` lock — one succeeds, the other gets `insufficient_gems`.
- **Purchase → immediate equip:** `equip_cosmetic` validates ownership server-side from `user_inventory`, so there is no client-cache race.

### 14.8 Transaction history (concern 13)

Both an audit trail and a user-facing view. **Expose:** `kind`, `delta`, resolved item name, `created_at`. **Never expose:** `metadata` jsonb, the idempotency key / `id`, or internal cap state. Refunds and grants render as plain positive rows ("Refund — XP Booster", "Starting balance"). Replays are invisible by construction — a replayed call writes no new row.

---

## 15. Implementation phases

Sequencing note (concern 18): Phase 1 is now a hard gate for everything downstream, because no UI can be trusted before there is one balance authority. **The flag must not be flipped live until the Phase 8 invariant tests pass.**

**Phase 0 — Remove pay-to-win** *(no UI change; Shop stays flagged off)*
Delete the 9 rejected SKUs; remove the `perfect_shield` block from `Learn.tsx:277-283` and the booster path from `Shop.tsx`; fix the `Math.max` gem merge; add `markNeedsSync()` to spend paths.
*Files:* `src/data/shopItems.ts`, `src/screens/Learn.tsx`, `src/services/progression/progressionService.ts`, `src/services/sync/progressionSync.ts`
*Success:* no code path increases XP by spending gems; no sync path restores spent gems.

**Phase 1 — Server economy** *(`backend/` repo; gates everything after)*
Migrations: `shop_items`, `gem_events`, `user_inventory`, the two `profiles` columns, the column-level REVOKE (B1), the A5 envelope-policy fix, view rebuilds, opening-balance + refund migration (14.5). RPCs `purchase_shop_item`, `equip_cosmetic`, `consume_item`, `mint_gems` with the full 14.3 hardening. Seed all 19 items.
*Success:* the 14.3 checklist verified by the §16 DB tests. **Verify B2 ownership before merging.**

**Phase 2 — Client economy service**
`shopService.ts`, `types/shop.ts`, `SET_ECONOMY` replacing `PURCHASE_ITEM`, mint wiring in the award path, balance hydration on login + `visibilitychange`, offline mint queue, dead-action cleanup.
*Success:* double-click charges once; network kill mid-purchase leaves balance and inventory consistent after reload.

> **Implementation note (added during Phase 2, not part of the original Rev. 2 text):** Shop.tsx was reduced to a minimal placeholder (`export function Shop() { return null; }`) rather than patched to compile against `SET_ECONOMY`/`shopService`, because it is fully rewritten in Phase 4 and is unreachable in prod (`FEATURE_FLAGS.shop = 'coming-soon'`). This was an explicit decision made during Phase 2 implementation, confirmed with the plan owner, to avoid throwaway compile-shim work on a screen being wholesale replaced next phase. Phase 4 writes the real screen into the same file.

**Phase 3 — Cosmetic rendering**
`CosmeticPreview`, equipped avatar/frame/nameplate in `TopContextBar`, `Profile`, `Rankings`, friends, search.
*Success:* equipping via RPC shows on the live leaderboard for a second account.

**Phase 4 — Shop shell + Streak Freeze**
Layout, header, 3 tabs, `ShopItemCard` rewrite, purchase flow with real error states. Rewire Streak Freeze to server inventory (fixes A9).
*Success:* buy → own → consume → streak protected, end to end, with the freeze *not* restored by a cloud pull.

**Deferred from Phase 2 (recorded here, not only in code):** Streak Freeze consumption is local-only and non-functional between Phase 2 and Phase 4 — `consumeStreakFreeze`/`consumeItem` (`progressionService.ts`) still read/write only the local `inventory` JSONB, never `user_inventory` or the `consume_item` RPC. Reason: A9/§14.4 requires calling `consume_item` and checking its result *before* incrementing the streak, but `consume_item` is async and its only caller, `analyticsService.updateStreak`, is invoked synchronously from `recordSession`, which is itself called synchronously from `Learn.tsx`, `ExamMode.tsx`, `WordDrop.tsx`, `DailyNewsFlash.tsx`, and `sessionOrchestrator.ts`. Making that chain async was judged out of Phase 2's scope (shopService/SET_ECONOMY/mint wiring/hydration only). **Phase 4 must replace `consumeStreakFreeze`'s local decrement with an async, RPC-checked call — not extend the local-only path.**

**Phase 5 — Identity + Locker + remaining Gear**
16 cosmetics, requirement evaluation + live progress, locked-card treatment, silhouette grid, equip flow, transaction history. Focus Token (wire into `decisionEngine`) and Streak Repair (wire into `analyticsService`).
*Success:* a locked card shows real progress from the real belief snapshot.

**Phase 6 — Coach line + motion polish**
`getDailyPlan()` header line, `+N more` / "≈2 sessions" copy, gem roll-down, equip-flies-home, bottom sheet, `animate-shake`. Remove all Shop confetti.

**Phase 7 — Integrity** *(required before selling gems or trusting requirements)*
Server-observed work (signed transcripts from `/api/transcribe`, or server-side mint from verified `scoring_envelopes`); server-validated achievements; then revoke client UPDATE on `total_xp`/`achievements`. **Blocks:** any real-money gem purchase.

**Phase 8 — QA, balancing, launch**
Flip `FEATURE_FLAGS.shop` to `live` only after §16 passes. Verify earn rate against real session data. Full mobile pass. `npm run typecheck && npm run lint && npm test`.

---

## 16. Verification

**Database integration tests (concern 15 — these prove the invariants; TypeScript unit tests cannot).** Run against a local Supabase with two real auth users.

| # | Test | Expected |
|---|---|---|
| 1 | Same idempotency key twice, same item | One `gem_events` row, one charge, second returns `replayed:true` |
| 2 | Same idempotency key, **different** item id | Second returns the *first* purchase replayed — never a second charge, never the second item |
| 3 | User B replays user A's raw key string | Namespaced to `B:<key>` — a normal new purchase for B; A's row never read or returned |
| 4 | Two concurrent purchases, balance covers only one | Exactly one succeeds; other raises `insufficient_gems`; balance never negative |
| 5 | Same item purchased concurrently, `max_owned = 1` | One succeeds, one raises `already_owned`; `qty` never exceeds 1 |
| 6 | Client `UPDATE profiles SET gems / inventory / avatar_emoji / equipped_frame` with anon key | **All denied** (A4) |
| 7 | Client INSERT into `gem_events` / `user_inventory` with anon key | Denied (no policy) |
| 8 | Client INSERT into `scoring_envelopes` / `session_transcripts` with anon key | Denied (A5) |
| 9 | Purchase with unmet `requirement` | `requirement_not_met`; no ledger row, no inventory row |
| 10 | `equip_cosmetic` for an unowned item | Raises; `profiles` unchanged |
| 11 | Refund migration run **twice** | Second run inserts zero rows; balances identical |
| 12 | `consume_item` replayed with an old key | No second decrement; returns the original result |
| 13 | `mint_gems` past 450 in one `occurred_at` day | Returns `capped:true`, inserts nothing, **does not error** |
| 14 | `mint_gems` with `p_amount = 5000` or `occurred_at` 60 days back | Rejected by bounds |
| 15 | `EXECUTE` on every RPC as `anon` / `PUBLIC` | Denied (A11 revoke) |
| 16 | `\df+` on all four RPCs | Owner is `postgres`; `search_path` is set (B2) |
| 17 | Post-migration smoke: privacy toggle, username rename, migration_version write | All still succeed (B1) |

**Precondition (added during Phase 2 implementation):** do not attempt to E2E-test Streak Freeze consume→streak-protected behavior before Phase 4 lands. Between Phase 2 and Phase 4, `consumeStreakFreeze` is local-only (see the §15 Phase 4 deferral note) and cannot demonstrate the server-backed, non-restorable-by-cloud-pull property test 5 in the End-to-end list below describes. Treat that specific E2E step as blocked, not failing, until Phase 4 ships.

**End-to-end** (`npm run dev`, `?ff_shop=live`, two accounts):
1. Practice on A; confirm displayed balance equals `SUM(gem_events.delta)`.
2. Buy an avatar → one ledger row, one inventory row, correct balance.
3. Buy offline → clean error, no state change; reconnect and retry with the same key → charges once.
4. Equip on A; open Rankings on B → avatar, frame, nameplate render.
5. Buy a Streak Freeze, skip a day, return → streak intact, freeze **not** restored by the next cloud pull (A9). *(Blocked until Phase 4 — see precondition above.)*
6. Two tabs: purchase in one, confirm the other reconciles on focus.
7. Mobile pass at 375px: no horizontal scroll, sheet drags, tabs scroll, gems pill navigates.
8. Total XP byte-identical before and after every purchase.

**Backend repo:** `git -C backend status` clean before starting; `git -C backend push` after committing.

---

## 17. Priorities

**MUST BUILD** — Phases 0–5: pay-to-win removal · server economy with one balance authority · hardened purchase RPC · equipped cosmetics on existing social surfaces · Shop shell with Streak Freeze · Identity collection with requirement gating · Locker with transaction history.

**SHOULD BUILD** — Coach header line · gem roll-down and equip animation · mobile bottom sheet · "≈2 more sessions" copy · Focus Token · Streak Repair.

**DON'T BUILD YET** — Phase 7 integrity (until gems are actually sold) · real-money purchase · seasonal items · bundles · gem grants on achievements · animated frames · sound · themes · anything rotating or expiring.

---

## 18. Recommended MVP

Phases 0–5. In order: remove the 9 pay-to-win/content SKUs and refund holders → make `gem_events` the single balance authority behind hardened RPCs → lock the six client-writable economic/cosmetic columns → render equipped cosmetics on the **live leaderboard** → ship Streak Freeze on server inventory → ship 16 achievement-gated cosmetics with live progress on locked cards → ship the Locker with a real transaction ledger.

**Why this is the right first ship:** #4 alone — an avatar appearing beside your name on a leaderboard other people read — likely delivers more motivation than the rest combined, and costs almost nothing because the column, the sync, and five render sites already exist. Everything else exists to make that moment *earned*, and Phase 1 exists to make it *paid for exactly once*.

---

## Readiness

This plan is implementation-ready with three explicitly-flagged verifications that must happen **during Phase 1, before merge**: B1 (the exact legitimate client-writable `profiles` column set), B2 (RPC ownership via `\df+`), and B3 (whether `profiles.gems` needs one release of shadow-writing). Everything else has been confirmed against the actual schema, policies, and code paths.

Two properties are **accepted limitations, not gaps**: requirements are forgeable via `profiles.achievements` until Phase 7, and gem minting is client-asserted-but-capped until Phase 7. Both are consequences of nothing in this system being server-observed, and both are why Phase 7 is a hard gate on selling gems.
