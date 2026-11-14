/**
 * The end-of-mission Postcard (junior-track §9): exactly three items, at most
 * four lines, no marks, scores or numbers, no red ✗. The items come from
 * `domain/junior/postcard.ts`; this only draws them.
 *
 *  The first card shows the TARGET sentence (never the raw transcript) with a play
 *  button for the kid's own recording; the practise card puts Léo and "You" side by
 *  side with the heard words as chips and one more try — "listen and compare",
 *  never a pronunciation verdict, and the extra try writes nothing; the last card
 *  is the sticker. The domain's emoji icons are not drawn: each kind has a lucide
 *  icon in a role-coloured chip (Design System v2).
 */
import { useEffect, useRef, useState } from 'react';
import { Mic, PartyPopper, Play, Star, Target, Medal, Volume2, type LucideIcon } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { JuniorArt } from './art/JuniorArt';
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
    <Button type="button" variant="secondary" size="sm" data-testid="postcard-play-mine" aria-label={label} onClick={() => play(url)}>
      <Play size={16} aria-hidden="true" /> You
    </Button>
  );
}

function HearLeo({ voice, lines }: { voice: LeoVoice; lines: readonly SpeakableLine[] }) {
  if (lines.length === 0 || !lines.every((l) => voice.canSpeak(l))) return null;
  return (
    <Button type="button" variant="secondary" size="sm" data-testid="postcard-hear-leo" aria-label="Hear Léo say it" onClick={() => void voice.speakAll(lines)}>
      <Volume2 size={16} aria-hidden="true" /> Léo
    </Button>
  );
}

/** Each Postcard item's icon and role colour. The domain's own emoji icons are left unused. */
const ITEM_VISUAL: Record<PostcardItem['kind'], { Icon: LucideIcon; chip: string }> = {
  saidGreat: { Icon: Star, chip: 'bg-progress-soft text-progress-text' },
  greatTry: { Icon: Star, chip: 'bg-progress-soft text-progress-text' },
  finished: { Icon: PartyPopper, chip: 'bg-progress-soft text-progress-text' },
  practise: { Icon: Target, chip: 'bg-info-soft text-info-text' },
  challenge: { Icon: Target, chip: 'bg-info-soft text-info-text' },
  listen: { Icon: Volume2, chip: 'bg-action-soft text-action-text' },
  sticker: { Icon: Medal, chip: 'bg-progress-soft text-progress-text' },
};

function ItemLabel({ kind, children }: { kind: PostcardItem['kind']; children: React.ReactNode }) {
  const { Icon, chip } = ITEM_VISUAL[kind];
  return (
    <p className="flex items-center gap-2 text-label text-ink-muted">
      <span aria-hidden="true" className={`flex h-7 w-7 items-center justify-center rounded-control ${chip}`}>
        <Icon size={16} />
      </span>
      {children}
    </p>
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
    <div data-testid="postcard-practise" className="flex flex-col gap-3">
      <ItemLabel kind="practise">{item.label}</ItemLabel>
      <p lang="fr" className="text-title text-ink">{item.sentence}</p>
      <div className="flex flex-wrap gap-2" aria-label="Words">
        {chips.map((w) => (
          <span
            key={w}
            data-testid="postcard-chip"
            data-lit={lit.has(w)}
            lang="fr"
            className={`rounded-pill border px-3 py-1 text-label ${lit.has(w) ? 'border-progress bg-progress-soft text-progress-text' : 'border-hairline-strong text-ink-muted'}`}
          >
            {w}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <HearLeo voice={voice} lines={lines} />
        <PlayMine url={url} label="Hear yourself" />
      </div>
      {tryAgain && (
        <div className="mt-1 flex flex-col items-center gap-2 rounded-card bg-surface-recessed px-4 py-4">
          <p className="flex items-center gap-1.5 text-label text-ink-muted">
            <Mic size={14} aria-hidden="true" /> One more try
          </p>
          <SpeakingConsentGate>
            <MicButton listening={capture.listening} busy={capture.busy} disabled={blocked} onTap={capture.toggle} level={capture.micLevel} />
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
    <section data-testid="postcard" aria-label="Your postcard" className="mx-auto flex w-full max-w-md flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {postcard.items.map((item) => (
          <li key={item.kind} data-testid={`postcard-${item.kind}`} className="rounded-card border border-hairline bg-surface p-4">
            {item.kind === 'practise' ? (
              <PractiseCard item={item} voice={voice} blocked={blocked} url={recordingUrl(item.recordingId)} lines={linesFor(item.sentence)} tryAgain={practiseTry} />
            ) : item.kind === 'sticker' ? (
              <div className="flex items-center gap-4">
                <JuniorArt picture={item.sticker.emoji} size={64} />
                <div className="flex flex-col gap-1">
                  <ItemLabel kind="sticker">{item.label}</ItemLabel>
                  <p className="text-subtitle text-ink">{item.gold ? 'Gold ' : ''}{item.sticker.name}</p>
                </div>
              </div>
            ) : item.kind === 'finished' ? (
              <ItemLabel kind="finished">{item.label}</ItemLabel>
            ) : (
              <div className="flex flex-col gap-3">
                <ItemLabel kind={item.kind}>{item.label}</ItemLabel>
                <p lang="fr" className="text-title text-ink">{item.sentence}</p>
                {(item.kind === 'saidGreat' || item.kind === 'greatTry') && (
                  <div className="flex"><PlayMine url={recordingUrl(item.recordingId)} label="Hear yourself" /></div>
                )}
                {item.kind === 'listen' && (
                  <div className="flex"><HearLeo voice={voice} lines={linesFor(item.sentence)} /></div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      <Button type="button" size="lg" data-testid="postcard-done" onClick={onDone} className="w-full">
        Done
      </Button>
    </section>
  );
}
