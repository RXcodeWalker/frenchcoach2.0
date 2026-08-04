import { describe, it, expect } from 'vitest';
import type { EvidenceEvent } from '../../../types/evidence';
import { detectRecurringGrammarDrill, hasMicroDrillForSkill } from '../recurringGrammar';
import { SKILL_TO_THEME } from '../../../domain/microDrill/skillThemes';
import { REBUILD_QUESTIONS } from '../../../data/rebuildQuestions';

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

  it('has MicroDrill coverage for confusions (pron_placement routes here)', () => {
    expect(hasMicroDrillForSkill('confusions')).toBe(true);
  });

  it('returns confusions after two failures on that node within a week', () => {
    const events = [makeFailure('confusions', 2), makeFailure('confusions', 0)];
    expect(detectRecurringGrammarDrill(events)).toBe('confusions');
  });
});

describe('hasMicroDrillForSkill — availability derived from real item counts', () => {
  it('every skill advertised in SKILL_TO_THEME resolves to at least 3 distinct on-theme items', () => {
    for (const [skillId, themes] of Object.entries(SKILL_TO_THEME)) {
      const count = REBUILD_QUESTIONS.filter(q => themes.includes(q.theme)).length;
      expect(count, `${skillId} (themes: ${themes.join(', ')}) has only ${count} items`).toBeGreaterThanOrEqual(3);
      expect(hasMicroDrillForSkill(skillId)).toBe(true);
    }
  });

  it('a skill with no SKILL_TO_THEME entry is never offered', () => {
    expect(hasMicroDrillForSkill('contraction')).toBe(false);
    expect(hasMicroDrillForSkill('nonexistent_skill')).toBe(false);
  });
});
