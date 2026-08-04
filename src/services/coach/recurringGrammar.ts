// ── Recurring grammar drill detection ─────────────────────────────────────────
// Pure detection over the existing evidence log. No persistence, no lifecycle.
// Returns a skill ID when MicroDrill should be offered.

import type { EvidenceEvent } from '../../types/evidence';
import { SKILL_DEFS } from '../coaching/diagnosticEngine';
import { SKILL_TO_THEME } from '../../domain/microDrill/skillThemes';
import { REBUILD_QUESTIONS } from '../../data/rebuildQuestions';
import { getRecentEvidence } from './coachStorage';

const WEEK_MS = 7 * 86_400_000;
const FAILURE_SCORE_THRESHOLD = 7;
/** A drill needs 3 on-theme items to draw from (MicroDrillModal shows 3 questions). */
const MICRO_DRILL_MIN_ITEMS = 3;

export function isGrammarSkill(nodeId: string): boolean {
  return SKILL_DEFS[nodeId]?.category === 'grammar';
}

/** Availability is derived from real on-theme item counts, not a hardcoded
 * skill-id set — a skill only "has" a drill if there's actually enough
 * content to draw 3 distinct questions from. */
export function hasMicroDrillForSkill(skillId: string): boolean {
  const themes = SKILL_TO_THEME[skillId];
  if (!themes) return false;
  return REBUILD_QUESTIONS.filter(q => themes.includes(q.theme)).length >= MICRO_DRILL_MIN_ITEMS;
}

function isLanguageFailure(ev: EvidenceEvent): boolean {
  if (ev.evidenceType !== 'language') return false;
  if (ev.result.success === false) return true;
  return (ev.result.score ?? 10) < FAILURE_SCORE_THRESHOLD;
}

/**
 * If the learner failed the same grammar skill twice (or more) in the last 7 days
 * and MicroDrill has content for it, return that skill ID. Otherwise null.
 */
export function detectRecurringGrammarDrill(events?: EvidenceEvent[]): string | null {
  const all = events ?? getRecentEvidence(50);
  const cutoff = Date.now() - WEEK_MS;

  const failCounts: Record<string, number> = {};
  let latestFailNode: string | null = null;
  let latestFailTime = 0;

  for (const ev of all) {
    if (!isLanguageFailure(ev)) continue;
    if (new Date(ev.occurredAt).getTime() < cutoff) continue;

    for (const nodeId of ev.targetNodeIds) {
      if (!isGrammarSkill(nodeId) || !hasMicroDrillForSkill(nodeId)) continue;

      failCounts[nodeId] = (failCounts[nodeId] ?? 0) + 1;

      const t = new Date(ev.occurredAt).getTime();
      if (t >= latestFailTime) {
        latestFailTime = t;
        latestFailNode = nodeId;
      }
    }
  }

  if (latestFailNode && (failCounts[latestFailNode] ?? 0) >= 2) {
    return latestFailNode;
  }

  for (const [nodeId, count] of Object.entries(failCounts)) {
    if (count >= 2) return nodeId;
  }

  return null;
}
