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
    const { questions: qs, factSheet } = lvl.interview;
    const sheet = factSheet
      ? ` L'élève a une fiche de notes (${level === 'a2' ? 'en anglais' : 'en français'}) : ${factSheet.map(f => `${f.label} : ${f.note}`).join(' ; ')}. Il doit utiliser ces faits pour répondre, sauf à la dernière question, qui demande son avis.`
      : ' Il peut inventer des détails.';
    return {
      ...base,
      text: `Interview en rôle, à partir de l'actualité « ${lvl.headline} ». ${lvl.interview.role.fr} Un journaliste pose ${qs.length} questions : ${qs
        .map((q, i) => `${i + 1}) ${q.fr}`)
        .join(' ')} L'élève répond aux ${qs.length} questions dans son rôle, une réponse après l'autre.${sheet}`,
      hint: 'Réponds dans ton rôle, avec des détails, au présent, au passé et au futur.',
      followUps: qs.map(q => q.fr),
      modelAnswer: qs.map(q => q.model).join(' '),
    };
  }
  if (segment === 'journalist') {
    const ts = lvl.journalist.targets;
    return {
      ...base,
      text: `Exercice de journaliste à partir de l'actualité « ${lvl.headline} ». L'élève pose trois questions en français à un présentateur pour obtenir ces informations : ${ts
        .map((t, i) => `${i + 1}) ${t.goal}`)
        .join(' ')} Les réponses de l'élève sont donc des questions, pas des affirmations : chacune doit utiliser le bon mot interrogatif et être correcte.`,
      hint: "Pose une vraie question avec le bon mot interrogatif : qui, où, quand, combien, comment, pourquoi, quel, qu'est-ce que.",
      followUps: ts.map(t => t.question),
      modelAnswer: ts.map(t => t.question).join(' '),
    };
  }
  if (segment === 'predict') {
    const p = lvl.predict;
    return {
      ...base,
      text: `Prédiction à partir de l'actualité « ${lvl.headline} ». 1) ${p.next.fr} 2) ${p.ifYou.fr} L'élève répond d'abord en imaginant la suite (au futur), puis dit ce qu'il ferait à leur place (au conditionnel).`,
      hint: "Utilise le futur (je pense que… va…, il y aura…), puis le conditionnel (je ferais, j'aimerais…).",
      followUps: [p.next.fr, p.ifYou.fr],
      modelAnswer: `${p.next.model} ${p.ifYou.model}`,
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
    return await getAIFeedback(transcript, question, undefined, undefined, 'groq', DEFAULT_DIFFICULTY, 'speech', undefined, 'news');
  } catch (error) {
    console.error('Daily News feedback unavailable:', error);
    return null;
  }
}
