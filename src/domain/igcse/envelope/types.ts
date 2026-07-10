/**
 * S4 ScoringEnvelope — the immutable, versioned record of one scoring attempt.
 * Field names deliberately mirror 02-scoring-pipeline-architecture.md §3.8,
 * with explicit, documented divergences (see docs/architecture/verification-log.md
 * S4 entry): llm.temperature/seed dropped (current models reject sampling params;
 * no seed param ever existed), predictedGrade omitted (not stubbed — S12's job),
 * stt embedded wholesale (SttMetadata is a strict superset of the doc's 4-field
 * sketch), evidencePromptVersion omitted (L1 is 100% deterministic, no LLM pass
 * to version), per-criterion confidence narrowed to the single literal
 * 'unassessed' (S5 has not built the guardrails that would justify high/medium/low).
 */

import type { EvidenceProfileSubset } from '../evidence/types';
import type { ContentProvenance, EvidenceSpan, SpeakingTranscript } from '../judgement/types';
import type { SttMetadata } from '../stt/types';

export const ENVELOPE_SCHEMA_VERSION = 'envelope-v0.1';

export interface VersionStack {
  /** Versions this envelope's own SHAPE — dispatched on like stt/schema.ts's schemaVersion. */
  envelopeSchemaVersion: string;
  rubricVersion: string;
  /** package.json version (+ short git SHA if available). */
  scoringEngineVersion: string;
  evidenceDetectorVersion: string;
  scoringPromptVersion: string;
  /** Literal sentinel — S5 guardrails not built yet. */
  guardrailsVersion: 'none';
  /** Literal sentinel — S8/S9 calibration not built yet. */
  calibrationVersion: 'none';
  /** Literal sentinel — S12 grade boundaries not built yet. */
  gradeBoundarySeries: 'none';
}

/** Free string, not an enum — e.g. 'gemini', 'groq'. Never fabricated if a provider doesn't expose an equivalent concept. */
export type LlmProviderName = 'gemini' | 'groq';

export interface LlmProvenance {
  provider: LlmProviderName;
  /** Free string, not an enum — e.g. 'gemini-2.5-flash-lite'. */
  model: string;
  /** Anthropic-specific effort knob — absent for providers with no equivalent (Gemini, Groq). */
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  /** Anthropic-specific adaptive thinking — absent for providers with no equivalent (Gemini, Groq). */
  thinking?: { type: 'adaptive' };
  /** Literal 1 in S4 — self-consistency (2 calls) is a Phase B/S9 concern. */
  selfConsistencyRuns: 1;
  /** Audit pointer only — not a determinism guarantee. Never fabricated if the provider doesn't return one. */
  responseId?: string;
}

/** Widens additively once S5 guardrails land (e.g. adds 'high' | 'medium' | 'low'). */
export type CriterionConfidence = 'unassessed';

export type Criterion = 'rolePlayTask' | 'communication' | 'qualityOfLanguage';

export interface EnvelopeRolePlayTask {
  taskId: string;
  mark: 0 | 1 | 2;
  confidence: CriterionConfidence;
  justification: string;
  evidenceSpans: EvidenceSpan[];
}

export interface EnvelopeBandCriterion {
  mark: number;
  band: { min: number; max: number; label: string | null };
  confidence: CriterionConfidence;
  justification: string;
  evidenceSpans: EvidenceSpan[];
}

export interface TranscriptVersion {
  schemaVersion: string;
  assemblerVersion: string;
}

export interface TranscriptConfidenceSummary {
  meanWordConfidence: number;
  lowConfidenceSpanRatio: number;
  lowConfidenceSpanCount: number;
  userCorrected: boolean;
}

export interface ScoringEnvelope {
  /** crypto.randomUUID() — NOT sessionId, so the same session can be scored more than once. */
  attemptId: string;
  sessionId: string;
  scoredAt: string;
  contentProvenance: ContentProvenance;
  versions: VersionStack;
  llm: LlmProvenance;
  /** Embedded wholesale — see file header. */
  stt: SttMetadata;
  transcriptVersion: TranscriptVersion;
  transcriptConfidence: TranscriptConfidenceSummary;
  /** Always [] in S4 — no calibration anchors exist yet. */
  anchorsUsedByCriterion: Record<Criterion, string[]>;

  /**
   * Provenance of the question set the attempt was scored against — feeds both
   * L1 (expectedTimeFrame, partsExpected) and the L2 prompt (mainText), so an
   * unversioned question set breaks the envelope's provenance chain. Optional
   * for backward compatibility with envelope-v0.1 envelopes persisted before
   * this field existed.
   */
  questionSetId?: string;
  /** sha256 of the canonicalized SessionQuestionSet — see SessionTranscript.questionSetHash. */
  questionSetHash?: string;

  rolePlayTasks: EnvelopeRolePlayTask[];
  communication: EnvelopeBandCriterion;
  qualityOfLanguage: EnvelopeBandCriterion;
  total: number;

  /** Always [] in S4 — no guardrails exist yet. */
  guardrailTriggers: string[];
  selfConsistencyOutcomes: { agreement: 'single_run'; rerunsRequested: 0 };

  /** Audit/debug artifact only — never read back in as a scoring input. See replayEnvelope. */
  evidenceProfileSnapshot: EvidenceProfileSubset;
  /** Audit/debug artifact only — never read back in as a scoring input. See replayEnvelope. */
  transcriptSnapshot: SpeakingTranscript;
  regradedFrom?: string;
}
