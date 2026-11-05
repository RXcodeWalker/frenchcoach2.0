import { describe, it, expect } from 'vitest';
import { MAX_DEVICE_BUCKETS, mergeIntoState, mergeSynced, parseSyncedModel, toSynced } from '../merge';
import { applyObservations, emptyModel, DAY_MS } from '../update';
import { readSkill } from '../read';
import type { SkillObservation, SyncedSkillModel } from '../types';

const T0 = Date.UTC(2026, 9, 1);
const o = (id: string, at: number, success: number, skill = 'gender'): SkillObservation => ({ id, skillIds: [skill], at, kind: 'outcome', success, weight: 0.5 });

function deviceModel(deviceId: string, observations: SkillObservation[], now: number): SyncedSkillModel {
  return toSynced(applyObservations(emptyModel(deviceId), observations, now));
}

const a = deviceModel('A', [o('a1', T0, 1), o('a2', T0 + DAY_MS, 0)], T0 + DAY_MS);
const b = deviceModel('B', [o('b1', T0 + 2 * DAY_MS, 1)], T0 + 2 * DAY_MS);
const c: SyncedSkillModel = { ...deviceModel('C', [o('c1', T0, 0)], T0), legacy: { cutoff: T0 - DAY_MS, createdBy: 'C', skills: {} } };
const aNewer = deviceModel('A', [o('a1', T0, 1), o('a2', T0 + DAY_MS, 0), o('a3', T0 + 3 * DAY_MS, 1)], T0 + 3 * DAY_MS);

describe('learner-model §4.3 — per-device conflict-free merge', () => {
  it('is commutative, associative and idempotent', () => {
    expect(mergeSynced(a, b)).toEqual(mergeSynced(b, a));
    expect(mergeSynced(mergeSynced(a, b), c)).toEqual(mergeSynced(a, mergeSynced(b, c)));
    const ab = mergeSynced(a, b);
    expect(mergeSynced(ab, ab)).toEqual(ab);
    expect(mergeSynced(aNewer, a)).toEqual(mergeSynced(a, aNewer));
  });

  it('keeps each device\'s latest bucket and sums buckets on read — nothing double counted', () => {
    const merged = mergeSynced(mergeSynced(a, b), aNewer);
    expect(merged.devices.A).toEqual(aNewer.devices.A);
    const r = readSkill(merged, 'gender', T0 + 3 * DAY_MS)!;
    expect(r.evidenceCount).toBe(4); // a1 a2 a3 b1 — a1/a2 once
  });

  it('keeps the legacy bucket with the earliest cutoff', () => {
    const late = { ...a, legacy: { cutoff: T0 + 5, createdBy: 'A', skills: {} } };
    expect(mergeSynced(late, c).legacy?.createdBy).toBe('C');
    expect(mergeSynced(c, late).legacy?.createdBy).toBe('C');
  });

  it('caps device buckets, dropping the longest-unused, never this device\'s own', () => {
    let merged: SyncedSkillModel = { version: 'learner-model-v1', devices: {}, legacy: null };
    for (let i = 0; i < MAX_DEVICE_BUCKETS + 3; i++) {
      merged = mergeSynced(merged, { version: 'learner-model-v1', devices: { [`d${i}`]: { updatedAt: 100 + i, skills: {} } }, legacy: null });
    }
    expect(Object.keys(merged.devices)).toHaveLength(MAX_DEVICE_BUCKETS);
    expect(merged.devices.d0).toBeUndefined();
    const local = { ...emptyModel('d0'), devices: { d0: { updatedAt: 1, skills: {} } } };
    const kept = mergeIntoState(local, merged);
    expect(kept.devices.d0).toBeDefined();
    expect(Object.keys(kept.devices)).toHaveLength(MAX_DEVICE_BUCKETS);
  });

  it('a malformed or wrong-version cloud value changes nothing; bad stats are dropped, never trusted', () => {
    const local = { ...emptyModel('A'), devices: a.devices };
    expect(mergeIntoState(local, null)).toBe(local);
    expect(mergeIntoState(local, { version: 'other', devices: {} })).toBe(local);
    const parsed = parseSyncedModel({ version: 'learner-model-v1', devices: { X: { updatedAt: 1, skills: { gender: { s: -1, f: 0, w: 0, a: 0, n: 0, t: 0, last: 0 }, opinion: { s: 1, f: 0, w: 1, a: 0, n: 1, t: 0, last: 0, r: '1x0' } } } }, legacy: { cutoff: 'no' } });
    expect(parsed?.devices.X.skills.gender).toBeUndefined();
    expect(parsed?.devices.X.skills.opinion.r).toBe('10');
    expect(parsed?.legacy).toBeNull();
  });

  it('the synced value never carries the seen-set or the device id field', () => {
    const state = applyObservations(emptyModel('A'), [o('x', T0, 1)], T0);
    const synced = toSynced(state) as unknown as Record<string, unknown>;
    expect(Object.keys(synced).sort()).toEqual(['devices', 'legacy', 'version']);
  });
});
