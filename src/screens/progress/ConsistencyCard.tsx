import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { fadeUp, fill } from '../../components/motion/variants';
import { CountUp } from '../../components/motion/CountUp';
import { scoreFill } from '../../domain/scoring';
import type { PractiseDay, WeakSkill } from '../../features/progress/progressSummary';

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const dayOf = (key: string) => new Date(`${key}T12:00:00Z`);

/**
 * Consistency (frame 3a): days practised out of the last 14 as a 7-column
 * grid (practised days on progress-soft, today ringed in --action), the
 * streak, and the grammar skills to work on as bars coloured by mastery.
 */
export function ConsistencyCard({ days, streakDays, weakSkills }: { days: PractiseDay[]; streakDays: number; weakSkills: WeakSkill[] }) {
  const practised = days.filter(d => d.practised).length;
  return (
    <motion.section
      variants={fadeUp}
      aria-labelledby="progress-consistency"
      className="flex min-w-0 flex-[1_1_300px] flex-col gap-5 rounded-card border border-hairline bg-surface p-[clamp(20px,3cqw,24px)]"
      data-testid="progress-learn"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="progress-consistency" className="text-section text-ink">Consistency</h2>
        <span className="text-[13px] text-ink-subtle">Last {days.length} days</span>
      </div>
      <span className="flex items-baseline gap-1">
        <CountUp value={practised} className="font-numeral text-num-l text-ink" />
        <span className="font-numeral text-[14px] text-ink-subtle">/{days.length} days practised</span>
      </span>
      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-7 gap-1.5" aria-hidden="true">
          {days.slice(0, 7).map(d => (
            <span key={d.key} className="text-center text-caption text-ink-subtle">{WEEKDAY[dayOf(d.key).getUTCDay()]}</span>
          ))}
        </div>
        <ol className="grid grid-cols-7 gap-1.5" aria-label="Days practised">
          {days.map(d => {
            const date = dayOf(d.key);
            const label = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
            return (
              <li
                key={d.key}
                title={`${label}${d.practised ? ' · practised' : ''}${d.today ? ' · today' : ''}`}
                aria-label={`${label}${d.practised ? ', practised' : ''}${d.today ? ', today' : ''}`}
                className="flex h-10 items-center justify-center rounded-control font-numeral text-[13px]"
                style={{
                  background: d.practised ? 'var(--progress-soft)' : 'var(--surface-recessed)',
                  color: d.practised ? 'var(--progress-text)' : 'var(--ink-subtle)',
                  boxShadow: d.today ? 'inset 0 0 0 1.5px var(--action)' : d.practised ? 'inset 0 0 0 1px var(--progress)' : 'inset 0 0 0 1px var(--hairline)',
                }}
              >
                {date.getUTCDate()}
              </li>
            );
          })}
        </ol>
      </div>
      <span className="inline-flex items-center gap-2 text-[13px] text-ink-muted">
        <Flame size={14} className="text-streak-text" aria-hidden="true" />
        {streakDays > 0 ? `${streakDays}-day streak` : 'No streak yet — practise today to start one'}
      </span>

      {weakSkills.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-hairline pt-4">
          <h3 className="text-eyebrow uppercase text-ink-subtle">Grammar to work on</h3>
          {weakSkills.map(k => (
            <div key={k.id} className="flex flex-col gap-1.5">
              <span className="flex justify-between gap-2 text-[14px] text-ink">
                <span>{k.name}</span>
                <span className="font-numeral text-ink-muted">{k.mastery}%</span>
              </span>
              <span className="block h-1.5 overflow-hidden rounded-pill bg-track">
                <motion.span
                  className="block h-full rounded-pill"
                  style={{ background: scoreFill(k.mastery / 10) }}
                  initial={{ width: 0 }}
                  animate={{ width: `${k.mastery}%` }}
                  transition={fill()}
                />
              </span>
            </div>
          ))}
          <span className="text-[13px] text-ink-subtle">Mastery from your corrections across every topic.</span>
        </div>
      )}
    </motion.section>
  );
}
