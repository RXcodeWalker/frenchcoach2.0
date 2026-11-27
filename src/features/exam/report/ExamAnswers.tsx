import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MessagesSquare, PenLine } from 'lucide-react';
import { correct, enter, enterReduced, stagger } from '../../../components/motion/variants';
import { ERROR_CATEGORY_LABELS } from '../../../domain/examFeedback/shared/errorCategories';
import { segmentAnswer, type AnswerPart, type AnswerRow } from './examReport';

/**
 * "Your answers": every answer the scorer read, part by part, with the
 * marker's own mistakes struck through and the correction dropped in (the
 * `correct` motion). Display only — the marks next to role-play tasks are
 * copied from the envelope.
 */

function Mark({ text, correction, order, reduced }: { text: string; correction: string; order: number; reduced: boolean }) {
  const d = 0.3 + order * 0.22;
  const [struck, setStruck] = useState(reduced);
  useEffect(() => {
    if (reduced) return setStruck(true);
    const t = setTimeout(() => setStruck(true), (d + 0.1) * 1000);
    return () => clearTimeout(t);
  }, [reduced, d]);
  return (
    <span>
      <span
        className="text-ink-muted line-through decoration-2"
        style={{
          textDecorationColor: struck ? 'var(--correction)' : 'transparent',
          transition: reduced ? undefined : 'text-decoration-color 240ms var(--ease)',
        }}
      >
        {text}
      </span>{' '}
      <motion.span
        className="rounded-[4px] bg-progress-soft px-1 font-semibold text-progress-text"
        initial={reduced ? false : { opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : correct.fix(d)}
      >
        {correction}
      </motion.span>
    </span>
  );
}

function MarkedAnswer({ row, reduced }: { row: AnswerRow; reduced: boolean }) {
  const segments = segmentAnswer(row.group.candidateResponse, row.mistakes);
  let n = 0;
  return (
    <p className="text-body-base text-ink">
      {segments.map((s, i) =>
        s.mistake ? (
          <Mark key={i} text={s.text} correction={s.mistake.correction} order={n++} reduced={reduced} />
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </p>
  );
}

function AnswerCard({ row, reduced }: { row: AnswerRow; reduced: boolean }) {
  const words = row.group.wordCount;
  const silent = !row.group.candidateResponse.trim();
  return (
    <motion.li variants={reduced ? enterReduced : enter} className="rounded-card border border-hairline bg-surface p-4" data-testid="exam-answer">
      <div className="flex items-center justify-between gap-2">
        <span className="text-eyebrow uppercase text-ink-subtle">{row.label}</span>
        <span className="flex items-center gap-1.5">
          {row.mistakes.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-pill bg-correction-soft px-2 py-0.5 text-caption text-correction-text">
              <PenLine size={12} aria-hidden="true" />
              {row.mistakes.length} to fix
            </span>
          )}
          {words !== undefined && <span className="rounded-pill bg-track px-2 py-0.5 font-numeral text-caption text-ink-muted">{words} words</span>}
          {row.taskMark !== undefined && (
            <span className="rounded-pill bg-track px-2 py-0.5 font-numeral text-caption text-ink">{row.taskMark} of 2</span>
          )}
        </span>
      </div>
      {row.group.prompt && <p className="mt-2 text-body-s text-ink-muted">{row.group.prompt}</p>}
      <div className="mt-2 rounded-control surface-recessed px-3 py-2.5">
        {silent ? <p className="text-body-s text-ink-subtle">No answer was recorded.</p> : <MarkedAnswer row={row} reduced={reduced} />}
      </div>
      {row.mistakes.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Mistake types">
          {row.mistakes.map((m, i) => (
            <li key={i} className="rounded-pill bg-track px-2 py-0.5 text-caption text-ink-muted">
              {m.category ? ERROR_CATEGORY_LABELS[m.category] : 'Mistake'}: <span className="text-ink">{m.correction}</span>
            </li>
          ))}
        </ul>
      )}
    </motion.li>
  );
}

export function ExamAnswers({ parts }: { parts: AnswerPart[] }) {
  const reduced = useReducedMotion() ?? false;
  return (
    <div className="space-y-6" data-testid="exam-answers">
      {parts.map((part) => {
        const fixes = part.rows.reduce((sum, r) => sum + r.mistakes.length, 0);
        return (
          <section key={part.part} aria-label={part.title} className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-control bg-info-soft text-info-text" aria-hidden="true">
                <MessagesSquare size={16} />
              </span>
              <h3 className="text-section text-ink">{part.title}</h3>
              <span className="ml-auto text-caption text-ink-subtle">
                {part.rows.length} {part.rows.length === 1 ? 'answer' : 'answers'}
                {fixes > 0 ? ` · ${fixes} to fix` : ''}
              </span>
            </div>
            <motion.ul variants={stagger} initial="hidden" animate="show" className="space-y-2.5">
              {part.rows.map((row) => (
                <AnswerCard key={row.group.questionOrTaskId} row={row} reduced={reduced} />
              ))}
            </motion.ul>
          </section>
        );
      })}
    </div>
  );
}
