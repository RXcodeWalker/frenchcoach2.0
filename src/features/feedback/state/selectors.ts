import type { FeedbackV2, CoachingIssue, VocabularyEntry } from '../../../types';

export function selectTopPriority(feedback: FeedbackV2): CoachingIssue | undefined {
  if (!feedback.issues?.length) return undefined;
  if (feedback.topPriorityIssueId) {
    return feedback.issues.find(i => i.id === feedback.topPriorityIssueId);
  }
  return [...feedback.issues].sort((a, b) => b.marksImpact - a.marksImpact)[0];
}

export function selectMajorIssues(feedback: FeedbackV2): CoachingIssue[] {
  return (feedback.issues ?? []).filter(i => i.severity === 'major' || i.severity === 'minor');
}

export function selectPolishIssues(feedback: FeedbackV2): CoachingIssue[] {
  return (feedback.issues ?? []).filter(i => i.severity === 'polish' || i.severity === 'anglicism');
}

export function selectVocabByTier(feedback: FeedbackV2): Record<string, VocabularyEntry[]> {
  const entries = feedback.vocabularyV2 ?? [];
  const grouped: Record<string, VocabularyEntry[]> = {};
  for (const entry of entries) {
    (grouped[entry.tier] ??= []).push(entry);
  }
  return grouped;
}

export function selectShowExaminerNotebook(feedback: FeedbackV2): boolean {
  const level = feedback.cefrLevel ?? 'A2';
  return ['B1', 'B2', 'C1', 'C2'].includes(level);
}
