/**
 * judge:check fixture loader — scripts/scoring/judgeCheck/fixtures/*.json.
 *
 * Each fixture is a hand-authored SpeakingTranscript (same 5 role-play tasks
 * and 4 topic questions as judgement/__tests__/fixtures.ts's
 * PRACTICE_TRANSCRIPT, only candidateResponse text varies) plus a
 * description, an optional pre-change baseline (for before/after), and an
 * optional pass-bar `expect` block. Loaded via fs + zod at runtime (not a
 * static import) so this stays a plain JSON file, per the plan.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import type { SpeakingTranscript } from '../../../src/domain/igcse/judgement/types';

const FIXTURE_DIR = path.join(process.cwd(), 'scripts', 'scoring', 'judgeCheck', 'fixtures');

const EvidenceSourceSchema = z.enum(['topic1', 'topic2']);

const RolePlayTaskResponseSchema = z.object({
  taskId: z.string(),
  taskPrompt: z.string(),
  candidateResponse: z.string(),
  partsExpected: z.union([z.literal(1), z.literal(2)]).optional(),
  secondPartPrompt: z.string().optional(),
  repetitions: z.number().optional(),
});

const ConversationTurnSchema = z.object({
  turnId: z.string(),
  questionPrompt: z.string(),
  candidateResponse: z.string(),
  expectedTimeFrame: z.string().optional(),
  candidateResponseDurationS: z.number().optional(),
  inputMode: z.enum(['speech', 'text']).optional(),
});

const TopicConversationSchema = z.object({
  conversationId: EvidenceSourceSchema,
  topicArea: z.enum(['A', 'B', 'C', 'D', 'E']).optional(),
  turns: z.array(ConversationTurnSchema).length(2),
});

const SpeakingTranscriptSchema = z.object({
  contentProvenance: z.enum(['original-practice', 'confidential-internal']),
  rolePlay: z.array(RolePlayTaskResponseSchema).length(5),
  topicConversations: z.tuple([TopicConversationSchema, TopicConversationSchema]),
});

const BaselineSchema = z
  .object({
    total: z.number().optional(),
    rolePlay: z.number().optional(),
    communication: z.number().optional(),
    qualityOfLanguage: z.number().optional(),
    note: z.string().optional(),
  })
  .optional();

const ExpectSchema = z
  .object({
    communicationMin: z.number().optional(),
    communicationMax: z.number().optional(),
    qualityOfLanguageMin: z.number().optional(),
    qualityOfLanguageMax: z.number().optional(),
  })
  .optional();

const JudgeCheckFixtureSchema = z.object({
  id: z.string(),
  description: z.string(),
  transcript: SpeakingTranscriptSchema,
  baseline: BaselineSchema,
  expect: ExpectSchema,
});

export type JudgeCheckExpect = z.infer<typeof ExpectSchema>;
export type JudgeCheckBaseline = z.infer<typeof BaselineSchema>;

export interface JudgeCheckFixture {
  id: string;
  description: string;
  transcript: SpeakingTranscript;
  baseline?: JudgeCheckBaseline;
  expect?: JudgeCheckExpect;
}

/** Fixture ids in a fixed, deliberate order — not directory-listing order. */
export const FIXTURE_IDS = [
  'weak',
  'middling-original',
  'strong',
  'borderline',
  'very-short',
  'split-a-strong-comm-poor-grammar',
  'split-b-accurate-minimal',
  'middling-rewritten',
] as const;

export function loadFixture(id: string): JudgeCheckFixture {
  const raw = fs.readFileSync(path.join(FIXTURE_DIR, `${id}.json`), 'utf8');
  const parsed = JudgeCheckFixtureSchema.parse(JSON.parse(raw));
  if (parsed.id !== id) {
    throw new Error(`Fixture file "${id}.json" declares id "${parsed.id}" — must match the filename`);
  }
  return parsed as JudgeCheckFixture;
}

export function loadAllFixtures(): JudgeCheckFixture[] {
  return FIXTURE_IDS.map(loadFixture);
}
