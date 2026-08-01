// Slice 7b (Phase 1 "stop actively miseducating"): mapBackendFeedback must
// recognize the backend's explicit providerStatus markers
// ("offline_fallback" / "malformed_response") as `unscored` — checked FIRST,
// before and independently of computing `overall` from scores/fluency. This
// specifically covers the case where a malformed response still carries a
// real `fluency` number (fluency and scores are supplied independently by
// the provider — see Slice 7's plan notes), which would otherwise defeat a
// naive `overall === undefined` check.

import { describe, it, expect } from 'vitest';
import { mapBackendFeedback } from '../apiClient';
import { isUnscored, displayScore } from '../../../domain/scoring';

describe('mapBackendFeedback: providerStatus-based unscored detection', () => {
  it('flags providerStatus "offline_fallback" as unscored, even with a real fluency number present', () => {
    const raw = { providerStatus: 'offline_fallback', fluency: 7.5, wordCount: 12 };
    const result = mapBackendFeedback(raw);

    expect(result.unscored).toBe('backend_offline_fallback');
    expect(isUnscored(result)).toBe(true);
    expect(displayScore(result)).toBeNull();
  });

  it('flags providerStatus "malformed_response" as unscored, even with a real fluency number present', () => {
    const raw = { providerStatus: 'malformed_response', fluency: 6.2, wordCount: 20 };
    const result = mapBackendFeedback(raw);

    expect(result.unscored).toBe('backend_malformed_response');
    expect(isUnscored(result)).toBe(true);
    expect(displayScore(result)).toBeNull();
  });

  it('does not flag a normal live response with real scores as unscored', () => {
    const raw = { providerStatus: 'primary', scores: { overall: 7, comm: 7, know: 7, acc: 7 }, wordCount: 30 };
    const result = mapBackendFeedback(raw);

    expect(result.unscored).toBeUndefined();
    expect(isUnscored(result)).toBe(false);
    expect(displayScore(result)).toBe('7.0');
  });

  it('still throws NoScoreInFeedbackError for a genuinely scoreless, non-marked response', async () => {
    const { NoScoreInFeedbackError } = await import('../apiClient');
    const raw = { providerStatus: 'primary', wordCount: 5 };
    expect(() => mapBackendFeedback(raw)).toThrow(NoScoreInFeedbackError);
  });
});
