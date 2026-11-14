import { Pause, Play } from 'lucide-react';
import { Segmented } from '../../components/ui/Segmented';
import type { Broadcast, BroadcastSpeed } from './useBroadcast';

interface Props {
  broadcast: Broadcast;
  sentenceCount: number;
}

/**
 * The broadcast controls (Design System v2): one 64px play/stop button, a
 * track with one segment per sentence that fills as Henri reads, and a
 * Normal / Slower switch. The track only moves when the voice does.
 */
export function NewsPlayer({ broadcast, sentenceCount }: Props) {
  const { playing, current, listened, unavailable, speed, setSpeed, playAll, stop } = broadcast;
  const status = unavailable
    ? 'Audio isn’t available on this device. Read the transcript below.'
    : playing
      ? `Sentence ${(current ?? 0) + 1} of ${sentenceCount}`
      : listened
        ? 'Heard it. Play it again, or tap a sentence below to replay it.'
        : 'Tap to hear today’s story';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={playing ? stop : playAll}
          disabled={unavailable}
          aria-label={playing ? 'Stop the broadcast' : listened ? 'Play the broadcast again' : 'Play the broadcast'}
          data-testid="news-play"
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-pill
            transition-[background-color,transform] duration-state ease-smooth active:scale-[.97] active:duration-press
            disabled:bg-track disabled:text-ink-subtle
            ${playing ? 'bg-ink text-surface' : 'bg-action text-action-ink hover:bg-action-hover active:bg-action-press'}`}
        >
          {playing ? <Pause size={24} aria-hidden="true" /> : <Play size={24} className="ml-0.5" aria-hidden="true" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-label text-ink" aria-live="polite">{status}</p>
          <div
            role="progressbar"
            aria-label="Broadcast progress"
            aria-valuemin={0}
            aria-valuemax={sentenceCount}
            aria-valuenow={playing && current !== null ? current + 1 : listened ? sentenceCount : 0}
            className="mt-2 flex gap-1"
          >
            {Array.from({ length: sentenceCount }, (_, i) => {
              const filled = (playing && current !== null && i < current) || (!playing && listened);
              const now = playing && current === i;
              return (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-pill transition-colors duration-state ease-smooth
                    ${now || filled ? 'bg-action' : 'bg-track'}`}
                />
              );
            })}
          </div>
        </div>
      </div>
      <Segmented<BroadcastSpeed>
        label="Playback speed"
        height={40}
        value={speed}
        onChange={setSpeed}
        options={[
          { id: 'normal', label: 'Normal speed' },
          { id: 'slow', label: 'Slower' },
        ]}
      />
    </div>
  );
}
