/**
 * The Junior mic control (junior-track §4): one big tap to start, a second tap
 * (or the silence rule) to stop — no hold-to-talk. At least 72 px, and it
 * pulses while listening. The record control is wrapped in `SpeakingConsentGate`
 * by the caller, exactly as on every other screen.
 */
import { Mic, Square } from 'lucide-react';

interface Props {
  listening: boolean;
  /** True while a finished capture is being read; further taps are ignored. */
  busy: boolean;
  disabled?: boolean;
  onTap: () => void;
}

/** The smallest the button may be, in CSS px (junior-track §4). */
export const MIC_BUTTON_MIN_PX = 72;

export function MicButton({ listening, busy, disabled = false, onTap }: Props) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        data-testid="junior-mic"
        aria-label={listening ? 'Stop' : 'Talk to Léo'}
        aria-pressed={listening}
        disabled={disabled || busy}
        onClick={onTap}
        style={{ minWidth: MIC_BUTTON_MIN_PX, minHeight: MIC_BUTTON_MIN_PX }}
        className={`relative flex h-20 w-20 items-center justify-center rounded-full bg-action text-action-ink transition-transform active:scale-95 disabled:opacity-40 ${
          listening ? 'motion-safe:animate-pulse ring-4 ring-action-soft' : ''
        }`}
      >
        {listening ? <Square size={28} aria-hidden="true" /> : <Mic size={32} aria-hidden="true" />}
      </button>
      {listening && (
        <p data-testid="junior-listening" role="status" className="flex items-center gap-1.5 text-label text-action-text">
          <span aria-hidden="true">👂</span> Léo is listening
        </p>
      )}
    </div>
  );
}
