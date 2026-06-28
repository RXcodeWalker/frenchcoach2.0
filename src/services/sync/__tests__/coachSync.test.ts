import { describe, it, expect } from 'vitest';
import type { EvidenceEvent } from '../../../types/evidence';
import { mergeEvidenceLists, rowToEvent, COACH_SYNC_SCHEMA_VERSION } from '../coachSync';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeEvent(id: string, occurredAt: string): EvidenceEvent {
  return {
    id,
    learnerId: 'local-user',
    occurredAt,
    sourceSessionId: 'sess-1',
    evidenceType: 'language',
    targetNodeIds: ['subjunctive'],
    observation: {},
    result: { score: 8 },
    reliability: {
      assessmentConfidence: 0.9,
      taskValidity: 0.9,
      signalQuality: 0.9,
      evaluator: 'llm',
      rubricVersion: 'v1',
    },
    context: { mode: 'practice', timed: false },
  };
}

function makeRow(id: string, occurredAt: string, schemaVersion = COACH_SYNC_SCHEMA_VERSION) {
  return {
    id,
    user_id: 'user-abc',
    occurred_at: occurredAt,
    source_session_id: 'sess-1',
    evidence_type: 'language',
    target_node_ids: ['subjunctive'],
    observation: {},
    result: { score: 8 },
    reliability: {
      assessmentConfidence: 0.9,
      taskValidity: 0.9,
      signalQuality: 0.9,
      evaluator: 'llm',
      rubricVersion: 'v1',
    },
    context: { mode: 'practice', timed: false },
    schema_version: schemaVersion,
    created_at: occurredAt,
  };
}

// ── mergeEvidenceLists ─────────────────────────────────────────────────────────

describe('mergeEvidenceLists', () => {
  it('unions local and cloud events by id', () => {
    const local = [makeEvent('ev-1', '2026-01-01T00:00:00Z')];
    const cloud = [makeEvent('ev-2', '2026-01-02T00:00:00Z')];
    const merged = mergeEvidenceLists(local, cloud);
    expect(merged.map(e => e.id)).toEqual(['ev-1', 'ev-2']);
  });

  it('does not duplicate events present in both local and cloud', () => {
    const ev = makeEvent('ev-1', '2026-01-01T00:00:00Z');
    const merged = mergeEvidenceLists([ev], [ev]);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('ev-1');
  });

  it('sorts events by occurredAt ascending', () => {
    const local = [makeEvent('ev-b', '2026-01-03T00:00:00Z')];
    const cloud = [makeEvent('ev-a', '2026-01-01T00:00:00Z'), makeEvent('ev-c', '2026-01-05T00:00:00Z')];
    const merged = mergeEvidenceLists(local, cloud);
    expect(merged.map(e => e.id)).toEqual(['ev-a', 'ev-b', 'ev-c']);
  });

  it('caps result at MAX_EVIDENCE_EVENTS (100)', () => {
    const local = Array.from({ length: 60 }, (_, i) =>
      makeEvent(`ev-l${i}`, `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`),
    );
    const cloud = Array.from({ length: 60 }, (_, i) =>
      makeEvent(`ev-c${i}`, `2026-02-${String(i + 1).padStart(2, '0')}T00:00:00Z`),
    );
    const merged = mergeEvidenceLists(local, cloud);
    expect(merged).toHaveLength(100);
    // Should keep the most recent 100 — all cloud events come after local, so oldest local are dropped
    expect(merged[merged.length - 1].id).toBe('ev-c59');
  });

  it('returns empty array when both inputs are empty', () => {
    expect(mergeEvidenceLists([], [])).toEqual([]);
  });
});

// ── rowToEvent version handling ────────────────────────────────────────────────

describe('rowToEvent', () => {
  it('maps a current-version row to an EvidenceEvent', () => {
    const row = makeRow('ev-1', '2026-01-01T00:00:00Z', COACH_SYNC_SCHEMA_VERSION);
    const ev = rowToEvent(row);
    expect(ev).not.toBeNull();
    expect(ev!.id).toBe('ev-1');
    expect(ev!.occurredAt).toBe('2026-01-01T00:00:00Z');
    expect(ev!.learnerId).toBe('local-user');
    expect(ev!.evidenceType).toBe('language');
  });

  it('accepts a lower (known) schema_version and migrates it', () => {
    // At v1 there are no actual field migrations, but the function should not return null
    if (COACH_SYNC_SCHEMA_VERSION <= 1) {
      // Nothing to test below v1 — just confirm v1 maps correctly
      const row = makeRow('ev-2', '2026-01-02T00:00:00Z', 1);
      const ev = rowToEvent(row);
      expect(ev).not.toBeNull();
    } else {
      const row = makeRow('ev-2', '2026-01-02T00:00:00Z', COACH_SYNC_SCHEMA_VERSION - 1);
      const ev = rowToEvent(row);
      expect(ev).not.toBeNull();
    }
  });

  it('skips rows with an unknown higher schema_version', () => {
    const row = makeRow('ev-3', '2026-01-03T00:00:00Z', COACH_SYNC_SCHEMA_VERSION + 1);
    const ev = rowToEvent(row);
    expect(ev).toBeNull();
  });

  it('sets learnerId to local-user regardless of the cloud user_id', () => {
    const row = makeRow('ev-4', '2026-01-04T00:00:00Z');
    const ev = rowToEvent(row);
    expect(ev!.learnerId).toBe('local-user');
  });

  it('maps null source_session_id to empty string', () => {
    const row = { ...makeRow('ev-5', '2026-01-05T00:00:00Z'), source_session_id: null };
    const ev = rowToEvent(row);
    expect(ev!.sourceSessionId).toBe('');
  });
});
