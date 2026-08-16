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
  | 'daily_challenge';

/** A single local XP ledger entry, appended synchronously at award time. */
export interface XpEventRecord {
  id: string;
  amount: number;
  source: XpSource;
  metadata: Record<string, unknown>;
  occurredAt: string;
}
