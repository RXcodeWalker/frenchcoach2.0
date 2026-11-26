import type { Mark, MarkKind } from './judge';
import { describeMarks } from './feedbackText';

/**
 * The learner's answer, word by word, lined up with what was said. Colour is
 * never the only signal: a word that is not right also says what happened in
 * words ("should be …", "missing", "not said"), and the full sentence about it
 * is in the list below.
 */

const TONE: Record<MarkKind, string> = {
  ok: 'bg-progress-soft text-progress-text',
  accent: 'bg-info-soft text-info-text',
  punct: 'bg-info-soft text-info-text',
  sound: 'bg-info-soft text-info-text',
  spelling: 'bg-info-soft text-info-text',
  wrong: 'bg-correction-soft text-correction-text',
  extra: 'bg-correction-soft text-correction-text',
  missing: 'border border-dashed border-correction text-correction-text',
};

/** Under the word: what it should have been, in the plainest words. */
function caption(mark: Mark): string | null {
  switch (mark.kind) {
    case 'ok':
      return null;
    case 'missing':
      return 'missing';
    case 'extra':
      return 'not said';
    default:
      return mark.joined ? `with “${mark.target}”` : `should be ${mark.target}`;
  }
}

export function MarkedAnswer({ marks }: { marks: Mark[] }) {
  return (
    <ul className="flex flex-wrap gap-x-2 gap-y-2.5" aria-label="Your answer, word by word" data-testid="dictee-marked">
      {marks.map((mark, i) => {
        const text = mark.kind === 'missing' ? mark.target : mark.joined ? '·' : mark.typed;
        const note = caption(mark);
        return (
          <li key={i} className="flex flex-col items-start gap-0.5" data-kind={mark.kind}>
            <span lang="fr" className={`rounded-control px-2.5 py-1 text-[16px] font-semibold ${TONE[mark.kind]} ${mark.kind === 'extra' ? 'line-through' : ''}`}>
              {text}
            </span>
            {note && <span className="px-1 text-[12px] font-normal text-ink-subtle">{note}</span>}
          </li>
        );
      })}
    </ul>
  );
}

/** One sentence per slip, in the order they came, capped so a very wrong answer isn't a wall of text. */
export function SlipNotes({ marks, max = 5 }: { marks: Mark[]; max?: number }) {
  const notes = describeMarks(marks);
  if (notes.length === 0) return null;
  const shown = notes.slice(0, max);
  return (
    <ul className="flex flex-col gap-1.5 text-[14px] leading-[1.5] text-ink-muted" data-testid="dictee-notes">
      {shown.map((note, i) => (
        <li key={i}>{note}</li>
      ))}
      {notes.length > shown.length && <li className="text-ink-subtle">…and {notes.length - shown.length} more.</li>}
    </ul>
  );
}
