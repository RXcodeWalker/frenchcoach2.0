/**
 * Runtime validator for LearnDemandsFile — the single contract for
 * src/data/learn/demands/<topic>.json, run by `npm run learn:check`.
 * Mirrors src/data/exam/bank/validate.ts's shape (three severities, schema-
 * version dispatch) but is independent code: src/domain/learn/ must not
 * import from src/data/exam/bank/ or src/domain/igcse/ (CLAUDE.md hard
 * constraint #1; architecture doc §5 guard).
 *
 * Three severities (docs §12):
 *  - errors: blocking structural violations — refuse the item.
 *  - warnings: lint.ts content-quality smells — surfaced, never blocking.
 *  - info: none defined for this validator (parity with exam bank not required).
 */

import { z } from 'zod';
import { deriveDemandLevel } from './deriveDemandLevel';
import { lintLearnDemandsEntry, lintTopicDemandCoverage } from './lint';
import { LEARN_DEMANDS_SCHEMA_VERSION } from './version';
import type { LearnDemandsEntry, LearnDemandsFile } from './types';

export class LearnDemandsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LearnDemandsValidationError';
  }
}

export interface Issue {
  code: string;
  message: string;
  path: string;
}

export interface ValidationReport {
  errors: Issue[];
  warnings: Issue[];
}

const QUESTION_DEMANDS_SHAPE = z.object({
  cognitiveDemand: z.enum(['describe', 'explain', 'justify', 'compare', 'hypothesize']),
  timeFrames: z.array(z.enum(['present', 'past', 'future', 'conditional'])),
  structures: z.array(
    z.enum([
      'opinion',
      'justification',
      'comparison',
      'negation',
      'perfect',
      'imperfect',
      'near-future',
      'simple-future',
      'conditional',
      'subjunctive',
    ]),
  ),
  responseLoad: z.enum(['short', 'developed', 'extended']),
  lexicalReach: z.enum(['everyday', 'topical', 'abstract']),
  sufficientAnswer: z.string().min(1),
  provenance: z.enum(['inferred', 'reviewed', 'authored']),
  inferenceConfidence: z.number().min(0).max(1).optional(),
});

const LEARN_DEMANDS_ENTRY_SHAPE = z.object({
  questionId: z.string().min(1),
  demands: QUESTION_DEMANDS_SHAPE,
  /**
   * Never authored deliberately (§7: "demandLevel is not a field" — authors
   * cannot assert a level). Accepted here only so demand-level-mismatch is a
   * real, testable rule that catches an accidentally hand-added level field
   * disagreeing with the derived one, per docs §16 example F.
   */
  checkedInLevel: z.enum(['A1', 'A2', 'B1', 'B2']).optional(),
  review: z.object({
    status: z.enum(['draft', 'approved']),
    reviewedBy: z.string().optional(),
    reviewedAt: z.string().optional(),
    notes: z.string().optional(),
  }),
});

const LEARN_DEMANDS_FILE_SHAPE = z.object({
  schemaVersion: z.literal(LEARN_DEMANDS_SCHEMA_VERSION),
  topicKey: z.string().min(1),
  entries: z.array(LEARN_DEMANDS_ENTRY_SHAPE),
});

const HIGH_DEMAND_MIN_LOAD: Record<string, string[]> = {
  justify: ['developed', 'extended'],
  compare: ['developed', 'extended'],
  hypothesize: ['developed', 'extended'],
};

const MIN_SUFFICIENT_ANSWER_WORDS = 8;

function validateEntryInvariants(
  entry: LearnDemandsEntry,
  knownQuestionIds: ReadonlySet<string> | undefined,
  errors: Issue[],
): void {
  const path = entry.questionId;

  if (knownQuestionIds && !knownQuestionIds.has(entry.questionId)) {
    errors.push({
      code: 'unknown-question-id',
      message: `${path}: questionId does not exist in the question bank`,
      path,
    });
  }

  if (entry.demands.timeFrames.length === 0) {
    errors.push({ code: 'missing-time-frame', message: `${path}: timeFrames must be non-empty`, path });
  }

  const minLoads = HIGH_DEMAND_MIN_LOAD[entry.demands.cognitiveDemand];
  if (minLoads && !minLoads.includes(entry.demands.responseLoad)) {
    errors.push({
      code: 'short-load-on-high-demand',
      message: `${path}: cognitiveDemand="${entry.demands.cognitiveDemand}" must not have responseLoad="short"`,
      path,
    });
  }

  const answerWordCount = entry.demands.sufficientAnswer.trim().split(/\s+/).filter(Boolean).length;
  if (answerWordCount < MIN_SUFFICIENT_ANSWER_WORDS) {
    errors.push({
      code: 'sufficient-answer-too-vague',
      message: `${path}: sufficientAnswer has ${answerWordCount} word(s), fewer than the ${MIN_SUFFICIENT_ANSWER_WORDS}-word minimum`,
      path,
    });
  }

  if (entry.demands.provenance === 'inferred' && entry.demands.inferenceConfidence === undefined) {
    errors.push({
      code: 'missing-inference-confidence',
      message: `${path}: provenance="inferred" requires inferenceConfidence`,
      path,
    });
  }
  if (entry.demands.provenance !== 'inferred' && entry.demands.inferenceConfidence !== undefined) {
    errors.push({
      code: 'unexpected-inference-confidence',
      message: `${path}: inferenceConfidence is only valid when provenance="inferred"`,
      path,
    });
  }

  if (entry.review.status !== 'approved') {
    errors.push({
      code: 'not-approved',
      message: `${path}: review.status must be "approved" (suppressed by --draft)`,
      path,
    });
  }
}

/**
 * Checked-in `demands.level` is not part of the type (§7: "demandLevel is not
 * a field") — nothing to compare against. This rule exists for a future
 * checked-in-level fixture format; kept here so the rule name/behaviour is
 * pinned by test even though the current entry shape has nothing to disagree.
 */
function checkDemandLevelMismatch(
  entry: LearnDemandsEntry,
  checkedInLevel: string | undefined,
  errors: Issue[],
): void {
  if (checkedInLevel === undefined) return;
  const derived = deriveDemandLevel(entry.demands);
  if (derived !== checkedInLevel) {
    errors.push({
      code: 'demand-level-mismatch',
      message: `${entry.questionId}: checked-in level "${checkedInLevel}" disagrees with derived level "${derived}"`,
      path: entry.questionId,
    });
  }
}

export interface ValidateOptions {
  /** When provided, unknown-question-id is enforced against this set. */
  knownQuestionIds?: ReadonlySet<string>;
  /**
   * questionId -> the question's French wording, for the time-frame-not-cued
   * and structure-not-elicited warn rules (§12). Entries with no text here
   * are skipped for those two rules (nothing to check against).
   */
  questionTextById?: ReadonlyMap<string, string>;
}

/**
 * Validates one LearnDemandsFile and returns the full report. Throws only via
 * the schemaVersion dispatch guard (unknown/retired version) — everything
 * else is reported, not thrown.
 */
export function validateLearnDemandsFile(raw: unknown, options: ValidateOptions = {}): ValidationReport {
  if (typeof raw !== 'object' || raw === null || !('schemaVersion' in raw)) {
    throw new LearnDemandsValidationError('Missing schemaVersion');
  }
  const version = (raw as { schemaVersion: unknown }).schemaVersion;
  if (version !== LEARN_DEMANDS_SCHEMA_VERSION) {
    throw new LearnDemandsValidationError(
      `Unknown schemaVersion "${String(version)}"; expected "${LEARN_DEMANDS_SCHEMA_VERSION}"`,
    );
  }

  const shapeResult = LEARN_DEMANDS_FILE_SHAPE.safeParse(raw);
  if (!shapeResult.success) {
    const errors: Issue[] = shapeResult.error.issues.map((i) => ({
      code: 'shape',
      message: i.message,
      path: i.path.join('.'),
    }));
    return { errors, warnings: [] };
  }

  const file = shapeResult.data as LearnDemandsFile;
  const errors: Issue[] = [];
  const warnings: Issue[] = [];

  const seen = new Set<string>();
  for (const entry of file.entries) {
    if (seen.has(entry.questionId)) {
      errors.push({
        code: 'duplicate-question-id',
        message: `questionId "${entry.questionId}" is not unique within ${file.topicKey}`,
        path: entry.questionId,
      });
    }
    seen.add(entry.questionId);

    validateEntryInvariants(entry, options.knownQuestionIds, errors);
    checkDemandLevelMismatch(entry, entry.checkedInLevel, errors);
  }

  for (const entry of file.entries) {
    const questionText = options.questionTextById?.get(entry.questionId);
    warnings.push(...lintLearnDemandsEntry(entry, questionText));
  }
  warnings.push(...lintTopicDemandCoverage(file.topicKey, file.entries));

  return { errors, warnings };
}

/** Throws LearnDemandsValidationError when errors is non-empty; otherwise returns the parsed file. */
export function parseLearnDemandsFile(raw: unknown, options: ValidateOptions = {}): LearnDemandsFile {
  const report = validateLearnDemandsFile(raw, options);
  if (report.errors.length > 0) {
    const summary = report.errors.map((e) => `${e.path}: ${e.message}`).join('; ');
    throw new LearnDemandsValidationError(`LearnDemandsFile failed validation: ${summary}`);
  }
  return raw as LearnDemandsFile;
}
