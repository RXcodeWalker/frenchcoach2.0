/**
 * S4 public surface. scripts/scoring imports from here and nowhere else in envelope/.
 */

export { buildScoringEnvelope } from './buildEnvelope';
export type { BuildScoringEnvelopeInput } from './buildEnvelope';

export { parseScoringEnvelope, ScoringEnvelopeValidationError } from './schema';

export { createFixtureEnvelopeStore } from './providers/fixtureEnvelopeStore';

export type { EnvelopeStore } from './ports';

export type {
  ScoringEnvelope,
  VersionStack,
  LlmProvenance,
  CriterionConfidence,
  Criterion,
  EnvelopeRolePlayTask,
  EnvelopeBandCriterion,
  TranscriptVersion,
  TranscriptConfidenceSummary,
} from './types';
export { ENVELOPE_SCHEMA_VERSION } from './types';
