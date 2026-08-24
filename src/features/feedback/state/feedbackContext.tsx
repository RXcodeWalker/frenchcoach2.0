import { createContext, useContext, useReducer, type ReactNode } from 'react';

interface FeedbackUIState {
  openCardIds: Set<string>;
  deepMode: boolean;
  selectedIssueId: string | null;
  highlightedCardId: string | null;
  /** Docs Stage 6: segmented control at the top of the feedback stack. */
  viewMode: 'coach' | 'report';
  /** Docs Stage 6: report's explicit "expand all" for collapsed lessons. */
  expandAllLessons: boolean;
}

type Action =
  | { type: 'TOGGLE_CARD'; id: string }
  | { type: 'OPEN_CARD'; id: string }
  | { type: 'SET_DEEP_MODE'; value: boolean }
  | { type: 'SELECT_ISSUE'; issueId: string | null }
  | { type: 'HIGHLIGHT_CARD'; cardId: string | null }
  | { type: 'SET_VIEW_MODE'; mode: 'coach' | 'report' }
  | { type: 'SET_EXPAND_ALL_LESSONS'; value: boolean };

function reducer(state: FeedbackUIState, action: Action): FeedbackUIState {
  switch (action.type) {
    case 'TOGGLE_CARD': {
      const next = new Set(state.openCardIds);
      if (next.has(action.id)) next.delete(action.id); else next.add(action.id);
      return { ...state, openCardIds: next };
    }
    case 'OPEN_CARD': {
      const next = new Set(state.openCardIds);
      next.add(action.id);
      return { ...state, openCardIds: next };
    }
    case 'SET_DEEP_MODE':
      return { ...state, deepMode: action.value };
    case 'SELECT_ISSUE':
      return { ...state, selectedIssueId: action.issueId };
    case 'HIGHLIGHT_CARD':
      return { ...state, highlightedCardId: action.cardId };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.mode };
    case 'SET_EXPAND_ALL_LESSONS':
      return { ...state, expandAllLessons: action.value };
    default:
      return state;
  }
}

const FeedbackContext = createContext<{
  state: FeedbackUIState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    openCardIds: new Set(['top-priority']),
    deepMode: false,
    selectedIssueId: null,
    highlightedCardId: null,
    viewMode: 'coach',
    expandAllLessons: false,
  });
  return <FeedbackContext.Provider value={{ state, dispatch }}>{children}</FeedbackContext.Provider>;
}

export function useFeedbackContext() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedbackContext must be used inside FeedbackProvider');
  return ctx;
}
