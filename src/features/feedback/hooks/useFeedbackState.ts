import { useMemo } from 'react';
import { useFeedbackContext } from '../state/feedbackContext';
import { selectTopPriority, selectMajorIssues, selectPolishIssues, selectShowExaminerNotebook } from '../state/selectors';
import type { FeedbackV2 } from '../../../types';

export function useFeedbackState(feedback: FeedbackV2) {
  const { state, dispatch } = useFeedbackContext();

  const topPriority = useMemo(() => selectTopPriority(feedback), [feedback]);
  const majorIssues = useMemo(() => selectMajorIssues(feedback), [feedback]);
  const polishIssues = useMemo(() => selectPolishIssues(feedback), [feedback]);
  const showExaminerNotebook = useMemo(() => selectShowExaminerNotebook(feedback), [feedback]);

  function isCardOpen(id: string) { return state.openCardIds.has(id); }

  function openCardFromIssue(issueId: string) {
    dispatch({ type: 'SELECT_ISSUE', issueId });
    // Figure out which card owns this issue
    const issue = feedback.issues?.find(i => i.id === issueId);
    if (!issue) return;
    const cardId = issueId === feedback.topPriorityIssueId ? 'top-priority' : 'corrections';
    dispatch({ type: 'OPEN_CARD', id: cardId });
    dispatch({ type: 'HIGHLIGHT_CARD', cardId });
    setTimeout(() => dispatch({ type: 'HIGHLIGHT_CARD', cardId: null }), 1200);
  }

  return {
    state, dispatch,
    topPriority, majorIssues, polishIssues, showExaminerNotebook,
    isCardOpen, openCardFromIssue,
  };
}
