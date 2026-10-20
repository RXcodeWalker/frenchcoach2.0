import { describe, it, expect } from 'vitest';
import { buildLevelsReport, formatLevelsReport } from '../levelsReport';
import type { QuestionDemands } from '../types';

function demands(o: Partial<QuestionDemands>): QuestionDemands {
  return {
    cognitiveDemand: 'describe',
    timeFrames: ['present'],
    structures: [],
    responseLoad: 'developed',
    lexicalReach: 'everyday',
    sufficientAnswer: 'x',
    provenance: 'inferred',
    ...o,
  };
}

describe('buildLevelsReport', () => {
  const report = buildLevelsReport([
    { id: 'a', topicKey: 'family', demands: demands({}) },
    { id: 'b', topicKey: 'holidays', demands: demands({ timeFrames: ['past'] }) },
    { id: 'c', topicKey: 'holidays', demands: demands({ cognitiveDemand: 'justify', provenance: 'reviewed' }) },
    { id: 'd', topicKey: 'holidays' },
  ]);

  it('counts levels now and before the floor', () => {
    expect(report.byLevel).toEqual({ A1: 1, A2: 1, B1: 1, B2: 0 });
    expect(report.byLevelBeforeFloor).toEqual({ A1: 2, A2: 0, B1: 1, B2: 0 });
  });

  it('lists only the questions the floor moved', () => {
    expect(report.movedByFloor).toEqual([
      { id: 'b', topicKey: 'holidays', from: 'A1', to: 'A2', scoreBefore: 2, scoreAfter: 3 },
    ]);
  });

  it('reports questions with no demands and non-inferred stretch', () => {
    expect(report.withoutDemands).toEqual(['d']);
    expect(report.trustedStretchByTopic).toEqual({ holidays: 1 });
  });

  it('formats without throwing', () => {
    expect(formatLevelsReport(report)).toContain('Moved by the describe floor');
  });
});
