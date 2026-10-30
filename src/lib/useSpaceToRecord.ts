import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { shouldRecordOnSpace } from './keyboardShortcuts';

interface Options {
  /** The screen can record right now (not processing, not blocked, not showing a result). */
  enabled: boolean;
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
}

/**
 * Space starts and stops the recorder on any practice screen. One implementation so every
 * recording surface behaves the same (see `shouldRecordOnSpace` for what it stands down for).
 * Stands down for a `pending` guardian-consent account. The keyup is swallowed too, otherwise a focused button would also "click" when Space is released.
 */
/** useAuth throws outside an AuthProvider (isolated renders); there is then no gate to honour. */
function useConsentPending(): boolean {
  try {
    return useAuth().consentStatus === 'pending';
  } catch {
    return false;
  }
}

export function useSpaceToRecord({ enabled, isRecording, onStart, onStop }: Options): void {
  // The shortcut must never arm a mic the record control is hiding: a `pending` under-13 account
  // sees the guardian notice instead of the control (SpeakingConsentGate), so Space does nothing.
  const consentPending = useConsentPending();
  const active = enabled && !consentPending;
  const latest = useRef({ isRecording, onStart, onStop });
  latest.current = { isRecording, onStart, onStop };
  const swallowKeyUp = useRef(false);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!shouldRecordOnSpace(e)) return;
      e.preventDefault();
      swallowKeyUp.current = true;
      const { isRecording, onStart, onStop } = latest.current;
      if (isRecording) onStop();
      else onStart();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || !swallowKeyUp.current) return;
      swallowKeyUp.current = false;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [active]);
}
