import type { FeedbackPoint, FeedbackPointGroup } from './components/FeedbackPointList';
import type { CoachingIssue, FeedbackV2 } from '../../types';

/**
 * Coach-voice feedback → the shared point list (Learn overhaul Batch 4).
 * Pure. Display selection only: the claims were already filtered once at
 * normalisation (domain/learn/feedback/filterCoachFeedback.ts), and nothing
 * here drops a claim from evidence — "at most 2" is how many the card shows.
 */

/** The coach view shows at most this many fixes; the rest stay in the Full report. */
export const MAX_COACH_FIXES = 2;

const SEVERITY_RANK: Record<string, number> = { major: 0, minor: 1, anglicism: 2, polish: 3 };

type GrammarItem = FeedbackV2['grammar']['critical'][number] & { quote?: string; themeLabel?: string };

function issueFix(issue: CoachingIssue): FeedbackPoint {
  return {
    kind: 'fix',
    quote: issue.quote,
    correction: issue.correction,
    ...(issue.diagnostic ? { why: issue.diagnostic } : {}),
    ...(issue.themeLabel ? { tag: issue.themeLabel } : {}),
  };
}

function grammarFix(item: GrammarItem): FeedbackPoint {
  return {
    kind: 'fix',
    quote: item.quote ?? '',
    correction: item.correction,
    ...(item.diagnostic ? { why: item.diagnostic } : {}),
    ...((item.themeLabel ?? item.theme) ? { tag: item.themeLabel ?? item.theme } : {}),
  };
}

/** The fixes worth showing, most important first: the top-priority issue, then by severity and impact. */
export function selectCoachFixes(feedback: FeedbackV2, max = MAX_COACH_FIXES): FeedbackPoint[] {
  const shown = (quote: string | undefined, correction: string | undefined) =>
    !!quote?.trim() && !!correction?.trim();

  const issues = (feedback.issues ?? []).filter((i) => shown(i.quote, i.correction));
  if (issues.length > 0) {
    const top = feedback.topPriorityIssueId;
    return [...issues]
      .map((issue, index) => ({ issue, index }))
      .sort(
        (a, b) =>
          Number(b.issue.id === top) - Number(a.issue.id === top) ||
          (SEVERITY_RANK[a.issue.severity] ?? 9) - (SEVERITY_RANK[b.issue.severity] ?? 9) ||
          b.issue.marksImpact - a.issue.marksImpact ||
          a.index - b.index,
      )
      .slice(0, max)
      .map(({ issue }) => issueFix(issue));
  }

  // No corrections[] (an older backend, or offline): the grammar items, critical first.
  const grammar = [...(feedback.grammar?.critical ?? []), ...(feedback.grammar?.polish ?? [])] as GrammarItem[];
  return grammar.filter((g) => shown(g.quote, g.correction)).slice(0, max).map(grammarFix);
}

/** "What worked": the one quoted strength (best_moment), else the legacy explanation. */
export function whatWorkedGroup(feedback: Partial<FeedbackV2>): FeedbackPointGroup {
  const text = feedback.best_moment ?? feedback.strongestMomentExplanation;
  return { heading: 'What worked', tone: 'good', points: text ? [{ kind: 'claim', claim: text }] : [] };
}

export function coachPointGroups(feedback: FeedbackV2): FeedbackPointGroup[] {
  return [whatWorkedGroup(feedback), { heading: 'Fix these', tone: 'bad', points: selectCoachFixes(feedback) }];
}
