import { describe, expect, it } from 'vitest';
import { buildEvidenceSubset } from '../../evidence/buildEvidence';
import { runGuardrails } from '../runGuardrails';
import {
  CLEAN_ASSESSMENT,
  CLEAN_LONG_TRANSCRIPT,
  FABRICATED_QUOTE_ASSESSMENT,
  LOW_WORD_COUNT_TRANSCRIPT,
} from './synthetic';

describe('runGuardrails', () => {
  it('returns no triggers for fully clean input', () => {
    const evidence = buildEvidenceSubset(CLEAN_LONG_TRANSCRIPT);
    const report = runGuardrails(CLEAN_ASSESSMENT, evidence, CLEAN_LONG_TRANSCRIPT);
    expect(report).toEqual({ triggers: [] });
  });

  it('returns both trigger kinds when both guardrails fire', () => {
    const evidence = buildEvidenceSubset(LOW_WORD_COUNT_TRANSCRIPT);
    const report = runGuardrails(FABRICATED_QUOTE_ASSESSMENT, evidence, LOW_WORD_COUNT_TRANSCRIPT);

    const ids = new Set(report.triggers.map((t) => t.id));
    expect(ids).toEqual(new Set(['insufficient_evidence_duration', 'quote_verification_failed']));
  });
});
