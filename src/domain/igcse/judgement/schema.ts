/**
 * S1 Layer-2 judgement schema — zod parsing, normalization, and structural validation.
 * Comparison is normalized, NOT exact-byte (see normalizeForMatch / canonicalizeForMatch).
 */

import { z } from 'zod';
import {
  COMMUNICATION,
  QUALITY_OF_LANGUAGE,
  ROLE_PLAY,
} from '../rubric';
import type { MarkBand } from '../rubric';
import type {
  BandAssessment,
  BestFitPlacement,
  EvidenceSource,
  QualityOfLanguageAssessment,
  RolePlayCommunicationAssessment,
  RolePlayTaskMark,
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

// P0 step 4: a silent task (nothing said) can only be marked 0 — and has no
// words to quote, so an empty evidenceSpans is allowed for mark 0 only.
// Requiring a span there forced the judge to cite another task's words or
// fail the whole attempt.
const RolePlayTaskMarkSchema = z
  .object({
    taskId: z.string(),
    mark: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    descriptorApplied: z.string(),
    evidenceSpans: z.array(EvidenceSpanSchema),
  })
  .superRefine((task, ctx) => {
    if (task.mark !== 0 && task.evidenceSpans.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['evidenceSpans'],
        message: `mark ${task.mark} requires at least one evidence span`,
      });
    }
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

/** scoring-prompt-v0.6 main call ('rolePlayCommunication'). */
export const RolePlayCommunicationOutputSchema = z.object({
  rolePlay: z.object({
    tasks: z.array(RolePlayTaskMarkSchema).length(ROLE_PLAY.tasks),
  }),
  communication: BandAssessmentSchema,
});

export type RolePlayCommunicationOutput = z.infer<typeof RolePlayCommunicationOutputSchema>;

// QoL is for "performance in both topic conversations" (p.12): its error
// quotes and evidence spans may cite topic1/topic2 only — never role play.
const TopicSourceSchema = z.enum(['topic1', 'topic2']);

const QolErrorSchema = z.object({
  source: TopicSourceSchema,
  turnId: z.string(),
  quote: z.string(),
  kind: z.enum(['grammar', 'vocabulary']),
  correction: z.string(),
});

/** scoring-prompt-v0.6 QoL call ('qualityOfLanguage'). */
export const QualityOfLanguageOutputSchema = BandAssessmentSchema.extend({
  errors: z.array(QolErrorSchema),
  errorFrequency: z.enum([
    'no errors',
    'occasional errors',
    'some errors',
    'frequent errors',
    'rarely accurate',
    'almost always inaccurate',
  ]),
  evidenceSpans: z.array(z.object({ source: TopicSourceSchema, quote: z.string() })).min(1),
});

export type QualityOfLanguageOutput = z.infer<typeof QualityOfLanguageOutputSchema>;

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

/**
 * P0 step 4: role-play evidence is grounded per task — taskId → that task's
 * candidate response only. Cambridge applies the role-play mark scheme
 * separately to each response, so a task can't be credited with another
 * task's words (the pooled `rolePlay` corpus above allowed exactly that).
 */
export function buildRolePlayTaskCorpora(transcript: SpeakingTranscript): Map<string, string> {
  return new Map(transcript.rolePlay.map((t) => [t.taskId, t.candidateResponse]));
}

/**
 * scoring-prompt-v0.6: QoL error quotes are grounded per turn —
 * `${conversationId}:${turnId}` → that turn's candidateResponse only. Same
 * precedent as buildRolePlayTaskCorpora: the pooled topic corpus (answers
 * joined with spaces) would accept a quote straddling two answers, or one
 * attributed to no particular answer. The key needs both fields because turn
 * ids repeat across topics (q1/q2 in both). Examiner text (questionPrompt,
 * examinerSupport) is never in a corpus, so it can never ground a quote.
 */
export function buildTopicTurnCorpora(transcript: SpeakingTranscript): Map<string, string> {
  return new Map(
    transcript.topicConversations.flatMap((conv) =>
      conv.turns.map((turn) => [topicTurnKey(conv.conversationId, turn.turnId), turn.candidateResponse] as const),
    ),
  );
}

export function topicTurnKey(conversationId: 'topic1' | 'topic2', turnId: string): string {
  return `${conversationId}:${turnId}`;
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

/**
 * True when `normalized` is one or more canonical bullets from `allowed`,
 * joined only by punctuation/whitespace. The field holds one string but a
 * mark carries several bullets (RP mark 2 has three), and judges were seen
 * in production to quote them all together — every attempt then failed.
 * Still strict: any word that isn't a canonical bullet is rejected.
 */
function isCanonicalBulletSequence(normalized: string, allowed: Set<string>): boolean {
  let rest = normalized;
  while (rest.length > 0) {
    const bullet = [...allowed].find((b) => rest.startsWith(b));
    if (!bullet) return false;
    rest = canonicalizeForMatch(rest.slice(bullet.length));
  }
  return true;
}

function validateRolePlayDescriptor(task: RolePlayTaskMark): void {
  const allowed = RP_DESCRIPTORS_BY_MARK[task.mark];
  const normalized = canonicalizeForMatch(task.descriptorApplied);
  if (!allowed.has(normalized) && !isCanonicalBulletSequence(normalized, allowed)) {
    // The rejected text is rubric wording, not candidate speech — safe to
    // log, and without it this failure can't be diagnosed from the server log.
    throw new JudgementValidationError(
      `Role play task ${task.taskId}: descriptorApplied does not match canonical text for mark ${task.mark} ` +
        `(got: ${JSON.stringify(task.descriptorApplied.slice(0, 200))})`,
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

/** Role-play task spans ground against that task's own response, whatever their `source`. */
function validateRolePlayTaskSpans(task: RolePlayTaskMark, taskCorpora: Map<string, string>): void {
  const corpus = taskCorpora.get(task.taskId) ?? '';
  for (const span of task.evidenceSpans) {
    if (!isQuoteGrounded(span.quote, corpus)) {
      throw new JudgementValidationError(
        `rolePlay task ${task.taskId}: evidence quote not grounded in that task's response: "${span.quote}"`,
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

function zodIssues(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
}

/**
 * Parse the 'rolePlayCommunication' judge reply: validate structure,
 * traceability, per-task grounding and placement; derive the role-play total.
 */
export function parseRolePlayCommunicationOutput(
  raw: unknown,
  transcript: SpeakingTranscript,
): RolePlayCommunicationAssessment {
  validateTranscriptStructure(transcript);

  const zodResult = RolePlayCommunicationOutputSchema.safeParse(raw);
  if (!zodResult.success) {
    throw new JudgementValidationError(`Judge output failed schema validation: ${zodIssues(zodResult.error)}`);
  }

  const output = zodResult.data;
  const corpora = buildEvidenceCorpora(transcript);
  const taskCorpora = buildRolePlayTaskCorpora(transcript);

  // Role play
  const expectedTaskIds = new Set(transcript.rolePlay.map((t) => t.taskId));
  const seenTaskIds = new Set<string>();
  for (const task of output.rolePlay.tasks) {
    if (!expectedTaskIds.has(task.taskId)) {
      throw new JudgementValidationError(`Unexpected role play taskId: ${task.taskId}`);
    }
    if (seenTaskIds.has(task.taskId)) {
      throw new JudgementValidationError(`Duplicate role play taskId: ${task.taskId}`);
    }
    seenTaskIds.add(task.taskId);
    validateRolePlayDescriptor(task);
    validateRolePlayTaskSpans(task, taskCorpora);
  }

  // Communication
  validateBandDescriptors(output.communication, commDescriptorSet, 'communication');
  validateBandPlacement(output.communication, 'communication');
  validateEvidenceSpans(output.communication.evidenceSpans, corpora, 'communication');

  const rolePlayTotal = output.rolePlay.tasks.reduce((sum, t) => sum + t.mark, 0);
  if (rolePlayTotal < 0 || rolePlayTotal > ROLE_PLAY.maxMarks) {
    throw new JudgementValidationError(`rolePlay total ${rolePlayTotal} out of range`);
  }

  return {
    rolePlay: { tasks: output.rolePlay.tasks, total: rolePlayTotal },
    communication: output.communication,
  };
}

/**
 * Each error must name an existing (source, turnId) and its quote must be
 * grounded in THAT turn's candidate response only. Messages quote only the
 * rejected span (candidate speech already in the envelope snapshot) — never
 * examiner text.
 */
function validateQolErrors(output: QualityOfLanguageOutput, turnCorpora: Map<string, string>): void {
  for (const error of output.errors) {
    const corpus = turnCorpora.get(topicTurnKey(error.source, error.turnId));
    if (corpus === undefined) {
      throw new JudgementValidationError(
        `qualityOfLanguage error: unknown turn (source=${error.source}, turnId=${JSON.stringify(error.turnId)})`,
      );
    }
    if (!isQuoteGrounded(error.quote, corpus)) {
      throw new JudgementValidationError(
        `qualityOfLanguage error quote not grounded in that turn's candidate response (source=${error.source}, turnId=${error.turnId}): "${error.quote}"`,
      );
    }
  }
}

/**
 * Parse the 'qualityOfLanguage' judge reply: validate the error list's
 * per-turn grounding, then the band block exactly as before (descriptors,
 * placement, topic-level evidence grounding). errorFrequency is recorded, not
 * enforced — no mapping from errors to band is applied here.
 */
export function parseQualityOfLanguageOutput(
  raw: unknown,
  transcript: SpeakingTranscript,
): QualityOfLanguageAssessment {
  validateTranscriptStructure(transcript);

  const zodResult = QualityOfLanguageOutputSchema.safeParse(raw);
  if (!zodResult.success) {
    throw new JudgementValidationError(
      `Quality of Language judge output failed schema validation: ${zodIssues(zodResult.error)}`,
    );
  }

  const output = zodResult.data;
  validateQolErrors(output, buildTopicTurnCorpora(transcript));

  validateBandDescriptors(output, qolDescriptorSet, 'qualityOfLanguage');
  validateBandPlacement(output, 'qualityOfLanguage');
  validateEvidenceSpans(output.evidenceSpans, buildEvidenceCorpora(transcript), 'qualityOfLanguage');

  return {
    mark: output.mark,
    band: output.band,
    bestFitPlacement: output.bestFitPlacement,
    descriptorsApplied: output.descriptorsApplied,
    justification: output.justification,
    evidenceSpans: output.evidenceSpans,
    errors: output.errors,
    errorFrequency: output.errorFrequency,
  };
}

/** @internal Exported for tests — descriptor equality helper. */
export { descriptorsEqual };
