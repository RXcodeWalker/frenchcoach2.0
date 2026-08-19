// ── Stage 5: MAX_EVIDENCE_EVENTS capacity regression (docs C3) ─────────────
// Pure-logic regression: 50 attempts × 3 events/attempt (language + demand +
// behavior/avoidance) still leaves both grammar and demand nodes present
// after appendEvidenceEvents' slice(-MAX_EVIDENCE_EVENTS). Exercises the same
// slice(-N) math coachStorage.appendEvidenceEvents applies, without touching
// localStorage — the cap value itself is the thing under test, not the I/O.

import { describe, it, expect } from 'vitest';
import { MAX_EVIDENCE_EVENTS } from '../coachStorage';
import { reduceEvidenceToBeliefState, projectEvidenceBeliefSnapshot } from '../beliefReducer';
import type { EvidenceEvent } from '../../../types/evidence';

function attemptEvents(index: number): EvidenceEvent[] {
  // Recent, monotonically increasing timestamps (minutes apart) — recencyWeight
  // must not decay these below MIN_RELIABLE_WEIGHT the way a fixed 2026-01-01
  // fixture would once "now" has moved past it.
  const occurredAt = new Date(Date.now() - (500 - index) * 60_000).toISOString();
  const base = {
    learnerId: 'local-user',
    occurredAt,
    sourceSessionId: `sess-${index}`,
    reliability: {
      assessmentConfidence: 0.8,
      taskValidity: 0.9,
      signalQuality: 0.9,
      evaluator: 'llm' as const,
      rubricVersion: 'coach-mvp-1',
    },
    context: { mode: 'practice', timed: false },
  };

  return [
    {
      id: `ev-${index}-lang`,
      ...base,
      evidenceType: 'language',
      targetNodeIds: ['tense_past'],
      observation: {},
      result: { score: 8, success: true, wordCount: 50 },
    },
    {
      id: `ev-${index}-demand`,
      ...base,
      evidenceType: 'language',
      targetNodeIds: ['demand:justify'],
      observation: {},
      result: { success: true },
    },
    {
      id: `ev-${index}-avoid`,
      ...base,
      evidenceType: 'behavior',
      targetNodeIds: ['subjunctive'],
      observation: { avoidanceSkillIds: ['subjunctive'] },
      result: { avoided: true },
    },
  ];
}

describe('MAX_EVIDENCE_EVENTS capacity (Stage 5 regression)', () => {
  it('is 150, preserving the ~50-attempt horizon at up to 3 events/attempt', () => {
    expect(MAX_EVIDENCE_EVENTS).toBe(150);
  });

  it('50 attempts x 3 events still leaves both the grammar node and the demand node present after slice(-MAX_EVIDENCE_EVENTS)', () => {
    const allEvents = Array.from({ length: 50 }, (_, i) => attemptEvents(i)).flat();
    expect(allEvents).toHaveLength(150);

    const capped = allEvents.slice(-MAX_EVIDENCE_EVENTS);
    expect(capped).toHaveLength(150);

    const snapshot = projectEvidenceBeliefSnapshot(reduceEvidenceToBeliefState(capped));
    expect(snapshot.skills['tense_past']).toBeDefined();
    expect(snapshot.demands?.['demand:justify']).toBeDefined();
  });

  it('a log twice the cap still leaves both node types present after truncation (older attempts dropped, not newer)', () => {
    const allEvents = Array.from({ length: 100 }, (_, i) => attemptEvents(i)).flat();
    expect(allEvents).toHaveLength(300);

    const capped = allEvents.slice(-MAX_EVIDENCE_EVENTS);
    expect(capped).toHaveLength(150);
    // Only the most recent 50 attempts' worth of events survive.
    expect(capped[0].id).toBe('ev-50-lang');

    const snapshot = projectEvidenceBeliefSnapshot(reduceEvidenceToBeliefState(capped));
    expect(snapshot.skills['tense_past']).toBeDefined();
    expect(snapshot.demands?.['demand:justify']).toBeDefined();
  });
});
