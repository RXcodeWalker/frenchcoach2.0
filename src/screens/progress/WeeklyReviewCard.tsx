import { motion } from 'framer-motion';
import { ArrowDown, ArrowRight, ArrowUp, CalendarDays, Check, Circle, X } from 'lucide-react';
import { fadeUp } from '../../components/motion/variants';
import { hasContent, type ReviewChange, type ReviewDone, type ReviewPlannedItem, type WeeklyReview } from '../../domain/coachOutcomes/weeklyReview';

interface WeeklyReviewCardProps {
  review: WeeklyReview | null | undefined;
  /** Shows the dismiss button (Home); My Plan shows the review without one. */
  onDismiss?: () => void;
}

function formatDateRange(start: string, end: string) {
  const fmt = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${fmt(start)} – ${fmt(end)}`;
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "5 Learn answers · 1 Exam Sim · 4 active days", only the parts that happened. */
function doneLine(d: ReviewDone): string {
  const parts: string[] = [];
  if (d.learnAnswers) parts.push(plural(d.learnAnswers, 'Learn answer'));
  if (d.examSims) parts.push(plural(d.examSims, 'Exam Sim'));
  if (d.coachedExams) parts.push(plural(d.coachedExams, 'Coached exam'));
  if (d.rolePlayAnswers) parts.push(plural(d.rolePlayAnswers, 'role-play answer'));
  if (parts.length === 0) return 'No practice that week.';
  parts.push(plural(d.activeDays, 'active day'));
  return parts.join(' · ');
}

const STATUS_TEXT: Record<ReviewPlannedItem['status'], string> = {
  followed: 'Done',
  not_followed: 'Not this time',
  open: 'Still open',
};

function PlannedRow({ item }: { item: ReviewPlannedItem }) {
  const done = item.status === 'followed';
  return (
    <li className="flex items-start gap-2 text-body-s text-ink-muted">
      {done
        ? <Check size={16} className="mt-0.5 shrink-0 text-progress-text" aria-hidden="true" />
        : <Circle size={16} className="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />}
      <span className="min-w-0 flex-1">{item.title}</span>
      <span className="shrink-0 text-caption text-ink-subtle">{STATUS_TEXT[item.status]}</span>
    </li>
  );
}

function ChangeRow({ change }: { change: ReviewChange }) {
  const Icon = change.direction === 'up' ? ArrowUp : change.direction === 'down' ? ArrowDown : ArrowRight;
  const tone = change.direction === 'up' ? 'text-progress-text' : 'text-ink-subtle';
  return (
    <li className="flex flex-col gap-0.5 text-body-s">
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-semibold text-ink">{change.label}</span>
        <span className={`inline-flex items-center gap-1 font-numeral ${tone}`}>
          {change.from}
          <Icon size={13} aria-hidden="true" />
          {change.to}
        </span>
      </span>
      <span className="text-caption text-ink-subtle">{change.basis}</span>
    </li>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-eyebrow uppercase text-ink-subtle">{title}</h3>
      {children}
    </section>
  );
}

/**
 * Home's weekly review (Design System v2): what the coach planned last week, what
 * you did, what measurably changed, and next week's focus. Renders nothing until a
 * review with something in it exists.
 */
export function WeeklyReviewCard({ review, onDismiss }: WeeklyReviewCardProps) {
  if (!review || !hasContent(review)) return null;
  return (
    <motion.section
      variants={fadeUp}
      aria-label="Weekly review"
      className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5"
      data-testid="weekly-review"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <CalendarDays size={14} className="shrink-0 text-ink-subtle" aria-hidden="true" />
          <h2 className="text-eyebrow uppercase text-ink-subtle">Last week</h2>
          <span className="font-numeral text-caption text-ink-subtle">{formatDateRange(review.weekStart, review.weekEnd)}</span>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss weekly review"
            className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-subtle transition-colors duration-state ease-smooth hover:bg-track hover:text-ink"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <Section title="What you did">
        <p className="text-body-s text-ink">{doneLine(review.done)}</p>
      </Section>

      {review.planned.length > 0 && (
        <Section title="What your coach planned">
          <ul className="flex flex-col gap-1.5">
            {review.planned.map(p => <PlannedRow key={p.title} item={p} />)}
          </ul>
        </Section>
      )}

      {review.changed.length > 0 && (
        <Section title="What changed">
          <ul className="flex flex-col gap-2">
            {review.changed.map(c => <ChangeRow key={`${c.label}|${c.from}|${c.to}`} change={c} />)}
          </ul>
        </Section>
      )}

      {review.nextFocus.length > 0 && (
        <Section title="This week's focus">
          <div className="flex flex-wrap gap-2">
            {review.nextFocus.map(f => (
              <span key={f} className="inline-flex min-h-8 items-center rounded-pill bg-surface-recessed px-3 text-[13px] font-medium text-ink-muted">
                {f}
              </span>
            ))}
          </div>
        </Section>
      )}
    </motion.section>
  );
}
