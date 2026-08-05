import { describe, it, expect } from 'vitest';
import {
  assessmentToAttemptRecord,
  segmentHistoryForTrend,
  segmentsForPhonemeTrend,
  type PronunciationAttemptRecord,
} from '../pronunciationHistoryService';
import type { PronunciationAssessment } from '../../../domain/pronunciation/types';

function makeAssessment(overrides: Partial<PronunciationAssessment> = {}): PronunciationAssessment {
  return {
    score: 80,
    transcript: 'vin',
    issues: [],
    words: [],
    provider: 'azure',
    subScores: { accuracy: 80, fluency: 80, completeness: 100, prosody: null },
    couldNotAssess: false,
    couldNotAssessReason: null,
    mode: 'scripted',
    locale: 'fr-FR',
    assessorVersion: 'pronunciation-v3',
    ...overrides,
  };
}

function makeRecord(overrides: Partial<PronunciationAttemptRecord>): PronunciationAttemptRecord {
  return {
    id: 'a1',
    createdAt: '2026-01-01T00:00:00.000Z',
    mode: 'scripted',
    locale: 'fr-FR',
    provider: 'azure',
    assessorVersion: 'pronunciation-v3',
    score: 80,
    couldNotAssess: false,
    confidenceOverall: 0.9,
    referenceText: 'vin',
    transcript: 'vin',
    ...overrides,
  };
}

describe('assessmentToAttemptRecord', () => {
  it('maps an assessment to a record, truncating text fields', () => {
    const assessment = makeAssessment({ transcript: 'x'.repeat(3000) });
    const record = assessmentToAttemptRecord('id-1', 'y'.repeat(1000), assessment);

    expect(record.id).toBe('id-1');
    expect(record.score).toBe(80);
    expect(record.provider).toBe('azure');
    expect(record.assessorVersion).toBe('pronunciation-v3');
    expect(record.referenceText.length).toBe(500);
    expect(record.transcript.length).toBe(2000);
  });

  it('never fabricates a score: couldNotAssess carries score null through', () => {
    const assessment = makeAssessment({ score: null, couldNotAssess: true });
    const record = assessmentToAttemptRecord('id-2', 'vin', assessment);

    expect(record.score).toBeNull();
    expect(record.couldNotAssess).toBe(true);
  });
});

describe('segmentHistoryForTrend', () => {
  it('keeps one (assessorVersion, provider) pair as a single segment', () => {
    const records = [
      makeRecord({ id: 'a', createdAt: '2026-01-01T00:00:00.000Z' }),
      makeRecord({ id: 'b', createdAt: '2026-01-02T00:00:00.000Z' }),
    ];
    const segments = segmentHistoryForTrend(records);

    expect(segments).toHaveLength(1);
    expect(segments[0].attempts.map(a => a.id)).toEqual(['a', 'b']);
  });

  it('breaks into a new segment at an assessorVersion boundary rather than interpolating', () => {
    const records = [
      makeRecord({ id: 'v2-a', createdAt: '2026-01-01T00:00:00.000Z', assessorVersion: 'pronunciation-v2', provider: 'whisper-heuristic' }),
      makeRecord({ id: 'v2-b', createdAt: '2026-01-02T00:00:00.000Z', assessorVersion: 'pronunciation-v2', provider: 'whisper-heuristic' }),
      makeRecord({ id: 'v3-a', createdAt: '2026-01-03T00:00:00.000Z', assessorVersion: 'pronunciation-v3', provider: 'azure' }),
    ];
    const segments = segmentHistoryForTrend(records);

    expect(segments).toHaveLength(2);
    expect(segments[0].assessorVersion).toBe('pronunciation-v2');
    expect(segments[0].attempts.map(a => a.id)).toEqual(['v2-a', 'v2-b']);
    expect(segments[1].assessorVersion).toBe('pronunciation-v3');
    expect(segments[1].attempts.map(a => a.id)).toEqual(['v3-a']);
  });

  it('breaks into a new segment on provider change even with the same assessorVersion', () => {
    const records = [
      makeRecord({ id: 'a', createdAt: '2026-01-01T00:00:00.000Z', provider: 'azure' }),
      makeRecord({ id: 'b', createdAt: '2026-01-02T00:00:00.000Z', provider: 'whisper-heuristic' }),
    ];
    const segments = segmentHistoryForTrend(records);

    expect(segments).toHaveLength(2);
  });

  it('sorts unordered input chronologically before segmenting', () => {
    const records = [
      makeRecord({ id: 'later', createdAt: '2026-01-05T00:00:00.000Z' }),
      makeRecord({ id: 'earlier', createdAt: '2026-01-01T00:00:00.000Z' }),
    ];
    const segments = segmentHistoryForTrend(records);

    expect(segments).toHaveLength(1);
    expect(segments[0].attempts.map(a => a.id)).toEqual(['earlier', 'later']);
  });
});

describe('segmentsForPhonemeTrend', () => {
  it('excludes whisper-heuristic segments entirely, not just from the average', () => {
    const segments = segmentHistoryForTrend([
      makeRecord({ id: 'a', createdAt: '2026-01-01T00:00:00.000Z', provider: 'whisper-heuristic', assessorVersion: 'pronunciation-v2' }),
      makeRecord({ id: 'b', createdAt: '2026-01-02T00:00:00.000Z', provider: 'azure', assessorVersion: 'pronunciation-v3' }),
    ]);

    const phonemeEligible = segmentsForPhonemeTrend(segments);

    expect(phonemeEligible).toHaveLength(1);
    expect(phonemeEligible[0].provider).toBe('azure');
  });
});
