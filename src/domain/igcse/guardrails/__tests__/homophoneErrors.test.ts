import { describe, expect, it } from 'vitest';
import { buildEvidenceProfile } from '../../evidence/buildEvidence';
import { checkHomophoneErrors } from '../homophoneErrors';
import { runGuardrails } from '../runGuardrails';
import { DEFAULT_DURATION_CONFIG } from '../config';
import { CLEAN_ASSESSMENT, CLEAN_LONG_TRANSCRIPT } from './synthetic';
import type { ExcusedQolError, SpeakingAssessment } from '../../judgement/types';

const EXCUSED: ExcusedQolError = {
  source: 'topic1',
  turnId: 'q1',
  quote: "j'ai joué au football",
  kind: 'grammar',
  correction: "j'ai jouer au football",
  reason: 'inaudible',
  nearPairIds: [],
};
const ids = (triggers: { id: string }[]) => triggers.map((t) => t.id);

describe('sound-alike guardrail (advisory)', () => {
  it('is silent when nothing was excused and nothing excusable is counted', () => {
    expect(checkHomophoneErrors(CLEAN_ASSESSMENT, CLEAN_LONG_TRANSCRIPT, undefined)).toEqual([]);
    expect(checkHomophoneErrors(CLEAN_ASSESSMENT, CLEAN_LONG_TRANSCRIPT, { excusedErrors: [], reAsk: 'not-needed', excusedInReAsk: 0 })).toEqual([]);
  });

  it('excused and resolved by the re-ask: homophone_error_excused only', () => {
    const triggers = checkHomophoneErrors(CLEAN_ASSESSMENT, CLEAN_LONG_TRANSCRIPT, {
      excusedErrors: [EXCUSED, { ...EXCUSED, quote: 'mes', correction: 'me', reason: 'ambiguousNear', nearPairIds: ['me~mes'] }],
      reAsk: 'applied',
      excusedInReAsk: 0,
    });
    expect(triggers).toEqual([
      expect.objectContaining({ id: 'homophone_error_excused', inaudible: 1, ambiguousNear: 1 }),
    ]);
  });

  it('a failed re-ask is unresolved: the first mark stands', () => {
    const triggers = checkHomophoneErrors(CLEAN_ASSESSMENT, CLEAN_LONG_TRANSCRIPT, { excusedErrors: [EXCUSED], reAsk: 'failed', excusedInReAsk: 0 });
    expect(ids(triggers)).toEqual(['homophone_error_excused', 'homophone_penalty_unresolved']);
    expect(triggers[1].message).toMatch(/re-ask failed/);
  });

  it('a re-run that listed an excusable error again is unresolved', () => {
    const triggers = checkHomophoneErrors(CLEAN_ASSESSMENT, CLEAN_LONG_TRANSCRIPT, { excusedErrors: [EXCUSED], reAsk: 'applied', excusedInReAsk: 1 });
    expect(ids(triggers)).toEqual(['homophone_error_excused', 'homophone_penalty_unresolved']);
  });

  it('defence in depth: an excusable error still in the counted list is unresolved even with no step record', () => {
    const assessment: SpeakingAssessment = {
      ...CLEAN_ASSESSMENT,
      qualityOfLanguage: { ...CLEAN_ASSESSMENT.qualityOfLanguage, errors: [{ ...EXCUSED }] },
    };
    expect(ids(checkHomophoneErrors(assessment, CLEAN_LONG_TRANSCRIPT, undefined))).toEqual(['homophone_penalty_unresolved']);
  });

  it('never moves a mark: runGuardrails adds the triggers but no adjustment', () => {
    const report = runGuardrails(CLEAN_ASSESSMENT, buildEvidenceProfile(CLEAN_LONG_TRANSCRIPT), CLEAN_LONG_TRANSCRIPT, DEFAULT_DURATION_CONFIG, {
      excusedErrors: [EXCUSED],
      reAsk: 'failed',
      excusedInReAsk: 0,
    });
    expect(ids(report.triggers)).toEqual(['homophone_error_excused', 'homophone_penalty_unresolved']);
    expect(report.adjustments).toEqual([]);
  });
});
