import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { fadeUp } from '../../components/motion/variants';
import { Button } from '../../components/ui/Button';
import { CONSISTENCY_WINDOW_DAYS, learnTopicPath, type LearnSummary } from '../../features/progress/progressSummary';

/** Learn: what's been practised, what's mastered, what's due for spaced review, and how regularly. */
export function LearnProgress({ learn }: { learn: LearnSummary }) {
  const navigate = useNavigate();
  const practised = learn.topics.length;

  return (
    <motion.section variants={fadeUp} aria-labelledby="progress-learn" className="surface rounded-card p-5" data-testid="progress-learn">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="progress-learn" className="text-subtitle text-ink">Learn</h2>
        <span className="text-eyebrow uppercase text-ink-subtle">Scores at Exam standard /10</span>
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Topics practised" value={`${practised} of ${learn.visibleTopicCount}`} />
        <Stat label="Topics mastered" value={String(learn.masteredCount)} />
        <Stat label="Due for review" value={String(learn.dueForReview)} testId="progress-learn-due" />
        <Stat
          label={`Days practised (last ${CONSISTENCY_WINDOW_DAYS})`}
          value={String(learn.daysPractisedRecently)}
          hint={learn.streakDays > 0 ? `${learn.streakDays}-day streak` : undefined}
        />
      </div>

      {practised === 0 ? (
        <div className="mt-4 space-y-3">
          <p className="text-body-s text-ink-muted">
            You haven't practised a Learn topic yet. Each answer you record is scored and feeds your topic averages,
            mastery and spaced review.
          </p>
          <Button variant="secondary" onClick={() => navigate('/learn')}>Pick a topic</Button>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-hairline" aria-label="Practised topics">
          {learn.topics.map(t => (
            <li key={t.key}>
              <button
                type="button"
                onClick={() => navigate(learnTopicPath(t.key))}
                className="w-full min-h-[44px] py-2.5 flex items-center gap-3 text-left hover:bg-[color-mix(in_srgb,var(--ink)_2%,transparent)]"
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-body-s text-ink truncate">
                    {t.label}
                    {t.mastered && <span className="ml-2 text-eyebrow uppercase text-progress-text">Mastered</span>}
                  </span>
                  <span className="block text-eyebrow text-ink-subtle">
                    {t.questionsAnswered} of {t.questionsTotal} questions answered
                    {t.dueForReview > 0 && <span className="text-action-text"> · {t.dueForReview} due for review</span>}
                  </span>
                </span>
                <span className="font-numeral text-body-s text-ink tabular-nums">
                  {t.averageScore === null ? '—' : t.averageScore.toFixed(1)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {learn.weakSkills.length > 0 && (
        <div className="mt-5">
          <h3 className="text-eyebrow uppercase text-ink-subtle mb-2">Grammar to work on</h3>
          <ul className="flex flex-wrap gap-2">
            {learn.weakSkills.map(s => (
              <li key={s.id} className="rounded-pill border border-hairline-strong px-3 py-1 text-body-s text-ink-muted">
                {s.name} <span className="font-numeral tabular-nums text-ink-subtle">{s.mastery}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.section>
  );
}

function Stat({ label, value, hint, testId }: { label: string; value: string; hint?: string; testId?: string }) {
  return (
    <div className="surface-recessed rounded-card p-3">
      <p className="font-numeral text-title text-ink tabular-nums" data-testid={testId}>{value}</p>
      <p className="text-eyebrow uppercase text-ink-subtle mt-1">{label}</p>
      {hint && <p className="text-eyebrow text-ink-subtle mt-0.5">{hint}</p>}
    </div>
  );
}
