import { z } from 'zod';

// ── Primitive schemas ─────────────────────────────────────────────────────────

const ScoreSchema = z.object({
  comm:    z.number().min(0).max(10),
  know:    z.number().min(0).max(10),
  acc:     z.number().min(0).max(10),
  overall: z.number().min(0).max(10).optional(),
});

// LLMs frequently emit `null` for a field they consider not-applicable rather
// than omitting the key — `.optional()` alone rejects that. `.nullish()` +
// transform normalises both "absent" and "null" to the same value.
const nullishString = z.string().nullish().transform(v => v ?? undefined);
const nullishStringWithFallback = (fallback: string) =>
  z.string().nullish().transform(v => v ?? fallback);

const GrammarItemSchema = z.object({
  id:         nullishString,
  themeLabel: nullishString,
  themeDesc:  nullishString,
  msg:        nullishStringWithFallback(''),
  diagnostic: nullishString,
  correction: nullishStringWithFallback(''),
  masterTip:  nullishString,
  // A stray/renamed severity value (e.g. the model echoing the array name
  // "critical" instead of "major") shouldn't sink the whole item.
  severity:   z.enum(['major', 'minor']).catch('minor'),
  quote:      nullishString,
});

const GrammarSchema = z.object({
  // .catch (not .default) so a malformed item inside one array doesn't
  // invalidate the whole response — only that array degrades to empty.
  critical: z.array(GrammarItemSchema).catch([]),
  polish:   z.array(GrammarItemSchema).catch([]),
});

const VocabItemSchema = z.object({
  basic:   z.string(),
  upgrade: z.string(),
  example: z.string().optional(),
  nuance:  z.string().optional(),
});

const PronunciationIssueSchema = z.object({
  word:     z.string(),
  problem:  z.string().optional(),
  expected: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'major', 'minor', 'polish', 'strong', 'anglicism']).optional(),
});

const PronunciationSchema = z.object({
  score:  z.number().min(0).max(10).nullable().optional(),
  issues: z.array(PronunciationIssueSchema).default([]),
});

// ── Critical fields — these must be present and valid ────────────────────────

export const BackendFeedbackSchema = z.object({
  // Scores: required, no silent defaults
  scores: z.object({
    comm: z.number().min(0).max(10),
    know: z.number().min(0).max(10),
    acc:  z.number().min(0).max(10),
  }).or(ScoreSchema),
  fluency:   z.number().min(0).max(10).optional(),
  // Grammar section is high-value but non-essential to the rest of the
  // feedback (scores, best_moment, vocabulary, ...) — if the AI mangles it
  // beyond recovery, degrade to empty rather than discarding the whole
  // response and forcing a fallback to the next engine / offline mode.
  grammar:   GrammarSchema
    .or(z.array(z.unknown()).transform(() => ({ critical: [], polish: [] })))
    .catch({ critical: [], polish: [] }),
  cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2']),

  // Coaching text — optional, string only (not arrays or objects)
  best_moment:          z.string().optional(),
  biggest_opportunity:  z.string().optional(),
  improved_answer:      z.string().optional(),
  advanced_answer:      z.string().optional(),
  rephrase:             z.string().nullable().optional(),
  followUpQuestion:     z.string().optional(),
  encouragement:        z.string().optional(),
  igcseLevel:           z.string().optional(),

  // Arrays — default to empty on missing
  vocabulary:      z.array(VocabItemSchema).default([]),
  expansion_ideas: z.array(z.string()).default([]),
  words:           z.array(z.unknown()).default([]),

  // Pronunciation
  pronunciation: PronunciationSchema.optional(),

  // Provider metadata — passthrough
  provider:        z.string().optional(),
  providerStatus:  z.string().optional(),
  providerErrors:  z.array(z.unknown()).optional(),
  wordCount:       z.number().optional(),

  // Learn adaptive-difficulty (docs §9.2/§14) — optional; only meaningful
  // when the request resolved demands server-side. §14: demands_met/
  // demands_missed are telemetry only, never rendered as a verdict — the
  // learner sees exactly one verdict per demand, and it is L1's.
  answered_the_question: z.boolean().optional(),
  demands_met:           z.array(z.string()).optional(),
  demands_missed:        z.array(z.string()).optional(),
  difficulty_fit:        z.enum(['too easy', 'right level', 'too hard']).optional(),
}).passthrough();

export type BackendFeedbackParsed = z.infer<typeof BackendFeedbackSchema>;

// ── Validate at the API boundary ─────────────────────────────────────────────

/**
 * Validates the raw backend response. Returns the parsed result on success.
 * On failure logs a warning and throws — caller should fall back to offline.
 * Only called for online (non-offline) responses so we catch real regressions.
 */
// A failed z.union collapses to one opaque top-level issue ("grammar: Invalid
// input") with the real cause buried in `unionErrors`. Unwrap those so schema
// failures are actually debuggable instead of always printing the same
// meaningless message.
function describeIssue(issue: z.ZodIssue): string {
  if (issue.code === 'invalid_union') {
    const nested = issue.errors
      .flat()
      .map(i => `${i.path.join('.')}: ${i.message}`)
      .join(' | ');
    return `${issue.path.join('.')}: Invalid input (${nested})`;
  }
  return `${issue.path.join('.')}: ${issue.message}`;
}

export function validateBackendFeedback(raw: unknown, endpoint: string): BackendFeedbackParsed {
  const result = BackendFeedbackSchema.safeParse(raw);
  if (result.success) return result.data;

  const issues = result.error.issues.map(describeIssue).join('; ');
  console.warn(`[Schema] ${endpoint} response failed validation — ${issues}`);

  // Re-throw a typed error so apiClient can decide whether to fallback
  throw new SchemaValidationError(`Backend response missing required fields: ${issues}`);
}

export class SchemaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}
