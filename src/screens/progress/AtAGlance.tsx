import { motion } from 'framer-motion';
import { BookOpen, Info, Minus, RotateCcw, TrendingDown, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { fadeUp, stagger } from '../../components/motion/variants';
import { CountUp } from '../../components/motion/CountUp';
import { EXAM_TOTAL_MAX, type ExamSummary, type LearnSummary } from '../../features/progress/progressSummary';

interface TileProps {
  label: string;
  value: number | null;
  decimals?: number;
  unit: string;
  note: ReactNode;
  noteIcon: ReactNode;
  noteClass: string;
  testId?: string;
}

function Tile({ label, value, decimals = 0, unit, note, noteIcon, noteClass, testId }: TileProps) {
  return (
    <motion.div variants={fadeUp} className="flex min-w-0 flex-col gap-1 rounded-card border border-hairline bg-surface px-[18px] py-4">
      <span className="text-[13px] text-ink-subtle">{label}</span>
      <span className="flex items-baseline gap-1">
        {value === null ? (
          <span className="font-numeral text-num-l text-ink-subtle" data-testid={testId}>—</span>
        ) : (
          <CountUp value={value} decimals={decimals} className="font-numeral text-num-l text-ink" data-testid={testId} />
        )}
        <span className="font-numeral text-[14px] text-ink-subtle">{unit}</span>
      </span>
      <span className={`mt-0.5 inline-flex items-center gap-1.5 text-[13px] ${noteClass}`}>
        <span className="inline-flex shrink-0" aria-hidden="true">{noteIcon}</span>{note}
      </span>
    </motion.div>
  );
}

/** At a glance (frame 3a): four numbers that count up — latest Exam Sim, Learn average, topics practised, due for review. */
export function AtAGlance({ exam, learn, learnAvg }: { exam: ExamSummary; learn: LearnSummary; learnAvg: number | null }) {
  const latest = exam.counted[0] ?? null;
  const prev = exam.counted[1] ?? null;
  const delta = latest && prev ? latest.total - prev.total : null;
  const notStarted = Math.max(0, learn.visibleTopicCount - learn.topics.length);

  const examNote =
    latest === null ? { text: 'No Exam Sim yet', icon: <Info size={14} />, cls: 'text-ink-subtle' }
    : delta === null ? { text: 'Your first Exam Sim', icon: <Info size={14} />, cls: 'text-ink-subtle' }
    : delta > 0 ? { text: `+${delta} on your last`, icon: <TrendingUp size={14} />, cls: 'font-medium text-progress-text' }
    : delta < 0 ? { text: `${delta} on your last`, icon: <TrendingDown size={14} />, cls: 'text-ink-muted' }
    : { text: 'Same as your last', icon: <Minus size={14} />, cls: 'text-ink-subtle' };

  return (
    <motion.div variants={stagger} className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr))]" data-testid="progress-glance">
      <Tile
        label="Latest Exam Sim"
        value={latest?.total ?? null}
        unit={`/${EXAM_TOTAL_MAX}`}
        note={examNote.text}
        noteIcon={examNote.icon}
        noteClass={examNote.cls}
      />
      <Tile
        label="Learn average"
        value={learnAvg}
        decimals={1}
        unit="/10"
        note="At Exam standard"
        noteIcon={<Info size={14} />}
        noteClass="text-ink-subtle"
      />
      <Tile
        label="Topics practised"
        value={learn.topics.length}
        unit={`/${learn.visibleTopicCount}`}
        note={notStarted === 0 ? 'Every topic tried' : `${notStarted} still to try`}
        noteIcon={<BookOpen size={14} />}
        noteClass="text-ink-subtle"
      />
      <Tile
        label="Due for review"
        value={learn.dueForReview}
        unit={learn.dueForReview === 1 ? 'answer' : 'answers'}
        note={learn.dueForReview > 0 ? 'Keeps them fresh' : 'Nothing due today'}
        noteIcon={<RotateCcw size={14} />}
        noteClass={learn.dueForReview > 0 ? 'font-medium text-action-text' : 'text-ink-subtle'}
        testId="progress-learn-due"
      />
    </motion.div>
  );
}
