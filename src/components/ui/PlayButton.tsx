import type { ReactNode } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { usePlayControl } from '../../services/audio/usePlayControl';

/**
 * A "▶" for any sound — a native line, the learner's own recording, a word.
 * Tapping it while it plays pauses it, tapping again resumes, and the ↺ next to
 * it (shown while it is playing or paused) plays it from the start
 * (`services/audio/playbackControl.ts`). `play` must resolve when the sound
 * has finished.
 */
interface Props {
  play: () => Promise<unknown>;
  /** The idle label, e.g. "Native" or "Your answer". Also names the pause/restart controls. */
  label: string;
  /** The idle icon (default ▶). */
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'quiet';
  size?: 'lg' | 'md' | 'sm';
  disabled?: boolean;
  className?: string;
  testId?: string;
}

export function PlayButton({ play, label, icon, variant = 'secondary', size = 'sm', disabled, className = '', testId }: Props) {
  const control = usePlayControl(play);
  const { status } = control;
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <Button
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={control.toggle}
        aria-label={status === 'playing' ? `Pause ${label}` : status === 'paused' ? `Resume ${label}` : undefined}
        data-testid={testId}
        data-playback={status}
      >
        {status === 'playing' ? (
          <Pause size={16} aria-hidden="true" />
        ) : status === 'paused' ? (
          <Play size={16} aria-hidden="true" />
        ) : (
          (icon ?? <Play size={16} aria-hidden="true" />)
        )}
        {status === 'playing' ? 'Pause' : status === 'paused' ? 'Resume' : label}
      </Button>
      {status !== 'idle' && <RestartButton label={label} onClick={control.restart} />}
    </span>
  );
}

/**
 * The same control as a small round icon (inline in text, word chips): ▶ / ⏸,
 * with ↺ beside it while active.
 */
export function PlayIconButton({
  play,
  label,
  icon,
  disabled,
  size = 12,
  className = '',
}: {
  play: () => Promise<unknown>;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  size?: number;
  className?: string;
}) {
  const control = usePlayControl(play);
  const { status } = control;
  const aria = status === 'playing' ? `Pause: ${label}` : status === 'paused' ? `Resume: ${label}` : label;
  return (
    <span className="inline-flex items-center gap-0.5">
      <button
        type="button"
        onClick={control.toggle}
        disabled={disabled}
        aria-label={aria}
        title={aria}
        data-playback={status}
        className={`inline-flex items-center justify-center rounded-full surface-recessed p-1 text-action-text disabled:opacity-40 ${className}`}
      >
        {status === 'playing' ? (
          <Pause size={size} aria-hidden="true" />
        ) : status === 'paused' ? (
          <Play size={size} aria-hidden="true" />
        ) : (
          (icon ?? <Play size={size} aria-hidden="true" />)
        )}
      </button>
      {status !== 'idle' && (
        <button
          type="button"
          onClick={control.restart}
          aria-label={`Play from the start: ${label}`}
          title="Play from the start"
          className="inline-flex items-center justify-center rounded-full p-1 text-ink-muted hover:bg-track hover:text-ink"
        >
          <RotateCcw size={size} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

function RestartButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Play ${label} from the start`}
      title="Play from the start"
      className="inline-flex h-10 w-10 items-center justify-center rounded-control text-ink-muted transition-colors duration-state ease-smooth hover:bg-track hover:text-ink"
    >
      <RotateCcw size={16} aria-hidden="true" />
    </button>
  );
}
