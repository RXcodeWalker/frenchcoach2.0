import { useCallback, useEffect, useRef, useState } from 'react';
import type { RevealKind } from './ui/AnswerReveal';
import { TTS } from '../../services/tts/ttsService';
import {
  hasCommandModifier,
  isChordPending,
  isDialogOpen,
  isTypingTarget,
} from '../../lib/keyboardShortcuts';

/**
 * `setTimeout` that is cancelled when the mode unmounts, so leaving a run
 * mid-feedback can't end or advance it from a screen that is gone.
 */
export function useLater(): (fn: () => void, ms: number) => void {
  const ids = useRef<number[]>([]);
  useEffect(
    () => () => {
      ids.current.forEach((id) => window.clearTimeout(id));
      ids.current = [];
    },
    []
  );
  return useCallback((fn, ms) => {
    ids.current.push(window.setTimeout(fn, ms));
  }, []);
}

/** True once a real French voice is available — an English voice never reads French here. */
export function useFrenchVoice(): boolean {
  const [ready, setReady] = useState(() => TTS.isSupported() && TTS.canSpeakFrench());
  useEffect(() => {
    if (!TTS.isSupported()) return;
    let live = true;
    void TTS.ensureVoiceReady().then(() => {
      if (live) setReady(TTS.canSpeakFrench());
    });
    return () => {
      live = false;
    };
  }, []);
  return ready;
}

/**
 * 1–4 pick the matching answer. Stands down for typing targets, an open
 * dialog, Ctrl/Cmd/Alt chords, Shift and a pending `g` chord — the same
 * guards as every other screen shortcut (`lib/keyboardShortcuts.ts`).
 */
export function useDigitKeys(enabled: boolean, count: number, onPick: (index: number) => void): void {
  const pick = useRef(onPick);
  pick.current = onPick;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.shiftKey || e.repeat) return;
      if (hasCommandModifier(e) || isTypingTarget(e.target) || isDialogOpen() || isChordPending()) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= count) {
        e.preventDefault();
        pick.current(n - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, count]);
}

export interface TypedReveal {
  kind: RevealKind;
  userAnswer?: string;
}

/**
 * State shared by the typed-answer modes (Hardcore, Speed Blitz, Arena). The
 * input element persists across questions — only its contents reset — so a
 * phone keyboard stays open from one word to the next.
 */
export function useTypedRound(questionId: string | undefined) {
  const [value, setValue] = useState('');
  const [reveal, setReveal] = useState<TypedReveal | null>(null);
  const lockedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    lockedRef.current = false;
    setReveal(null);
    setValue('');
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [questionId]);

  return { value, setValue, reveal, setReveal, lockedRef, inputRef };
}
