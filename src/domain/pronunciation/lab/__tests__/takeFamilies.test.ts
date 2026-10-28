import { describe, expect, it } from 'vitest';
import { familiesInTake, takeObservations } from '../takeFamilies';
import { buildLabTake } from '../wordStates';
import { azureWord, scripted } from './labFixtures';

describe('takeFamilies', () => {
  it('collects family evidence per target word, naming the weakest sound', () => {
    const take = buildLabTake('Le vin rouge.', scripted([azureWord('le', 95, { phonemeScores: [95, 95] }), azureWord('vin', 60, { phonemeScores: [90, 35] }), azureWord('rouge', 80, { phonemeScores: [60, 95, 90] })]));
    const families = familiesInTake(take);
    expect(families.get(1)?.weakest).toBe('nasalIn');
    expect(families.get(2)?.weakest).toBe('frenchR');
    expect(takeObservations(take).map((o) => o.family)).toEqual(['nasalIn', 'frenchR', 'uOu']);
  });

  it('uses the neighbouring words: a liaison is never an observation, a verb -ent is silent', () => {
    const take = buildLabTake('Ils parlent.', scripted([azureWord('ils', 90, { phonemeScores: [90, 90] }), azureWord('parlent', 70, { phonemeScores: [90, 90, 50, 90] })]));
    const observations = takeObservations(take);
    expect(observations.map((o) => o.family)).not.toContain('liaison');
    expect(observations).toContainEqual({ family: 'frenchR', accuracy: 50, basis: 'phoneme' });
    expect(observations).toContainEqual({ family: 'silentFinal', accuracy: 70, basis: 'word' });
  });

  it('gives nothing for a refused take', () => {
    const take = buildLabTake('Le vin.', scripted([azureWord('le', 95), azureWord('vin', 30)], { mode: 'freeform' }));
    expect(takeObservations(take)).toEqual([]);
  });
});
