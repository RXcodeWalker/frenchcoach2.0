/**
 * The Junior mic control (junior-track §4): one big tap to start, a second tap
 * (or the silence rule) to stop — no hold-to-talk. At least 72 px. While it
 * listens, the live waveform (the design system's `record` motion) follows the
 * voice and a still ring marks the button; nothing pulses. The record control is
 * wrapped in `SpeakingConsentGate` by the caller, exactly as on every other screen.
 */
import { Ear, Mic, Square } from 'lucide-react';
import { LevelBars } from '../recording/LevelBars';
import type { MicLevelController } from '../recording/useMicLevel';

interface Props {
  listening: boolean;
  /** True while a finished capture is being read; further taps are ignored. */
  busy: boolean;
  disabled?: boolean;
  onTap: () => void;
  /** The live mic level; the waveform shows while listening when this is given. */
  level?: MicLevelController;
}

/** The smallest the button may be, in CSS px (junior-track §4). */
export const MIC_BUTTON_MIN_PX = 72;

export function MicButton({ listening, busy, disabled = false, onTap, level }: Props) {
  const off = disabled || busy;
  return (
    <div className="flex flex-col items-center gap-3">
      {listening && level && <LevelBars active source={level} centred />}
      <button
        type="button"
        data-testid="junior-mic"
        aria-label={listening ? 'Stop' : 'Talk to Léo'}
        aria-pressed={listening}
        disabled={off}
        onClick={onTap}
        style={{ minWidth: MIC_BUTTON_MIN_PX, minHeight: MIC_BUTTON_MIN_PX }}
        className={`flex h-[72px] w-[72px] items-center justify-center rounded-full border-2
          transition-[background-color,border-color,color,transform] duration-state ease-smooth active:scale-[.97] active:duration-press
          disabled:cursor-default disabled:active:scale-100
          ${
            off
              ? 'border-transparent bg-track text-ink-subtle'
              : listening
                ? 'border-action bg-surface text-action-text'
                : 'border-transparent bg-action text-action-ink hover:bg-action-hover active:bg-action-press'
          }`}
      >
        {listening ? <Square size={26} fill="currentColor" aria-hidden="true" /> : <Mic size={30} aria-hidden="true" />}
      </button>
      {listening ? (
        <p data-testid="junior-listening" role="status" className="flex items-center gap-1.5 text-label text-action-text">
          <Ear size={16} aria-hidden="true" /> Léo is listening
        </p>
      ) : (
        <p className="text-label text-ink-muted">{busy ? 'Léo is thinking…' : 'Tap, then speak'}</p>
      )}
    </div>
  );
}
