import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import type { NewsGlossaryEntry, NewsSentence } from '../../data/news/types';
import { segmentWithGlossary } from './newsText';

interface Props {
  sentences: readonly NewsSentence[];
  glossary: readonly NewsGlossaryEntry[];
  /** The sentence being read aloud, highlighted. */
  current: number | null;
  onPlaySentence?: (i: number) => void;
  /** Show each sentence's English under it (Review). */
  showEnglish?: boolean;
  /** Sentences to mark (a missed fact's sentence on Review). */
  marked?: ReadonlySet<number>;
}

/** The story, one sentence per line: tap ▶ to replay a line, tap an underlined word for its English. */
export function StoryTranscript({ sentences, glossary, current, onPlaySentence, showEnglish = false, marked }: Props) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <ol className="flex flex-col gap-1.5" data-testid="news-transcript">
      {sentences.map((s, i) => {
        const now = current === i;
        return (
          <li
            key={i}
            className={`flex items-start gap-2 rounded-control px-2 py-1.5 transition-colors duration-state ease-smooth
              ${now ? 'bg-action-soft' : marked?.has(i) ? 'bg-reward-soft' : ''}`}
            aria-current={now ? 'true' : undefined}
          >
            {onPlaySentence && (
              <button
                type="button"
                onClick={() => onPlaySentence(i)}
                aria-label={`Replay sentence ${i + 1}`}
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-pill text-ink-muted hover:bg-track hover:text-ink"
              >
                <Volume2 size={16} aria-hidden="true" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <p lang="fr" className="text-body-s text-ink">
                {segmentWithGlossary(s.fr, glossary).map((seg, j) => {
                  if (!seg.gloss) return <span key={j}>{seg.text}</span>;
                  const id = `${i}:${j}`;
                  const shown = open === id;
                  return (
                    <span key={j} className="relative inline-block">
                      <button
                        type="button"
                        onClick={() => setOpen(shown ? null : id)}
                        aria-expanded={shown}
                        className="underline decoration-dotted decoration-ink-subtle underline-offset-4 hover:decoration-ink"
                      >
                        {seg.text}
                      </button>
                      {shown && (
                        <span
                          role="tooltip"
                          lang="en"
                          className="absolute left-0 top-full z-10 mt-1 whitespace-nowrap rounded-control bg-ink px-2 py-1 text-caption text-surface shadow-lg"
                        >
                          {seg.gloss}
                        </span>
                      )}
                    </span>
                  );
                })}
              </p>
              {showEnglish && <p className="mt-0.5 text-caption text-ink-muted">{s.en}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
