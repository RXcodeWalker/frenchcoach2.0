// ── B2: evidence-derived skill-profile projection ─────────────────────────────
// The legacy skill-profile store (frenchCoach_sde) lost its only writer when
// Phase 2 removed the call to diagnosticEngine.runAfterSession. Everything that
// reads it — SkillsTab (hasData), SkillTreeTab, buildSkillContext() (which
// drives question selection in Learn), and projectEvidenceBeliefSnapshot's own
// sparse-evidence fallback — has been frozen ever since, empty for any new user.
//
// This module is the replacement writer. It does NOT introduce a second
// learner model: the EvidenceBeliefSnapshot stays the single source of belief,
// and the skill profile is a derived projection of it (invariant I9 — the
// evidence log is the source of truth; every other store is a rebuildable
// cache). The mapping is 1:1 and adds no new math.

import type { EvidenceBeliefSnapshot } from '../../types/beliefs';
import type { SkillProfile, SkillEntry } from '../../types';
import { SKILL_DEFS } from '../coaching/diagnosticEngine';

/**
 * Mastery buckets. Copied verbatim from diagnosticEngine.getSkillProfile() so
 * every existing UI consumer keeps identical semantics — these thresholds are
 * a UI presentation concern, not a Cambridge rubric number.
 */
function masteryBucket(score: number): SkillEntry['mastery'] {
  return score >= 0.85 ? 'mastered'
    : score >= 0.6 ? 'practiced'
    : score >= 0.3 ? 'learning'
    : 'unknown';
}

/**
 * Project the coach's belief snapshot into the legacy SkillProfile shape.
 *
 * CRITICAL — feedback-loop guard: beliefs carrying `fallbackUsed ===
 * 'diagnosticEngine'` are SKIPPED. projectEvidenceBeliefSnapshot reads
 * getSkillProfile() as its sparse-evidence fallback (coachStorage.ts), so a
 * fallback-sourced belief is *already* this profile's own data coming back
 * round. Writing it back would be self-referential: each cycle would re-read
 * its own output as fresh "evidence" and inflate mastery/confidence over
 * successive sessions. The `fallbackUsed` marker exists to break exactly this
 * loop, and this filter is the only place that consumes it for that purpose.
 *
 * Pure: no storage access, no side effects.
 */
export function projectSkillProfile(snapshot: EvidenceBeliefSnapshot): SkillProfile {
  const profile: SkillProfile = {};

  for (const belief of Object.values(snapshot.skills)) {
    // Feedback-loop guard — see the doc comment above. Never relax this.
    if (belief.fallbackUsed) continue;

    const def = SKILL_DEFS[belief.nodeId];
    if (!def) continue;

    profile[belief.nodeId] = {
      name: def.name,
      score: belief.mastery,
      lastSeen: belief.lastObservedAt ? Date.parse(belief.lastObservedAt) : 0,
      feedbackCount: belief.evidenceCount,
      mastery: masteryBucket(belief.mastery),
    };
  }

  return profile;
}
