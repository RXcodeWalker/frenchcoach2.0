/**
 * `judge:check --feedback` measurements (Phase 3 Batch A). Pure: given a
 * fixture, the envelope built from one real judge run, and the post-marking
 * report generated from it, report — never gate —
 *  - feedback recall against `auditErrors`, separately from judge recall (it
 *    shows whether the display filters ate a real error);
 *  - each matched error's shown correction against the fixture's expected one;
 *  - every error the display filters dropped, and why;
 *  - the inaudible watch-list items the judge or the feedback counted;
 *  - every error the report shows (on `strong`, each is a candidate false positive).
 *
 * Part of the feedback surface (ADR 0009 amendment): it is never imported by
 * scoreAttempt.ts or the /score path.
 */

import { buildScoringEnvelope } from '../../../src/domain/igcse/envelope/buildEnvelope';
import type { ScoringEnvelope } from '../../../src/domain/igcse/envelope/types';
import type { EvidenceProfile } from '../../../src/domain/igcse/evidence/types';
import type { QolError, SpeakingAssessment, SpeakingTranscript } from '../../../src/domain/igcse/judgement/types';
import { canonicalizeForMatch } from '../../../src/domain/igcse/text/normalize';
import { decideQolErrorDisplay, type QolErrorDisplayDecision } from '../../../src/domain/examFeedback/schema';
import type { ExamFeedbackQolError, ExamFeedbackReport } from '../../../src/domain/examFeedback/types';
import type { JudgeCheckFixture } from './fixtures';

interface Located {
  source: 'topic1' | 'topic2';
  turnId: string;
  quote: string;
}

/** Same match rule as judge recall: same turn, one quote contains the other after canonicalisation. */
function sameError(a: Located, b: Located): boolean {
  if (a.source !== b.source || a.turnId !== b.turnId) return false;
  const qa = canonicalizeForMatch(a.quote);
  const qb = canonicalizeForMatch(b.quote);
  return qa.includes(qb) || qb.includes(qa);
}

/** Whole-word containment either way ("je fais du sport" matches "je fais"; "on jouent" does not match "on joue"). */
function correctionMatches(shown: string, expected: string): boolean {
  const words = (t: string) => ` ${canonicalizeForMatch(t).replace(/[^\p{L}\p{N}']+/gu, ' ').trim()} `;
  const s = words(shown);
  const e = words(expected);
  return s.includes(e) || e.includes(s);
}

/**
 * The judge:check fixtures are spoken transcripts that carry no `inputMode`;
 * for the report they are marked 'speech' (absent turns only), so the
 * spoken-only display filter applies as it would in a real Exam Sim attempt.
 */
export function asSpokenTranscript(transcript: SpeakingTranscript): SpeakingTranscript {
  return {
    ...transcript,
    topicConversations: transcript.topicConversations.map((c) => ({
      ...c,
      turns: c.turns.map((t) => ({ ...t, inputMode: t.inputMode ?? ('speech' as const) })),
    })) as SpeakingTranscript['topicConversations'],
  };
}

/** An envelope for one judge:check run — the marks are the run's own; the provenance fields are placeholders. */
export function buildCheckEnvelope(
  fixtureId: string,
  transcript: SpeakingTranscript,
  assessment: SpeakingAssessment,
  evidenceProfile: EvidenceProfile,
): ScoringEnvelope {
  const spoken = asSpokenTranscript(transcript);
  return buildScoringEnvelope({
    attemptId: `judge-check-${fixtureId}`,
    sessionId: `judge-check-${fixtureId}`,
    scoredAt: new Date().toISOString(),
    transcript: spoken,
    assessment,
    evidenceProfile,
    stt: {
      model: 'judge-check-fixture',
      modelVersion: 'n/a',
      provider: 'judge-check',
      languageCode: 'fr',
      alignmentModel: null,
      diarizationModel: null,
      decodeParamsHash: 'n/a',
      confidenceSource: 'whisperx-align-score',
      promptBiasedRetries: 0,
      transcribedAt: new Date().toISOString(),
    },
    transcriptVersion: { schemaVersion: 'judge-check', assemblerVersion: 'judge-check' },
    transcriptQuality: { meanWordConfidence: 1, lowConfidenceSpanRatio: 0, lowConfidenceSpanCount: 0 },
    userCorrected: false,
    llm: { provider: 'gemini', model: 'judge-check', selfConsistencyRuns: 1 },
    qualityOfLanguageLlm: { provider: 'gemini', model: 'judge-check', selfConsistencyRuns: 1 },
    versions: {
      rubricVersion: 'judge-check',
      scoringEngineVersion: 'judge-check',
      evidenceDetectorVersion: 'judge-check',
      scoringPromptVersion: 'judge-check',
      guardrailsVersion: 'judge-check',
    },
    guardrailTriggers: [],
  });
}

export interface FeedbackMeasurement {
  /** Feedback recall: audit errors the REPORT shows (after the display filters). */
  recall: { quote: string; caught: boolean }[];
  /** For each audit error the report shows: the shown correction vs the expected one. */
  corrections: { quote: string; expected: string; shown: string; matches: boolean }[];
  /** Envelope errors the display filters removed. */
  dropped: QolErrorDisplayDecision[];
  /** Watch-list items the judge (envelope) or the feedback (report) counted as errors. */
  inaudibleCounted: { quote: string; note: string; by: 'judge' | 'feedback' }[];
  /** Every QoL error the report shows. */
  reported: ExamFeedbackQolError[];
}

export function measureFeedback(
  fixture: JudgeCheckFixture,
  envelope: ScoringEnvelope,
  report: ExamFeedbackReport,
): FeedbackMeasurement {
  const shown = report.qualityOfLanguage.errors;
  const judgeErrors: QolError[] = envelope.qualityOfLanguage.errors ?? [];

  const recall = (fixture.auditErrors ?? []).map((audit) => ({
    quote: audit.quote,
    caught: shown.some((e) => sameError(e, audit)),
  }));

  const corrections: FeedbackMeasurement['corrections'] = [];
  for (const audit of fixture.auditErrors ?? []) {
    if (!audit.correction) continue;
    const match = shown.find((e) => sameError(e, audit));
    if (!match) continue;
    corrections.push({
      quote: audit.quote,
      expected: audit.correction,
      shown: match.correction,
      matches: correctionMatches(match.correction, audit.correction),
    });
  }

  const inaudibleCounted: FeedbackMeasurement['inaudibleCounted'] = [];
  for (const watch of fixture.inaudibleWatchList ?? []) {
    if (judgeErrors.some((e) => sameError(e, watch))) inaudibleCounted.push({ quote: watch.quote, note: watch.note, by: 'judge' });
    if (shown.some((e) => sameError(e, watch))) inaudibleCounted.push({ quote: watch.quote, note: watch.note, by: 'feedback' });
  }

  return {
    recall,
    corrections,
    dropped: decideQolErrorDisplay(envelope).filter((d) => !d.kept),
    inaudibleCounted,
    reported: shown,
  };
}
