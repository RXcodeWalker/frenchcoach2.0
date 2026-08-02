// ── Recurring grammar drill detection ─────────────────────────────────────────
// Pure detection over the existing evidence log. No persistence, no lifecycle.
// Returns a skill ID when MicroDrill should be offered.

import type { EvidenceEvent } from '../../types/evidence';
import { SKILL_DEFS } from '../coaching/diagnosticEngine';
import { getRecentEvidence } from './coachStorage';

const WEEK_MS = 7 * 86_400_000;
const FAILURE_SCORE_THRESHOLD = 7;

/** Skills covered by MicroDrillModal's SKILL_TO_THEME mapping. */
export const MICRO_DRILL_SKILL_IDS = new Set([
  'elision',
  'negation',
  'preposition',
  'subjunctive',
  'relative_pron',
  'tense_past',
  'hypothetical',
  'gender',
  'demonstrative',
  'comparative',
  'confusions',
]);

export function isGrammarSkill(nodeId: string): boolean {
  return SKILL_DEFS[nodeId]?.category === 'grammar';
}

export function hasMicroDrillForSkill(skillId: string): boolean {
  return MICRO_DRILL_SKILL_IDS.has(skillId);
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
