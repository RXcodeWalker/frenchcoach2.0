import { z } from 'zod';

// ── Primitive schemas ─────────────────────────────────────────────────────────

const ScoreSchema = z.object({
  comm:    z.number().min(0).max(10),
  know:    z.number().min(0).max(10),
  acc:     z.number().min(0).max(10),
  overall: z.number().min(0).max(10).optional(),
});

const GrammarItemSchema = z.object({
  id:         z.string().optional(),
  themeLabel: z.string().optional(),
  themeDesc:  z.string().optional(),
  msg:        z.string(),
  diagnostic: z.string().optional(),
  correction: z.string(),
  masterTip:  z.string().optional(),
  severity:   z.enum(['major', 'minor']),
  quote:      z.string().optional(),
});

const GrammarSchema = z.object({
  critical: z.array(GrammarItemSchema).default([]),
  polish:   z.array(GrammarItemSchema).default([]),
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
  grammar:   GrammarSchema.or(z.array(z.unknown()).transform(() => ({ critical: [], polish: [] }))),
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
}).passthrough();

export type BackendFeedbackParsed = z.infer<typeof BackendFeedbackSchema>;

// ── Validate at the API boundary ─────────────────────────────────────────────

/**
 * Validates the raw backend response. Returns the parsed result on success.
 * On failure logs a warning and throws — caller should fall back to offline.
 * Only called for online (non-offline) responses so we catch real regressions.
 */
export function validateBackendFeedback(raw: unknown, endpoint: string): BackendFeedbackParsed {
  const result = BackendFeedbackSchema.safeParse(raw);
  if (result.success) return result.data;

  const issues = result.error.issues
    .map(i => `${i.path.join('.')}: ${i.message}`)
    .join('; ');
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
