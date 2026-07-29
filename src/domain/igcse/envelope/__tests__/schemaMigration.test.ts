/**
 * C0 — persisted envelopes are forward-migrated, never rejected.
 *
 * parseScoringEnvelope dispatched on EXACT version equality until this change,
 * so every ENVELOPE_SCHEMA_VERSION bump orphaned the whole persisted corpus
 * (this silently happened at Phase 1, v0.1 -> v0.2). These tests pin the three
 * properties that make the corpus survivable: older versions parse, migration
 * is idempotent, and a newer/unknown version still throws loudly.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  KNOWN_ENVELOPE_SCHEMA_VERSIONS,
  migrateEnvelope,
  parseScoringEnvelope,
  ScoringEnvelopeValidationError,
} from '../schema';
import type { KnownEnvelopeSchemaVersion } from '../schema';
import { ENVELOPE_SCHEMA_VERSION } from '../types';
import { createFixtureEnvelopeStore } from '../providers/fixtureEnvelopeStore';

/**
 * A persisted envelope as written by an older build. Deliberately a raw literal
 * rather than buildScoringEnvelope output: the point is to read back bytes this
 * codebase no longer produces.
 */
function persistedEnvelope(version: string): Record<string, unknown> {
  return {
    attemptId: `attempt-${version}`,
    sessionId: 'session-1',
    scoredAt: '2026-01-01T00:00:00.000Z',
    contentProvenance: 'original-practice',
    versions: {
      envelopeSchemaVersion: version,
      rubricVersion: 'rubric-v0.1',
      scoringEngineVersion: 'engine-v0.1',
      evidenceDetectorVersion: 'detectors-v0.1',
      scoringPromptVersion: 'scoring-prompt-v0.1',
      guardrailsVersion: 'guardrails-v0.1',
      calibrationVersion: 'none',
      gradeBoundarySeries: 'none',
    },
    llm: { provider: 'gemini', model: 'gemini-2.5-flash-lite', selfConsistencyRuns: 1 },
    stt: {
      model: 'm',
      modelVersion: '1',
      provider: 'p',
      languageCode: 'fr',
      alignmentModel: null,
      diarizationModel: null,
      decodeParamsHash: 'h',
      confidenceSource: 'whisperx-align-score',
      promptBiasedRetries: 0,
      transcribedAt: '2025-12-31T00:00:00.000Z',
    },
    transcriptVersion: { schemaVersion: 'session-transcript-v1', assemblerVersion: 'stt-assembler-v1' },
    transcriptConfidence: {
      meanWordConfidence: 0.9,
      lowConfidenceSpanRatio: 0,
      lowConfidenceSpanCount: 0,
      userCorrected: false,
    },
    anchorsUsedByCriterion: { rolePlayTask: [], communication: [], qualityOfLanguage: [] },
    // v0.1 predates questionSetId/questionSetHash entirely — absent, not null.
    ...(version === 'envelope-v0.1'
      ? {}
      : { questionSetId: 'qs-1', questionSetHash: 'sha256:abc' }),
    rolePlayTasks: [
      {
        taskId: 't1',
        mark: 2,
        confidence: 'unassessed',
        justification: 'communicated the message',
        evidenceSpans: [{ source: 'rolePlay', quote: 'je voudrais une chambre' }],
      },
    ],
    communication: {
      mark: 8,
      band: { min: 7, max: 9, label: 'Satisfactory' },
      confidence: 'unassessed',
      justification: 'j',
      evidenceSpans: [],
    },
    qualityOfLanguage: {
      mark: 8,
      band: { min: 7, max: 9, label: 'Satisfactory' },
      confidence: 'unassessed',
      justification: 'j',
      evidenceSpans: [],
    },
    total: 18,
    guardrailTriggers: [],
    selfConsistencyOutcomes: { agreement: 'single_run', rerunsRequested: 0 },
    evidenceProfileSnapshot: {
      timeFrameAlignmentByQuestion: [],
      responseCountsByQuestion: [],
      fillerDensityByQuestion: [],
      rolePlayPartsByTask: [],
      topicConversationDurationByConversation: [],
    },
    transcriptSnapshot: {
      contentProvenance: 'original-practice',
      rolePlay: [],
      topicConversations: [
        { conversationId: 'topic1', turns: [] },
        { conversationId: 'topic2', turns: [] },
      ],
    },
  };
}

describe('envelope schema forward migration (C0)', () => {
  it('KNOWN_ENVELOPE_SCHEMA_VERSIONS contains the version this build writes', () => {
    expect(KNOWN_ENVELOPE_SCHEMA_VERSIONS).toContain(ENVELOPE_SCHEMA_VERSION);
  });

  it('is append-only — v0.1 and v0.2 are never dropped, so an old row stays readable after a revert', () => {
    expect(KNOWN_ENVELOPE_SCHEMA_VERSIONS).toContain('envelope-v0.1');
    expect(KNOWN_ENVELOPE_SCHEMA_VERSIONS).toContain('envelope-v0.2');
  });

  it('parses a persisted envelope-v0.1 envelope and stamps it at the current version', () => {
    const parsed = parseScoringEnvelope(persistedEnvelope('envelope-v0.1'));
    expect(parsed.versions.envelopeSchemaVersion).toBe(ENVELOPE_SCHEMA_VERSION);
    // Migration is additive only — nothing about the recorded judgement moves.
    expect(parsed.communication.mark).toBe(8);
    expect(parsed.qualityOfLanguage.mark).toBe(8);
    expect(parsed.total).toBe(18);
    expect(parsed.rolePlayTasks[0].mark).toBe(2);
    expect(parsed.guardrailTriggers).toEqual([]);
  });

  it('parses a persisted envelope-v0.2 envelope and preserves its questionSet provenance', () => {
    const parsed = parseScoringEnvelope(persistedEnvelope('envelope-v0.2'));
    expect(parsed.versions.envelopeSchemaVersion).toBe(ENVELOPE_SCHEMA_VERSION);
    expect(parsed.questionSetId).toBe('qs-1');
    expect(parsed.questionSetHash).toBe('sha256:abc');
    expect(parsed.total).toBe(18);
  });

  it('migrateEnvelope is idempotent: migrate(migrate(x)) deep-equals migrate(x)', () => {
    // The second pass runs at the version the first pass stamped, which is what
    // a real re-read does — the same row parsed twice must not drift.
    const current = ENVELOPE_SCHEMA_VERSION as KnownEnvelopeSchemaVersion;
    for (const from of ['envelope-v0.1', 'envelope-v0.2'] as const) {
      const once = migrateEnvelope(persistedEnvelope(from), from);
      const twice = migrateEnvelope(once, current);
      expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
    }
  });

  it('migrateEnvelope backfills criterionAdjustments to [] — a pre-v0.3 build applied no clamp', () => {
    const migrated = migrateEnvelope(persistedEnvelope('envelope-v0.1'), 'envelope-v0.1') as {
      criterionAdjustments: unknown;
    };
    expect(migrated.criterionAdjustments).toEqual([]);
  });

  it('throws on an entirely unknown envelopeSchemaVersion', () => {
    const raw = persistedEnvelope('envelope-v9.9');
    expect(() => parseScoringEnvelope(raw)).toThrow(ScoringEnvelopeValidationError);
    expect(() => parseScoringEnvelope(raw)).toThrow(/Unknown envelopeSchemaVersion/);
  });

  it('throws on a known-but-NEWER version rather than downgrading it', () => {
    const known: readonly string[] = KNOWN_ENVELOPE_SCHEMA_VERSIONS;
    const newer = known.slice(known.indexOf(ENVELOPE_SCHEMA_VERSION) + 1);
    for (const version of newer) {
      expect(() => parseScoringEnvelope(persistedEnvelope(version))).toThrow(
        ScoringEnvelopeValidationError,
      );
    }
    // When this build writes the newest known version there is nothing forward
    // of it; the guard is still asserted by the unknown-version case above.
    expect(newer.every((v) => v !== ENVELOPE_SCHEMA_VERSION)).toBe(true);
  });

  it('throws when the versions block is missing entirely', () => {
    expect(() => parseScoringEnvelope({ attemptId: 'a' })).toThrow(/missing a versions block/);
  });
});

describe('unreadable rows are skipped and reported, not fatal (C0)', () => {
  it('createFixtureEnvelopeStore keeps the good fixtures when one is unreadable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const store = createFixtureEnvelopeStore({
        good: persistedEnvelope('envelope-v0.2'),
        alsoGood: { ...persistedEnvelope('envelope-v0.1'), attemptId: 'alsoGood' },
        corrupt: { versions: { envelopeSchemaVersion: 'envelope-v9.9' } },
      });

      expect((await store.list()).sort()).toEqual(['alsoGood', 'good']);
      expect(await store.load('good')).toBeTruthy();
      await expect(store.load('corrupt')).rejects.toThrow(/no envelope for attemptId/);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('corrupt'));
    } finally {
      warn.mockRestore();
    }
  });
});
