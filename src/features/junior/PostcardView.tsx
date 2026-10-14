/**
 * The end-of-mission Postcard (junior-track §9): exactly three items, at most
 * four lines, no marks, scores or numbers, no red ✗. The items come from
 * `domain/junior/postcard.ts`; this only draws them.
 *
 *  ⭐ shows the TARGET sentence (never the raw transcript) with a ▶ for the kid's
 *  own recording; 🎯 puts 🔊 Léo and 🎙 You side by side with the heard words as
 *  chips and one more try — "listen and compare", never a pronunciation verdict,
 *  and the extra try writes nothing; 🏅 is the sticker.
 */
import { useEffect, useRef, useState } from 'react';
import { Play, Volume2 } from 'lucide-react';
import type { Postcard, PostcardItem } from '../../domain/junior/postcard';
import { matchAnswer, type FrameTarget } from '../../domain/junior/matchAnswer';
import { isSilent } from '../../domain/junior/warmup';
import type { LeoVoice, SpeakableLine } from './leoVoice';
import { Leo } from './Leo';
import { MicButton } from './MicButton';
import { SpeakingConsentGate } from '../../components/SpeakingConsentGate';
import { useJuniorCapture, type CaptureResult } from './useJuniorCapture';

/** What the 🎯 card needs to run its one more try, kept by the mission for the practised turn only. */
export interface PractiseTry {
  targets: readonly FrameTarget[];
  /** Key words to show as chips (core words + the chosen word), in sentence order. */
  keyWords: readonly string[];
}

interface Props {
  postcard: Postcard;
  voice: LeoVoice;
  blocked: boolean;
  /** Object URL of the kid's own recording, or null when none was kept. */
  recordingUrl: (recordingId: string | null) => string | null;
  /** The recorded/spoken lines of a sentence the Postcard shows (one per frame); empty when unknown. */
  linesFor: (sentence: string) => readonly SpeakableLine[];
  /** The 🎯 card's one more try, when the practised turn has one. */
  practiseTry: PractiseTry | null;
  onDone: () => void;
}

function useAudioPlayer() {
  const ref = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => ref.current?.pause(), []);
  return (url: string) => {
    ref.current?.pause();
    const audio = new Audio(url);
    ref.current = audio;
    void audio.play().catch(() => {});
  };
}

function PlayMine({ url, label }: { url: string | null; label: string }) {
  const play = useAudioPlayer();
  if (!url) return null;
  return (
    <button
      type="button"
      data-testid="postcard-play-mine"
      aria-label={label}
      onClick={() => play(url)}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-progress-soft text-progress-text"
    >
      <Play size={18} aria-hidden="true" />
    </button>
  );
}

function HearLeo({ voice, lines }: { voice: LeoVoice; lines: readonly SpeakableLine[] }) {
  if (lines.length === 0 || !lines.every((l) => voice.canSpeak(l))) return null;
  return (
    <button
      type="button"
      data-testid="postcard-hear-leo"
      aria-label="Hear Léo say it"
      onClick={() => void voice.speakAll(lines)}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-action-soft text-action-text"
    >
      <Volume2 size={18} aria-hidden="true" />
    </button>
  );
}

function PractiseCard({
  item,
  voice,
  blocked,
  url,
  lines,
  tryAgain,
}: {
  item: Extract<PostcardItem, { kind: 'practise' }>;
  voice: LeoVoice;
  blocked: boolean;
  url: string | null;
  lines: readonly SpeakableLine[];
  tryAgain: PractiseTry | null;
}) {
  const [heardNow, setHeardNow] = useState<readonly string[] | null>(null);
  const [again, setAgain] = useState(false);
  const capture = useJuniorCapture(blocked, (r: CaptureResult) => {
    if (!tryAgain) return;
    if (isSilent({ peakMicLevel: r.peak, transcript: r.transcript })) {
      setAgain(true);
      return;
    }
    setAgain(false);
    setHeardNow(matchAnswer(r.transcript, tryAgain.targets).heard);
  });
  const lit = new Set(heardNow ?? item.heard);
  const chips = tryAgain?.keyWords ?? item.heard;
  return (
    <div data-testid="postcard-practise">
      <p className="text-label text-ink-muted">{item.icon} {item.label}</p>
      <p lang="fr" className="mt-1 text-title text-ink">{item.sentence}</p>
      <div className="mt-2 flex flex-wrap gap-2" aria-label="Words">
        {chips.map((w) => (
          <span
            key={w}
            data-testid="postcard-chip"
            data-lit={lit.has(w)}
            lang="fr"
            className={`rounded-pill border px-3 py-1 text-label ${lit.has(w) ? 'border-progress bg-progress-soft text-progress-text' : 'border-hairline text-ink-muted'}`}
          >
            {w}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span aria-hidden="true">🔊 Léo</span>
          <HearLeo voice={voice} lines={lines} />
        </div>
        <div className="flex items-center gap-2">
          <span aria-hidden="true">🎙 You</span>
          <PlayMine url={url} label="Hear yourself" />
        </div>
      </div>
      {tryAgain && (
        <div className="mt-3 flex flex-col items-center gap-2">
          <SpeakingConsentGate>
            <MicButton listening={capture.listening} busy={capture.busy} disabled={blocked} onTap={capture.toggle} />
          </SpeakingConsentGate>
          {again && <p role="status" className="text-label text-ink-muted">Encore ?</p>}
          {heardNow && <Leo state="happy" size="sm" />}
        </div>
      )}
    </div>
  );
}

export function PostcardView({ postcard, voice, blocked, recordingUrl, linesFor, practiseTry, onDone }: Props) {
  return (
    <section data-testid="postcard" aria-label="Your postcard" className="mx-auto flex max-w-md flex-col gap-4">
      <ul className="flex flex-col gap-4">
        {postcard.items.map((item) => (
          <li key={item.kind} data-testid={`postcard-${item.kind}`} className="rounded-card border border-hairline surface p-4">
            {item.kind === 'practise' ? (
              <PractiseCard item={item} voice={voice} blocked={blocked} url={recordingUrl(item.recordingId)} lines={linesFor(item.sentence)} tryAgain={practiseTry} />
            ) : item.kind === 'sticker' ? (
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className={`text-5xl ${item.gold ? 'drop-shadow' : ''}`}>{item.sticker.emoji}</span>
                <div>
                  <p className="text-label text-ink-muted">{item.icon} {item.label}</p>
                  <p className="text-subtitle text-ink">{item.gold ? 'Gold ' : ''}{item.sticker.name}</p>
                </div>
              </div>
            ) : item.kind === 'finished' ? (
              <p className="text-subtitle text-ink">{item.icon} {item.label}</p>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-label text-ink-muted">{item.icon} {item.label}</p>
                  <p lang="fr" className="mt-1 text-title text-ink">{item.sentence}</p>
                </div>
                {(item.kind === 'saidGreat' || item.kind === 'greatTry') && <PlayMine url={recordingUrl(item.recordingId)} label="Hear yourself" />}
                {item.kind === 'listen' && <HearLeo voice={voice} lines={linesFor(item.sentence)} />}
              </div>
            )}
          </li>
        ))}
      </ul>
      <button type="button" data-testid="postcard-done" onClick={onDone} className="h-12 rounded-pill bg-action px-6 text-label text-action-ink">
        Done
      </button>
    </section>
  );
}

