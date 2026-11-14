import { useState } from 'react';
import { Check, Volume2 } from 'lucide-react';
import type { NewsFact, NewsSentence } from '../../data/news/types';

interface Props {
  facts: readonly NewsFact[];
  covered: readonly string[];
  /** Live (while recording): facts stay hidden behind "Need a hint?". Review: every fact is shown. */
  mode: 'live' | 'review';
  sentences?: readonly NewsSentence[];
  onReplay?: (sentence: number) => void;
}

/**
 * The facts a good retelling carries (daily-news §3). Live, it lights a slot
 * as each fact is heard — the text stays hidden unless the learner asks, so
 * the scaffold never turns the report into a translation exercise. On Review
 * every fact is shown; a missed one gets its French sentence and a replay.
 */
export function FactChecklist({ facts, covered, mode, sentences, onReplay }: Props) {
  const [hints, setHints] = useState(false);
  const done = new Set(covered);
  const reveal = mode === 'review' || hints;

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2" aria-label="Facts in the story">
        {facts.map((f, i) => {
          const ok = done.has(f.id);
          return (
            <li key={f.id} className="flex items-start gap-3" data-testid={`news-fact-${f.id}`}>
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-pill text-caption font-semibold font-numeral
                  transition-colors duration-state ease-smooth
                  ${ok ? 'bg-progress-soft text-progress-text' : 'bg-track text-ink-subtle'}`}
              >
                {ok ? <Check size={12} /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-body-s ${ok ? 'text-ink' : 'text-ink-muted'}`}>
                  {reveal ? f.en : ok ? 'Got it' : `Fact ${i + 1}`}
                  <span className="sr-only">{ok ? ' (covered)' : ' (not yet)'}</span>
                </p>
                {mode === 'review' && !ok && sentences?.[f.sentence] && (
                  <div className="mt-1 flex items-start gap-1.5">
                    {onReplay && (
                      <button
                        type="button"
                        onClick={() => onReplay(f.sentence)}
                        aria-label="Hear this sentence"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill text-ink-muted hover:bg-track hover:text-ink"
                      >
                        <Volume2 size={14} aria-hidden="true" />
                      </button>
                    )}
                    <p lang="fr" className="text-caption text-ink-muted">« {sentences[f.sentence].fr} »</p>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {mode === 'live' && !hints && (
        <button type="button" onClick={() => setHints(true)} className="self-start text-label text-ink-muted underline underline-offset-4 hover:text-ink">
          Need a hint? Show the facts in English
        </button>
      )}
    </div>
  );
}
