/**
 * Toolkit-only index over synthetic.ts fixtures — never edits or duplicates
 * their content, only tags each with the examiner-report failure taxonomy
 * item it targets and which guardrail(s), if any, it is expected to trip.
 * This file is the source of record for the five-item taxonomy below (the
 * document it was originally transcribed from no longer exists) — extend it
 * carefully, and extend synthetic.ts itself alongside it.
 *
 * Two of the five entries below (CLEAN_LONG_TRANSCRIPT-based) pair a
 * SpeakingTranscript with a static SpeakingAssessment, so goldenRegression.ts
 * can run them through buildEvidenceSubset -> runGuardrails ->
 * buildScoringEnvelope directly, with no LLM/judge stub/network call.
 */

import {
  CLEAN_ASSESSMENT,
  CLEAN_LONG_TRANSCRIPT,
  CLEAN_NO_TIMING_TRANSCRIPT,
  FABRICATED_QUOTE_ASSESSMENT,
  LOW_DURATION_TRANSCRIPT,
  LOW_WORD_COUNT_TRANSCRIPT,
} from './synthetic';
import type { SpeakingAssessment, SpeakingTranscript } from '../../judgement/types';
import type { GuardrailId } from '../types';

/**
 * The five-item examiner-report failure taxonomy this manifest tags against.
 * Three of these (misunderstoodInterrogatives, cEstVsCEtait,
 * numberWithoutCurrency) are L1/L2 signals, not guardrail triggers — no
 * synthetic fixture exists for them yet (see synthetic.ts's own extension
 * note), so their manifest entries are commented, not fabricated as []
 * rows with fake fixtures.
 */
export type FailureTaxonomyTag =
  | 'wrongTimeFrameAfterCue'
  | 'misunderstoodInterrogatives'
  | 'droppedSecondPartOfTask'
  | 'cEstVsCEtait'
  | 'numberWithoutCurrency'
  | 'fabricatedEvidence'
  | 'insufficientEvidenceDuration'
  | 'clean';

export interface SyntheticManifestEntry {
  id: string;
  taxonomyTag: FailureTaxonomyTag;
  transcript: SpeakingTranscript;
  /** Present only for fixtures that pair a static (non-LLM) assessment. */
  assessment?: SpeakingAssessment;
  expectedGuardrails: GuardrailId[];
  note: string;
}

export const SYNTHETIC_MANIFEST: SyntheticManifestEntry[] = [
  {
    id: 'clean-long-quote-verification',
    taxonomyTag: 'clean',
    transcript: CLEAN_LONG_TRANSCRIPT,
    assessment: CLEAN_ASSESSMENT,
    expectedGuardrails: [],
    note:
      'Clean transcript + clean assessment — every evidence span is a real ' +
      'substring, response length is sufficient. Must stay silent on both guardrails.',
  },
  {
    id: 'fabricated-quote',
    taxonomyTag: 'fabricatedEvidence',
    transcript: CLEAN_LONG_TRANSCRIPT,
    assessment: FABRICATED_QUOTE_ASSESSMENT,
    expectedGuardrails: ['quote_verification_failed'],
    note: 'Communication evidence span is not a substring of the transcript — proves quote_verification_failed fires.',
  },
  {
    id: 'low-word-count',
    taxonomyTag: 'insufficientEvidenceDuration',
    transcript: LOW_WORD_COUNT_TRANSCRIPT,
    expectedGuardrails: ['insufficient_evidence_duration'],
    note:
      'Combined topic-conversation word count < 200, no turn carries a duration — ' +
      'no assessment paired (evidence/guardrail-only fixture; goldenRegression runs ' +
      'evidence + guardrails but not a full envelope for this entry).',
  },
  {
    id: 'low-duration',
    taxonomyTag: 'insufficientEvidenceDuration',
    transcript: LOW_DURATION_TRANSCRIPT,
    expectedGuardrails: ['insufficient_evidence_duration'],
    note:
      'Word count >= 200 but combined candidateResponseDurationS < 240s — duration ' +
      'sub-check trips, word sub-check does not. No assessment paired.',
  },
  {
    id: 'clean-no-timing',
    taxonomyTag: 'clean',
    transcript: CLEAN_NO_TIMING_TRANSCRIPT,
    expectedGuardrails: [],
    note:
      'Sufficient word count, zero timing data anywhere — must NOT trip ' +
      'insufficient_evidence_duration (absence of timing is not a penalty signal).',
  },
];

/**
 * UNCOVERED_TAXONOMY_ITEMS: the 3 of 5 examiner-report failure modes with no
 * guardrail and no synthetic fixture yet. Recorded here (not silently
 * dropped) so the manifest is an honest map of taxonomy -> coverage, per this
 * toolkit's "never fabricate coverage" constraint.
 */
export const UNCOVERED_TAXONOMY_ITEMS: Array<{ tag: FailureTaxonomyTag; note: string }> = [
  {
    tag: 'misunderstoodInterrogatives',
    note: 'Où/Quand/Combien/Comment answered with wrong information type — L1/L2 signal, no guardrail exists (S6 territory).',
  },
  {
    tag: 'cEstVsCEtait',
    note: "c'est vs c'était in past-tense opinion questions — L2 judgement signal, no guardrail exists (S6 territory).",
  },
  {
    tag: 'numberWithoutCurrency',
    note: 'Number given without any currency unit in a price task — L1/L2 signal, no guardrail exists (S6 territory).',
  },
];
