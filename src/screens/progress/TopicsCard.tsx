import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { fadeUp, fill } from '../../components/motion/variants';
import { Button } from '../../components/ui/Button';
import { TopicChip } from '../../components/ui/TopicChip';
import { scoreSoft, scoreTone } from '../../domain/scoring';
import { learnTopicPath, type LearnSummary } from '../../features/progress/progressSummary';
import type { Topic } from '../../types';

/**
 * Topics (frame 3a): the practised topics, weakest average first, each with
 * its chip, names, answered bar, review count and a tone-coloured average;
 * a row opens that topic's setup. The footer counts the topics not started.
 */
export function TopicsCard({ learn, topics }: { learn: LearnSummary; topics: Topic[] }) {
  const navigate = useNavigate();
  const rows = [...learn.topics].sort((a, b) => (a.averageScore ?? 99) - (b.averageScore ?? 99));
  const notStarted = Math.max(0, learn.visibleTopicCount - rows.length);

  return (
    <motion.section variants={fadeUp} aria-labelledby="progress-topics" className="overflow-hidden rounded-card border border-hairline bg-surface" data-testid="progress-topics">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-[clamp(16px,3cqw,24px)] py-4">
        <h2 id="progress-topics" className="text-section text-ink">Topics</h2>
        <span className="text-[13px] text-ink-subtle">Weakest first · scores at Exam standard /10</span>
      </div>

      {rows.length === 0 ? (
        <p className="border-t border-hairline px-[clamp(16px,3cqw,24px)] py-4 text-body-s text-ink-muted">
          You haven't practised a Learn topic yet. Each answer you record is scored and feeds your topic averages,
          mastery and spaced review.
        </p>
      ) : (
        <ul aria-label="Practised topics">
          {rows.map(t => {
            const topic = topics.find(x => x.key === t.key);
            const pct = t.questionsTotal > 0 ? Math.max(3, (t.questionsAnswered / t.questionsTotal) * 100) : 0;
            return (
              <li key={t.key} className="border-t border-hairline">
                <button
                  type="button"
                  onClick={() => navigate(learnTopicPath(t.key))}
                  className="flex w-full flex-wrap items-center gap-x-4 gap-y-2.5 px-[clamp(16px,3cqw,24px)] py-3.5 text-left text-ink
                    transition-colors duration-state ease-smooth hover:bg-surface-recessed"
                >
                  <TopicChip topicKey={t.key} size={36} />
                  <span className="flex min-w-0 flex-[1_1_150px] flex-col">
                    <span className="text-[15px] font-semibold leading-[1.35]">
                      {topic?.label ?? t.label}
                      {t.mastered && <span className="ml-2 text-caption font-semibold text-progress-text">Mastered</span>}
                    </span>
                    <span className="text-[13px] leading-[1.35] text-ink-subtle">{topic?.labelEn ?? t.label}</span>
                  </span>
                  <span className="flex min-w-0 flex-[1_1_200px] flex-col gap-1.5">
                    <span className="flex justify-between gap-2 text-caption text-ink-subtle">
                      <span className="font-numeral">{t.questionsAnswered} of {t.questionsTotal} answered</span>
                      {t.dueForReview > 0 && <span className="font-semibold text-action-text">{t.dueForReview} due for review</span>}
                    </span>
                    <span className="block h-1.5 overflow-hidden rounded-pill bg-track">
                      <motion.span
                        className="block h-full rounded-pill bg-progress"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={fill()}
                      />
                    </span>
                  </span>
                  <span
                    className="inline-flex h-8 min-w-[52px] shrink-0 items-center justify-center rounded-control px-2.5 font-numeral text-[14px]"
                    style={{
                      background: t.averageScore !== null ? scoreSoft(t.averageScore) : 'var(--surface-recessed)',
                      color: t.averageScore !== null ? scoreTone(t.averageScore) : 'var(--ink-subtle)',
                    }}
                  >
                    {t.averageScore === null ? '—' : t.averageScore.toFixed(1)}
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-ink-subtle" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-hairline bg-surface-recessed px-[clamp(16px,3cqw,24px)] py-3">
        <span className="text-[14px] text-ink-muted">
          {notStarted === 0 ? 'You’ve practised every topic.' : `${notStarted} topic${notStarted === 1 ? '' : 's'} not started yet`}
        </span>
        <Button variant="secondary" size="sm" onClick={() => navigate('/learn')}>Browse topics</Button>
      </div>
    </motion.section>
  );
}
