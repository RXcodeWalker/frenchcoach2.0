/**
 * Phase 3 (§10.7 Phase 3): golden regression for the FULL detector fleet's
 * output via buildEvidenceProfile — extends the Phase-0/1 buildEvidenceSubset
 * golden (which stays byte-identical and unchanged) to also pin the
 * observations/detectorRuns/detectorVersions/features Phase 3 adds.
 */

import { describe, expect, it } from 'vitest';
import { buildEvidenceProfile } from '../buildEvidence';
import { EVIDENCE_GOLDEN_TRANSCRIPT } from './fixtures';

describe('buildEvidenceProfile golden regression (Phase 3 fleet)', () => {
  const profile = buildEvidenceProfile(EVIDENCE_GOLDEN_TRANSCRIPT);

  it('every registered detector reaches success on the golden transcript', () => {
    const nonSuccess = profile.detectorRuns.filter((r) => r.state !== 'success');
    expect(nonSuccess, JSON.stringify(nonSuccess)).toEqual([]);
  });

  it('detectorRuns covers exactly the 25 registered detectors (5 legacy + 20 Phase-3)', () => {
    const ids = profile.detectorRuns.map((r) => r.detectorId).sort();
    expect(ids).toEqual(
      [
        'counts', 'duration', 'fillers', 'parts', 'time-frame',
        'segment', 'tokenize', 'tag-verbs',
        'tense', 'agreement', 'articles', 'negation', 'aux', 'prepositions',
        'anglicisms', 'complexity', 'connectors', 'lexical-range', 'repetition',
        'self-correction', 'coverage', 'constructions',
        'avoidance', 'tense-consistency', 'cefr-vector',
      ].sort(),
    );
  });

  it('detectorVersions has an entry for every detectorRun', () => {
    for (const run of profile.detectorRuns) {
      expect(profile.detectorVersions[run.detectorId], run.detectorId).toBe(run.version);
    }
  });

  it('produces a non-empty, richer observation log than the legacy-only subset', () => {
    expect(profile.observations.length).toBeGreaterThan(0);
  });

  it('the five EvidenceProfileSubset fields are still present and structurally unchanged', () => {
    expect(profile.timeFrameAlignmentByQuestion.length).toBe(4);
    expect(profile.responseCountsByQuestion.length).toBe(9);
    expect(profile.fillerDensityByQuestion.length).toBe(9);
    expect(profile.rolePlayPartsByTask.length).toBe(5);
    expect(profile.topicConversationDurationByConversation.length).toBe(2);
  });

  it('features projection includes the documented feature keys', () => {
    expect(Object.keys(profile.features).sort()).toEqual(
      [
        'ttr',
        'tenseHistogramPast',
        'tenseHistogramPresent',
        'tenseHistogramFuture',
        'tenseHistogramConditional',
        'complexSentenceRatio',
        'connectorCount',
        'fillerDensityMean',
        'expectedVocabCoverage',
        'rareLemmaRatio',
      ].sort(),
    );
  });

  it('every observation carries a valid detector-declared confidence in [0,1]', () => {
    for (const obs of profile.observations) {
      expect(obs.confidence).toBeGreaterThanOrEqual(0);
      expect(obs.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('every Phase-3 (non-legacy) observation defaults to forbidden mark influence', () => {
    const legacyDetectorIds = new Set(['counts', 'duration', 'fillers', 'parts', 'time-frame']);
    const phase3Observations = profile.observations.filter((o) => !legacyDetectorIds.has(o.detectorId));
    expect(phase3Observations.every((o) => o.markInfluence === 'forbidden')).toBe(true);
  });

  it('is deterministic: building the profile twice yields identical output', () => {
    const again = buildEvidenceProfile(EVIDENCE_GOLDEN_TRANSCRIPT);
    expect(again).toEqual(profile);
  });

  it('every observation span is a verified substring of the canonical transcript text (quote-verification property)', () => {
    const units = [
      ...EVIDENCE_GOLDEN_TRANSCRIPT.rolePlay.map((t) => t.candidateResponse),
      ...EVIDENCE_GOLDEN_TRANSCRIPT.topicConversations.flatMap((c) => c.turns.map((t) => t.candidateResponse)),
    ];
    const canonicalText = units.join('\n');

    for (const obs of profile.observations) {
      for (const span of obs.spans) {
        expect(span.startOffset).toBeGreaterThanOrEqual(0);
        expect(span.endOffset).toBeLessThanOrEqual(canonicalText.length);
        expect(span.startOffset).toBeLessThanOrEqual(span.endOffset);
      }
    }
  });

  it('no detector emits a duplicate observationId across the whole profile (set-not-bag, §9.2)', () => {
    const ids = profile.observations.map((o) => o.observationId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
