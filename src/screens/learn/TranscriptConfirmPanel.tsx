import { Fragment, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { enter } from '../../components/motion/variants';
import { Button } from '../../components/ui/Button';
import { alignRecognisers, applyAlternatives, swappedWords } from '../../domain/transcription/alignRecognisers';
import { tokenize } from '../../domain/igcse/stt/homophones/text';
import type { AnswerTranscription } from '../../features/learn/answerTranscription';

export interface TranscriptConfirmation {
  /** The text feedback will be about: the primary transcript with any swaps the student chose. */
  text: string;
  /** The student swapped at least one word for the other recogniser's reading. */
  edited: boolean;
  source: AnswerTranscription['source'];
}

interface Props {
  /** The recording is still being double-checked; nothing to confirm yet. */
  checking: boolean;
  transcription: AnswerTranscription | null;
  onConfirm: (confirmation: TranscriptConfirmation) => void;
  onRerecord: () => void;
}

const CARD = 'flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5';

/**
 * "Did we hear you right?" (transcription-accuracy plan, Phase 3). Shows the
 * primary transcript with the words the two recognisers disagreed on
 * underlined. Tapping one offers the other reading or a re-record. There is no
 * free-text editing: the student can only pick between what the recognisers
 * actually heard.
 */
export function TranscriptConfirmPanel({ checking, transcription, onConfirm, onRerecord }: Props) {
  const alignment = useMemo(
    () => (transcription ? alignRecognisers(transcription.primaryText, transcription.secondaryText, { spokenNumbers: true }) : null),
    [transcription],
  );
  const [chosen, setChosen] = useState<ReadonlySet<number>>(new Set());
  const [open, setOpen] = useState<number | null>(null);

  if (checking || !transcription || !alignment) {
    return (
      <motion.div variants={enter} initial="hidden" animate="show" className={CARD}>
        <p role="status" className="text-body-s text-ink-muted">Double-checking what we heard…</p>
      </motion.div>
    );
  }

  const tokens = tokenize(alignment.primaryText).map((t) => t.raw);
  const underlined = alignment.spans.map((span, index) => ({ span, index })).filter(({ span }) => span.swappable);
  const spanStartingAt = new Map(underlined.map((u) => [u.span.start, u]));
  const hasText = alignment.primaryText.trim().length > 0;
  const liveCaptionsOnly = transcription.source === 'live-captions' && transcription.fallbackReason !== 'no-audio';

  const toggleChoice = (index: number) => {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
    setOpen(null);
  };

  const body: React.ReactNode[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const hit = spanStartingAt.get(i);
    if (!hit) {
      body.push(<Fragment key={i}>{i > 0 ? ' ' : ''}{tokens[i]}</Fragment>);
      continue;
    }
    const swapped = chosen.has(hit.index);
    const words = swapped ? swappedWords(alignment, hit.index) : hit.span.primaryWords;
    body.push(
      <Fragment key={i}>
        {i > 0 ? ' ' : ''}
        <button
          type="button"
          data-testid="uncertain-word"
          aria-expanded={open === hit.index}
          onClick={() => setOpen(open === hit.index ? null : hit.index)}
          className="text-reward-text underline decoration-reward-text decoration-dotted decoration-2 underline-offset-4 font-semibold"
        >
          {words}
        </button>
      </Fragment>,
    );
    i = hit.span.end - 1;
  }

  const openSpan = open !== null ? alignment.spans[open] : null;

  return (
    <motion.div variants={enter} initial="hidden" animate="show" className={CARD}>
      <div>
        <p className="mb-1.5 text-eyebrow uppercase text-ink-subtle">We heard</p>
        {hasText ? (
          <p lang="fr" className="text-body-base text-ink" data-testid="heard-text">{body}</p>
        ) : (
          <p className="text-body-s italic text-ink-muted">Nothing was transcribed.</p>
        )}
      </div>

      {underlined.length > 0 && (
        <p className="text-[13px] text-ink-muted">Underlined words are ones we weren’t sure about. Tap one to check it.</p>
      )}
      {liveCaptionsOnly && (
        <p className="text-[13px] text-ink-muted" data-testid="live-captions-note">
          We couldn’t double-check this answer, so this is the live caption as it was.
        </p>
      )}

      {openSpan && open !== null && (
        <div className="flex flex-col gap-2 rounded-control bg-reward-soft p-3" data-testid="word-choice">
          <p className="text-[13px] text-ink">
            {openSpan.kind === 'nearHomophone'
              ? 'These sound alike, so it could have been either. Say it clearly if you can.'
              : 'We heard this word two different ways.'}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => toggleChoice(open)}>
              {chosen.has(open) ? `Use “${openSpan.primaryWords}”` : `Use “${openSpan.secondaryWords}”`}
            </Button>
            <Button variant="quiet" size="sm" className="flex-1" onClick={onRerecord}>
              Re-record
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" size="lg" onClick={onRerecord}>
          Re-record
        </Button>
        <Button
          size="lg"
          className="flex-1"
          onClick={() =>
            onConfirm({
              text: applyAlternatives(alignment, chosen),
              edited: chosen.size > 0,
              source: transcription.source,
            })
          }
        >
          Use this
        </Button>
      </div>
    </motion.div>
  );
}
