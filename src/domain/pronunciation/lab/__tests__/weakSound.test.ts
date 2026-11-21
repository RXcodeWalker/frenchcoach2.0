import { describe, expect, it } from 'vitest';
import { buildLabTake } from '../wordStates';
import { weakSoundInWord, weakestSound } from '../weakSound';
import { azureWord, scripted } from './labFixtures';

describe('weakSoundInWord', () => {
  it('names the letters and family of the lowest lined-up sound', () => {
    // retrouve read as ʁ ə t ʁ u v or ʁ t ʁ u v ə: position 0 is the first r in both.
    expect(weakSoundInWord(azureWord('retrouve', 55, { phonemeScores: [30, 90, 90, 90, 90, 90] }))).toMatchObject({
      word: 'retrouve', letters: 'r', family: 'frenchR',
    });
    expect(weakSoundInWord(azureWord('jardin', 60, { phonemeScores: [90, 90, 40, 90, 90] }))).toMatchObject({ letters: 'r', family: 'frenchR' });
    expect(weakSoundInWord(azureWord('trente', 60, { phonemeScores: [90, 90, 30, 90] }))).toMatchObject({ letters: 'en', family: 'nasalAn' });
  });

  it('says nothing when the readings disagree on where the weak sound is', () => {
    // Position 3 is the second r in one reading and the ou in the other.
    expect(weakSoundInWord(azureWord('retrouve', 55, { phonemeScores: [90, 90, 90, 30, 90, 90] }))).toBeNull();
  });

  it('says nothing when every sound reached Clear, or the phonemes cannot be lined up', () => {
    expect(weakSoundInWord(azureWord('jardin', 85, { phonemeScores: [90, 85, 80, 90, 90] }))).toBeNull();
    expect(weakSoundInWord(azureWord('jardin', 50, { phonemeScores: [40, 90] }))).toBeNull();
    expect(weakSoundInWord(azureWord('jardin', 50))).toBeNull();
    expect(weakSoundInWord(azureWord('jardin', null, { phonemeScores: [90, 90, 40, 90, 90] }))).toBeNull();
    expect(weakSoundInWord(azureWord('jardin', 50, { errorType: 'skipped', phonemeScores: [90, 90, 40, 90, 90] }))).toBeNull();
  });
});

describe('weakestSound', () => {
  it('picks the weakest sound across a drill take, and nothing for a refused take', () => {
    const take = buildLabTake('jardin', scripted([azureWord('jardin', 50, { phonemeScores: [90, 90, 40, 90, 90] })]));
    expect(weakestSound(take)).toMatchObject({ letters: 'r', family: 'frenchR' });
    const refused = buildLabTake('jardin', scripted([azureWord('jardin', 50, { phonemeScores: [90, 90, 40, 90, 90] })], { provider: 'whisper-heuristic' as never }));
    expect(weakestSound(refused)).toBeNull();
  });
});
