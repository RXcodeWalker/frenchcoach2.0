import { describe, it, expect } from 'vitest';
import type { EvidenceEvent } from '../../../types/evidence';
import { detectRecurringGrammarDrill, hasMicroDrillForSkill } from '../recurringGrammar';

function makeFailure(nodeId: string, daysAgo = 0): EvidenceEvent {
  const occurredAt = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  return {
    id: `ev-${nodeId}-${daysAgo}`,
    learnerId: 'local-user',
    occurredAt,
    sourceSessionId: 'sess-1',
    evidenceType: 'language',
    targetNodeIds: [nodeId],
    observation: {},
    result: { score: 4, success: false },
    reliability: {
      assessmentConfidence: 0.8,
      taskValidity: 0.9,
      signalQuality: 0.9,
      evaluator: 'llm',
      rubricVersion: 'test',
    },
    context: { mode: 'practice', timed: false },
  };
}

describe('detectRecurringGrammarDrill', () => {
  it('returns null with fewer than two failures', () => {
    expect(detectRecurringGrammarDrill([makeFailure('subjunctive')])).toBeNull();
  });

  it('returns skill after two failures on same grammar node within a week', () => {
    const events = [makeFailure('subjunctive', 2), makeFailure('subjunctive', 0)];
    expect(detectRecurringGrammarDrill(events)).toBe('subjunctive');
  });

  it('ignores skills without MicroDrill coverage', () => {
    const events = [makeFailure('contraction', 1), makeFailure('contraction', 0)];
    expect(detectRecurringGrammarDrill(events)).toBeNull();
    expect(hasMicroDrillForSkill('contraction')).toBe(false);
  });

  it('ignores failures older than seven days', () => {
    const events = [makeFailure('negation', 8), makeFailure('negation', 0)];
    expect(detectRecurringGrammarDrill(events)).toBeNull();
  });
});
