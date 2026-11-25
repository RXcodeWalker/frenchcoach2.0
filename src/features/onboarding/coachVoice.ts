/**
 * The coach's voice during first-run setup: warm, a little playful, always
 * professional. First person ("I"), a sprinkle of French, no emoji.
 *
 * Pure strings, all in one place so the tone stays consistent and a test can
 * hold every line to the same honesty rules as `planSummary.ts`:
 *   - praise is for showing up and speaking, never for how well they spoke;
 *   - no promise about a mark, grade, band, level or exam result;
 *   - no invented numbers (the only digits are counts the caller passes in).
 *
 * None of this adds a screen, a tap or a wait: it only replaces the plain
 * subtitles that were already on the screens a learner passes through.
 */

/** " Léa" for a learner with a name, "" without — so a line reads well either way. */
function withName(name: string | undefined | null, lead = ', '): string {
  const n = name?.trim();
  return n ? `${lead}${n}` : '';
}

export type SurveyStep = 'exam_board' | 'exam_date' | 'goal_intent';

/** The line under each survey question (first run only; editing goals from Profile keeps the plain wording). */
export function surveyNote(step: SurveyStep): string {
  switch (step) {
    case 'exam_board':
      return "Bienvenue! Tell me what you're working towards and I'll shape every session around it.";
    case 'exam_date':
      return "Great choice. A date helps me pace your practice, and it's fine to skip it for now.";
    case 'goal_intent':
      return 'Last question, then we build your plan. What matters most to you?';
  }
}

/** Under "Building your plan": the thank-you for the answers, not a progress report. */
export function buildingNote(name?: string | null): string {
  return `Merci${withName(name)}. I'm shaping every session around your answers.`;
}

/** Under "You're all set": the coach says thank you, and what it will be there for. */
export function thanksNote(name?: string | null): string {
  return `Thank you for choosing me${withName(name)}. I built this plan from your answers, and I'll be right beside you for every answer, streak and stumble.`;
}

/** Under the placement check's heading. The first question gets the reassurance; the rest get a nudge. */
export function placementNote(questionIndex: number, total: number): string {
  if (questionIndex <= 0) {
    return `${total === 5 ? 'Five' : 'A few'} short questions, out loud. This is just me getting to know you. No marks, no pressure.`;
  }
  const remaining = total - questionIndex; // this question included
  if (remaining <= 1) return 'Last one. Finish strong.';
  if (remaining === 2) return 'Nearly there: just this one and one more.';
  if (questionIndex * 2 >= total - 1) return 'More than halfway. Nice and steady.';
  return "Good start. Keep going, you're finding your voice.";
}

/** The result card's opening: praise for the act of speaking, then the plain facts. */
export function placementBravo(name: string | null | undefined, answered: number, total: number): string {
  return `Bravo${withName(name)}! You answered ${answered} of ${total} questions out loud, which is the hardest part of learning any language. There are no marks; this only sets your first questions.`;
}
