/**
 * S1 Layer-2 judgement schema — zod parsing, normalization, and structural validation.
 * Comparison is normalized, NOT exact-byte (see normalizeForMatch / canonicalizeForMatch).
 */

import { z } from 'zod';
import {
  COMMUNICATION,
  IGCSE_0520_SPEAKING,
  QUALITY_OF_LANGUAGE,
  ROLE_PLAY,
} from '../rubric';
import type { MarkBand } from '../rubric';
import type {
  BandAssessment,
  BestFitPlacement,
  EvidenceSource,
  RolePlayTaskMark,
  SpeakingAssessment,
  SpeakingTranscript,
} from './types';

// ── Normalization (sole comparison path) ──────────────────────────────────────
// Moved to ../text/normalize.ts (S3) so STT question-matching uses the identical
// normaliser as this quote-verification guardrail. Re-exported here so existing
// importers of judgement/schema keep working unchanged.
export { normalizeForMatch, canonicalizeForMatch } from '../text/normalize';
import { normalizeForMatch, canonicalizeForMatch } from '../text/normalize';

// ── Errors ────────────────────────────────────────────────────────────────────

export class JudgementValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JudgementValidationError';
  }
}

// ── Zod schemas (judge output shape — totals derived, not trusted) ────────────

const EvidenceSourceSchema = z.enum(['rolePlay', 'topic1', 'topic2']);

const EvidenceSpanSchema = z.object({
  source: EvidenceSourceSchema,
  quote: z.string(),
});

const RolePlayTaskMarkSchema = z.object({
  taskId: z.string(),
  mark: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  descriptorApplied: z.string(),
  evidenceSpans: z.array(EvidenceSpanSchema).min(1),
});

const BandLabelSchema = z.enum(['Poor', 'Weak', 'Satisfactory', 'Good', 'Very good']).nullable();

const BandSchema = z.object({
  min: z.number().int().min(0).max(15),
  max: z.number().int().min(0).max(15),
  label: BandLabelSchema,
});

const BestFitPlacementSchema = z.enum(['convincingly', 'adequately', 'just']);

const BandAssessmentSchema = z.object({
  mark: z.number().int().min(0).max(15),
  band: BandSchema,
  bestFitPlacement: BestFitPlacementSchema,
  descriptorsApplied: z.array(z.string()).min(1),
  justification: z.string().min(1),
  evidenceSpans: z.array(EvidenceSpanSchema).min(1),
});

export const JudgeOutputSchema = z.object({
  rolePlay: z.object({
    tasks: z.array(RolePlayTaskMarkSchema).length(ROLE_PLAY.tasks),
  }),
  communication: BandAssessmentSchema,
  qualityOfLanguage: BandAssessmentSchema,
});

export type JudgeOutput = z.infer<typeof JudgeOutputSchema>;

// ── Canonical descriptor index ────────────────────────────────────────────────

function buildNormalizedDescriptorSet(descriptors: readonly string[]): Set<string> {
  return new Set(descriptors.map((d) => canonicalizeForMatch(d)));
}

function descriptorsEqual(canonical: string, candidate: string): boolean {
  return canonicalizeForMatch(canonical) === canonicalizeForMatch(candidate);
}

const RP_DESCRIPTORS_BY_MARK: Record<0 | 1 | 2, Set<string>> = {
  0: buildNormalizedDescriptorSet(ROLE_PLAY.marks.find((m) => m.mark === 0)!.descriptor),
  1: buildNormalizedDescriptorSet(ROLE_PLAY.marks.find((m) => m.mark === 1)!.descriptor),
  2: buildNormalizedDescriptorSet(ROLE_PLAY.marks.find((m) => m.mark === 2)!.descriptor),
};

function bandDescriptorSet(bands: readonly MarkBand[], min: number, max: number): Set<string> {
  const band = bands.find((b) => b.min === min && b.max === max);
  if (!band) return new Set();
  return buildNormalizedDescriptorSet(band.descriptor);
}

function commDescriptorSet(min: number, max: number): Set<string> {
  return bandDescriptorSet(COMMUNICATION.bands, min, max);
}

function qolDescriptorSet(min: number, max: number): Set<string> {
  return bandDescriptorSet(QUALITY_OF_LANGUAGE.bands, min, max);
}

// ── Transcript corpus per evidence source ─────────────────────────────────────

export function buildEvidenceCorpora(transcript: SpeakingTranscript): Record<EvidenceSource, string> {
  const rolePlayText = transcript.rolePlay.map((t) => t.candidateResponse).join(' ');
  const topic1 = transcript.topicConversations.find((c) => c.conversationId === 'topic1');
  const topic2 = transcript.topicConversations.find((c) => c.conversationId === 'topic2');

  if (!topic1 || !topic2) {
    throw new JudgementValidationError('topicConversations must include topic1 and topic2');
  }

  return {
    rolePlay: rolePlayText,
    topic1: topic1.turns.map((t) => t.candidateResponse).join(' '),
    topic2: topic2.turns.map((t) => t.candidateResponse).join(' '),
  };
}

export function isQuoteGrounded(quote: string, corpus: string): boolean {
  const normalizedQuote = canonicalizeForMatch(quote);
  if (normalizedQuote === '') return false;
  const normalizedCorpus = normalizeForMatch(corpus);
  return normalizedCorpus.includes(normalizedQuote);
}

// ── Placement ↔ mark consistency ──────────────────────────────────────────────

export function expectedMarkForPlacement(
  band: { min: number; max: number },
  placement: BestFitPlacement,
): number {
  const width = band.max - band.min;
  if (width === 0) return band.min;
  if (width === 1) return band.min; // degenerate 2-point band (not in 0520 rubric)
  // Width 3 labeled bands
  switch (placement) {
    case 'convincingly':
      return band.max;
    case 'adequately':
      return band.min + 1;
    case 'just':
      return band.min;
  }
}

// ── Validators ────────────────────────────────────────────────────────────────

function validateRolePlayDescriptor(task: RolePlayTaskMark): void {
  const allowed = RP_DESCRIPTORS_BY_MARK[task.mark];
  const normalized = canonicalizeForMatch(task.descriptorApplied);
  if (!allowed.has(normalized)) {
    throw new JudgementValidationError(
      `Role play task ${task.taskId}: descriptorApplied does not match canonical text for mark ${task.mark}`,
    );
  }
}

function validateBandDescriptors(
  assessment: BandAssessment,
  descriptorSetFn: (min: number, max: number) => Set<string>,
  criterion: string,
): void {
  const allowed = descriptorSetFn(assessment.band.min, assessment.band.max);
  if (allowed.size === 0) {
    throw new JudgementValidationError(
      `${criterion}: band {min:${assessment.band.min}, max:${assessment.band.max}} is not a valid rubric band`,
    );
  }
  for (const desc of assessment.descriptorsApplied) {
    const normalized = canonicalizeForMatch(desc);
    if (!allowed.has(normalized)) {
      throw new JudgementValidationError(
        `${criterion}: descriptorsApplied entry does not match canonical text for band ${assessment.band.min}–${assessment.band.max}`,
      );
    }
  }
}

function validateBandPlacement(assessment: BandAssessment, criterion: string): void {
  if (assessment.mark < assessment.band.min || assessment.mark > assessment.band.max) {
    throw new JudgementValidationError(
      `${criterion}: mark ${assessment.mark} is outside band ${assessment.band.min}–${assessment.band.max}`,
    );
  }
  const expected = expectedMarkForPlacement(assessment.band, assessment.bestFitPlacement);
  if (assessment.mark !== expected) {
    throw new JudgementValidationError(
      `${criterion}: mark ${assessment.mark} inconsistent with bestFitPlacement "${assessment.bestFitPlacement}" (expected ${expected})`,
    );
  }
}

function validateEvidenceSpans(
  spans: { source: EvidenceSource; quote: string }[],
  corpora: Record<EvidenceSource, string>,
  context: string,
): void {
  for (const span of spans) {
    if (!isQuoteGrounded(span.quote, corpora[span.source])) {
      throw new JudgementValidationError(
        `${context}: evidence quote not grounded in transcript (source=${span.source}): "${span.quote}"`,
      );
    }
  }
}

function validateTranscriptStructure(transcript: SpeakingTranscript): void {
  if (transcript.rolePlay.length !== ROLE_PLAY.tasks) {
    throw new JudgementValidationError(
      `rolePlay must contain exactly ${ROLE_PLAY.tasks} tasks, got ${transcript.rolePlay.length}`,
    );
  }
  const ids = transcript.topicConversations.map((c) => c.conversationId);
  if (ids[0] !== 'topic1' || ids[1] !== 'topic2') {
    throw new JudgementValidationError('topicConversations must be [topic1, topic2] in order');
  }
}

/**
 * Parse raw judge JSON, validate structure/traceability/evidence/placement,
 * derive totals, and return a typed SpeakingAssessment.
 */
export function parseAndValidateJudgeOutput(
  raw: unknown,
  transcript: SpeakingTranscript,
): SpeakingAssessment {
  validateTranscriptStructure(transcript);

  const zodResult = JudgeOutputSchema.safeParse(raw);
  if (!zodResult.success) {
    const issues = zodResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new JudgementValidationError(`Judge output failed schema validation: ${issues}`);
  }

  const output = zodResult.data;
  const corpora = buildEvidenceCorpora(transcript);

  // Role play
  const expectedTaskIds = new Set(transcript.rolePlay.map((t) => t.taskId));
  for (const task of output.rolePlay.tasks) {
    if (!expectedTaskIds.has(task.taskId)) {
      throw new JudgementValidationError(`Unexpected role play taskId: ${task.taskId}`);
    }
    validateRolePlayDescriptor(task);
    validateEvidenceSpans(task.evidenceSpans, corpora, `rolePlay task ${task.taskId}`);
  }

  // Communication
  validateBandDescriptors(output.communication, commDescriptorSet, 'communication');
  validateBandPlacement(output.communication, 'communication');
  validateEvidenceSpans(output.communication.evidenceSpans, corpora, 'communication');

  // Quality of Language
  validateBandDescriptors(output.qualityOfLanguage, qolDescriptorSet, 'qualityOfLanguage');
  validateBandPlacement(output.qualityOfLanguage, 'qualityOfLanguage');
  validateEvidenceSpans(output.qualityOfLanguage.evidenceSpans, corpora, 'qualityOfLanguage');

  const rolePlayTotal = output.rolePlay.tasks.reduce((sum, t) => sum + t.mark, 0);
  if (rolePlayTotal < 0 || rolePlayTotal > ROLE_PLAY.maxMarks) {
    throw new JudgementValidationError(`rolePlay total ${rolePlayTotal} out of range`);
  }

  const total = rolePlayTotal + output.communication.mark + output.qualityOfLanguage.mark;
  if (total < 0 || total > IGCSE_0520_SPEAKING.totalMarks) {
    throw new JudgementValidationError(`total ${total} out of range`);
  }

  return {
    rolePlay: { tasks: output.rolePlay.tasks, total: rolePlayTotal },
    communication: output.communication,
    qualityOfLanguage: output.qualityOfLanguage,
    total,
  };
}

/** @internal Exported for tests — descriptor equality helper. */
export { descriptorsEqual };
