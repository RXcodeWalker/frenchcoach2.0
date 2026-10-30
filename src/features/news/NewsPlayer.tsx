import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { Segmented } from '../../components/ui/Segmented';

type Speed = 'normal' | 'slow';
const RATE: Record<Speed, number> = { normal: 1, slow: 0.75 };

interface Props {
  /** The French broadcast text, read aloud by the browser's French voice. */
  text: string;
  /** Called when playback starts, so the screen can stop competing audio. */
  onPlay?: () => void;
  /** Bumped by the parent to stop playback (e.g. when recording starts). */
  stopSignal?: number;
}

/**
 * The broadcast player (Design System v2): one 64px play/stop button, a
 * progress track that follows the voice word by word, and a Normal / Slow
 * switch. No fake waveform — the track only moves when the voice does.
 */
export function NewsPlayer({ text, onPlay, stopSignal = 0 }: Props) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState<Speed>('normal');
  const runRef = useRef(0);

  const stop = useCallback(() => {
    runRef.current += 1;
    window.speechSynthesis.cancel();
    setPlaying(false);
  }, []);

  useEffect(() => stop, [stop]);
  useEffect(() => {
    if (stopSignal > 0) stop();
  }, [stopSignal, stop]);

  const play = () => {
    stop();
    const run = runRef.current;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = RATE[speed];
    utterance.onboundary = e => {
      if (run === runRef.current) setProgress(Math.min(1, e.charIndex / Math.max(1, text.length)));
    };
    utterance.onend = () => {
      if (run !== runRef.current) return;
      setPlaying(false);
      setProgress(1);
    };
    utterance.onerror = () => {
      if (run === runRef.current) setPlaying(false);
    };
    setProgress(0);
    setPlaying(true);
    onPlay?.();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={playing ? stop : play}
          aria-label={playing ? 'Stop the broadcast' : progress >= 1 ? 'Play the broadcast again' : 'Play the broadcast'}
          data-testid="news-play"
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-pill
            transition-[background-color,transform] duration-state ease-smooth active:scale-[.97] active:duration-press
            ${playing ? 'bg-ink text-surface' : 'bg-action text-action-ink hover:bg-action-hover active:bg-action-press'}`}
        >
          {playing ? <Pause size={24} aria-hidden="true" /> : <Play size={24} className="ml-0.5" aria-hidden="true" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-label text-ink">{playing ? 'Playing…' : progress >= 1 ? 'Played. Listen again if you like.' : 'Tap to hear today’s story'}</p>
          <div
            role="progressbar"
            aria-label="Broadcast progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            className="mt-2 h-1.5 overflow-hidden rounded-pill bg-track"
          >
            <span
              className="block h-full rounded-pill bg-action transition-[width] duration-200 ease-linear"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      </div>
      <Segmented<Speed>
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
