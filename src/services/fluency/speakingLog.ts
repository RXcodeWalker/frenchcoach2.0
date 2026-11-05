/**
 * Learn's speaking log: one row of flow measurements per spoken answer
 * (`domain/fluency/speechMetrics.ts`), kept so a future fluency view has history
 * to draw on. Nothing reads it in the UI yet.
 *
 * Per account (the key is account-scoped, not device-scoped), with a cloud copy in
 * Supabase `speaking_samples` (`services/sync/speakingLogSync.ts`, signed-in only).
 * No request body to an AI provider, log line or analytics property may read it,
 * and `deleteMyAccount()` removes it (`speakingLogPrivacy.test.ts`; the cloud rows
 * cascade with the profile). It holds numbers, ids and enums — never audio or a
 * transcript (the Session already has the text).
 * It writes no XP, Session, mastery, review or evidence, so it is outside
 * `AppContext` on purpose, like the Pronunciation Lab's history.
 */

import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import type { SpeechMetrics } from '../../domain/fluency/speechMetrics';

export const SPEAKING_LOG_VERSION = 1;
/** Oldest rows drop off past this many (≈ a year at three answers a day). */
export const SPEAKING_LOG_MAX = 1500;

export interface SpeakingSample extends SpeechMetrics {
  id: string;
  /** ISO time the answer was evaluated. */
  at: string;
  surface: 'learn';
  style: 'coach' | 'examiner';
  /** The Session this answer wrote, when it wrote one (coach style only). */
  sessionId: string | null;
  topicKey: string | null;
  questionId: string;
  followUp: boolean;
  /** Which recogniser's reading the word counts come from. */
  transcriptSource: 'whisper' | 'captions';
  /** Exam-standard overall (`Session.score`); null when unscored or examiner style. */
  score: number | null;
  /** The coach's own fluency sub-score (0–10), an AI judgement kept beside the measurements; null when absent. */
  aiFluency: number | null;
  /** Seconds the record button was held, as the app saw it. */
  durationSec: number;
}

interface StoredLog {
  v: number;
  samples: SpeakingSample[];
}

export function getSpeakingLog(): SpeakingSample[] {
  const stored = storageGet<StoredLog | null>(STORAGE_KEYS.speakingLog, null);
  if (!stored || stored.v !== SPEAKING_LOG_VERSION || !Array.isArray(stored.samples)) return [];
  return stored.samples;
}

function save(samples: SpeakingSample[]): void {
  storageSet(STORAGE_KEYS.speakingLog, {
    v: SPEAKING_LOG_VERSION,
    samples: samples.slice(-SPEAKING_LOG_MAX),
  } satisfies StoredLog);
}

export function appendSpeakingSample(sample: SpeakingSample): void {
  const samples = getSpeakingLog().filter((s) => s.id !== sample.id);
  samples.push(sample);
  save(samples);
}

/** Adds samples the log doesn't have yet (by id), oldest first; a local sample always wins. */
export function mergeSpeakingSamples(incoming: SpeakingSample[]): void {
  const byId = new Map(getSpeakingLog().map((s) => [s.id, s]));
  for (const s of incoming) if (!byId.has(s.id)) byId.set(s.id, s);
  save([...byId.values()].sort((a, b) => a.at.localeCompare(b.at)));
}
