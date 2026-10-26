import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { examTotalOutOf40 } from '../../features/progress/progressSummary';
import { fadeUp } from '../../components/motion/variants';
import { TopicChip } from '../../components/ui/TopicChip';
import { TOPICS } from '../../data/gameData';
import type { Session } from '../../types/index';

interface Props {
  sessions: Session[];
  compact?: boolean;
}

const MODE_LABEL: Record<string, string> = { practice: 'Learn', exam: 'Exam' };

function label(s: Session): string {
  if (s.mode === 'exam') return 'Exam Sim';
  return TOPICS.find(t => t.key === s.topicKey)?.label ?? 'Practice';
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/**
 * Recent activity (Home 2a): the last four sessions. Desktop: an eyebrow over
 * a recessed list of 56px rows (topic chip, topic and meta, score, XP).
 * Compact: a card with single-line 44px rows.
 */
export function RecentActivity({ sessions, compact = false }: Props) {
  const rows = sessions.slice(0, 4);

  const empty = (
    <p className="px-4 py-4 text-body-s text-ink-muted">
      Your sessions will appear here.{' '}
      <Link to="/learn" className="font-semibold text-action-text">Record your first answer</Link>
    </p>
  );

  const score = (s: Session) => {
    const scored = typeof s.score === 'number' && Number.isFinite(s.score);
    const total = s.mode === 'exam' ? examTotalOutOf40({ score: s.score, examMarks: s.examMarks }) : null;
    return (
      <span className={`shrink-0 whitespace-nowrap ${scored ? 'font-numeral text-[14px] text-ink' : 'text-[13px] text-ink-muted'}`}>
        {!scored ? 'Not graded' : total !== null ? `${total}/40` : (s.score as number).toFixed(1)}
      </span>
    );
  };

  const chip = (s: Session, size: number) =>
    s.mode === 'exam' ? (
      <span
        aria-hidden="true"
        className="flex shrink-0 items-center justify-center rounded-control bg-action-soft text-action-text"
        style={{ width: size, height: size, borderRadius: size >= 28 ? 8 : 6 }}
      >
        <GraduationCap size={14} />
      </span>
    ) : (
      <TopicChip topicKey={s.topicKey} size={size} />
    );

  if (compact) {
    return (
      <motion.section variants={fadeUp} className="overflow-hidden rounded-card border border-hairline bg-surface">
        <h2 className="border-b border-hairline px-5 py-3 text-[14px] font-semibold text-ink">Recent activity</h2>
        {rows.length === 0 ? empty : rows.map((s, i) => (
          <div key={s.id} className={`flex h-11 items-center gap-3 px-5 ${i ? 'border-t border-hairline' : ''}`}>
            {chip(s, 20)}
            <span className="min-w-0 flex-1 truncate text-[14px] text-ink">
              {label(s)} <span className="text-[13px] text-ink-subtle">· {shortDate(s.createdAt)}</span>
            </span>
            {score(s)}
            <span className="w-14 text-right font-numeral text-[13px] text-reward-text">+{s.xpEarned} XP</span>
          </div>
        ))}
      </motion.section>
    );
  }

  return (
    <motion.section variants={fadeUp} className="flex flex-col gap-2">
      <h2 className="px-1 text-eyebrow uppercase text-ink-subtle">Recent activity</h2>
      <div className="overflow-hidden rounded-card border border-hairline bg-surface-recessed">
        {rows.length === 0 ? empty : rows.map((s, i) => (
          <div key={s.id} className={`flex min-h-14 items-center gap-3 px-4 py-2.5 ${i ? 'border-t border-hairline' : ''}`}>
            {chip(s, 28)}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[14px] leading-[1.35] text-ink">{label(s)}</span>
              <span className="text-caption text-ink-subtle">{MODE_LABEL[s.mode] ?? 'Practice'} · {shortDate(s.createdAt)}</span>
            </span>
            {score(s)}
            <span className="w-16 text-right font-numeral text-[13px] text-reward-text">+{s.xpEarned} XP</span>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
