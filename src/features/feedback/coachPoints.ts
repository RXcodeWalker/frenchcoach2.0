import type { FeedbackPoint, FeedbackPointGroup } from './components/FeedbackPointList';
import { sameQuote } from '../../domain/examFeedback/shared/quoteRules';
import type { CoachingIssue, FeedbackV2 } from '../../types';

/**
 * Coach-voice feedback → the shared point list (Learn overhaul Batch 4,
 * detail restored in Batch 6a). Pure. Display selection only: the claims were
 * already filtered once at normalisation (domain/learn/feedback/
 * filterCoachFeedback.ts), and nothing here drops a claim from evidence —
 * every fix is shown, the first FIRST_FIXES under "Fix these first" and the
 * rest under "Also worth fixing".
 */

/** How many fixes lead, under "Fix these first"; every other fix is still shown, under "Also worth fixing". */
export const FIRST_FIXES = 2;

/** The heading of the group the teacher turns into "Try it first" nudges. */
export const FIX_FIRST_HEADING = 'Fix these first';

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

interface RankedFix {
  point: FeedbackPoint & { kind: 'fix' };
  top: boolean;
  severity: string;
  impact: number;
  index: number;
}

/**
 * Every fix worth showing, most important first: the top-priority issue, then
 * by severity and impact. corrections[] (issues) and the grammar items restate
 * the same errors, so a grammar item whose quote an issue already covers is
 * dropped (deduplicated by quote, ignoring case and edge punctuation).
 */
export function selectCoachFixes(feedback: FeedbackV2): FeedbackPoint[] {
  const shown = (quote: string | undefined, correction: string | undefined) =>
    !!quote?.trim() && !!correction?.trim();

  const ranked: RankedFix[] = [];
  const add = (fix: RankedFix) => {
    if (!ranked.some((r) => sameQuote(r.point.quote, fix.point.quote))) ranked.push(fix);
  };

  const top = feedback.topPriorityIssueId;
  for (const issue of feedback.issues ?? []) {
    if (!shown(issue.quote, issue.correction)) continue;
    add({
      point: issueFix(issue) as RankedFix['point'],
      top: issue.id === top,
      severity: issue.severity,
      impact: issue.marksImpact,
      index: ranked.length,
    });
  }
  // The grammar items, critical first — the only fixes on an older backend or offline.
  for (const [bucket, items] of [
    ['major', feedback.grammar?.critical ?? []],
    ['minor', feedback.grammar?.polish ?? []],
  ] as const) {
    for (const item of items as GrammarItem[]) {
      if (!shown(item.quote, item.correction)) continue;
      add({
        point: grammarFix(item) as RankedFix['point'],
        top: false,
        severity: item.severity ?? bucket,
        impact: 0,
        index: ranked.length,
      });
    }
  }

  return ranked
    .sort(
      (a, b) =>
        Number(b.top) - Number(a.top) ||
        (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9) ||
        b.impact - a.impact ||
        a.index - b.index,
    )
    .map((r) => r.point);
}

/** "What you did well": every quoted strength, else the one best_moment, else the legacy explanation. */
export function whatWorkedGroup(feedback: Partial<FeedbackV2>): FeedbackPointGroup {
  const strengths = (feedback.strengths ?? []).filter((s) => s.quote.trim() && s.why.trim());
  const fallback = feedback.best_moment || feedback.strongestMomentExplanation;
  const points: FeedbackPoint[] =
    strengths.length > 0
      ? strengths.map((s) => ({ kind: 'claim', claim: s.why, quote: s.quote }))
      : fallback
        ? [{ kind: 'claim', claim: fallback }]
        : [];
  return { heading: 'What you did well', tone: 'good', points };
}

export function coachPointGroups(feedback: FeedbackV2): FeedbackPointGroup[] {
  const fixes = selectCoachFixes(feedback);
  return [
    whatWorkedGroup(feedback),
    { heading: FIX_FIRST_HEADING, tone: 'bad', points: fixes.slice(0, FIRST_FIXES) },
    { heading: 'Also worth fixing', tone: 'bad', points: fixes.slice(FIRST_FIXES) },
  ];
}

/** Vocabulary upgrades or expansion ideas exist to show under "Go further". */
export function hasGoFurther(feedback: FeedbackV2): boolean {
  return (
    (feedback.vocabularyV2?.length ?? 0) > 0 ||
    (feedback.vocabulary?.length ?? 0) > 0 ||
    (feedback.expansion_ideas?.length ?? 0) > 0
  );
}
