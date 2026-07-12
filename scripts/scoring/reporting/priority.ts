/**
 * Generic "sort by disagreement" ranking primitive over DiffRow[] + guardrail
 * trigger counts. Operates only on already-computed diff/guardrail data —
 * never calibration-specific selection rules (that stays calibration/select.ts's
 * job entirely, S8 territory). No aggregate accuracy stats computed here
 * (hard scope redline shared with diff.ts/batchScore.ts).
 */

import type { DiffRow } from '../../../src/domain/igcse/comparison/diff';

export interface SessionPriority {
  sessionId: string;
  /** Max |delta| across the session's diff rows with a teacher mark; null if none have one. */
  maxAbsDelta: number | null;
  guardrailTriggerCount: number;
}

/** Pure. Computes per-session priority signals from already-built diff rows + guardrail triggers. */
export function computeSessionPriorities(
  diffRows: DiffRow[],
  guardrailTriggersBySession: Map<string, string[]>,
): SessionPriority[] {
  const bySession = new Map<string, DiffRow[]>();
  for (const row of diffRows) {
    const existing = bySession.get(row.sessionId) ?? [];
    existing.push(row);
    bySession.set(row.sessionId, existing);
  }

  const sessionIds = new Set<string>([...bySession.keys(), ...guardrailTriggersBySession.keys()]);
  const priorities: SessionPriority[] = [];

  for (const sessionId of sessionIds) {
    const rows = bySession.get(sessionId) ?? [];
    const deltas = rows.map((r) => r.delta).filter((d): d is number => d !== null).map(Math.abs);
    const maxAbsDelta = deltas.length > 0 ? Math.max(...deltas) : null;
    const guardrailTriggerCount = (guardrailTriggersBySession.get(sessionId) ?? []).length;
    priorities.push({ sessionId, maxAbsDelta, guardrailTriggerCount });
  }

  return priorities;
}

export type SortBy = 'delta' | 'guardrails' | 'none';

/**
 * Pure. Ranks sessionIds by the requested strategy — 'delta' (descending
 * maxAbsDelta, sessions with no teacher mark sort last), 'guardrails'
 * (descending guardrailTriggerCount), 'none' (input order unchanged).
 */
export function rankSessions(
  diffRows: DiffRow[],
  guardrailTriggersBySession: Map<string, string[]>,
  sortBy: SortBy,
): string[] {
  const priorities = computeSessionPriorities(diffRows, guardrailTriggersBySession);
  const sessionIds = priorities.map((p) => p.sessionId);

  if (sortBy === 'none') return sessionIds;

  const bySessionId = new Map(priorities.map((p) => [p.sessionId, p]));

  if (sortBy === 'delta') {
    return [...sessionIds].sort((a, b) => {
      const deltaA = bySessionId.get(a)!.maxAbsDelta;
      const deltaB = bySessionId.get(b)!.maxAbsDelta;
      if (deltaA === null && deltaB === null) return 0;
      if (deltaA === null) return 1;
      if (deltaB === null) return -1;
      return deltaB - deltaA;
    });
  }

  return [...sessionIds].sort(
    (a, b) => bySessionId.get(b)!.guardrailTriggerCount - bySessionId.get(a)!.guardrailTriggerCount,
  );
}
