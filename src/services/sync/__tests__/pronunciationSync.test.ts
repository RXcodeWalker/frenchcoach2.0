import { describe, it, expect } from 'vitest';
import {
  mergeAttemptLists,
  rowToRecord,
  PRONUNCIATION_SYNC_SCHEMA_VERSION,
} from '../pronunciationSync';
import type { PronunciationAttemptRecord } from '../../pronunciation/pronunciationHistoryService';

function makeRecord(id: string, createdAt: string): PronunciationAttemptRecord {
  return {
    id,
    createdAt,
    mode: 'scripted',
    locale: 'fr-FR',
    provider: 'azure',
    assessorVersion: 'pronunciation-v3',
    score: 80,
    couldNotAssess: false,
    confidenceOverall: 0.9,
    referenceText: 'vin',
    transcript: 'vin',
  };
}

function makeRow(id: string, createdAt: string, schemaVersion = PRONUNCIATION_SYNC_SCHEMA_VERSION) {
  return {
    id,
    user_id: 'user-abc',
    client_request_id: id,
    mode: 'scripted',
    locale: 'fr-FR',
    provider: 'azure',
    assessor_version: 'pronunciation-v3',
    score: 80,
    could_not_assess: false,
    confidence_overall: 0.9,
    reference_text: 'vin',
    transcript: 'vin',
    schema_version: schemaVersion,
    created_at: createdAt,
  };
}

describe('mergeAttemptLists', () => {
  it('dedupes by id, preferring local, sorted chronologically', () => {
    const local = [makeRecord('a', '2026-01-02T00:00:00.000Z')];
    const cloud = [
      makeRecord('a', '2026-01-02T00:00:00.000Z'),
      makeRecord('b', '2026-01-01T00:00:00.000Z'),
    ];
    const merged = mergeAttemptLists(local, cloud);

    expect(merged.map(r => r.id)).toEqual(['b', 'a']);
  });
});

describe('rowToRecord', () => {
  it('maps a cloud row to a local record', () => {
    const record = rowToRecord(makeRow('a', '2026-01-01T00:00:00.000Z'));
    expect(record).not.toBeNull();
    expect(record!.id).toBe('a');
    expect(record!.score).toBe(80);
    expect(record!.provider).toBe('azure');
  });

  it('returns null for a row written by a newer client rather than misinterpreting it', () => {
    const record = rowToRecord(makeRow('a', '2026-01-01T00:00:00.000Z', PRONUNCIATION_SYNC_SCHEMA_VERSION + 1));
    expect(record).toBeNull();
  });

  it('never fabricates a score: could_not_assess rows carry score null through', () => {
    const row = { ...makeRow('a', '2026-01-01T00:00:00.000Z'), score: null, could_not_assess: true };
    const record = rowToRecord(row);
    expect(record!.score).toBeNull();
    expect(record!.couldNotAssess).toBe(true);
  });
});
