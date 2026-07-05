import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { GamePhase } from '../types';
import { GameCountdown } from './GameCountdown';

interface GameShellProps {
  phase: GamePhase;
  onBack?: () => void;
  accentColor?: string;
  hud?: ReactNode;
  timerBar?: ReactNode;
  children: ReactNode;
  feedback?: ReactNode;
  footer?: ReactNode;
  countdownDisplay?: string | number;
  countdownValue?: number;
  countdownClassName?: string;
  countdownTextClassName?: string;
  maxWidthClassName?: string;
  className?: string;
}

export function GameShell({
  phase,
  onBack,
  hud,
  timerBar,
  children,
  feedback,
  footer,
  countdownDisplay,
  countdownValue = 0,
  countdownClassName,
  countdownTextClassName,
  maxWidthClassName = 'max-w-2xl',
  className = '',
}: GameShellProps) {
  if (phase === 'countdown' && countdownDisplay !== undefined) {
    return (
      <GameCountdown
        display={countdownDisplay}
        value={countdownValue}
        className={countdownClassName}
        textClassName={countdownTextClassName}
      />
    );
  }

  return (
    <div className={`${maxWidthClassName} mx-auto px-4 pt-12 ${className}`}>
      {onBack && phase === 'idle' && (
        <button
          type="button"
          onClick={onBack}
          className="mb-6 p-2 rounded-xl hover:bg-white/5 text-slate-400 flex items-center gap-2"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-bold">Back</span>
        </button>
      )}

      {hud}
      {timerBar}

      <div className="relative">
        {children}
        {feedback}
      </div>

      {footer}
    </div>
  );
}
