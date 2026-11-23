import { useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { enter, enterReduced } from '../../components/motion/variants';
import { practiceChunks } from '../../domain/pronunciation/lab/practiceChunks';
import { localDay, trickyDeck } from '../../domain/pronunciation/lab/trickyWords';
import type { LabEntry } from '../../services/telemetry/telemetryService';
import { summaryFixedLine, summaryHeadline, summarySentenceLine, summaryTrickyLine } from './labCopy';
import { useLabHistory } from './labStore';
import { LabPractice, type LabSentenceResult } from './LabPractice';

/**
 * The Lab's practice flow for a text that may be longer than one breath.
 *
 * Learn's corrected answer is 30–70 words, but the Lab practises one sentence at
 * a time ("N of M words clear", four takes), so this cuts the text with
 * `practiceChunks` and runs one `LabPractice` per piece — "Sentence 2 of 3", Next
 * sentence, Stop here — and ends with a short summary of the sitting. A one-
 * sentence text behaves as before, plus the summary.
 *
 * The summary is a plain tally of what just happened (first → best words
 * clear, words fixed on their own) and what waits in the tricky deck. It is held
 * in memory for the sitting: nothing is stored, sent or tracked from here, and a
 * sitting where no take could be checked leaves without one.
 */

interface Props {
  /** The text to practise (Learn: the corrected answer; the Lab home: one picked sentence). */
  text: string;
  entry: LabEntry;
  /** Leaves the Lab (after the summary, when there is one). */
  onDone: () => void;
  /** What the leave button says on a sentence; Learn passes "Done — next question". */
  doneLabel?: string;
  /** What the summary's button says; Learn passes "Next question". */
  continueLabel?: string;
}

function Summary({ results, onContinue, continueLabel }: { results: LabSentenceResult[]; onContinue: () => void; continueLabel: string }) {
  const reduced = useReducedMotion() ?? false;
  const history = useLabHistory();
  const fixed = results.reduce((sum, r) => sum + r.fixedInPractice, 0);
  const tricky = trickyDeck(history.words, localDay(new Date())).length;
  const fixedLine = summaryFixedLine(fixed);
  const trickyLine = summaryTrickyLine(tricky);
  return (
    <motion.section
      variants={reduced ? enterReduced : enter}
      initial="hidden"
      animate="show"
      className="space-y-4 rounded-card border border-hairline bg-surface-raised p-5"
      aria-label="Practice summary"
      data-testid="lab-summary"
    >
      <p className="text-eyebrow uppercase text-action-text">Say it again</p>
      <p className="font-numeral text-title text-ink" role="status">{summaryHeadline(results.length)}</p>
      <ul className="space-y-1">
        {results.map((r, i) => (
          <li key={i} className="text-body-s text-ink">
            {results.length > 1 && <span className="text-ink-muted">Sentence {i + 1}: </span>}
            <span className="font-numeral">{summarySentenceLine(r)}</span>
          </li>
        ))}
      </ul>
      {fixedLine && <p className="text-body-s text-progress-text">{fixedLine}</p>}
      {trickyLine && <p className="text-body-s text-ink-muted">{trickyLine}</p>}
      <Button className="w-full" onClick={onContinue}>{continueLabel}</Button>
    </motion.section>
  );
}

export function ChunkedPractice({ text, entry, onDone, doneLabel = 'Done', continueLabel = 'Continue' }: Props) {
  const chunks = useMemo(() => {
    const cut = practiceChunks(text);
    return cut.length > 0 ? cut : [text.trim()].filter(Boolean);
  }, [text]);
  const [index, setIndex] = useState(0);
  const [summary, setSummary] = useState(false);
  /** The latest result of each sentence, by index; a sentence skipped without a take leaves a gap. */
  const results = useRef<Array<LabSentenceResult | null>>([]);

  if (chunks.length === 0) return null;

  const end = () => {
    const done = results.current.filter((r): r is LabSentenceResult => r !== null);
    if (done.length === 0) onDone();
    else setSummary(true);
  };

  if (summary) {
    const done = results.current.filter((r): r is LabSentenceResult => r !== null);
    return <Summary results={done} onContinue={onDone} continueLabel={continueLabel} />;
  }

  const hasNext = index + 1 < chunks.length;
  return (
    <LabPractice
      key={index}
      targetSentence={chunks[index]}
      entry={entry}
      trackOpen={index === 0}
      position={{ index, total: chunks.length }}
      doneLabel={doneLabel}
      onResult={(r) => {
        results.current[index] = r;
      }}
      onNextSentence={hasNext ? () => setIndex(index + 1) : undefined}
      onDone={end}
    />
  );
}
