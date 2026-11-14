import { describe, expect, it } from 'vitest';
import { examPracticeUnlocked, EXAM_UNLOCK_MISSIONS, missionsFinished } from '../examUnlock';

describe('examPracticeUnlocked', () => {
  it('is open on the exam track with no missions', () => {
    expect(examPracticeUnlocked('exam', {})).toBe(true);
  });

  it('unlocks on Junior only after enough finished missions, counting any outcomes', () => {
    expect(examPracticeUnlocked('junior', {})).toBe(false);
    expect(examPracticeUnlocked('junior', { moi: 2, couleurs: 2 })).toBe(false);
    expect(missionsFinished({ moi: 2, couleurs: 3 })).toBe(EXAM_UNLOCK_MISSIONS);
    expect(examPracticeUnlocked('junior', { moi: 2, couleurs: 3 })).toBe(true);
  });
});
