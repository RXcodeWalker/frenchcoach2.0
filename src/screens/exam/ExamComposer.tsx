import { useEffect, useRef, useState } from 'react';
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
export function ExamComposer({ recording, disabled, onStartRecording, onSubmitSpeech, onSubmitText }: Props) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rec = recording.isRecording;
  const { consentStatus } = useAuth();
  const consentPending = consentStatus === 'pending';

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

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder="Écris ta réponse…"
          className="flex-1 resize-none rounded-control surface-recessed px-3 py-2.5 text-body-base text-ink
            placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-action disabled:opacity-40 max-h-32"
        />

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
