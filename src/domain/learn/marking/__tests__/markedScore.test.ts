import { describe, it, expect } from 'vitest';
import fixture from './fixtures/ladderReply.fam_01_simple_a1.json';
import {
  MARKING_LEVELS,
  isMarkingLevel,
  markedScore,
  markingLevelEarnsBonus,
  resolveMarkedScore,
  type LevelCheck,
} from '../markingLevel';
import type { FeedbackV2 } from '../../../../types';

// The real gate-run reply (fam_01 simple answer, learn-marking §9.1 Ex 1): its
// `scores` are the Exam-standard entry of levelCheck.subScoresByLevel.
const levelCheck = fixture.response.levelCheck as LevelCheck;
const examOverall = (8 + 8 + 10 + 1) / 4; // comm, know, acc, fluency at exam

function feedback(overrides: Partial<FeedbackV2> = {}): Pick<FeedbackV2, 'unscored' | 'scores' | 'levelCheck'> {
  return {
    scores: { overall: Math.round(examOverall * 10) / 10, communication: 8, language: 8, accuracy: 10, fluency: 1 },
    levelCheck,
    ...overrides,
  };
}

describe('markedScore (learn-marking §8.2)', () => {
  it('is computeOverall of the chosen level\'s sub-scores', () => {
    expect(markedScore(feedback(), 'A1')).toBe(8.8); // (10 + 5 + 10 + 10) / 4 = 8.75, half up
    expect(markedScore(feedback(), 'exam')).toBe(6.8);
    expect(markedScore(feedback(), 'B2')).toBe(4);
  });

  it('at Exam standard equals the Exam-standard fb.scores.overall', () => {
    const fb = feedback();
    expect(markedScore(fb, 'exam')).toBe(fb.scores.overall);
  });

  it('falls A1 ≥ A2 ≥ Exam ≥ B1 ≥ B2 on the real reply', () => {
    const scores = MARKING_LEVELS.map((level) => markedScore(feedback(), level) as number);
    for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
  });

  it('without levelCheck shows the Exam score, marked as a fallback (§8.3)', () => {
    const fb = feedback({ levelCheck: undefined });
    for (const level of MARKING_LEVELS) {
      expect(resolveMarkedScore(fb, level)).toEqual({ score: 6.8, level: 'exam', levelMarked: false, earnsBonus: true });
    }
  });

  it('an unscored attempt has no marked score and earns nothing', () => {
    const fb = feedback({ unscored: 'no_llm_offline' });
    expect(resolveMarkedScore(fb, 'B1')).toEqual({ score: null, level: 'B1', levelMarked: false, earnsBonus: false });
  });

  it('below Exam standard earns no bonus; Exam and above do (owner decision 2026-10-18)', () => {
    expect(MARKING_LEVELS.map(markingLevelEarnsBonus)).toEqual([false, false, true, true, true]);
    expect(resolveMarkedScore(feedback(), 'A1').earnsBonus).toBe(false);
    expect(resolveMarkedScore(feedback(), 'B1').earnsBonus).toBe(true);
  });

  it('isMarkingLevel accepts exactly the five levels', () => {
    for (const level of MARKING_LEVELS) expect(isMarkingLevel(level)).toBe(true);
    for (const bad of ['Exam', 'C1', '', null, 3]) expect(isMarkingLevel(bad)).toBe(false);
  });
});
