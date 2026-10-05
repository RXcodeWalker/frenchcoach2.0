/**
 * Exam-mode pronunciation analysis — one plain sentence per state (plan §2:
 * "each a sentence, never blocking"). None of these names a mark, band, grade
 * or score; `messages.test.ts` runs them through the shared mark/band filter.
 *
 * `consent_required` is deliberately absent: it renders the shared
 * GuardianConsentNotice instead of a sentence.
 */

import type { ExamPronunciationState } from '../../../services/exam/pronunciation/client';

export const PRONUNCIATION_STATE_MESSAGE: Record<
  Exclude<ExamPronunciationState, 'idle' | 'done' | 'consent_required'>,
  string
> = {
  running: 'Analysing your recordings. This can take a minute.',
  failed: 'Pronunciation analysis did not work this time. Nothing else on this page is affected.',
  budget_exhausted: 'Pronunciation analysis is unavailable until next month.',
  daily_cap: 'You have reached today’s limit for pronunciation analysis. Try again tomorrow.',
  no_audio: 'No recordings were kept for this exam, so there is nothing to analyse.',
  signed_out: 'Sign in to analyse your pronunciation.',
  not_enabled: 'Pronunciation analysis is not available on your account yet.',
};

/** A part that finished with no analysable speech (too short, silent, undecodable, or recognisers could not assess it). */
export const PART_NOTHING_ANALYSED = 'Nothing could be analysed in this part.';

/** A part that was analysed and nothing was reported. Comprehensibility, never accent, is the test. */
export const PART_NOTHING_STOOD_OUT =
  'Nothing stood out in this part that would get in the way of being understood.';

/** A Coached card whose part has no recording left in memory. */
export const PART_NO_AUDIO = 'No recordings were kept for this part, so there is nothing to analyse.';

export const ANALYSE_BUTTON_LABEL = 'Analyse my pronunciation';
export const RETRY_BUTTON_LABEL = 'Try again';

export const PRONUNCIATION_PRIVACY_NOTE =
  'Your recordings stay in this browser tab and are never saved. Accents are not treated as mistakes.';

export const PART_NAME: Record<'rolePlay' | 'topic1' | 'topic2', string> = {
  rolePlay: 'Role play',
  topic1: 'Topic 1',
  topic2: 'Topic 2',
};
