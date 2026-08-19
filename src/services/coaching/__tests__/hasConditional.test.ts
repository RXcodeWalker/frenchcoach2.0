import { describe, it, expect } from 'vitest';
import { hasConditional, detectAvoidance } from '../diagnosticEngine';
import type { Question } from '../../../types';

function question(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q1',
    topicKey: 'topic',
    text: 'Si tu pouvais voyager, où irais-tu ?',
    hint: '',
    difficulty: 2,
    followUps: [],
    modelAnswer: '',
    keyVocab: [],
    ...overrides,
  };
}

describe('hasConditional — Stage 4b fix', () => {
  it('matches irregular-stem conditional forms that the old \\b-before-suffix regex missed', () => {
    expect(hasConditional("j'irais en France")).toBe(true);
    expect(hasConditional('nous ferions un voyage')).toBe(true);
    expect(hasConditional('ce serait formidable')).toBe(true);
  });

  it('still matches the regular -er conditional forms it already caught', () => {
    expect(hasConditional('je voudrais partir')).toBe(true);
    expect(hasConditional('elles aimeraient venir')).toBe(true);
  });

  it('does not match a transcript with no conditional mood at all', () => {
    expect(hasConditional("je vais à l'école tous les jours")).toBe(false);
  });

  it('does not false-positive on common present-tense/adverb words sharing the suffix', () => {
    expect(hasConditional('je fais du sport et je vais au marché')).toBe(false);
    expect(hasConditional("je ne sais pas mais je n'y suis jamais allé")).toBe(false);
  });
});

describe('detectAvoidance — hypothetical signal now uses the fixed hasConditional', () => {
  it('no longer flags a hypothetical-question answer that uses "j\'irais" (previously a false positive)', () => {
    const q = question({ text: 'Si tu pouvais voyager, où irais-tu ?' });
    const transcript =
      "Si je pouvais voyager n'importe où, j'irais au Japon parce que la culture m'intéresse beaucoup et je voudrais découvrir Tokyo.";
    const signals = detectAvoidance(transcript, q);
    expect(signals.find((s) => s.skillId === 'hypothetical')).toBeUndefined();
  });

  it('still flags a hypothetical question answered entirely in the present tense', () => {
    const q = question({ text: 'Si tu pouvais voyager, où irais-tu ?' });
    const transcript = 'Je voyage beaucoup et je visite plein de pays chaque année avec ma famille.';
    const signals = detectAvoidance(transcript, q);
    expect(signals.find((s) => s.skillId === 'hypothetical')).toBeDefined();
  });
});
