import { Mic } from 'lucide-react';
import { LevelBars } from '../recording/LevelBars';
import type { MicLevelController } from '../recording/useMicLevel';

/** The record / stop control (the `record` motion is the level bars). */
export function RecordControl({
  recording,
  checking,
  disabled,
  label,
  onStart,
  onStop,
  level,
  size = 'lg',
}: {
  recording: boolean;
  checking: boolean;
  disabled: boolean;
  label: string;
  onStart: () => void;
  onStop: () => void;
  level: MicLevelController;
  size?: 'lg' | 'md';
}) {
  const dim = size === 'lg' ? 'h-16 w-16' : 'h-12 w-12';
  return (
    <div className="flex flex-col items-center gap-2">
      {recording ? (
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop and check"
          className={`flex ${dim} items-center justify-center rounded-pill bg-ink shadow-[0_0_0_6px_var(--surface),0_0_0_7px_var(--hairline-strong)]
            transition-transform duration-press active:scale-[.97]`}
        >
          <span className="h-[18px] w-[18px] rounded-[4px] bg-surface" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onStart}
          disabled={disabled || checking}
          aria-label={label}
          className={`flex ${dim} items-center justify-center rounded-pill bg-action text-action-ink
            transition-[background-color,transform] duration-state ease-smooth hover:bg-action-hover active:scale-[.97] active:bg-action-press
            disabled:bg-track disabled:text-ink-subtle`}
        >
          <Mic size={size === 'lg' ? 24 : 20} aria-hidden="true" />
        </button>
      )}
      <LevelBars active={recording} source={level} centred />
      <p className="text-caption text-ink-muted" aria-live="polite">
        {checking ? 'Checking…' : recording ? 'Listening… tap to stop' : label}
      </p>
    </div>
  );
}
