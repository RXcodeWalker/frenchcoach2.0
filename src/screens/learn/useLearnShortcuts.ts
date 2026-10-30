import { useEffect, useRef } from 'react';
import {
  hasCommandModifier,
  isChordPending,
  isDialogOpen,
  isTypingTarget,
} from '../../lib/keyboardShortcuts';

/** The Continue / Next-question button carries this, so `n` only works when it is on screen. */
export const CONTINUE_SHORTCUT_ATTR = 'data-shortcut';
export const CONTINUE_SHORTCUT_VALUE = 'continue';

interface Options {
  /** A question is showing and nothing is being recorded or processed. */
  canAnswer: boolean;
  /** The learner is reading feedback. */
  inFeedback: boolean;
  onHint: () => void;
  onSkip: () => void;
}

/**
 * Learn's single-key shortcuts: h hint, s skip (while a question is showing),
 * n next question (while feedback is). Shift+letter is navigation and `g` + letter
 * is a chord, so both are left alone, as are typing, dialogs and Ctrl/Cmd/Alt.
 */
export function useLearnShortcuts({ canAnswer, inFeedback, onHint, onSkip }: Options): void {
  const latest = useRef({ canAnswer, inFeedback, onHint, onSkip });
  latest.current = { canAnswer, inFeedback, onHint, onSkip };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.shiftKey || hasCommandModifier(e)) return;
      if (isChordPending() || isTypingTarget(e.target) || isDialogOpen()) return;
      const { canAnswer, inFeedback, onHint, onSkip } = latest.current;
      const key = e.key.toLowerCase();

      if (canAnswer && key === 'h') {
        e.preventDefault();
        onHint();
      } else if (canAnswer && key === 's') {
        e.preventDefault();
        onSkip();
      } else if (inFeedback && key === 'n') {
        const next = document.querySelector<HTMLElement>(`[${CONTINUE_SHORTCUT_ATTR}="${CONTINUE_SHORTCUT_VALUE}"]`);
        if (next && !(next as HTMLButtonElement).disabled) {
          e.preventDefault();
          next.click();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
