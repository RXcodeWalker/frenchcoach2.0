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

/**
 * Adaptive card plan (docs Stage 5) — which optional cards render, and
 * whether the corrections lesson content should default open, given the
 * depth actually applied to this response and what data arrived.
 *
 * `feedback.effectiveDepth` is the server's post-clamp value (docs Stage 5
 * correctness note) — never recomputed client-side, since the server may
 * have clamped a 'deep' request down and the cards must reflect what was
 * actually delivered, not what was requested. When it's absent (an old
 * backend that predates this field — invariant #12, both deploy orders stay
 * safe), the plan falls back to data-shape only: every card with content
 * renders, none of that is a guess about depth.
 */
export interface CardPlan {
  showExpansionIdeas: boolean;
  showAdvancedAnswer: boolean;
  lessonsDefaultOpen: boolean;
}

export function selectCardPlan(feedback: FeedbackV2): CardPlan {
  const depth = feedback.effectiveDepth;
  const hasExpansionIdeas = (feedback.expansion_ideas?.length ?? 0) > 0;
  const hasAdvancedAnswer = !!feedback.advanced_answer;

  if (!depth) {
    // No signal — render whatever data arrived, expand nothing extra.
    return {
      showExpansionIdeas: hasExpansionIdeas,
      showAdvancedAnswer: hasAdvancedAnswer,
      lessonsDefaultOpen: false,
    };
  }

  if (depth === 'brief') {
    // A long, clean answer earned brevity — the ladder/advanced-answer
    // cards would be more content than the response justified.
    return { showExpansionIdeas: false, showAdvancedAnswer: false, lessonsDefaultOpen: false };
  }

  if (depth === 'deep') {
    // Short-with-errors or a missed demand earned depth — surface every
    // available extension and open lessons by default rather than making
    // the learner hunt for them.
    return {
      showExpansionIdeas: hasExpansionIdeas,
      showAdvancedAnswer: hasAdvancedAnswer,
      lessonsDefaultOpen: true,
    };
  }

  return {
    showExpansionIdeas: hasExpansionIdeas,
    showAdvancedAnswer: hasAdvancedAnswer,
    lessonsDefaultOpen: false,
  };
}
