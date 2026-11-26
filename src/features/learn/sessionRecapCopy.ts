// The headline of the Learn session summary, worked out from what actually
// happened in THIS session. Pure. Nothing here is the same for everyone: the
// title follows the learner's own average (or says plainly that nothing was
// graded), and the line is facts — answers, words, minutes, and the skill that
// moved most — never a generic cheer. No emoji; no numbers about mastery.

export interface SummaryFacts {
  topicLabel: string;
  /** Questions completed this session. */
  answered: number;
  /** Average of the real (graded) scores at the learner's marking level; null when none were graded. */
  avgScore: number | null;
  words: number;
  minutes: number;
  mastered: boolean;
  /** The skill that rose most this session, if any rose. */
  topSkill: string | null;
}

/** An average at or above this is called strong; the same line the old confetti used. */
export const STRONG_SESSION_AVERAGE = 7;
const SOLID_SESSION_AVERAGE = 5;

export function summaryHeadline(f: SummaryFacts): { title: string; line: string } {
  const title = headlineTitle(f);
  const facts: string[] = [];
  if (f.answered > 0) facts.push(`${f.answered} answer${f.answered === 1 ? '' : 's'}`);
  if (f.words > 0) facts.push(`${f.words} word${f.words === 1 ? '' : 's'} spoken`);
  facts.push(f.minutes < 1 ? 'under a minute' : `${f.minutes} min`);
  let line = `${f.topicLabel}: ${facts.join(', ')}.`;
  if (f.answered > 0 && f.avgScore == null) line += ' Not graded this time, so no score counts.';
  else if (f.topSkill) line += ` ${f.topSkill} moved up the most.`;
  return { title, line };
}

function headlineTitle(f: SummaryFacts): string {
  if (f.answered === 0) return 'Session ended early';
  if (f.mastered) return `${f.topicLabel} mastered`;
  if (f.avgScore == null) return 'Answers saved';
  if (f.avgScore >= STRONG_SESSION_AVERAGE) return 'A strong session';
  if (f.avgScore >= SOLID_SESSION_AVERAGE) return 'Solid practice';
  return 'You showed up and spoke';
}
