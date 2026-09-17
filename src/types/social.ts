// ── Social layer: XP ledger contracts (social layer plan §2.3, §4.2) ──────────
// Canonical XP source union — the authoring source of truth, mirrored by the
// xp_events.source CHECK constraint in the DB migration. Both ends must be
// updated together; a source used in dispatchAddXP that isn't in this union
// (and the matching CHECK) will be rejected by the DB insert.

export type XpSource =
  | 'practice'
  | 'exam'
  | 'roleplay'
  | 'word_drop'
  | 'daily_news'
  | 'story'
  | 'listening'
  | 'sentence_rebuilder'
  | 'accent_analyzer'
  | 'emoji_master'
  | 'micro_drill'
  | 'mystery_box'
  | 'challenge'
  | 'minigame'
  // Friend Duels (Phase 2) — server-written only, via award_xp inside the
  // duel RPCs (create/respond/submit_duel_attempt). Never dispatched
  // client-side through logXpEvent.
  | 'friend_challenge'
  // Daily Challenge (Phase 1) — server-written only, via award_xp inside
  // submit_daily_challenge_attempt. Never dispatched client-side through
  // logXpEvent; included here so xpLedger.ts's cloud-pull path (which casts
  // xp_events.source to XpSource) stays exhaustive.
  | 'daily_challenge'
  // Shadowing Mode (Phase 4) — deliberately client-submittable via
  // submit_xp_event, unlike daily_challenge/friend_challenge: the rolling
  // 24h XP cap (20260815090000_league_xp_event_hardening.sql) has no
  // source filter, so adding this source raises the forgeable ceiling by
  // exactly zero. Must stay in sync with xp_events_source_check in
  // 20260816120000_phase4_shadowing_xp_source.sql.
  | 'shadowing';

/**
 * Sources `submit_xp_event` refuses from a client, raising
 * `source_not_client_submittable` (20260815090000_league_xp_event_hardening
 * .sql, extended with mystery_box by 20260912093000_mystery_box_server_claim
 * .sql). They are written server-side by award_xp inside the RPCs that grant
 * them, and reach the local ledger only by being pulled back down from
 * xp_events.
 *
 * The push/backfill paths in services/social/xpLedger.ts must skip these:
 * mystery_box events logged locally *before* the box became server-claimed
 * are still sitting in users' local ledgers, and every sync retries them
 * forever because a rejected event is never marked synced. Keep this in sync
 * with the RPC's own IN-list — a source added there and not here reintroduces
 * exactly that retry loop.
 */
export const SERVER_ONLY_XP_SOURCES: ReadonlySet<XpSource> = new Set<XpSource>([
  'daily_challenge',
  'friend_challenge',
  'mystery_box',
]);

/** A single local XP ledger entry, appended synchronously at award time. */
export interface XpEventRecord {
  id: string;
  amount: number;
  source: XpSource;
  metadata: Record<string, unknown>;
  occurredAt: string;
}
