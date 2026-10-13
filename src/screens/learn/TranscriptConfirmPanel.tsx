import { Fragment, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
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

const CARD = 'rounded-xl surface-raised p-5 space-y-4';

/**
 * "Did we hear you right?" (transcription-accuracy plan, Phase 3). Shows the
 * primary transcript with the words the two recognisers disagreed on
 * underlined. Tapping one offers the other reading or a re-record. There is no
 * free-text editing: the student can only pick between what the recognisers
 * actually heard.
 */
export function TranscriptConfirmPanel({ checking, transcription, onConfirm, onRerecord }: Props) {
  const alignment = useMemo(
    () => (transcription ? alignRecognisers(transcription.primaryText, transcription.secondaryText) : null),
    [transcription],
  );
  const [chosen, setChosen] = useState<ReadonlySet<number>>(new Set());
  const [open, setOpen] = useState<number | null>(null);

  if (checking || !transcription || !alignment) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={CARD}>
        <p role="status" className="text-sm text-ink-muted">Double-checking what we heard…</p>
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
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={CARD}>
      <div>
        <p className="text-eyebrow uppercase text-ink-muted mb-1.5">We heard</p>
        {hasText ? (
          <p className="text-sm text-ink leading-relaxed" data-testid="heard-text">{body}</p>
        ) : (
          <p className="text-sm text-ink-muted italic">Nothing was transcribed.</p>
        )}
      </div>

      {underlined.length > 0 && (
        <p className="text-xs text-ink-muted">Underlined words are ones we weren’t sure about. Tap one to check it.</p>
      )}
      {liveCaptionsOnly && (
        <p className="text-xs text-ink-muted" data-testid="live-captions-note">
          We couldn’t double-check this answer, so this is the live caption as it was.
        </p>
      )}

      {openSpan && open !== null && (
        <div className="rounded-lg border border-hairline bg-reward-soft p-3 space-y-2" data-testid="word-choice">
          <p className="text-xs text-ink">
            {openSpan.kind === 'nearHomophone'
              ? 'These sound alike, so it could have been either. Say it clearly if you can.'
              : 'We heard this word two different ways.'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => toggleChoice(open)}
              className="flex-1 py-2 rounded-lg text-xs font-bold border border-hairline text-ink hover:bg-white/5 transition-colors"
            >
              {chosen.has(open) ? `Use “${openSpan.primaryWords}”` : `Use “${openSpan.secondaryWords}”`}
            </button>
            <button
              type="button"
              onClick={onRerecord}
              className="flex-1 py-2 rounded-lg text-xs font-bold border border-hairline text-ink-muted hover:bg-white/5 transition-colors"
            >
              Re-record
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRerecord}
          className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-hairline text-ink-muted hover:bg-white/5 transition-colors"
        >
          Re-record
        </button>
        <button
          type="button"
          onClick={() =>
            onConfirm({
              text: applyAlternatives(alignment, chosen),
              edited: chosen.size > 0,
              source: transcription.source,
            })
          }
          className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-br from-violet-electric to-indigo-500 text-action-ink shadow-[0_0_16px_rgba(124,58,237,0.3)]"
        >
          Use this
        </button>
      </div>
    </motion.div>
  );
}
