/**
 * Cloud copy of Learn's speaking log (`services/fluency/speakingLog.ts`) in the
 * `speaking_samples` table (backend migration 20261103090000). Rows are written
 * once and never changed: a push is `INSERT … ON CONFLICT DO NOTHING` on
 * (user_id, id), so retries are safe and the table needs no UPDATE grant.
 *
 * - `pushSpeakingSample` — fire-and-forget after each answer; a failure is
 *   simply caught up by the next `syncSpeakingLog`.
 * - `syncSpeakingLog` — on sign-in: pull the account's rows, merge them into the
 *   local log (so a new device has the history), then push every local row the
 *   cloud lacks.
 */

import { supabase, supabaseConfigured } from '../../lib/supabase';
import {
  getSpeakingLog,
  mergeSpeakingSamples,
  type SpeakingSample,
} from '../fluency/speakingLog';

const TABLE = 'speaking_samples';
/** Pull window, matching the local cap (`SPEAKING_LOG_MAX` ≈ a year of answers). */
const PULL_DAYS = 400;

export type SpeakingSampleRow = {
  user_id: string;
  id: string;
  created_at: string;
  metrics_version: number;
  surface: SpeakingSample['surface'];
  style: SpeakingSample['style'];
  session_id: string | null;
  topic_key: string | null;
  question_id: string;
  follow_up: boolean;
  transcript_source: SpeakingSample['transcriptSource'];
  score: number | null;
  ai_fluency: number | null;
  duration_sec: number;
  recorded_s: number;
  start_delay_s: number;
  speaking_span_s: number;
  voiced_s: number;
  pause_count: number;
  pauses_over_1s: number;
  pauses_over_2s: number;
  longest_pause_s: number;
  total_pause_s: number;
  word_count: number;
  words_per_minute: number | null;
  articulation_wpm: number | null;
  words_per_run: number | null;
};

const COLUMNS =
  'user_id, id, created_at, metrics_version, surface, style, session_id, topic_key, question_id, follow_up, transcript_source, score, ai_fluency, duration_sec, recorded_s, start_delay_s, speaking_span_s, voiced_s, pause_count, pauses_over_1s, pauses_over_2s, longest_pause_s, total_pause_s, word_count, words_per_minute, articulation_wpm, words_per_run';

export function sampleToRow(userId: string, s: SpeakingSample): SpeakingSampleRow {
  return {
    user_id: userId,
    id: s.id,
    created_at: s.at,
    metrics_version: s.metricsVersion,
    surface: s.surface,
    style: s.style,
    session_id: s.sessionId,
    topic_key: s.topicKey,
    question_id: s.questionId,
    follow_up: s.followUp,
    transcript_source: s.transcriptSource,
    score: s.score,
    ai_fluency: s.aiFluency,
    duration_sec: s.durationSec,
    recorded_s: s.recordedS,
    start_delay_s: s.startDelayS,
    speaking_span_s: s.speakingSpanS,
    voiced_s: s.voicedS,
    pause_count: s.pauseCount,
    pauses_over_1s: s.pausesOver1s,
    pauses_over_2s: s.pausesOver2s,
    longest_pause_s: s.longestPauseS,
    total_pause_s: s.totalPauseS,
    word_count: s.wordCount,
    words_per_minute: s.wordsPerMinute,
    articulation_wpm: s.articulationWpm,
    words_per_run: s.wordsPerRun,
  };
}

export function rowToSample(r: SpeakingSampleRow): SpeakingSample {
  return {
    id: r.id,
    at: new Date(r.created_at).toISOString(),
    metricsVersion: r.metrics_version,
    surface: r.surface,
    style: r.style,
    sessionId: r.session_id,
    topicKey: r.topic_key,
    questionId: r.question_id,
    followUp: r.follow_up,
    transcriptSource: r.transcript_source,
    score: r.score,
    aiFluency: r.ai_fluency,
    durationSec: r.duration_sec,
    recordedS: r.recorded_s,
    startDelayS: r.start_delay_s,
    speakingSpanS: r.speaking_span_s,
    voicedS: r.voiced_s,
    pauseCount: r.pause_count,
    pausesOver1s: r.pauses_over_1s,
    pausesOver2s: r.pauses_over_2s,
    longestPauseS: r.longest_pause_s,
    totalPauseS: r.total_pause_s,
    wordCount: r.word_count,
    wordsPerMinute: r.words_per_minute,
    articulationWpm: r.articulation_wpm,
    wordsPerRun: r.words_per_run,
  };
}

async function insertRows(rows: SpeakingSampleRow[]): Promise<boolean> {
  if (rows.length === 0) return true;
  const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'user_id,id', ignoreDuplicates: true });
  if (error) {
    console.warn('[speakingLogSync] push failed:', error.message);
    return false;
  }
  return true;
}

export async function pushSpeakingSample(userId: string, sample: SpeakingSample): Promise<boolean> {
  if (!supabaseConfigured) return false;
  try {
    return await insertRows([sampleToRow(userId, sample)]);
  } catch (err) {
    console.warn('[speakingLogSync] push error:', err);
    return false;
  }
}

export async function syncSpeakingLog(userId: string): Promise<void> {
  if (!supabaseConfigured) return;
  try {
    const cutoff = new Date(Date.now() - PULL_DAYS * 86_400_000).toISOString();
    const { data, error } = await supabase
      .from(TABLE)
      .select(COLUMNS)
      .eq('user_id', userId)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('[speakingLogSync] pull failed:', error.message);
      return;
    }
    const cloud = ((data ?? []) as SpeakingSampleRow[]).map(rowToSample);
    const cloudIds = new Set(cloud.map((s) => s.id));
    if (cloud.length > 0) mergeSpeakingSamples(cloud);
    const missing = getSpeakingLog().filter((s) => !cloudIds.has(s.id));
    for (let i = 0; i < missing.length; i += 200) {
      if (!(await insertRows(missing.slice(i, i + 200).map((s) => sampleToRow(userId, s))))) return;
    }
  } catch (err) {
    console.warn('[speakingLogSync] sync error:', err);
  }
}
