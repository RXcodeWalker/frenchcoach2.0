import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Clock, MessageCircle, Minus, Type, Mic } from 'lucide-react';
import { CountUp } from '../../../components/motion/CountUp';
import { enter, enterReduced, fill, stagger } from '../../../components/motion/variants';
import { formatTime } from '../../../domain/time';
import type { EnvelopeView } from '../../../domain/igcse/envelope/envelopeView';
import {
  AREA_LABEL,
  areaMarks,
  areaTone,
  changeSince,
  type ExamFacts,
  type PreviousExam,
} from './examReport';

/**
 * The top of the exam results screen: the /40 as a ring that fills, the three
 * scored areas as bars, what changed since the last counted Exam Sim (two
 * numbers read from the history, never a trend or a prediction) and the exam
 * in numbers. Every mark is copied from the envelope view.
 */

interface Props {
  view: EnvelopeView | null;
  facts: ExamFacts;
  /** "Exam Sim", "Coached Practice — doesn’t count", … */
  modeLabel: string;
  coached: boolean;
  /** The newest counted Exam Sim before this one; only passed when this attempt counts. */
  previous: PreviousExam | null;
}

const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;
const STROKE = { progress: 'stroke-progress', reward: 'stroke-reward', correction: 'stroke-correction' } as const;
const BAR = { progress: 'bg-progress', reward: 'bg-reward', correction: 'bg-correction' } as const;

function TotalRing({ total, reduced }: { total: number; reduced: boolean }) {
  const offset = RING_C * (1 - Math.max(0, Math.min(40, total)) / 40);
  return (
    <div className="relative h-[132px] w-[132px] shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={RING_R} fill="none" strokeWidth="10" className="stroke-track" />
        <motion.circle
          cx="60"
          cy="60"
          r={RING_R}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={RING_C}
          className={STROKE[areaTone(total, 40)]}
          initial={{ strokeDashoffset: reduced ? offset : RING_C }}
          animate={{ strokeDashoffset: offset }}
          transition={reduced ? { duration: 0 } : fill(0.25)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-label={`${total} out of 40`}>
        <CountUp value={total} delay={250} className="font-numeral text-num-l leading-none text-ink" data-testid="exam-total" />
        <span className="mt-1 font-numeral text-label text-ink-subtle">/40</span>
      </div>
    </div>
  );
}

function Delta({ value, testId }: { value: number; testId?: string }) {
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  const cls = value > 0 ? 'bg-progress-soft text-progress-text' : value < 0 ? 'bg-correction-soft text-correction-text' : 'bg-track text-ink-muted';
  const text = value > 0 ? `+${value}` : value < 0 ? `${value}` : 'same';
  return (
    <span data-testid={testId} className={`inline-flex items-center gap-0.5 rounded-pill px-2 py-0.5 font-numeral text-label ${cls}`}>
      <Icon size={13} aria-hidden="true" />
      {text}
    </span>
  );
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function ExamResultHero({ view, facts, modeLabel, coached, previous }: Props) {
  const reduced = useReducedMotion() ?? false;
  const areas = view ? areaMarks(view) : [];
  const change = view && previous ? changeSince(view, previous) : null;

  const stats = [
    { icon: MessageCircle, value: `${facts.answers}`, label: facts.answers === 1 ? 'answer' : 'answers' },
    { icon: Clock, value: formatTime(Math.round(facts.speakingS)), label: 'speaking' },
    { icon: Mic, value: `${facts.words}`, label: 'words' },
  ];

  return (
    <motion.section
      variants={reduced ? enterReduced : enter}
      initial="hidden"
      animate="show"
      aria-label="Your exam result"
      data-testid="exam-results-hero"
      className="rounded-card border border-hairline bg-surface-raised p-5 shadow-card sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-pill bg-action-soft px-2.5 py-0.5 text-label text-action-text">{modeLabel}</span>
        {view && view.typedTurnCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-pill bg-track px-2.5 py-0.5 text-label text-ink-muted">
            <Type size={12} aria-hidden="true" />
            {view.typedTurnCount} typed answer{view.typedTurnCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <h1 className="mt-3 text-title text-ink">
        {coached ? 'Coached practice complete' : 'Exam Sim complete'}
      </h1>
      <p className="mt-0.5 text-body-s text-ink-muted">Cambridge IGCSE French 0520 · Speaking</p>

      {view && (
        <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-7">
          <TotalRing total={view.total} reduced={reduced} />
          <motion.ul
            variants={stagger}
            initial="hidden"
            animate="show"
            className="w-full min-w-0 flex-1 space-y-3"
            aria-label="Marks by area"
          >
            {areas.map((a, i) => {
              const tone = areaTone(a.mark, a.max);
              return (
                <motion.li key={a.area} variants={reduced ? enterReduced : enter} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-label text-ink">{AREA_LABEL[a.area]}</span>
                    <span className="flex items-center gap-1.5">
                      {change && <Delta value={change.byArea[a.area]} />}
                      <span className="font-numeral text-label text-ink">{a.mark} of {a.max}</span>
                    </span>
                  </div>
                  <span className="block h-2 overflow-hidden rounded-pill bg-track" aria-hidden="true">
                    <motion.span
                      className={`block h-full rounded-pill ${BAR[tone]}`}
                      initial={{ width: reduced ? `${(a.mark / a.max) * 100}%` : 0 }}
                      animate={{ width: `${(a.mark / a.max) * 100}%` }}
                      transition={reduced ? { duration: 0 } : fill(0.4 + i * 0.1)}
                    />
                  </span>
                </motion.li>
              );
            })}
          </motion.ul>
        </div>
      )}

      {change && previous && (
        <div data-testid="exam-change" className="mt-4 flex items-center gap-2 rounded-control surface-recessed px-3 py-2">
          <Delta value={change.total} testId="exam-change-total" />
          <span className="min-w-0 text-body-s text-ink-muted">
            since your last counted Exam Sim ({previous.marks.total} of 40{shortDate(previous.date) ? `, ${shortDate(previous.date)}` : ''})
          </span>
        </div>
      )}

      <ul className="mt-4 grid grid-cols-3 gap-2 border-t border-hairline pt-4" aria-label="Your exam in numbers">
        {stats.map(({ icon: Icon, value, label }) => (
          <li key={label} className="flex flex-col items-center gap-0.5 text-center">
            <Icon size={16} className="text-ink-subtle" aria-hidden="true" />
            <span className="font-numeral text-section text-ink">{value}</span>
            <span className="text-caption text-ink-subtle">{label}</span>
          </li>
        ))}
      </ul>

      {view && (
        <p className="mt-4 text-caption text-ink-subtle">
          An estimate, not a grade prediction: this marker has not yet been checked against a real Cambridge examiner.
        </p>
      )}
    </motion.section>
  );
}
