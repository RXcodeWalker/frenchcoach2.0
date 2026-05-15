import { supabase } from './client';
import type { Session } from '../../types';

export async function insertSession(userId: string, session: Session): Promise<void> {
  await supabase.from('sessions').insert({
    id: session.id,
    user_id: userId,
    mode: session.mode,
    topic_key: session.topicKey ?? null,
    question_text: session.questionText ?? null,
    transcript: session.transcript ?? null,
    word_count: session.wordCount,
    score: session.score,
    xp_earned: session.xpEarned,
    duration_sec: session.durationSec,
    feedback: session.feedback as unknown as Record<string, unknown> ?? null,
    created_at: session.createdAt,
  });
}

export async function fetchRecentSessions(userId: string, limit = 20): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map(row => ({
    id: row.id,
    mode: row.mode as Session['mode'],
    topicKey: row.topic_key ?? undefined,
    questionText: row.question_text ?? undefined,
    transcript: row.transcript ?? undefined,
    wordCount: row.word_count,
    score: row.score,
    xpEarned: row.xp_earned,
    durationSec: row.duration_sec,
    createdAt: row.created_at,
  }));
}
