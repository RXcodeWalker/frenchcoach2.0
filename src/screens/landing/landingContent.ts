/**
 * Landing-page content that more than one place reads: the section list
 * drives both the sticky nav (MarketingLayout) and each section's `id`; the
 * FAQ drives both the visible accordion and the FAQPage JSON-LD in
 * src/config/seo.ts, so the structured data can never describe questions
 * the page doesn't show.
 *
 * Every claim here must be something the product does today. No statistics,
 * testimonials or "same as Cambridge" equivalence — "marked against the
 * Cambridge 0520 speaking criteria" is the strongest wording we use.
 */

import { LEARN_ANSWERS_PER_DAY } from '../../features/learn/dailyAllowance';

// Launch limits (CLAUDE.md "Launch usage limits"): LEARN_ANSWERS_PER_DAY marked
// Learn answers a day, and one mock exam per rolling 7 days
// (server/examAllowance.ts's EXAM_WINDOW_DAYS — server-only, so restated here).
export const LIMITS_COPY = `${LEARN_ANSWERS_PER_DAY} marked answers a day and a full mock exam every week`;

export const LANDING_SECTIONS = [
  { id: 'how-it-works', label: 'How it works' },
  { id: 'why', label: 'Why it works' },
  { id: 'exam', label: 'The exam' },
  { id: 'faq', label: 'FAQ' },
] as const;

export type LandingSectionId = (typeof LANDING_SECTIONS)[number]['id'];

export interface FaqEntry {
  question: string;
  answer: string;
}

export const LANDING_FAQ: FaqEntry[] = [
  {
    question: 'Is it free?',
    answer:
      `Yes. Start right now as a guest, with no account and no card. A free account gives you ${LIMITS_COPY}, and keeps your progress safe.`,
  },
  {
    question: 'Which exam is it for?',
    answer:
      'Cambridge IGCSE French (0520), Paper 3: Speaking. The questions follow the same format: a role play and two topic conversations.',
  },
  {
    question: 'How is my answer marked?',
    answer:
      'Your spoken answer is written out, then checked against the Cambridge 0520 speaking criteria. Practice questions give you coaching: what went well, what to fix first and a better way to say it. Full mock exams are marked out of 40, split into role play, communication and quality of language.',
  },
  {
    question: 'Will my mark match my real exam?',
    answer:
      'Treat it as practice, not an official grade. Its job is to show you where you are losing marks and what to change, so you can walk into the real exam ready.',
  },
  {
    question: 'What do I need?',
    answer:
      'A phone or laptop with a microphone and a modern browser. Chrome gives the smoothest experience. There is nothing to install.',
  },
  {
    question: 'Is it made by Cambridge?',
    answer:
      'No. Français AI is an independent practice tool. It is not affiliated with or endorsed by Cambridge Assessment International Education.',
  },
];
