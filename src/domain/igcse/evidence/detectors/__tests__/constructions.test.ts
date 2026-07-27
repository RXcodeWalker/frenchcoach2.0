import { describe, expect, it } from 'vitest';
import { constructionsDetector } from '../constructions';
import { PHASE3_DETECTORS } from '../../framework/phase3Detectors';
import { oneResponseTranscript, runDetectorChain } from './fixtures';

describe('constructions detector', () => {
  it('flags subjunctive missing after il faut que', () => {
    const transcript = oneResponseTranscript('il faut que je vais au marche');
    const observations = runDetectorChain(constructionsDetector, PHASE3_DETECTORS, transcript);
    expect(observations.some((o) => o.type === 'subjunctive_missing')).toBe(true);
  });

  it('flags a broken si-clause hypothetical sequence (si + imparfait immediately followed by future/present, not conditional)', () => {
    const transcript = oneResponseTranscript("si j'avais je vais voyager");
    const observations = runDetectorChain(constructionsDetector, PHASE3_DETECTORS, transcript);
    expect(observations.some((o) => o.type === 'hypothetical_form')).toBe(true);
  });

  it('flags "qui" used where "que" is needed (relative pronoun)', () => {
    const transcript = oneResponseTranscript('le livre qui je lis');
    const observations = runDetectorChain(constructionsDetector, PHASE3_DETECTORS, transcript);
    expect(observations.some((o) => o.type === 'relative_pronoun')).toBe(true);
  });

  it('flags "plus bon"/"plus bien" comparative mistakes', () => {
    const transcript = oneResponseTranscript('ce film est plus bon que le premier');
    const observations = runDetectorChain(constructionsDetector, PHASE3_DETECTORS, transcript);
    expect(observations.some((o) => o.type === 'comparative_form')).toBe(true);
  });

  it('flags "ce" before a vowel/mute-h noun (demonstrative error), even at end of string', () => {
    const transcript = oneResponseTranscript('ce ete');
    const observations = runDetectorChain(constructionsDetector, PHASE3_DETECTORS, transcript);
    expect(observations.some((o) => o.type === 'demonstrative_error')).toBe(true);
  });

  it('flags object pronoun placed after the verb (pronoun placement)', () => {
    const transcript = oneResponseTranscript('je vois le chien tous les jours et je vois le');
    const observations = runDetectorChain(constructionsDetector, PHASE3_DETECTORS, transcript);
    expect(observations.some((o) => o.type === 'pronoun_placement')).toBe(true);
  });

  it('flags malformed interrogation form', () => {
    const transcript = oneResponseTranscript('que est le probleme');
    const observations = runDetectorChain(constructionsDetector, PHASE3_DETECTORS, transcript);
    expect(observations.some((o) => o.type === 'interrogation_form')).toBe(true);
  });

  it('does not flag correct constructions', () => {
    const transcript = oneResponseTranscript(
      "il faut que je sois prêt et si j'avais de l'argent je voyagerais",
    );
    const observations = runDetectorChain(constructionsDetector, PHASE3_DETECTORS, transcript);
    expect(observations).toEqual([]);
  });
});
