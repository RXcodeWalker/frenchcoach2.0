import { useState } from 'react';
import { motion } from 'framer-motion';
import { applyChoices, type ConfirmModel, type UnderlinedSpan } from '../../domain/transcription/confirmView';

interface Props {
  /** Null while the second opinion is still being fetched. */
  model: ConfirmModel | null;
  onUse: (text: string, edited: boolean) => void;
  onRerecord: () => void;
}

function spanHelp(span: UnderlinedSpan): string {
  if (span.alternatives.length === 0) return 'Only one of our two listeners caught this. Re-record if it is wrong.';
  return span.origin === 'single-recogniser'
    ? 'This word is easy to mix up. Did you mean:'
    : 'Our two listeners heard this differently. The other one heard:';
}

/**
 * "We heard…": the primary transcript with the words the recognisers disagree
 * on (and the easily-confused Category B words) underlined. Tapping one offers
 * the other recogniser's word or a re-record. There is no free-text editing.
 */
export function TranscriptConfirmPanel({ model, onUse, onRerecord }: Props) {
  const [choices, setChoices] = useState<Record<number, string>>({});
  const [openSpan, setOpenSpan] = useState<number | null>(null);

  const choose = (spanId: number, value: string | null) => {
    setChoices((prev) => {
      const next = { ...prev };
      if (value === null) delete next[spanId];
      else next[spanId] = value;
      return next;
    });
    setOpenSpan(null);
  };

  const confirmed = model ? applyChoices(model, choices) : null;
  const open = model && openSpan !== null ? model.spans[openSpan] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl surface-raised p-5 space-y-4"
      data-testid="transcript-confirm"
    >
      <div>
        <p className="text-eyebrow uppercase text-ink-muted mb-1.5">We heard</p>
        {model === null ? (
          <p className="text-sm text-ink-muted italic" role="status">Checking what you said…</p>
        ) : model.displayText.trim() ? (
          <p className="text-sm text-ink leading-relaxed" data-testid="transcript-text">
            {model.pieces.map((piece, i) => {
              const span = piece.spanId === null ? null : model.spans[piece.spanId];
              const swapped = span && choices[span.id] !== undefined;
              const sep = i < model.pieces.length - 1 ? ' ' : '';
              if (!span) return <span key={i}>{piece.text}{sep}</span>;
              // The whole span is one button, rendered on its first piece.
              if (piece.spanId !== null && model.pieces[i - 1]?.spanId === piece.spanId) return null;
              const text = model.pieces.slice(span.start, span.end).map((p) => p.text).join(' ');
              return (
                <span key={i}>
                  <button
                    type="button"
                    data-testid={`uncertain-${span.id}`}
                    onClick={() => setOpenSpan(openSpan === span.id ? null : span.id)}
                    aria-expanded={openSpan === span.id}
                    className="underline decoration-dotted decoration-info-text underline-offset-4 font-semibold text-info-text"
                  >
                    {swapped ? choices[span.id] : text}
                  </button>
                  {i + (span.end - span.start) < model.pieces.length ? ' ' : ''}
                </span>
              );
            })}
          </p>
        ) : (
          <p className="text-sm text-ink-muted italic">Nothing was transcribed.</p>
        )}
        {model?.source === 'chrome' && model.fallbackReason && (
          <p className="mt-1.5 text-[11px] text-ink-muted" data-testid="fallback-note">
            Showing your browser’s live captions this time.
          </p>
        )}
      </div>

      {model && open && (
        <div className="rounded-lg bg-info-soft border border-hairline p-3 space-y-2" data-testid="uncertain-options">
          <p className="text-xs text-ink">{spanHelp(open)}</p>
          <div className="flex flex-wrap gap-2">
            {open.alternatives.map((alt) => (
              <button
                key={alt}
                type="button"
                onClick={() => choose(open.id, alt)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-hairline text-ink hover:bg-white/5"
              >
                {alt}
              </button>
            ))}
            {choices[open.id] !== undefined && (
              <button
                type="button"
                onClick={() => choose(open.id, null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-hairline text-ink-muted hover:bg-white/5"
              >
                Keep “{open.shownWords.join(' ')}”
              </button>
            )}
            <button
              type="button"
              onClick={onRerecord}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-hairline text-ink-muted hover:bg-white/5"
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
          className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-700 text-ink-muted hover:bg-white/5 transition-colors"
        >
          Re-record
        </button>
        <button
          type="button"
          disabled={confirmed === null}
          onClick={() => confirmed && onUse(confirmed.text, confirmed.edited)}
          className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-br from-violet-electric to-indigo-500 text-action-ink shadow-[0_0_16px_rgba(124,58,237,0.3)] disabled:opacity-50"
        >
          Use this
        </button>
      </div>
    </motion.div>
  );
}
