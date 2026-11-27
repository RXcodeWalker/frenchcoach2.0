import type { CoachingIssue, IssueCategory } from '../../../types';

/**
 * The Breakdown's "mistakes by type": the corrections already shown, counted
 * by their display label. Pure and count-only — it adds no claim and drops
 * none; an issue without a theme label is counted under its category.
 */

const CATEGORY_LABEL: Record<IssueCategory, string> = {
  grammar: 'Grammar',
  tense: 'Tense',
  gender: 'Gender',
  agreement: 'Agreement',
  preposition: 'Preposition',
  elision: 'Elision',
  auxiliary: 'Auxiliary',
  subjunctive: 'Subjunctive',
  anglicism: 'Anglicism',
  vocabulary: 'Vocabulary',
  connectors: 'Linking words',
  pronunciation: 'Pronunciation',
  rhythm: 'Rhythm',
  fluency: 'Fluency',
};

export interface CorrectionType {
  label: string;
  count: number;
}

/** Most frequent first; ties keep the order the corrections are listed in. */
export function correctionTypes(issues: readonly CoachingIssue[]): CorrectionType[] {
  const counts = new Map<string, number>();
  for (const issue of issues) {
    const label = issue.themeLabel?.trim() || CATEGORY_LABEL[issue.category] || 'Other';
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}
