import { z } from 'zod';

// Schemas validate the API/DB shape (snake_case) — the shape admin forms submit
// and the backend persists. The client-side scenario graph validation mirrors
// the authoritative Pydantic validator in backend/models/content.py.

export const contentStatusSchema = z.enum(['draft', 'published', 'archived']);
export type ContentStatus = z.infer<typeof contentStatusSchema>;

// ── Questions ──────────────────────────────────────────────────────────────
export const vocabItemSchema = z.object({
  fr: z.string().min(1, 'French term required'),
  en: z.string().min(1, 'English gloss required'),
});

export const questionSchema = z.object({
  id: z.string().min(1, 'ID required'),
  topic_key: z.string().min(1, 'Topic required'),
  text: z.string().min(1, 'Question text required'),
  hint: z.string().default(''),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  follow_ups: z.array(z.string()).default([]),
  model_answer: z.string().default(''),
  key_vocab: z.array(vocabItemSchema).default([]),
  is_past_paper: z.boolean().default(false),
  year: z.number().int().nullable().optional(),
  paper_code: z.string().nullable().optional(),
  status: contentStatusSchema.default('draft'),
});
export type QuestionInput = z.infer<typeof questionSchema>;

// ── Scenarios ────────────────────────────────────────────────────────────────
// Passthrough: scenario states carry engine-specific extras (e.g. `memory`,
// `capture`) beyond the routing fields — preserve them rather than stripping.
export const scenarioStateSchema = z.object({
  prompt: z.array(z.string()).optional(),
  intents: z.record(z.string(), z.string()).optional(),
  next: z.string().optional(),
  capture: z.string().optional(),
}).passthrough();

/** Structural validation of a scenario state machine. Returns error messages. */
export function validateScenarioGraph(data: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const keys = Object.keys(data);
  if (keys.length === 0) return ['Scenario data must contain at least one state'];
  if (!('start' in data)) return ['Scenario must have a "start" state'];

  const targetsOf = (state: unknown): string[] => {
    if (!state || typeof state !== 'object') return [];
    const s = state as { next?: unknown; intents?: unknown };
    const out: string[] = [];
    if (typeof s.next === 'string') out.push(s.next);
    if (s.intents && typeof s.intents === 'object') {
      for (const v of Object.values(s.intents as Record<string, unknown>)) {
        if (typeof v === 'string') out.push(v);
      }
    }
    return out;
  };

  // Dangling references
  for (const [name, state] of Object.entries(data)) {
    for (const tgt of targetsOf(state)) {
      if (!(tgt in data)) {
        errors.push(`State "${tgt}" is referenced (from "${name}") but not defined`);
      }
    }
  }

  // Unreachable states (BFS from start)
  const reachable = new Set<string>(['start']);
  const queue = ['start'];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const tgt of targetsOf(data[cur])) {
      if (tgt in data && !reachable.has(tgt)) {
        reachable.add(tgt);
        queue.push(tgt);
      }
    }
  }
  const unreachable = keys.filter(k => !reachable.has(k));
  if (unreachable.length) {
    errors.push(`Unreachable states: ${unreachable.join(', ')}`);
  }

  return errors;
}

export const scenarioSchema = z.object({
  id: z.string().min(1, 'ID required'),
  emoji: z.string().default(''),
  title: z.string().min(1, 'Title required'),
  description: z.string().default(''),
  turns: z.number().int().min(1).default(15),
  status: contentStatusSchema.default('draft'),
  data: z.record(z.string(), scenarioStateSchema).superRefine((data, ctx) => {
    for (const message of validateScenarioGraph(data as Record<string, unknown>)) {
      ctx.addIssue({ code: 'custom', message });
    }
  }),
});
export type ScenarioInput = z.infer<typeof scenarioSchema>;
