import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

interface Props {
  blob: Blob;
  headline: string;
  emoji: string;
  date: string;
}

/**
 * "Watch your broadcast" (daily-news §3): the learner's own report played
 * back under a TV-style lower third. Local only — the recording never leaves
 * the device from here.
 */
export function BroadcastReplay({ blob, headline, emoji, date }: Props) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else void el.play().catch(() => setPlaying(false));
  };

  return (
    <div className="overflow-hidden rounded-card border border-hairline bg-ink text-surface" data-testid="news-broadcast">
      <div className="relative flex h-40 items-center justify-center md:h-48">
        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-pill bg-correction px-2.5 py-1 text-caption font-semibold uppercase tracking-wide text-action-ink">
          <span className={`h-1.5 w-1.5 rounded-pill bg-action-ink`} aria-hidden="true" />
          {playing ? 'En direct' : 'Replay'}
        </span>
        <span className="absolute right-4 top-4 text-caption opacity-70">{date}</span>
        <span className="text-6xl" aria-hidden="true">{emoji}</span>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pause your broadcast' : 'Play your broadcast'}
          className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-pill bg-surface text-ink
            transition-transform duration-state ease-smooth active:scale-[.97]"
        >
          {playing ? <Pause size={20} aria-hidden="true" /> : <Play size={20} className="ml-0.5" aria-hidden="true" />}
        </button>
      </div>
      <div className="flex items-stretch">
        <span className="flex items-center bg-action px-3 text-caption font-semibold uppercase tracking-wide text-action-ink">Le Journal</span>
        <div className="min-w-0 flex-1 bg-surface px-3 py-2 text-ink">
          <p lang="fr" className="truncate text-label">{headline}</p>
          <p className="text-caption text-ink-muted">Reporter: you</p>
        </div>
      </div>
      <span className="block h-1 bg-track" aria-hidden="true">
        <span className="block h-full bg-action transition-[width] duration-200 ease-linear" style={{ width: `${progress * 100}%` }} />
      </span>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(1);
        }}
        onTimeUpdate={e => {
          const el = e.currentTarget;
          if (Number.isFinite(el.duration) && el.duration > 0) setProgress(el.currentTime / el.duration);
        }}
      />
    </div>
  );
}
