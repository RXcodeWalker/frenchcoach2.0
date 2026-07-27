// ── Canonical learner id ────────────────────────────────────────────────────
// The one place LEARNER_ID is defined. coachStorage and coachProfileService
// both import from here so neither can drift back to a private copy.
//
// coachProfileService.ts previously had its own private `LEARNER_ID =
// 'local_learner'`, disagreeing with coachStorage's `'local-user'`
// (i-am-building-an-cosmic-cascade.md, Resolved Decisions §1). Evidence is
// the source of truth, so 'local-user' (the id already used by evidence/
// beliefs) is canonical.

export const LEARNER_ID = 'local-user';

/** The only prior id this app ever wrote CoachProfile.learnerId under. */
const LEGACY_LEARNER_ID = 'local_learner';

/**
 * A CoachProfile is a single JSON blob under one fixed storage key (no
 * per-learner sub-key ever existed), so "migration" is just correcting a
 * stale `learnerId` field on read — not moving data between keys. Pass the
 * profile straight through if it already carries the canonical id.
 */
export function migrateLegacyLearnerId<T extends { learnerId: string }>(profile: T): T {
  if (profile.learnerId !== LEGACY_LEARNER_ID) return profile;
  return { ...profile, learnerId: LEARNER_ID };
}
