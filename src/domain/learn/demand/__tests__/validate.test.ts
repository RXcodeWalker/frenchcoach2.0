import { describe, it, expect } from 'vitest';
import { validateLearnDemandsFile, LearnDemandsValidationError } from '../validate';
import type { LearnDemandsEntry, LearnDemandsFile } from '../types';

function entry(overrides: Partial<LearnDemandsEntry> = {}): LearnDemandsEntry {
  return {
    questionId: 'sch_01',
    demands: {
      cognitiveDemand: 'describe',
      timeFrames: ['present'],
      structures: [],
      responseLoad: 'developed',
      lexicalReach: 'everyday',
      sufficientAnswer: 'State the size of the school and one subject you like.',
      provenance: 'authored',
    },
    review: { status: 'approved' },
    ...overrides,
  };
}

function file(entries: LearnDemandsEntry[]): LearnDemandsFile {
  return { schemaVersion: 'learn-demands-v1', topicKey: 'school', entries };
}

describe('validateLearnDemandsFile — schemaVersion dispatch', () => {
  it('throws on missing schemaVersion', () => {
    expect(() => validateLearnDemandsFile({})).toThrow(LearnDemandsValidationError);
  });

  it('throws on unknown schemaVersion', () => {
    expect(() => validateLearnDemandsFile({ schemaVersion: 'learn-demands-v99' })).toThrow(
      LearnDemandsValidationError,
    );
  });

  it('accepts the current schemaVersion with zero entries', () => {
    const report = validateLearnDemandsFile(file([]));
    expect(report.errors).toEqual([]);
  });
});

describe('validateLearnDemandsFile — error rules', () => {
  it('unknown-question-id: fails when the id is not in the known set', () => {
    const report = validateLearnDemandsFile(file([entry()]), {
      knownQuestionIds: new Set(['other_id']),
    });
    expect(report.errors.some((e) => e.code === 'unknown-question-id')).toBe(true);
  });

  it('unknown-question-id: passes when the id is in the known set', () => {
    const report = validateLearnDemandsFile(file([entry()]), {
      knownQuestionIds: new Set(['sch_01']),
    });
    expect(report.errors.some((e) => e.code === 'unknown-question-id')).toBe(false);
  });

  it('missing-time-frame: fails on empty timeFrames', () => {
    const bad = entry({ demands: { ...entry().demands, timeFrames: [] } });
    const report = validateLearnDemandsFile(file([bad]));
    expect(report.errors.some((e) => e.code === 'missing-time-frame')).toBe(true);
  });

  it('missing-time-frame: passes with >=1 timeFrames', () => {
    const report = validateLearnDemandsFile(file([entry()]));
    expect(report.errors.some((e) => e.code === 'missing-time-frame')).toBe(false);
  });

  it('short-load-on-high-demand: fails for justify+short', () => {
    const bad = entry({
      demands: { ...entry().demands, cognitiveDemand: 'justify', responseLoad: 'short' },
    });
    const report = validateLearnDemandsFile(file([bad]));
    expect(report.errors.some((e) => e.code === 'short-load-on-high-demand')).toBe(true);
  });

  it('short-load-on-high-demand: passes for justify+developed', () => {
    const ok = entry({
      demands: { ...entry().demands, cognitiveDemand: 'justify', responseLoad: 'developed' },
    });
    const report = validateLearnDemandsFile(file([ok]));
    expect(report.errors.some((e) => e.code === 'short-load-on-high-demand')).toBe(false);
  });

  it('short-load-on-high-demand: passes for describe+short (describe may be short)', () => {
    const ok = entry({
      demands: { ...entry().demands, cognitiveDemand: 'describe', responseLoad: 'short' },
    });
    const report = validateLearnDemandsFile(file([ok]));
    expect(report.errors.some((e) => e.code === 'short-load-on-high-demand')).toBe(false);
  });

  it('sufficient-answer-too-vague: fails on < 8 words', () => {
    const bad = entry({ demands: { ...entry().demands, sufficientAnswer: 'Say something nice.' } });
    const report = validateLearnDemandsFile(file([bad]));
    expect(report.errors.some((e) => e.code === 'sufficient-answer-too-vague')).toBe(true);
  });

  it('sufficient-answer-too-vague: passes on >= 8 countable words', () => {
    const report = validateLearnDemandsFile(file([entry()]));
    expect(report.errors.some((e) => e.code === 'sufficient-answer-too-vague')).toBe(false);
  });

  it('demand-level-mismatch: fails when a checked-in level disagrees with the derived level', () => {
    // describe/present/developed/everyday derives to A1 (score 2.0); doctor a disagreeing checkedInLevel.
    const bad = entry({ checkedInLevel: 'B2' });
    const report = validateLearnDemandsFile(file([bad]));
    expect(report.errors.some((e) => e.code === 'demand-level-mismatch')).toBe(true);
  });

  it('demand-level-mismatch: passes when no checkedInLevel is present (the normal case)', () => {
    const report = validateLearnDemandsFile(file([entry()]));
    expect(report.errors.some((e) => e.code === 'demand-level-mismatch')).toBe(false);
  });

  it('demand-level-mismatch: passes when the checked-in level agrees with the derived level', () => {
    const ok = entry({ checkedInLevel: 'A1' });
    const report = validateLearnDemandsFile(file([ok]));
    expect(report.errors.some((e) => e.code === 'demand-level-mismatch')).toBe(false);
  });

  it('duplicate-question-id: fails when the same id appears twice', () => {
    const report = validateLearnDemandsFile(file([entry(), entry()]));
    expect(report.errors.some((e) => e.code === 'duplicate-question-id')).toBe(true);
  });

  it('duplicate-question-id: passes with unique ids', () => {
    const report = validateLearnDemandsFile(file([entry(), entry({ questionId: 'sch_02' })]));
    expect(report.errors.some((e) => e.code === 'duplicate-question-id')).toBe(false);
  });

  it('not-approved: fails (unless draft-suppressed by the caller) when status is draft', () => {
    const bad = entry({ review: { status: 'draft' } });
    const report = validateLearnDemandsFile(file([bad]));
    expect(report.errors.some((e) => e.code === 'not-approved')).toBe(true);
  });

  it('not-approved: passes when status is approved', () => {
    const report = validateLearnDemandsFile(file([entry()]));
    expect(report.errors.some((e) => e.code === 'not-approved')).toBe(false);
  });

  it('missing-inference-confidence: fails when provenance=inferred has no inferenceConfidence', () => {
    const bad = entry({ demands: { ...entry().demands, provenance: 'inferred' } });
    const report = validateLearnDemandsFile(file([bad]));
    expect(report.errors.some((e) => e.code === 'missing-inference-confidence')).toBe(true);
  });

  it('missing-inference-confidence: passes when provenance=inferred carries inferenceConfidence', () => {
    const ok = entry({
      demands: { ...entry().demands, provenance: 'inferred', inferenceConfidence: 0.6 },
    });
    const report = validateLearnDemandsFile(file([ok]));
    expect(report.errors.some((e) => e.code === 'missing-inference-confidence')).toBe(false);
  });

  it('unexpected-inference-confidence: fails when provenance!=inferred carries inferenceConfidence', () => {
    const bad = entry({
      demands: { ...entry().demands, provenance: 'authored', inferenceConfidence: 0.6 },
    });
    const report = validateLearnDemandsFile(file([bad]));
    expect(report.errors.some((e) => e.code === 'unexpected-inference-confidence')).toBe(true);
  });

  it('unexpected-inference-confidence: passes when provenance=authored has no inferenceConfidence', () => {
    const report = validateLearnDemandsFile(file([entry()]));
    expect(report.errors.some((e) => e.code === 'unexpected-inference-confidence')).toBe(false);
  });
});

describe('validateLearnDemandsFile — warn rules (from lint.ts, folded in)', () => {
  it('level-not-carried-by-vocabulary: warns when abstract lexical reach is the only signal', () => {
    const q = entry({ demands: { ...entry().demands, lexicalReach: 'abstract' } });
    const report = validateLearnDemandsFile(file([q]));
    expect(report.warnings.some((w) => w.code === 'level-not-carried-by-vocabulary')).toBe(true);
  });

  it('level-not-carried-by-vocabulary: silent when another signal is also present', () => {
    const q = entry({
      demands: { ...entry().demands, lexicalReach: 'abstract', responseLoad: 'extended' },
    });
    const report = validateLearnDemandsFile(file([q]));
    expect(report.warnings.some((w) => w.code === 'level-not-carried-by-vocabulary')).toBe(false);
  });

  it('time-frame-not-cued: warns when a tagged frame has no cue in the question text', () => {
    const q = entry({ demands: { ...entry().demands, timeFrames: ['future'] } });
    const report = validateLearnDemandsFile(file([q]), {
      questionTextById: new Map([['sch_01', 'Parle-moi de ton école.']]),
    });
    expect(report.warnings.some((w) => w.code === 'time-frame-not-cued')).toBe(true);
  });

  it('time-frame-not-cued: silent when the cue is present', () => {
    const q = entry({ demands: { ...entry().demands, timeFrames: ['future'] } });
    const report = validateLearnDemandsFile(file([q]), {
      questionTextById: new Map([['sch_01', "Qu'est-ce que tu vas faire l'année prochaine ?"]]),
    });
    expect(report.warnings.some((w) => w.code === 'time-frame-not-cued')).toBe(false);
  });

  it('time-frame-not-cued: silent when no question text is available to check against', () => {
    const q = entry({ demands: { ...entry().demands, timeFrames: ['future'] } });
    const report = validateLearnDemandsFile(file([q]));
    expect(report.warnings.some((w) => w.code === 'time-frame-not-cued')).toBe(false);
  });

  it('structure-not-elicited: warns when a tagged structure has no matching pattern', () => {
    const q = entry({ demands: { ...entry().demands, structures: ['justification'] } });
    const report = validateLearnDemandsFile(file([q]), {
      questionTextById: new Map([['sch_01', 'Parle-moi de ton école.']]),
    });
    expect(report.warnings.some((w) => w.code === 'structure-not-elicited')).toBe(true);
  });

  it('structure-not-elicited: silent when the structure is textually elicited', () => {
    const q = entry({ demands: { ...entry().demands, structures: ['justification'] } });
    const report = validateLearnDemandsFile(file([q]), {
      questionTextById: new Map([['sch_01', 'Pourquoi aimes-tu ton école ?']]),
    });
    expect(report.warnings.some((w) => w.code === 'structure-not-elicited')).toBe(false);
  });

  it('topic-demand-monotony: warns when a topic covers < 3 distinct cognitiveDemand values', () => {
    const entries = [entry(), entry({ questionId: 'sch_02' })];
    const report = validateLearnDemandsFile(file(entries));
    expect(report.warnings.some((w) => w.code === 'topic-demand-monotony')).toBe(true);
  });

  it('topic-demand-monotony: silent when a topic covers >= 3 distinct cognitiveDemand values', () => {
    const entries = [
      entry({ questionId: 'sch_01', demands: { ...entry().demands, cognitiveDemand: 'describe' } }),
      entry({ questionId: 'sch_02', demands: { ...entry().demands, cognitiveDemand: 'explain' } }),
      entry({ questionId: 'sch_03', demands: { ...entry().demands, cognitiveDemand: 'justify' } }),
    ];
    const report = validateLearnDemandsFile(file(entries));
    expect(report.warnings.some((w) => w.code === 'topic-demand-monotony')).toBe(false);
  });
});
