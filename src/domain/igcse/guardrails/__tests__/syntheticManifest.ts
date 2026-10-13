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
  SOUND_ALIKE_DIFFERENT_WORD,
  SOUND_ALIKE_FALLBACK_TRANSCRIPTION,
  SOUND_ALIKE_FALLBACK_TURN,
  SOUND_ALIKE_INAUDIBLE,
  SOUND_ALIKE_NEAR_AGREEMENT,
  SOUND_ALIKE_NEAR_DISAGREEMENT,
} from './synthetic';
import type { QualityOfLanguageAssessment, SpeakingAssessment, SpeakingTranscript } from '../../judgement/types';
import type { EnvelopeTranscription } from '../../envelope/types';
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
  /** Stage 6 — not an examiner-report item: the owner's sound-alike transcription rules. */
  | 'soundAlikeTranscription'
  | 'clean';

export interface SyntheticManifestEntry {
  id: string;
  taxonomyTag: FailureTaxonomyTag;
  transcript: SpeakingTranscript;
  /** Present only for fixtures that pair a static (non-LLM) assessment. */
  assessment?: SpeakingAssessment;
  /**
   * Stage 6: the static reply to the one QoL re-ask, or 'failed'. Required when
   * the first QoL reply has an error the sound-alike step excuses
   * (goldenRegression.ts throws otherwise), ignored when it has none.
   */
  qolReAsk?: QualityOfLanguageAssessment | 'failed';
  /** Stage 6: the envelope's transcription block. Omitted: no recognition records. */
  transcription?: EnvelopeTranscription;
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
  {
    id: 'sound-alike-inaudible-excused',
    taxonomyTag: 'soundAlikeTranscription',
    ...SOUND_ALIKE_INAUDIBLE,
    expectedGuardrails: ['homophone_error_excused'],
    note:
      'Category A: "il zappent" (both recognisers; the respeller does not know zapper) is listed by the ' +
      'judge, excused as inaudible, and the one re-ask (QoL 7 -> 8) drops it. Excused, resolved.',
  },
  {
    id: 'sound-alike-near-disagreement-excused',
    taxonomyTag: 'soundAlikeTranscription',
    ...SOUND_ALIKE_NEAR_DISAGREEMENT,
    expectedGuardrails: ['homophone_error_excused'],
    note:
      'Category B, recognisers disagree ("j\'ai en chien" vs "j\'ai un chien"): an "Uncertain words" span, ' +
      'the error is excused as ambiguousNear (kept in excusedErrors with pair un~en for the feedback note), re-ask 7 -> 8.',
  },
  {
    id: 'sound-alike-near-agreement-counted',
    taxonomyTag: 'soundAlikeTranscription',
    ...SOUND_ALIKE_NEAR_AGREEMENT,
    expectedGuardrails: [],
    note: 'Category B, both recognisers heard "en": no span, the error counts, no re-ask, QoL stays 7.',
  },
  {
    id: 'sound-alike-different-word-counted',
    taxonomyTag: 'soundAlikeTranscription',
    ...SOUND_ALIKE_DIFFERENT_WORD,
    expectedGuardrails: [],
    note: 'Recognisers heard clearly different words (un / une): a `different` span, audit only — the error counts.',
  },
  {
    id: 'sound-alike-fallback-turn',
    taxonomyTag: 'soundAlikeTranscription',
    ...SOUND_ALIKE_FALLBACK_TURN,
    transcription: SOUND_ALIKE_FALLBACK_TRANSCRIPTION,
    expectedGuardrails: ['homophone_error_excused', 'homophone_penalty_unresolved'],
    note:
      'A live-captions fallback answer (one recogniser): "de pain" -> "du pain" is excused as ambiguousNear; the ' +
      're-ask fails, so the first mark (7) stands without the error and the penalty is flagged unresolved.',
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
