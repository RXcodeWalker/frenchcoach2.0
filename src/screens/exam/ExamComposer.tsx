import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AlertTriangle, Mic, Send, Square } from 'lucide-react';
import { ScrollingWaveform } from '../../features/recording/ScrollingWaveform';
import { SpeakingConsentGate } from '../../components/SpeakingConsentGate';
import { useAuth } from '../../context/AuthContext';
import type { RecordingState } from '../../features/recording/useRecording';

interface Props {
  recording: RecordingState;
  disabled: boolean;
  onStartRecording: () => void;
  onSubmitSpeech: () => void;
  onSubmitText: (text: string) => void;
}

/**
 * Mic + text field, both live every turn (W4). Recording is never
 * auto-started by the caller — the candidate chooses mic or keyboard each
 * turn, matching the chat metaphor this screen adopts (competitor-take
 * "dual mic/text input" in the exam-overhaul plan). Typing takes over from
 * an in-progress recording: starting to type stops it in the background
 * (its transcript discarded, never awaited) so the mic is never left
 * capturing once the candidate has switched to the keyboard — this is what
 * lets a typed submit "skip recording.stop()" per the plan, since by the
 * time Send is pressed nothing is left running to stop.
 */
/** Default autosize cap: grows up to this many lines, then scrolls internally. */
const AUTO_MAX_LINES = 4;
/** Manual drag-from-top resize handle can stretch the box up to this many lines. */
const MANUAL_MAX_LINES = 6;

export function ExamComposer({ recording, disabled, onStartRecording, onSubmitSpeech, onSubmitText }: Props) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  /** Explicit height (px) set by dragging the resize handle; null means "autosize". */
  const [manualHeight, setManualHeight] = useState<number | null>(null);
  const rec = recording.isRecording;
  const { consentStatus } = useAuth();
  const consentPending = consentStatus === 'pending';

  const measureBox = () => {
    const el = textareaRef.current;
    if (!el) return null;
    const styles = getComputedStyle(el);
    const lineHeight = parseFloat(styles.lineHeight) || 20;
    const paddingTop = parseFloat(styles.paddingTop) || 0;
    const paddingBottom = parseFloat(styles.paddingBottom) || 0;
    const vertical = paddingTop + paddingBottom;
    return {
      lineHeight,
      vertical,
      minHeight: lineHeight + vertical,
      autoMaxHeight: lineHeight * AUTO_MAX_LINES + vertical,
      manualMaxHeight: lineHeight * MANUAL_MAX_LINES + vertical,
    };
  };

  // Autosize on content change (typing, pasting, or programmatic clears) —
  // grows with the answer up to AUTO_MAX_LINES, then scrolls internally
  // instead of growing further. Skipped once the user has manually resized.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    const box = measureBox();
    if (!el || !box) return;
    if (manualHeight != null) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, box.autoMaxHeight);
    el.style.height = `${Math.max(next, box.minHeight)}px`;
    el.style.overflowY = el.scrollHeight > box.autoMaxHeight ? 'auto' : 'hidden';
  }, [text, manualHeight]);

  // Manually resized height still needs to keep scroll in sync as content changes.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el || manualHeight == null) return;
    el.style.height = `${manualHeight}px`;
    el.style.overflowY = el.scrollHeight > manualHeight ? 'auto' : 'hidden';
  }, [text, manualHeight]);

  const handleResizeStart = (e: React.PointerEvent) => {
    const el = textareaRef.current;
    const box = measureBox();
    if (!el || !box) return;
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = el.getBoundingClientRect().height;
    const pointerId = e.pointerId;
    (e.currentTarget as Element).setPointerCapture(pointerId);

    const onMove = (ev: PointerEvent) => {
      // Dragging the top edge upward should grow the box.
      const delta = startY - ev.clientY;
      const next = Math.min(box.manualMaxHeight, Math.max(box.minHeight, startHeight + delta));
      setManualHeight(next);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (disabled || consentPending) return;
      if (e.code !== 'Space') return;
      if (document.activeElement === textareaRef.current) return;
      if (text.trim().length > 0) return;
      e.preventDefault();
      if (rec) onSubmitSpeech();
      else onStartRecording();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [disabled, consentPending, rec, text, onStartRecording, onSubmitSpeech]);

  const handleTextChange = (value: string) => {
    setText(value);
    if (value.length > 0 && rec) void recording.stop();
  };

  const submitText = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    setText('');
    setManualHeight(null);
    onSubmitText(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitText();
    }
  };

  return (
    <div className="w-full space-y-3">
      {!recording.sttSupported && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25">
          <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-300 leading-snug">
            This browser doesn&rsquo;t support live speech transcription — your answer will be transcribed after you
            submit. Try Chrome or Edge for the best experience, or type your answer instead.
          </p>
        </div>
      )}

      {rec && (
        <div className="space-y-1">
          <ScrollingWaveform isRecording={rec} source={recording.micLevel} />
        </div>
      )}

      {/*
       * Wraps only the mic control, per Phase 1.6 Part C / ADR 0006 — the
       * text field below is never gated, since typing captures no audio.
       * SpeakingConsentGate's waiting card is full-width chrome, not an
       * icon-sized affordance, so it gets its own row above the input bar
       * rather than swapping in for the mic button inline; the mic button
       * itself is simply absent from the row while pending (RoleplaySession's
       * <span /> placeholder pattern — the gate's real content lives in the
       * sibling branch below, not inside these children).
       */}
      {consentPending && (
        <SpeakingConsentGate>
          <span />
        </SpeakingConsentGate>
      )}

      <div className="flex items-end gap-2">
        {!consentPending && (
          <button
            onClick={rec ? onSubmitSpeech : onStartRecording}
            disabled={disabled}
            aria-label={rec ? 'Stop and submit' : 'Start recording'}
            className="shrink-0 w-11 h-11 rounded-pill bg-action hover:bg-action-hover disabled:opacity-40
              flex items-center justify-center transition-colors duration-state ease-smooth"
          >
            {rec ? <Square size={16} className="fill-action-ink text-action-ink" /> : <Mic size={18} className="text-action-ink" />}
          </button>
        )}

        <div className="relative flex-1">
          {/* Drag-from-top resize handle — grows the box up to MANUAL_MAX_LINES lines. */}
          <div
            onPointerDown={handleResizeStart}
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-10 h-3 flex items-center justify-center
              cursor-row-resize touch-none z-10"
            aria-hidden="true"
          >
            <div className="w-8 h-1 rounded-pill bg-hairline-strong" />
          </div>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={1}
            placeholder="Écris ta réponse…"
            className="w-full resize-none rounded-control surface-recessed px-3 py-2.5 text-body-base text-ink
              placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-action disabled:opacity-40"
          />
        </div>

        <button
          onClick={submitText}
          disabled={disabled || text.trim().length === 0}
          aria-label="Send"
          className="shrink-0 w-11 h-11 rounded-pill border border-hairline-strong text-ink disabled:opacity-30
            hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] flex items-center justify-center
            transition-colors duration-state ease-smooth"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
