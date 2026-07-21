/**
 * S11 runtime validator - the single cross-language contract for AuthoredQuestionSet,
 * run at three gates (CI test, seed-to-Supabase, in-app load). Mirrors
 * stt/schema.ts parseSessionTranscript: dispatches on schemaVersion first and
 * rejects unknown/retired versions loudly before structural validation (8.3).
 *
 * Three severities (3.2):
 *  - errors: blocking structural violations - refuse load/seed.
 *  - warnings: lint.ts content-quality smells - surfaced, never blocking.
 *  - info: coverage diagnostics for authors and the future S8 anchor/selection pipeline.
 *
 * Imports only types.ts (+ lint.ts for the warnings bucket) - never the
 * adapter, engine, hash, or any Supabase/HTTP code (component-boundary rule, 7).
 */

import { z } from 'zod';
import { lintAuthoredContent } from './lint';
import { QUESTION_BANK_SCHEMA_VERSION } from './version';
import type { AuthoredQuestion, AuthoredQuestionSet, AuthoredTopic } from './types';

export class QuestionBankValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuestionBankValidationError';
  }
}

export interface Issue {
  code: string;
  message: string;
  path: string;
}

export interface Diagnostic {
  code: string;
  message: string;
  value: number | string;
}

export interface ValidationReport {
  errors: Issue[];
  warnings: Issue[];
  info: Diagnostic[];
}

/**
 * Reserved delimiters the canonicalization spec (hashQuestionSet.ts 3.5.1) depends on:
 * U+001D (group separator), U+001E (record separator), U+001F (unit separator).
 * Built from char codes rather than embedded literally, to keep the source file
 * free of raw control bytes.
 */
const RESERVED_DELIMITERS = new RegExp(`[${String.fromCharCode(0x1d, 0x1e, 0x1f)}]`, 'u');

/** C0 (U+0000-U+001F) and C1 (U+0080-U+009F) control characters - all forbidden. */
const CONTROL_CHARS = new RegExp(
  `[${String.fromCharCode(0x00)}-${String.fromCharCode(0x1f)}${String.fromCharCode(0x80)}-${String.fromCharCode(0x9f)}]`,
  'u',
);

function hasUnpairedSurrogate(s: string): boolean {
  for (let i = 0; i < s.length; i += 1) {
    const code = s.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = s.charCodeAt(i + 1);
      if (Number.isNaN(next) || next < 0xdc00 || next > 0xdfff) return true;
      i += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

/** Canonicalization-safety check (3.2 blocking bucket) - every hashed text field. */
function checkCanonicalizationSafety(value: string, path: string, errors: Issue[]): void {
  if (hasUnpairedSurrogate(value)) {
    errors.push({ code: 'invalid-unicode', message: `${path} contains an unpaired UTF-16 surrogate`, path });
  }
  if (CONTROL_CHARS.test(value)) {
    errors.push({ code: 'control-character', message: `${path} contains a C0/C1 control character`, path });
  }
  if (RESERVED_DELIMITERS.test(value)) {
    errors.push({
      code: 'reserved-delimiter',
      message: `${path} contains a reserved canonicalization delimiter (U+001D/1E/1F)`,
      path,
    });
  }
}

const QUESTION_ID_FORMAT = /^[a-z0-9][a-z0-9-]*$/;
const SET_ID_FORMAT = /^[a-z0-9][a-z0-9-]*$/;

const AuthoredQuestionShapeSchema = z.object({
  questionId: z.string().min(1),
  part: z.enum(['rolePlay', 'topic1', 'topic2']),
  mainText: z.string().min(1),
  alternativeTexts: z.array(z.string()),
  topicArea: z.enum(['A', 'B', 'C', 'D', 'E']).optional(),
  subTopic: z.string().optional(),
  difficulty: z.enum(['foundation', 'core', 'higher']).optional(),
  targetStructures: z
    .array(
      z.enum([
        'present',
        'perfect',
        'imperfect',
        'near-future',
        'simple-future',
        'conditional',
        'opinion',
        'justification',
        'comparison',
        'negation',
      ]),
    )
    .optional(),
  expectedTimeFrame: z.enum(['past', 'present', 'future', 'conditional']).optional(),
  partsExpected: z.union([z.literal(1), z.literal(2)]),
  secondPartText: z.string().optional(),
});

const AuthoredContentShapeSchema = z.object({
  rolePlay: z.object({
    scenarioId: z.string().min(1),
    topicArea: z.enum(['A', 'B', 'C', 'D', 'E']),
    title: z.string().min(1),
    tasks: z.array(AuthoredQuestionShapeSchema),
  }),
  topic1: z.object({
    topicArea: z.enum(['A', 'B', 'C', 'D', 'E']),
    subTopic: z.string(),
    questions: z.array(AuthoredQuestionShapeSchema),
    furtherQuestions: z.tuple([z.string(), z.string()]),
  }),
  topic2: z.object({
    topicArea: z.enum(['A', 'B', 'C', 'D', 'E']),
    subTopic: z.string(),
    questions: z.array(AuthoredQuestionShapeSchema),
    furtherQuestions: z.tuple([z.string(), z.string()]),
  }),
});

const AuthoredQuestionSetShapeSchema = z.object({
  questionSetId: z.string().min(1),
  schemaVersion: z.literal(QUESTION_BANK_SCHEMA_VERSION),
  content: AuthoredContentShapeSchema,
  provenance: z.literal('original-practice'),
  review: z.object({
    status: z.enum(['draft', 'approved']),
    reviewedBy: z.string().optional(),
    reviewedAt: z.string().optional(),
    notes: z.string().optional(),
  }),
});

const HASHED_TEXT_FIELDS: (keyof AuthoredQuestion)[] = ['mainText', 'secondPartText'];

function validateQuestionShapeInvariants(
  q: AuthoredQuestion,
  path: string,
  requireTopicMetadata: boolean,
  errors: Issue[],
): void {
  for (const field of HASHED_TEXT_FIELDS) {
    const value = q[field];
    if (typeof value === 'string') checkCanonicalizationSafety(value, `${path}.${String(field)}`, errors);
  }
  checkCanonicalizationSafety(q.questionId, `${path}.questionId`, errors);
  for (let i = 0; i < q.alternativeTexts.length; i += 1) {
    checkCanonicalizationSafety(q.alternativeTexts[i], `${path}.alternativeTexts[${i}]`, errors);
  }
  if (!QUESTION_ID_FORMAT.test(q.questionId)) {
    errors.push({ code: 'bad-question-id-format', message: `${path}.questionId "${q.questionId}" is not lowercase-kebab`, path });
  }

  if (q.partsExpected === 2) {
    if (!q.secondPartText || q.secondPartText.trim().length === 0) {
      errors.push({ code: 'missing-second-part-text', message: `${path}: partsExpected===2 requires non-empty secondPartText`, path });
    } else if (q.secondPartText === q.mainText) {
      errors.push({ code: 'second-part-equals-main', message: `${path}.secondPartText must differ from mainText`, path });
    }
  } else if (q.secondPartText !== undefined) {
    errors.push({ code: 'unexpected-second-part-text', message: `${path}: partsExpected===1 must not carry secondPartText`, path });
  }

  if (requireTopicMetadata) {
    if (!q.topicArea) errors.push({ code: 'missing-topic-area', message: `${path}: topic question requires topicArea`, path });
    if (!q.subTopic || q.subTopic.trim().length === 0) {
      errors.push({ code: 'missing-sub-topic', message: `${path}: topic question requires non-empty subTopic`, path });
    }
    if (!q.difficulty) errors.push({ code: 'missing-difficulty', message: `${path}: topic question requires difficulty`, path });
    if (!q.targetStructures || q.targetStructures.length === 0) {
      errors.push({ code: 'missing-target-structures', message: `${path}: topic question requires >=1 targetStructures`, path });
    }
    if (!q.expectedTimeFrame) {
      errors.push({ code: 'missing-expected-time-frame', message: `${path}: topic question requires expectedTimeFrame`, path });
    }
  }
}

function validateTopic(topic: AuthoredTopic, topicPath: 'topic1' | 'topic2', errors: Issue[]): void {
  if (topic.questions.length !== 5) {
    errors.push({
      code: 'wrong-question-count',
      message: `${topicPath} must have exactly 5 questions, got ${topic.questions.length}`,
      path: topicPath,
    });
  }
  topic.questions.forEach((q, i) => {
    const path = `${topicPath}.questions[${i}]`;
    if (q.part !== topicPath) {
      errors.push({ code: 'wrong-part', message: `${path}.part must be "${topicPath}", got "${q.part}"`, path });
    }
    validateQuestionShapeInvariants(q, path, true, errors);
    // Q3-Q5 (index 2..4) require >=1 alternative.
    if (i >= 2 && q.alternativeTexts.length === 0) {
      errors.push({ code: 'missing-alternative', message: `${path}: topic Q${i + 1} requires >=1 alternativeText`, path });
    }
    if (q.topicArea !== undefined && q.topicArea !== topic.topicArea) {
      errors.push({
        code: 'topic-area-mismatch',
        message: `${path}.topicArea "${q.topicArea}" disagrees with ${topicPath}.topicArea "${topic.topicArea}"`,
        path,
      });
    }
    if (q.subTopic !== undefined && q.subTopic !== topic.subTopic) {
      errors.push({
        code: 'sub-topic-mismatch',
        message: `${path}.subTopic "${q.subTopic}" disagrees with ${topicPath}.subTopic "${topic.subTopic}"`,
        path,
      });
    }
  });
  checkCanonicalizationSafety(topic.furtherQuestions[0], `${topicPath}.furtherQuestions[0]`, errors);
  checkCanonicalizationSafety(topic.furtherQuestions[1], `${topicPath}.furtherQuestions[1]`, errors);
}

/**
 * Validates one AuthoredQuestionSet and returns the full three-bucket report.
 * Throws only via the schemaVersion dispatch guard (unknown/retired version) -
 * everything else is reported, not thrown. Use parseAuthoredQuestionSet for
 * the throw-on-errors convenience wrapper.
 */
export function validateAuthoredQuestionSet(raw: unknown): ValidationReport {
  if (typeof raw !== 'object' || raw === null || !('schemaVersion' in raw)) {
    throw new QuestionBankValidationError('Missing schemaVersion');
  }
  const version = (raw as { schemaVersion: unknown }).schemaVersion;
  if (version !== QUESTION_BANK_SCHEMA_VERSION) {
    throw new QuestionBankValidationError(
      `Unknown schemaVersion "${String(version)}"; expected "${QUESTION_BANK_SCHEMA_VERSION}"`,
    );
  }

  const shapeResult = AuthoredQuestionSetShapeSchema.safeParse(raw);
  if (!shapeResult.success) {
    const errors: Issue[] = shapeResult.error.issues.map((i) => ({
      code: 'shape',
      message: i.message,
      path: i.path.join('.'),
    }));
    return { errors, warnings: [], info: [] };
  }

  const set = shapeResult.data as AuthoredQuestionSet;
  const errors: Issue[] = [];
  const info: Diagnostic[] = [];

  checkCanonicalizationSafety(set.questionSetId, 'questionSetId', errors);
  if (!SET_ID_FORMAT.test(set.questionSetId)) {
    errors.push({ code: 'bad-set-id-format', message: `questionSetId "${set.questionSetId}" is not lowercase-kebab`, path: 'questionSetId' });
  }

  const { rolePlay, topic1, topic2 } = set.content;

  if (rolePlay.tasks.length !== 5) {
    errors.push({ code: 'wrong-task-count', message: `rolePlay.tasks must have exactly 5 tasks, got ${rolePlay.tasks.length}`, path: 'rolePlay.tasks' });
  }
  rolePlay.tasks.forEach((task, i) => {
    const path = `rolePlay.tasks[${i}]`;
    if (task.part !== 'rolePlay') {
      errors.push({ code: 'wrong-part', message: `${path}.part must be "rolePlay", got "${task.part}"`, path });
    }
    validateQuestionShapeInvariants(task, path, false, errors);
  });

  validateTopic(topic1, 'topic1', errors);
  validateTopic(topic2, 'topic2', errors);

  const allIds = [
    ...rolePlay.tasks.map((t) => t.questionId),
    ...topic1.questions.map((q) => q.questionId),
    ...topic2.questions.map((q) => q.questionId),
  ];
  const seen = new Set<string>();
  for (const id of allIds) {
    if (seen.has(id)) {
      errors.push({ code: 'duplicate-question-id', message: `questionId "${id}" is not unique within the set`, path: 'content' });
    }
    seen.add(id);
  }

  if (set.review.status !== 'approved') {
    errors.push({
      code: 'not-approved',
      message: 'review.status must be "approved" to enter the live registry/seed (unapproved sets may exist only in a draft list)',
      path: 'review.status',
    });
  }

  const warnings: Issue[] = lintAuthoredContent(set.content).map((issue) => ({
    code: issue.code,
    message: issue.message,
    path: issue.path,
  }));

  info.push({ code: 'question-count', message: 'total authored questions (role-play + topics)', value: allIds.length });
  info.push({ code: 'topic-area', message: 'set-level role-play topicArea', value: rolePlay.topicArea });
  const difficultyCounts = new Map<string, number>();
  for (const q of [...topic1.questions, ...topic2.questions]) {
    if (q.difficulty) difficultyCounts.set(q.difficulty, (difficultyCounts.get(q.difficulty) ?? 0) + 1);
  }
  for (const [difficulty, count] of difficultyCounts) {
    info.push({ code: 'difficulty-coverage', message: `questions tagged difficulty=${difficulty}`, value: count });
  }
  const frameCounts = new Map<string, number>();
  for (const q of [...topic1.questions, ...topic2.questions]) {
    if (q.expectedTimeFrame) frameCounts.set(q.expectedTimeFrame, (frameCounts.get(q.expectedTimeFrame) ?? 0) + 1);
  }
  for (const [frame, count] of frameCounts) {
    info.push({ code: 'time-frame-coverage', message: `questions tagged expectedTimeFrame=${frame}`, value: count });
  }
  const structureCounts = new Map<string, number>();
  for (const q of [...topic1.questions, ...topic2.questions]) {
    for (const s of q.targetStructures ?? []) structureCounts.set(s, (structureCounts.get(s) ?? 0) + 1);
  }
  for (const [structure, count] of structureCounts) {
    info.push({ code: 'target-structure-coverage', message: `questions tagged targetStructure=${structure}`, value: count });
  }

  return { errors, warnings, info };
}

/** Throws QuestionBankValidationError when errors is non-empty; otherwise returns the parsed set. */
export function parseAuthoredQuestionSet(raw: unknown): AuthoredQuestionSet {
  const report = validateAuthoredQuestionSet(raw);
  if (report.errors.length > 0) {
    const summary = report.errors.map((e) => `${e.path}: ${e.message}`).join('; ');
    throw new QuestionBankValidationError(`AuthoredQuestionSet failed validation: ${summary}`);
  }
  return raw as AuthoredQuestionSet;
}
