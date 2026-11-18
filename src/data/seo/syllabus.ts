import type { TopicArea } from '../exam/bank/types';

/**
 * Syllabus topic-area names (Syl p.14), the same wording as the exam guide's
 * TOPIC_AREA_NAMES. Copied, not imported: the guide's module pulls in app
 * features, and this one has to stay light for the public pages. A test holds
 * the two equal.
 */
export const AREA_NAMES: Readonly<Record<TopicArea, string>> = {
  A: 'Everyday activities',
  B: 'Personal and social life',
  C: 'The world around us',
  D: 'The world of work',
  E: 'The international world',
};

/**
 * Which topic conversation can use these areas: the first draws from A or B,
 * the second from C, D or E (TN p.3, Syl p.19; exam-conduct §21).
 */
export function conversationFor(areas: readonly TopicArea[]): 'first' | 'second' | 'either' {
  const first = areas.some((a) => a === 'A' || a === 'B');
  const second = areas.some((a) => a === 'C' || a === 'D' || a === 'E');
  if (first && second) return 'either';
  return first ? 'first' : 'second';
}

export function conversationLabel(areas: readonly TopicArea[]): string {
  const which = conversationFor(areas);
  if (which === 'first') return 'topic conversation 1 (Areas A and B)';
  if (which === 'second') return 'topic conversation 2 (Areas C, D and E)';
  return 'either topic conversation';
}
