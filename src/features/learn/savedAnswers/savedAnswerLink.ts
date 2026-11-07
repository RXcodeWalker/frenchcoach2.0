/** `/learn?saved=<id>` opens a saved (offline) answer in Learn for feedback. */
export const SAVED_ANSWER_PARAM = 'saved';

/**
 * With `again=1`, a saved answer that was already marked is marked afresh — a
 * real attempt that spends one of today's answers ("Get new feedback"). Without
 * it a marked answer is never re-marked from a link: its stored feedback is read
 * for free on Saved answers.
 */
export const SAVED_ANSWER_AGAIN_PARAM = 'again';

export function savedAnswerLink(id: string, again = false): string {
  const q = new URLSearchParams({ [SAVED_ANSWER_PARAM]: id });
  if (again) q.set(SAVED_ANSWER_AGAIN_PARAM, '1');
  return `/learn?${q.toString()}`;
}

/** Whether Learn may mark this saved answer: ready ones always, marked ones only on an explicit "again". */
export function canMarkSavedAnswer(status: string, again: boolean): boolean {
  return status === 'ready' || (status === 'marked' && again);
}
