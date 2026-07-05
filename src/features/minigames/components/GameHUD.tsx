import type { ReactNode } from 'react';

interface GameHUDProps {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export function GameHUD({ left, center, right, className = '' }: GameHUDProps) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <div className="flex items-center gap-3">{left}</div>
      {center && <div className="flex items-center gap-3">{center}</div>}
      <div className="flex items-center gap-3">{right}</div>
    </div>
  );
}
