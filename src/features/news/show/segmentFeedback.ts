/**
 * The one AI call a speaking segment makes — docs/systems/daily-news.md §8.
 *
 * Coach feedback through the ordinary getAIFeedback (it charges `feedback`,
 * never Learn's daily answers: no `marking` is sent). The scenario and the
 * prompts go in `question.text`, the only question field the backend reads;
 * the learner's answers are joined into one transcript, so every quote the
 * feedback filter keeps is the learner's own words. No audio is sent: there
 * are several turns, and the backend would re-transcribe only one. The reply's
 * scores exist but are never shown (NewsCoachFeedback.tsx).
 */
import type { NewsEdition, NewsLevelId } from '../../../data/news/types';
import type { FeedbackV2, Question } from '../../../types';
import { getAIFeedback } from '../../../services/api/apiClient';
import { DEFAULT_DIFFICULTY } from '../../../utils/difficultyConfig';
import type { SegmentId } from './showPlan';

const DIFFICULTY: Record<NewsLevelId, 1 | 2 | 3> = { a2: 1, b1: 2, b2: 3 };

export function segmentQuestion(edition: NewsEdition, level: NewsLevelId, segment: SegmentId): Question {
  const lvl = edition.levels[level];
  const base = {
    id: `news-${edition.id}-${level}-${segment}`,
    topicKey: 'news',
    difficulty: DIFFICULTY[level],
    keyVocab: lvl.glossary.map(g => ({ fr: g.fr, en: g.en })),
  };
  if (segment === 'interview') {
    const qs = lvl.interview.questions;
    return {
      ...base,
      text: `Interview en rôle, à partir de l'actualité « ${lvl.headline} ». ${lvl.interview.role.fr} Un journaliste pose trois questions : ${qs
        .map((q, i) => `${i + 1}) ${q.fr}`)
        .join(' ')} L'élève répond aux trois questions dans son rôle et peut inventer des détails.`,
      hint: 'Réponds dans ton rôle, avec des détails, au présent, au passé et au futur.',
      followUps: qs.map(q => q.fr),
      modelAnswer: qs.map(q => q.model).join(' '),
    };
  }
  const d = lvl.debate;
  return {
    ...base,
    text: `Débat à partir de l'actualité « ${lvl.headline} ». Question : ${d.motion.fr} L'élève donne d'abord un avis pour, avec une raison, puis un avis contre, avec une raison.`,
    hint: 'Donne ton avis et justifie-le : parce que, car, à mon avis…',
    followUps: [d.motion.fr],
    modelAnswer: `${d.for.model} ${d.against.model}`,
  };
}

/** Coach feedback on the segment's answers, or null when it isn't available (offline, signed out, failed). */
export async function segmentFeedback(answers: readonly string[], question: Question): Promise<FeedbackV2 | null> {
  const transcript = answers.map(a => a.trim()).filter(Boolean).join(' ');
  if (!transcript) return null;
  try {
    return await getAIFeedback(transcript, question, undefined, undefined, 'groq', DEFAULT_DIFFICULTY, 'speech');
  } catch (error) {
    console.error('Daily News feedback unavailable:', error);
    return null;
  }
}
