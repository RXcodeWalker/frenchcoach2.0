import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { enter, enterReduced } from '../../components/motion/variants';
import type { LabHistory } from '../../domain/pronunciation/lab/labHistory';
import { clearedCount, localDay, trickyDeck } from '../../domain/pronunciation/lab/trickyWords';
import { track } from '../../services/telemetry/telemetryService';
import { TRICKY_EMPTY_BODY, TRICKY_HELP, trickyHeadline } from './soundsCopy';
import { WordDrill } from './WordDrill';

/**
 * Tricky words (pronunciation-lab plan §3.3): every word that came up as
 * "Practise this" twice in the Lab, as a deck with spaced review. A word
 * re-surfaces here until it has been Clear on two different days, then it
 * leaves (`domain/pronunciation/lab/trickyWords.ts` holds the rules).
 *
 * The deck is read from the local Lab history, so it shows words only — never
 * the sentences they came from. One card is open at a time.
 */

interface Props {
  history: LabHistory;
  onPractiseSentence: () => void;
}

export function TrickyWords({ history, onPractiseSentence }: Props) {
  const reduced = useReducedMotion() ?? false;
  const [open, setOpen] = useState<string | null>(null);
  const opened = useRef(false);
  const today = localDay(new Date());
  const deck = trickyDeck(history.words, today);
  // A word that just left the deck stays on screen until its card is closed, so the learner sees why.
  const shown = open !== null && !deck.some((d) => d.word === open) ? [{ word: open, due: false, clearRun: 0 }, ...deck] : deck;
  const cleared = clearedCount(history.words);

  useEffect(() => {
    if (open !== null && !opened.current) {
      opened.current = true;
      track({ name: 'lab_opened', props: { entry: 'tricky_words' } });
    }
  }, [open]);

  return (
    <motion.section
      variants={reduced ? enterReduced : enter}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
      aria-label="Tricky words"
      data-testid="tricky-words"
    >
      <div className="flex flex-col gap-2">
        <p className="text-eyebrow uppercase text-action-text">Tricky words</p>
        <h1 className="text-h1 text-ink">{trickyHeadline(deck)}</h1>
        {deck.length > 0 && <p className="text-body-s text-ink-muted">{TRICKY_HELP}</p>}
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col gap-3 rounded-card border border-hairline bg-surface-recessed p-5">
          <p className="text-body-s text-ink">{TRICKY_EMPTY_BODY}</p>
          <Button variant="secondary" className="w-fit" onClick={onPractiseSentence}>Practise a sentence</Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((item) =>
            open === item.word ? (
              <li key={item.word}>
                <WordDrill word={item.word} onClose={() => setOpen(null)} />
              </li>
            ) : (
              <li key={item.word}>
                <button
                  type="button"
                  onClick={() => setOpen(item.word)}
                  data-testid={`tricky-${item.word}`}
                  className="flex w-full items-center gap-3 rounded-card border border-hairline bg-surface p-4 text-left text-ink
                    transition-colors duration-state ease-smooth hover:border-hairline-strong active:bg-surface-recessed"
                >
                  <span className="min-w-0 flex-1 truncate text-[18px]" lang="fr">{item.word}</span>
                  <span className={`shrink-0 rounded-control px-2 py-0.5 text-caption font-semibold ${item.due ? 'bg-action-soft text-action-text' : 'bg-track text-ink-muted'}`}>
                    {item.due ? 'Practise today' : item.clearRun > 0 ? 'Clear today' : 'Practised today'}
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-ink-subtle" aria-hidden="true" />
                </button>
              </li>
            ),
          )}
        </ul>
      )}

      {cleared > 0 && (
        <p className="text-body-s text-progress-text">
          {cleared} {cleared === 1 ? 'word has' : 'words have'} left your list so far.
        </p>
      )}
    </motion.section>
  );
}
