import { useEffect, useRef, useState } from 'react';
import { Mic, Volume2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { PlayButton } from '../../../components/ui/PlayButton';
import { stopNative } from '../../pronunciation/audio/nativeVoice';
import { playNativeChunks } from '../../pronunciation/audio/playChunks';
import { NATIVE_PREPARING, NATIVE_UNAVAILABLE } from '../../pronunciation/labCopy';
import { useListenSpeed } from '../../pronunciation/ListenSpeed';

/**
 * Hear it, then say it — right under the "Say it better" rewrite, where the
 * learner has just read the corrected French and wants to know how it sounds.
 * Both buttons lead into what already exists: ▶ plays the corrected answer
 * (sentence by sentence, at the learner's saved listen speed) and "Practise
 * saying it" opens the same practice as the "How it sounded" card below, which
 * stays the place for the deeper tools (your own recording, flow, watch-out
 * sounds). No request of its own beyond ▶ Native's, no mark and no storage.
 */

interface Props {
  /** The corrected answer (`improved_answer`). */
  sentence: string;
  /** Opens the practice (the "How it sounded" card). */
  onPractise: () => void;
}

export function SayItBetterActions({ sentence, onPractise }: Props) {
  const [speed] = useListenSpeed();
  const [preparing, setPreparing] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const alive = useRef(true);
  const call = useRef(0);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopNative();
    };
  }, []);

  const hear = async () => {
    const mine = ++call.current;
    const result = await playNativeChunks(sentence, {
      speed,
      synthesize: true,
      onPreparing: () => {
        if (alive.current && mine === call.current) setPreparing(true);
      },
    });
    if (!alive.current || mine !== call.current) return;
    setPreparing(false);
    if (result === 'unavailable') setUnavailable(true);
  };

  return (
    <div className="space-y-2" data-testid="say-it-better-actions">
      <div className="flex flex-wrap items-center gap-2">
        <PlayButton label="Hear it" icon={<Volume2 size={16} aria-hidden="true" />} play={hear} />
        <Button variant="secondary" size="sm" onClick={onPractise}>
          <Mic size={16} aria-hidden="true" /> Practise saying it
        </Button>
      </div>
      {preparing && (
        <p className="text-caption text-ink-muted" role="status">{NATIVE_PREPARING}</p>
      )}
      {unavailable && <p className="text-caption text-ink-muted">{NATIVE_UNAVAILABLE}</p>}
    </div>
  );
}
