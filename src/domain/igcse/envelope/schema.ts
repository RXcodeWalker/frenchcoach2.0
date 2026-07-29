/**
 * S4 ScoringEnvelope zod validation. Dispatches on versions.envelopeSchemaVersion
 * first (mirrors stt/schema.ts's schemaVersion dispatch).
 *
 * C0: the dispatch was an exact-equality check until this change, so every
 * ENVELOPE_SCHEMA_VERSION bump silently orphaned every previously persisted
 * envelope — which is what happened at Phase 1 (v0.1 -> v0.2). The persisted
 * corpus (Supabase `scoring_envelopes`, file store) is the future calibration
 * dataset and must survive bumps, so older versions are now FORWARD-MIGRATED
 * rather than rejected. Unknown/newer versions still throw: that direction
 * stays loud, because a newer writer may mean something different by a field
 * this code already knows.
 *
 * Modelled on services/sync/coachSync.ts::rowToEvent — migrateRow upgrades
 * older rows; newer ones are refused.
 */

import { z } from 'zod';
import { ENVELOPE_SCHEMA_VERSION } from './types';
import type { ScoringEnvelope } from './types';

export class ScoringEnvelopeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScoringEnvelopeValidationError';
  }
}

const EvidenceSpanSchema = z.object({
  source: z.enum(['rolePlay', 'topic1', 'topic2']),
  quote: z.string(),
});

const ConfidenceSchema = z.literal('unassessed');

const VersionStackSchema = z.object({
  envelopeSchemaVersion: z.string(),
  rubricVersion: z.string(),
  scoringEngineVersion: z.string(),
  evidenceDetectorVersion: z.string(),
  scoringPromptVersion: z.string(),
  guardrailsVersion: z.string(),
  calibrationVersion: z.literal('none'),
  gradeBoundarySeries: z.literal('none'),
});

const LlmProvenanceSchema = z.object({
  provider: z.enum(['gemini', 'groq']),
  model: z.string(),
  effort: z.enum(['low', 'medium', 'high', 'xhigh', 'max']).optional(),
  thinking: z.object({ type: z.literal('adaptive') }).optional(),
  selfConsistencyRuns: z.literal(1),
  responseId: z.string().optional(),
});

const CriterionSchema = z.enum(['rolePlayTask', 'communication', 'qualityOfLanguage']);

const RolePlayTaskSchema = z.object({
  taskId: z.string(),
  mark: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  confidence: ConfidenceSchema,
  justification: z.string(),
  evidenceSpans: z.array(EvidenceSpanSchema),
});

const BandCriterionSchema = z.object({
  mark: z.number(),
  band: z.object({ min: z.number(), max: z.number(), label: z.string().nullable() }),
  confidence: ConfidenceSchema,
  justification: z.string(),
  evidenceSpans: z.array(EvidenceSpanSchema),
});

// Loosely validated — these are audit snapshots (evidenceProfileSnapshot,
// transcriptSnapshot) and stt, not re-derived contracts; ScoringEnvelope's own
// TypeScript types are the source of truth for their exact shape.
const ScoringEnvelopeSchema = z.object({
  attemptId: z.string(),
  sessionId: z.string(),
  scoredAt: z.string(),
  contentProvenance: z.enum(['original-practice', 'confidential-internal']),
  versions: VersionStackSchema,
  llm: LlmProvenanceSchema,
  stt: z.record(z.string(), z.unknown()),
  transcriptVersion: z.object({ schemaVersion: z.string(), assemblerVersion: z.string() }),
  transcriptConfidence: z.object({
    meanWordConfidence: z.number(),
    lowConfidenceSpanRatio: z.number(),
    lowConfidenceSpanCount: z.number(),
    userCorrected: z.boolean(),
  }),
  anchorsUsedByCriterion: z.record(CriterionSchema, z.array(z.string())),
  questionSetId: z.string().optional(),
  questionSetHash: z.string().optional(),
  rolePlayTasks: z.array(RolePlayTaskSchema),
  communication: BandCriterionSchema,
  qualityOfLanguage: BandCriterionSchema,
  total: z.number(),
  // Required at v0.3. C0's migrateEnvelope backfills it to [] for every
  // pre-v0.3 envelope, so it is always present by the time zod sees it.
  criterionAdjustments: z.array(
    z.object({
      criterion: z.enum(['communication', 'qualityOfLanguage']),
      proposedMark: z.number(),
      finalMark: z.number(),
    }),
  ),
  guardrailTriggers: z.array(z.string()),
  selfConsistencyOutcomes: z.object({
    agreement: z.literal('single_run'),
    rerunsRequested: z.literal(0),
  }),
  evidenceProfileSnapshot: z.record(z.string(), z.unknown()),
  transcriptSnapshot: z.record(z.string(), z.unknown()),
  regradedFrom: z.string().optional(),
});

/**
 * Every envelope schema version this parser can read, oldest first. An entry is
 * NEVER removed: a version that once shipped may sit in the persisted corpus
 * forever, and a later revert of the code that wrote it must still be able to
 * read those rows back (see the fix plan §5, asymmetric-rollback note).
 */
export const KNOWN_ENVELOPE_SCHEMA_VERSIONS = [
  'envelope-v0.1',
  'envelope-v0.2',
  'envelope-v0.3',
] as const;

export type KnownEnvelopeSchemaVersion = (typeof KNOWN_ENVELOPE_SCHEMA_VERSIONS)[number];

function isKnownVersion(value: unknown): value is KnownEnvelopeSchemaVersion {
  return (KNOWN_ENVELOPE_SCHEMA_VERSIONS as readonly unknown[]).includes(value);
}

/**
 * True when `version` is newer than the version this build writes. The list may
 * legitimately name a version ahead of ENVELOPE_SCHEMA_VERSION (it is
 * append-only and survives a revert of the code that made that version
 * current), and there is no backward migration — so a forward-dated envelope is
 * refused here rather than silently mis-read, mirroring coachSync.ts's
 * `row.schema_version > COACH_SYNC_SCHEMA_VERSION` guard.
 */
function isNewerThanThisBuild(version: KnownEnvelopeSchemaVersion): boolean {
  const known: readonly string[] = KNOWN_ENVELOPE_SCHEMA_VERSIONS;
  return known.indexOf(version) > known.indexOf(ENVELOPE_SCHEMA_VERSION);
}

/**
 * Forward-migrate a raw envelope from `from` to ENVELOPE_SCHEMA_VERSION.
 *
 * Purely additive so far — each step fills in fields the newer shape requires
 * and stamps the new version. Idempotent by construction: an envelope already
 * at the current version is returned unchanged, so migrate(migrate(x)) is
 * migrate(x).
 *
 * v0.1 -> v0.2: questionSetId/questionSetHash became optional-but-known; no
 *   value to backfill (absent stays absent), version stamp only.
 * v0.2 -> v0.3: criterionAdjustments added (Workstream C). A pre-v0.3 envelope
 *   was written by a build with no ceiling application at all, so [] is the
 *   only truthful backfill — it asserts "no clamp was applied", which is
 *   exactly what was the case.
 */
export function migrateEnvelope(raw: unknown, from: KnownEnvelopeSchemaVersion): unknown {
  if (typeof raw !== 'object' || raw === null) return raw;
  if (from === ENVELOPE_SCHEMA_VERSION) return raw;

  const source = raw as Record<string, unknown>;
  const versions = (source.versions ?? {}) as Record<string, unknown>;

  return {
    ...source,
    criterionAdjustments: Array.isArray(source.criterionAdjustments)
      ? source.criterionAdjustments
      : [],
    versions: { ...versions, envelopeSchemaVersion: ENVELOPE_SCHEMA_VERSION },
  };
}

/**
 * Parse and validate a raw value as a ScoringEnvelope. Older known versions are
 * forward-migrated first. Throws ScoringEnvelopeValidationError on an unknown
 * (or newer-than-this-build) envelopeSchemaVersion, or on any zod failure.
 */
export function parseScoringEnvelope(raw: unknown): ScoringEnvelope {
  if (typeof raw !== 'object' || raw === null || !('versions' in raw)) {
    throw new ScoringEnvelopeValidationError('Envelope is missing a versions block');
  }
  const versions = (raw as { versions: unknown }).versions;
  const envelopeSchemaVersion =
    typeof versions === 'object' && versions !== null && 'envelopeSchemaVersion' in versions
      ? (versions as { envelopeSchemaVersion: unknown }).envelopeSchemaVersion
      : undefined;
  if (!isKnownVersion(envelopeSchemaVersion)) {
    throw new ScoringEnvelopeValidationError(
      `Unknown envelopeSchemaVersion "${String(envelopeSchemaVersion)}"; known versions are ${KNOWN_ENVELOPE_SCHEMA_VERSIONS.join(', ')}`,
    );
  }
  if (isNewerThanThisBuild(envelopeSchemaVersion)) {
    throw new ScoringEnvelopeValidationError(
      `envelopeSchemaVersion "${envelopeSchemaVersion}" is newer than this build's "${ENVELOPE_SCHEMA_VERSION}"; refusing to downgrade`,
    );
  }

  const migrated = migrateEnvelope(raw, envelopeSchemaVersion);

  const result = ScoringEnvelopeSchema.safeParse(migrated);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new ScoringEnvelopeValidationError(`ScoringEnvelope failed schema validation: ${issues}`);
  }

  return result.data as unknown as ScoringEnvelope;
}
