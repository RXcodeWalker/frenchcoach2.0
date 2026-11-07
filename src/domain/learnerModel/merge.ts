// ── Learner model: cross-device merge (learner-model §4.3) ─────────────────────
//
// The synced value is a per-device conflict-free map. Each device writes only
// its own bucket; a merge keeps each device's latest bucket (by updatedAt) and
// the legacy bucket with the earliest cutoff. Readers sum the buckets — decayed
// sums add, so nothing is counted twice. Merge is commutative, associative and
// idempotent over the synced part (merge.test.ts).

import { LEARNER_MODEL_VERSION, type DeviceBucket, type LearnerModelState, type LegacyBucket, type SkillStat, type SkillStats, type SyncedSkillModel } from './types';

/**
 * At most this many device buckets are kept. Over the cap, the buckets updated
 * longest ago are DROPPED (never folded into a shared archive: two devices
 * folding different sets could not be merged without double counting). A
 * bucket that old has decayed to almost nothing — 14-day half-life — and a
 * device that comes back simply re-adds its own bucket.
 */
export const MAX_DEVICE_BUCKETS = 8;

const finite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

function parseStat(raw: unknown): SkillStat | null {
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as Record<string, unknown>;
  if (!finite(v.s) || !finite(v.f) || !finite(v.w) || !finite(v.a) || !finite(v.n) || !finite(v.t) || !finite(v.last)) return null;
  if (v.s < 0 || v.f < 0 || v.w < 0 || v.a < 0 || v.n < 0) return null;
  const stat: SkillStat = {
    s: v.s, f: v.f, w: v.w, a: v.a, n: v.n, t: v.t, last: v.last,
    r: typeof v.r === 'string' ? v.r.replace(/[^01]/g, '').slice(-20) : '',
  };
  if (finite(v.lm) && finite(v.lx)) {
    stat.lm = v.lm;
    stat.lx = v.lx;
  }
  return stat;
}

function parseStats(raw: unknown): SkillStats {
  const out: SkillStats = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const stat = parseStat(value);
    if (stat) out[id] = stat;
  }
  return out;
}

/** Defensive parse of a stored or cloud value. Anything malformed is dropped, never trusted. */
export function parseSyncedModel(raw: unknown): SyncedSkillModel | null {
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as Record<string, unknown>;
  if (v.version !== LEARNER_MODEL_VERSION) return null;
  const devices: Record<string, DeviceBucket> = {};
  if (v.devices && typeof v.devices === 'object') {
    for (const [id, bucket] of Object.entries(v.devices as Record<string, unknown>)) {
      if (!bucket || typeof bucket !== 'object') continue;
      const b = bucket as Record<string, unknown>;
      if (!finite(b.updatedAt)) continue;
      devices[id] = { updatedAt: b.updatedAt, skills: parseStats(b.skills) };
    }
  }
  let legacy: LegacyBucket | null = null;
  if (v.legacy && typeof v.legacy === 'object') {
    const l = v.legacy as Record<string, unknown>;
    if (finite(l.cutoff) && typeof l.createdBy === 'string') {
      legacy = { cutoff: l.cutoff, createdBy: l.createdBy, skills: parseStats(l.skills) };
    }
  }
  return { version: LEARNER_MODEL_VERSION, devices, legacy };
}

/** Deterministic tiebreak between two buckets with the same updatedAt. */
function heavier(x: DeviceBucket, y: DeviceBucket): DeviceBucket {
  const jx = JSON.stringify(x);
  const jy = JSON.stringify(y);
  return jx >= jy ? x : y;
}

function pickBucket(x: DeviceBucket | undefined, y: DeviceBucket | undefined): DeviceBucket | undefined {
  if (!x) return y;
  if (!y) return x;
  if (x.updatedAt !== y.updatedAt) return x.updatedAt > y.updatedAt ? x : y;
  return heavier(x, y);
}

function pickLegacy(x: LegacyBucket | null, y: LegacyBucket | null): LegacyBucket | null {
  if (!x) return y;
  if (!y) return x;
  if (x.cutoff !== y.cutoff) return x.cutoff < y.cutoff ? x : y;
  if (x.createdBy !== y.createdBy) return x.createdBy < y.createdBy ? x : y;
  return JSON.stringify(x) >= JSON.stringify(y) ? x : y;
}

/** Keep the MAX_DEVICE_BUCKETS most recently updated buckets; `keep` (this device) is never dropped. */
function capDevices(devices: Record<string, DeviceBucket>, keep?: string): Record<string, DeviceBucket> {
  const ids = Object.keys(devices);
  if (ids.length <= MAX_DEVICE_BUCKETS) return devices;
  const ranked = ids
    .filter((id) => id !== keep)
    .sort((a, b) => devices[b].updatedAt - devices[a].updatedAt || (a < b ? -1 : 1));
  const room = keep && devices[keep] ? MAX_DEVICE_BUCKETS - 1 : MAX_DEVICE_BUCKETS;
  const kept = ranked.slice(0, room);
  if (keep && devices[keep]) kept.push(keep);
  return Object.fromEntries(kept.sort().map((id) => [id, devices[id]]));
}

/** Pure: merge two synced values. Commutative, associative, idempotent. */
export function mergeSynced(x: SyncedSkillModel, y: SyncedSkillModel, keepDevice?: string): SyncedSkillModel {
  const devices: Record<string, DeviceBucket> = {};
  for (const id of new Set([...Object.keys(x.devices), ...Object.keys(y.devices)])) {
    const b = pickBucket(x.devices[id], y.devices[id]);
    if (b) devices[id] = b;
  }
  const sorted = Object.fromEntries(Object.keys(devices).sort().map((id) => [id, devices[id]]));
  return {
    version: LEARNER_MODEL_VERSION,
    devices: capDevices(sorted, keepDevice),
    legacy: pickLegacy(x.legacy, y.legacy),
  };
}

/** Pure: a local slice merged with a cloud value (malformed cloud value = no change). */
export function mergeIntoState(local: LearnerModelState, cloud: unknown): LearnerModelState {
  const parsed = parseSyncedModel(cloud);
  if (!parsed) return local;
  const merged = mergeSynced(toSynced(local), parsed, local.deviceId);
  return { ...local, devices: merged.devices, legacy: merged.legacy };
}

/** The synced part of a slice — what goes to learner_state (never `seen`, never `deviceId`). */
export function toSynced(model: LearnerModelState | SyncedSkillModel): SyncedSkillModel {
  return { version: LEARNER_MODEL_VERSION, devices: model.devices, legacy: model.legacy };
}
