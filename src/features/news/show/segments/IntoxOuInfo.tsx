import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, X } from 'lucide-react';
import type { NewsFake, NewsSentence } from '../../../../data/news/types';
import { TTS } from '../../../../services/tts/ttsService';
import { Button } from '../../../../components/ui/Button';
import { PlayIconButton } from '../../../../components/ui/PlayButton';
import { NewsPlayer } from '../../NewsPlayer';
import { useBroadcast } from '../../useBroadcast';

interface Props {
  sentences: readonly NewsSentence[];
  fake: NewsFake;
  onDone: (right: boolean) => void;
}

/**
 * « Intox ou info ? » (daily-news §7): Henri reads the story again with one
 * detail changed. Pick what changed; then hear the real sentence. Marked
 * instantly, first pick counts. The fake sentence is recorded like the story's
 * own (catalogue source `news`).
 */
export function IntoxOuInfo({ sentences, fake, onDone }: Props) {
  const texts = useMemo(
    () => sentences.map((s, i) => (i === fake.sentence ? fake.fr : s.fr)),
    [sentences, fake],
  );
  const broadcast = useBroadcast(texts);
  const [picked, setPicked] = useState<number | null>(null);
  const ready = broadcast.listened || broadcast.unavailable;
  const real = sentences[fake.sentence];
  const right = picked === fake.answer;

  useEffect(() => () => TTS.stop(), []);

  const pick = (i: number) => {
    if (picked !== null) return;
    broadcast.stop();
    setPicked(i);
  };

  return (
    <div className="flex flex-col gap-5">
      <NewsPlayer broadcast={broadcast} sentenceCount={texts.length} />

      <div>
        <p className="text-label text-ink">What changed?</p>
        <p className="mt-1 text-body-s text-ink-muted">
          {ready ? 'Your first pick counts.' : 'Listen all the way through first. One detail is different from the story you heard.'}
        </p>
        <ul className="mt-3 flex flex-col gap-2" aria-label="What changed?">
          {fake.options.map((o, i) => {
            const isAnswer = picked !== null && i === fake.answer;
            const isWrongPick = picked === i && !right;
            return (
              <li key={o}>
                <button
                  type="button"
                  disabled={!ready || picked !== null}
                  onClick={() => pick(i)}
                  data-testid={`news-intox-option-${i}`}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-control border px-4 py-2 text-left text-body-s transition-colors duration-state ease-smooth
                    disabled:cursor-default
                    ${isAnswer ? 'border-transparent bg-progress-soft text-ink' : isWrongPick ? 'border-transparent bg-reward-soft text-ink' : 'border-hairline-strong text-ink enabled:hover:bg-track'}
                    ${!ready ? 'opacity-60' : ''}`}
                >
                  <span className="min-w-0 flex-1">{o}</span>
                  {isAnswer && <Check size={16} className="shrink-0 text-progress-text" aria-label="The detail that changed" />}
                  {isWrongPick && <X size={16} className="shrink-0 text-reward-text" aria-label="Not this one" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {picked !== null && (
        <div className="flex flex-col gap-4 rounded-control bg-surface-recessed p-4" role="status" data-testid="news-intox-result">
          <p className="text-label text-ink">{right ? 'Bien vu ! You spotted the fake.' : 'Not quite. Here is what changed.'}</p>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-eyebrow uppercase text-ink-subtle">Intox · what Henri said</p>
              <p lang="fr" className="mt-1 text-body-s text-ink-muted line-through decoration-ink-subtle">{fake.fr}</p>
            </div>
            <div>
              <p className="text-eyebrow uppercase text-ink-subtle">Info · the real story</p>
              <div className="mt-1 flex items-start gap-2">
                <PlayIconButton play={() => TTS.speak(real.fr, { recorded: true, rate: 0.9 })} label="Hear the real sentence" size={16} className="mt-0.5" />
                <div className="min-w-0">
                  <p lang="fr" className="text-body-s text-ink">{real.fr}</p>
                  <p className="mt-0.5 text-caption text-ink-muted">{real.en}</p>
                </div>
              </div>
            </div>
          </div>
          <Button size="lg" onClick={() => { TTS.stop(); onDone(right); }} className="sm:self-end sm:min-w-48" data-testid="news-intox-done">
            On to the segment <ChevronRight size={18} aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}
