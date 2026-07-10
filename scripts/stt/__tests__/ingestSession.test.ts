import { describe, expect, it } from 'vitest';
import { canonicalize, resolveProvider } from '../ingestSession';
import type { RawAsrResult } from '../../../src/domain/igcse/stt/types';

describe('canonicalize', () => {
  it('is content-sensitive for nested objects, not just top-level keys', () => {
    const a = { questionSetId: 'qs1', questions: [{ mainText: 'A' }] };
    const b = { questionSetId: 'qs1', questions: [{ mainText: 'B' }] };

    expect(canonicalize(a)).not.toBe(canonicalize(b));
  });

  it('is stable regardless of key order at any nesting depth', () => {
    const a = { questionSetId: 'qs1', questions: [{ mainText: 'A', partsExpected: 2 }] };
    const b = { questions: [{ partsExpected: 2, mainText: 'A' }], questionSetId: 'qs1' };

    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  it('changes when a deeply nested field changes', () => {
    const a = { questions: [{ nested: { expectedTimeFrame: 'past' } }] };
    const b = { questions: [{ nested: { expectedTimeFrame: 'present' } }] };

    expect(canonicalize(a)).not.toBe(canonicalize(b));
  });
});

describe('resolveProvider', () => {
  const fixtureResult: RawAsrResult = {
    provider: 'fixture',
    model: 'fixture-model',
    modelVersion: 'v0',
    languageCode: 'fr',
    alignmentModel: null,
    diarizationModel: null,
    decodeParamsHash: 'h',
    confidenceSource: 'whisperx-align-score',
    promptBiasedRetries: 0,
    transcribedAt: '2026-07-09T00:00:00.000Z',
    words: [],
  };

  it('returns a fixture provider when --provider fixture and a fixtureResult are given', async () => {
    const provider = resolveProvider(
      { session: 's1', provider: 'fixture', contentProvenance: 'confidential-internal' },
      fixtureResult,
    );

    const result = await provider.transcribe({
      audioPath: '/dev/null',
      languageCode: 'fr',
      diarize: true,
      expectedSpeakers: 2,
    });

    expect(result).toEqual(fixtureResult);
  });

  it('throws when --provider fixture is given without a fixtureResult', () => {
    expect(() =>
      resolveProvider({ session: 's1', provider: 'fixture', contentProvenance: 'confidential-internal' }),
    ).toThrow(/requires a canned RawAsrResult/);
  });
});
