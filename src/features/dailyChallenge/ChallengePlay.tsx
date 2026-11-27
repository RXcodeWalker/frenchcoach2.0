import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Clock, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { enter, enterReduced } from '../../components/motion/variants';
import { EmptySlot, TileGhost, WordTile } from '../sentenceRebuilder/WordTile';
import { answerWords, formatDuration } from './format';
import type { DailyChallengeItem } from './types';

interface Props {
  item: DailyChallengeItem;
  itemCount: number;
  startedAt: string;
  /** The item just marked by the server (shown until Next). */
  marked: DailyChallengeItem | null;
  busy: boolean;
  error: string | null;
  onCheck: (tiles: number[]) => void;
  onNext: () => void;
}

/** Elapsed time on the server's clock, from the run's start. Display only: the server times the run. */
function useElapsed(startedAt: string): number {
  const start = Date.parse(startedAt);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return Number.isFinite(start) ? Math.max(0, now - start) : 0;
}

/**
 * One sentence: the English, the line being built and the word bank. Check sends the
 * placed tiles to the server, which marks them once; the answer is then shown with the
 * model sentence and its rule. The screen never knows the answer before the server says.
 */
export function ChallengePlay({ item, itemCount, startedAt, marked, busy, error, onCheck, onNext }: Props) {
  const reduced = useReducedMotion();
  const variants = reduced ? enterReduced : enter;
  const [line, setLine] = useState<number[]>([]);
  const elapsed = useElapsed(startedAt);
  const showing = marked ?? item;
  const locked = marked !== null || busy;

  // A new item starts with an empty line.
  useEffect(() => setLine([]), [item.position]);

  const place = (t: number) => !locked && setLine(l => (l.includes(t) ? l : [...l, t]));
  const remove = (t: number) => !locked && setLine(l => l.filter(x => x !== t));
  const placed = marked?.answer?.tiles ?? line;
  const isLast = showing.position === itemCount - 1;

  return (
    <motion.section variants={variants} className="rounded-card border border-hairline bg-surface p-5 md:p-6" aria-labelledby="dc-prompt">
      <div className="flex items-center justify-between gap-3">
        <p className="text-eyebrow uppercase text-ink-subtle" data-testid="dc-progress">
          Sentence <span className="font-numeral">{showing.position + 1}</span> of <span className="font-numeral">{itemCount}</span>
        </p>
        <p className="inline-flex items-center gap-1.5 text-label text-ink-muted" aria-label={`Time ${formatDuration(elapsed)}`}>
          <Clock size={14} aria-hidden="true" />
          <span className="font-numeral">{formatDuration(elapsed)}</span>
        </p>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-pill bg-track" aria-hidden="true">
        <div className="h-full rounded-pill bg-action" style={{ width: `${(showing.position / itemCount) * 100}%` }} />
      </div>

      <h2 id="dc-prompt" className="mt-5 text-title text-ink">{showing.english}</h2>
      <p className="mt-1 text-caption text-ink-subtle">
        Put the French words in order. <span className="font-numeral">{showing.wordCount}</span> words: one try.
      </p>

      <div
        className={`mt-5 flex min-h-16 flex-wrap items-center gap-2 rounded-control border p-3 ${
          marked?.answer ? (marked.answer.correct ? 'border-progress bg-progress-soft' : 'border-correction bg-correction-soft') : 'border-hairline bg-surface-recessed'
        }`}
        aria-label="Your sentence"
        data-testid="dc-line"
      >
        {placed.length === 0 && Array.from({ length: Math.min(showing.wordCount, 8) }, (_, i) => <EmptySlot key={i} />)}
        {placed.map(t => (
          <WordTile
            key={`line-${t}`}
            tileId={`dc-${showing.position}-${t}`}
            text={showing.tiles[t] ?? ''}
            tone={marked?.answer ? (marked.answer.correct ? 'right' : 'wrong') : 'placed'}
            disabled={locked}
            label={marked ? undefined : `${showing.tiles[t]}, tap to take it out`}
            onActivate={() => remove(t)}
          />
        ))}
      </div>

      {!marked && (
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Words" data-testid="dc-bank">
          {showing.tiles.map((text, t) =>
            line.includes(t) ? (
              <TileGhost key={`bank-${t}`} text={text} />
            ) : (
              <WordTile key={`bank-${t}`} tileId={`dc-${showing.position}-${t}`} text={text} tone="plain" disabled={locked} onActivate={() => place(t)} />
            ),
          )}
        </div>
      )}

      {marked?.answer && marked.solution && (
        <div className="mt-5 space-y-2" role="status" data-testid="dc-marked">
          <p className={`inline-flex items-center gap-1.5 text-label ${marked.answer.correct ? 'text-progress-text' : 'text-correction-text'}`}>
            {marked.answer.correct ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
            {marked.answer.correct ? 'Right' : 'Not this time'}
          </p>
          {!marked.answer.correct && (
            <p className="text-body-s text-ink-muted">
              You built: <span lang="fr" className="text-ink">{answerWords(marked, marked.answer.tiles).join(' ')}</span>
            </p>
          )}
          <p className="text-body text-ink" lang="fr">{marked.solution.french}</p>
          {marked.solution.explanation && <p className="text-body-s text-ink-muted">{marked.solution.explanation}</p>}
        </div>
      )}

      {error && <p className="mt-4 text-body-s text-correction-text" role="alert">{error}</p>}

      <div className="mt-6 flex items-center justify-end gap-2">
        {marked ? (
          <Button onClick={onNext} data-shortcut="continue">{isLast ? 'See my result' : 'Next sentence'}</Button>
        ) : (
          <>
            <Button variant="quiet" onClick={() => setLine([])} disabled={locked || line.length === 0}>Clear</Button>
            <Button onClick={() => onCheck(line)} disabled={locked || line.length === 0}>{busy ? 'Checking…' : 'Check'}</Button>
          </>
        )}
      </div>
    </motion.section>
  );
}
