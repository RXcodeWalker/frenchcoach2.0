import { Star, Turtle, Volume2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { Speed } from './audio';

/** Earned stars out of three, readable as one label. */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span role="img" aria-label={`${value} of 3 stars`} className="inline-flex items-center gap-0.5">
      {[1, 2, 3].map(n => (
        <Star
          key={n}
          size={size}
          strokeWidth={1.75}
          aria-hidden="true"
          className={n <= value ? 'fill-current text-reward-text' : 'text-hairline-strong'}
        />
      ))}
    </span>
  );
}

interface ListenProps {
  playing: Speed | null;
  /** Listens so far; the label says "again" once there has been one. */
  heard: number;
  onListen: (speed: Speed) => void;
  size?: 'lg' | 'md';
  /** After an answer the screen's one primary action is "Next", so listening steps back. */
  secondary?: boolean;
}

/** Listen (primary) and Slower: the two ways to hear the line again. */
export function ListenButtons({ playing, heard, onListen, size = 'lg', secondary = false }: ListenProps) {
  return (
    <div className="flex gap-2">
      <Button size={size} variant={secondary ? 'secondary' : 'primary'} className="flex-1" onClick={() => onListen('normal')} data-testid="dictee-listen" data-playing={playing === 'normal' || undefined}>
        <Volume2 size={18} aria-hidden="true" />
        {playing === 'normal' ? 'Playing…' : heard > 0 ? 'Listen again' : 'Listen'}
      </Button>
      <Button size={size} variant="secondary" onClick={() => onListen('slow')} data-testid="dictee-slow" data-playing={playing === 'slow' || undefined}>
        <Turtle size={18} aria-hidden="true" />
        {playing === 'slow' ? 'Playing…' : 'Slower'}
      </Button>
    </div>
  );
}
