// Cloud copy of the Learn state that used to live only on this device, so a new
// phone kept the sessions but lost: topic progress (sessions, questions already
// answered, gold badges), the spaced-review (SM-2) schedule, and the learner's
// own Learn settings (aim, marking level, daily goal).
//
// Backend table `learner_state` (migration 20261103150000): one row per
// (user, key), value is a JSON object, owner-only RLS, deleted with the profile.
// Keys are a closed list — never put the notebook, the Pronunciation Lab's
// history, the Junior track or a game's bests here (each is local-only by
// owner decision; see their privacy/isolation tests).
//
// Merge rules (all additive — nothing a device holds is lost on sign-in):
//  - topic_mastery: per topic, the entry with more sessions wins (ties: the
//    later lastSessionAt); answered questions are unioned; mastered is sticky.
//  - review_pool: per question, the item answered most recently wins
//    (reviewPool.ts's mergeReviewPoolFromCloud).
//  - learn_settings: the cloud value fills a setting this device never set;
//    once set here, this device's value wins and is pushed.
//  - skill_model (docs/systems/learner-model.md §4.3): a per-device map of
//    decayed per-skill numbers. Each device writes only its own bucket; the
//    merge keeps each device's latest bucket and the earliest legacy bucket
//    (domain/learnerModel/merge.ts). No text, transcripts or event bodies.
//    Behind flag `learnerModelSync` until backend migration 20261106100000
//    (which adds the key to the CHECK) is applied in production — a push
//    before then would be refused by the constraint.

import { supabase, supabaseConfigured } from '../../lib/supabase';
import { STORAGE_KEYS, storageGet, storageSet, scopedKey } from '../persistence/storage';
import { mergeReviewPoolFromCloud, readReviewPoolForSync } from '../coach/reviewPool';
import { normalizeTopicMasteryAll } from '../../features/learn/topicAverage';
import { isMarkingLevel, type MarkingLevel } from '../../domain/learn/marking/markingLevel';
import type { Aim } from '../../domain/learn/selection/sessionTarget';
import type { TopicMasteryEntry } from '../../types';
import { resolveFeatureStatus } from '../../config/featureFlags';
import { mergeIntoState, toSynced } from '../../domain/learnerModel/merge';
import type { LearnerModelState } from '../../domain/learnerModel/types';
import { readStoredLearnerModel, writeLearnerModel } from '../learnerModel/learnerModelStore';

export type LearnerStateKey = 'topic_mastery' | 'review_pool' | 'learn_settings' | 'skill_model';
const BASE_KEYS: readonly LearnerStateKey[] = ['topic_mastery', 'review_pool', 'learn_settings'];

/** The keys this build syncs: skill_model only while `learnerModelSync` is live. */
export function syncedLearnerStateKeys(): readonly LearnerStateKey[] {
  return resolveFeatureStatus('learnerModelSync') === 'live' ? [...BASE_KEYS, 'skill_model'] : BASE_KEYS;
}

const AIMS: readonly Aim[] = ['comfortable', 'balanced', 'push'];

export interface LearnSettings {
  aim?: Aim;
  markingLevel?: MarkingLevel;
  dailyGoal?: number;
}

/** What hydration changed, for AppContext to dispatch into state. */
export interface LearnerStateHydration {
  topicMastery: Record<string, TopicMasteryEntry>;
  changedTopics: string[];
  /** Settings this device had never set, now filled from the cloud. */
  settings: LearnSettings;
  /** The learner model merged with the cloud's, when skill_model is synced and something changed. */
  learnerModel?: LearnerModelState;
}

/** Last value pushed (or pulled) per key — skips a push that would change nothing. */
const lastSynced = new Map<string, string>();
/**
 * Accounts whose cloud copy was merged on this page load. A push before that
 * (or after a failed pull) could overwrite a richer cloud copy with this
 * device's partial one, so pushLearnerState waits for it.
 */
const hydratedUsers = new Set<string>();

function cacheKey(userId: string, key: LearnerStateKey): string {
  return `${userId}:${key}`;
}

// ── Topic mastery merge ──────────────────────────────────────────────────────

function isTopicEntry(value: unknown): value is TopicMasteryEntry {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.topicKey === 'string'
    && typeof v.sessionsCompleted === 'number'
    && Array.isArray(v.uniqueQuestionsAnswered)
    && typeof v.lastSessionAt === 'string'
    && typeof v.mastered === 'boolean'
    && (v.averageScore === null || typeof v.averageScore === 'number');
}

function mergeTopicEntry(local: TopicMasteryEntry, cloud: TopicMasteryEntry): TopicMasteryEntry {
  const cloudAhead = cloud.sessionsCompleted > local.sessionsCompleted
    || (cloud.sessionsCompleted === local.sessionsCompleted && cloud.lastSessionAt > local.lastSessionAt);
  const base = cloudAhead ? cloud : local;
  const mastered = local.mastered || cloud.mastered;
  const masteredAt = [local.masteredAt, cloud.masteredAt].filter((d): d is string => typeof d === 'string').sort()[0];
  return {
    ...base,
    uniqueQuestionsAnswered: Array.from(new Set([...local.uniqueQuestionsAnswered, ...cloud.uniqueQuestionsAnswered])),
    lastSessionAt: local.lastSessionAt > cloud.lastSessionAt ? local.lastSessionAt : cloud.lastSessionAt,
    mastered,
    ...(masteredAt ? { masteredAt } : {}),
    ...(mastered ? { badge: 'gold' as const } : {}),
  };
}

/** Pure: this device's topic entries merged with the cloud's. Exported for tests. */
export function mergeTopicMastery(
  local: Record<string, TopicMasteryEntry>,
  cloud: unknown,
): { merged: Record<string, TopicMasteryEntry>; changedTopics: string[] } {
  const merged: Record<string, TopicMasteryEntry> = { ...local };
  const changedTopics: string[] = [];
  if (!cloud || typeof cloud !== 'object') return { merged, changedTopics };
  for (const [key, entry] of Object.entries(cloud as Record<string, unknown>)) {
    if (!isTopicEntry(entry) || entry.topicKey !== key) continue;
    const mine = merged[key];
    const next = mine ? mergeTopicEntry(mine, entry) : entry;
    if (!mine || JSON.stringify(next) !== JSON.stringify(mine)) {
      merged[key] = next;
      changedTopics.push(key);
    }
  }
  return { merged: normalizeTopicMasteryAll(merged), changedTopics };
}

// ── Settings ─────────────────────────────────────────────────────────────────

function rawSetting(key: string): string | null {
  try {
    return localStorage.getItem(scopedKey(key));
  } catch {
    return null;
  }
}

function readLocalSettings(): LearnSettings {
  const aim = rawSetting(STORAGE_KEYS.aim);
  const level = rawSetting(STORAGE_KEYS.markingLevel);
  const goal = Number(rawSetting(STORAGE_KEYS.dailyGoal));
  return {
    ...(aim && (AIMS as readonly string[]).includes(aim) ? { aim: aim as Aim } : {}),
    ...(isMarkingLevel(level) ? { markingLevel: level } : {}),
    ...(rawSetting(STORAGE_KEYS.dailyGoal) !== null && Number.isFinite(goal) && goal > 0 ? { dailyGoal: goal } : {}),
  };
}

function parseCloudSettings(value: unknown): LearnSettings {
  if (!value || typeof value !== 'object') return {};
  const v = value as Record<string, unknown>;
  return {
    ...(typeof v.aim === 'string' && (AIMS as readonly string[]).includes(v.aim) ? { aim: v.aim as Aim } : {}),
    ...(isMarkingLevel(v.markingLevel) ? { markingLevel: v.markingLevel } : {}),
    ...(typeof v.dailyGoal === 'number' && Number.isFinite(v.dailyGoal) && v.dailyGoal > 0 ? { dailyGoal: v.dailyGoal } : {}),
  };
}

/** Pure: the settings the cloud may fill (only ones this device never set). Exported for tests. */
export function settingsToFill(local: LearnSettings, cloud: LearnSettings): LearnSettings {
  return {
    ...(local.aim === undefined && cloud.aim ? { aim: cloud.aim } : {}),
    ...(local.markingLevel === undefined && cloud.markingLevel ? { markingLevel: cloud.markingLevel } : {}),
    ...(local.dailyGoal === undefined && cloud.dailyGoal ? { dailyGoal: cloud.dailyGoal } : {}),
  };
}

// ── Network ──────────────────────────────────────────────────────────────────

async function pullRows(userId: string): Promise<Partial<Record<LearnerStateKey, unknown>> | null> {
  const { data, error } = await supabase
    .from('learner_state')
    .select('key, value')
    .eq('user_id', userId);
  if (error) {
    console.warn('[learnerStateSync] pull failed:', error.message);
    return null;
  }
  const keys = syncedLearnerStateKeys();
  const out: Partial<Record<LearnerStateKey, unknown>> = {};
  for (const row of (data ?? []) as { key: string; value: unknown }[]) {
    if ((keys as readonly string[]).includes(row.key)) out[row.key as LearnerStateKey] = row.value;
  }
  return out;
}

function currentValues(): Record<LearnerStateKey, Record<string, unknown>> {
  const model = readStoredLearnerModel();
  return {
    topic_mastery: storageGet<Record<string, TopicMasteryEntry>>(STORAGE_KEYS.topicMastery, {}),
    review_pool: readReviewPoolForSync(),
    learn_settings: { ...readLocalSettings() },
    // Only the synced part: never the device's seen-set or its id field.
    skill_model: model ? (toSynced(model) as unknown as Record<string, unknown>) : {},
  };
}

/**
 * Push every key whose value changed since the last sync. Best effort: a
 * failure is retried by the next change or the next sign-in.
 */
export async function pushLearnerState(userId: string): Promise<void> {
  if (!supabaseConfigured || !hydratedUsers.has(userId)) return;
  const values = currentValues();
  const rows = syncedLearnerStateKeys()
    // An empty skill_model (no model stored yet) is not worth a row.
    .filter(key => key !== 'skill_model' || Object.keys(values.skill_model).length > 0)
    .map(key => ({ key, json: JSON.stringify(values[key]) }))
    .filter(({ key, json }) => lastSynced.get(cacheKey(userId, key)) !== json)
    .map(({ key, json }) => ({ user_id: userId, key, value: JSON.parse(json) as Record<string, unknown>, updated_at: new Date().toISOString() }));
  if (rows.length === 0) return;
  try {
    const { error } = await supabase.from('learner_state').upsert(rows, { onConflict: 'user_id,key' });
    if (error) {
      console.warn('[learnerStateSync] push failed:', error.message);
      return;
    }
    for (const row of rows) lastSynced.set(cacheKey(userId, row.key), JSON.stringify(row.value));
  } catch (err) {
    console.warn('[learnerStateSync] push error:', err);
  }
}

/**
 * Sign-in: pull the cloud copy, merge it into this device's storage, push back
 * whatever the cloud lacks. Returns what changed so the caller can dispatch it
 * (the caller then pushes); null when nothing could be pulled (offline, table
 * missing) — local stays as is and pushes stay off until a later hydration works.
 */
export async function hydrateLearnerState(userId: string): Promise<LearnerStateHydration | null> {
  if (!supabaseConfigured) return null;
  try {
    const cloud = await pullRows(userId);
    if (!cloud) return null;
    for (const key of syncedLearnerStateKeys()) {
      if (cloud[key] !== undefined) lastSynced.set(cacheKey(userId, key), JSON.stringify(cloud[key]));
    }

    const localMastery = storageGet<Record<string, TopicMasteryEntry>>(STORAGE_KEYS.topicMastery, {});
    const { merged, changedTopics } = mergeTopicMastery(localMastery, cloud.topic_mastery);
    if (changedTopics.length > 0) storageSet(STORAGE_KEYS.topicMastery, merged);

    mergeReviewPoolFromCloud(cloud.review_pool);

    const settings = settingsToFill(readLocalSettings(), parseCloudSettings(cloud.learn_settings));

    // learner-model §4.3: merge per device; only a real change is written and dispatched.
    let learnerModel: LearnerModelState | undefined;
    if (cloud.skill_model !== undefined) {
      const local = readStoredLearnerModel();
      if (local) {
        const next = mergeIntoState(local, cloud.skill_model);
        if (JSON.stringify(toSynced(next)) !== JSON.stringify(toSynced(local))) {
          writeLearnerModel(next);
          learnerModel = next;
        }
      }
    }
    hydratedUsers.add(userId);

    return { topicMastery: merged, changedTopics, settings, ...(learnerModel ? { learnerModel } : {}) };
  } catch (err) {
    console.warn('[learnerStateSync] hydrate error:', err);
    return null;
  }
}

/** Test seam: forget what was last synced. */
export function _resetLearnerStateSyncCache(): void {
  lastSynced.clear();
  hydratedUsers.clear();
}
