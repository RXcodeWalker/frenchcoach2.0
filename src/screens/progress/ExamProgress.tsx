import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { fadeUp } from '../../components/motion/variants';
import { Button } from '../../components/ui/Button';
import { EXAM_TOTAL_MAX, type ExamArea, type ExamSummary } from '../../features/progress/progressSummary';
import { formatShortDate } from './formatDate';

const TREND_LIMIT = 8;

/** Exam: how the /40 is going (Exam Sim attempts only) and which scored area pulls it down. */
export function ExamProgress({ exam }: { exam: ExamSummary }) {
  const navigate = useNavigate();
  const latest = exam.counted[0] ?? null;
  const trend = exam.counted.slice(0, TREND_LIMIT).reverse();

  return (
    <motion.section variants={fadeUp} aria-labelledby="progress-exam" className="surface rounded-card p-5" data-testid="progress-exam">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="progress-exam" className="text-subtitle text-ink">Exam</h2>
        <span className="text-eyebrow uppercase text-ink-subtle">Exam Sim marks /40</span>
      </div>

      {latest === null ? (
        <div className="mt-3 space-y-3">
          <p className="text-body-s text-ink-muted">
            No Exam Sim result yet. Exam Sim is a full 0520 speaking exam (a role play and two topic conversations)
            marked out of 40, under real exam conditions. You get one sample exam every 7 days.
          </p>
          {exam.practiceExcludedCount > 0 && <PracticeNote count={exam.practiceExcludedCount} />}
          <Button variant="secondary" onClick={() => navigate('/exam')}>Start Exam Sim</Button>
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <p className="font-numeral text-title text-ink tabular-nums" data-testid="progress-exam-latest">
                {latest.total}<span className="text-body-s text-ink-subtle">/{EXAM_TOTAL_MAX}</span>
              </p>
              <p className="text-eyebrow uppercase text-ink-subtle mt-1">Latest · {formatShortDate(latest.date)}</p>
            </div>
            {trend.length > 1 && (
              <div>
                <ol className="flex items-end gap-1.5 h-10" aria-label="Exam Sim totals, oldest to newest">
                  {trend.map(a => (
                    <li
                      key={a.id}
                      className="w-3 rounded-sm bg-progress"
                      style={{ height: `${Math.max(8, (a.total / EXAM_TOTAL_MAX) * 100)}%` }}
                      title={`${a.total}/${EXAM_TOTAL_MAX} · ${formatShortDate(a.date)}`}
                    />
                  ))}
                </ol>
                <p className="text-eyebrow uppercase text-ink-subtle mt-1">Last {trend.length} attempts</p>
              </div>
            )}
          </div>

          {exam.areas.length > 0 ? (
            <div className="space-y-3">
              <p className="text-body-s text-ink-muted">
                By scored area{exam.latestWithAreas && exam.latestWithAreas.id !== latest.id ? ` (from ${formatShortDate(exam.latestWithAreas.date)})` : ''}:
              </p>
              {exam.areas.map(area => (
                <AreaBar key={area.key} area={area} weakest={exam.weakestArea?.key === area.key} />
              ))}
            </div>
          ) : (
            <p className="text-body-s text-ink-muted">
              The breakdown by role play, communication and quality of language appears after your next Exam Sim.
            </p>
          )}

          {exam.practiceExcludedCount > 0 && <PracticeNote count={exam.practiceExcludedCount} />}
        </div>
      )}
    </motion.section>
  );
}

function AreaBar({ area, weakest }: { area: ExamArea; weakest: boolean }) {
  return (
    <div data-testid={`progress-exam-area-${area.key}`}>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-body-s text-ink">
          {area.label}
          {weakest && <span className="ml-2 text-eyebrow uppercase text-correction-text">Weakest</span>}
        </span>
        <span className="font-numeral text-body-s text-ink tabular-nums">{area.mark}/{area.max}</span>
      </div>
      <div className="h-1.5 rounded-pill bg-track overflow-hidden">
        <div
          className={`h-full rounded-pill ${weakest ? 'bg-correction' : 'bg-progress'}`}
          style={{ width: `${(area.mark / area.max) * 100}%` }}
        />
      </div>
    </div>
  );
}

function PracticeNote({ count }: { count: number }) {
  return (
    <p className="text-body-s text-ink-subtle">
      {count} practice {count === 1 ? 'attempt' : 'attempts'} (Coached, or not sat under exam conditions) {count === 1 ? 'is' : 'are'} not counted here.
    </p>
  );
}
