import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { fadeUp, fill } from '../../components/motion/variants';
import { Button } from '../../components/ui/Button';
import { CountUp } from '../../components/motion/CountUp';
import { EXAM_TOTAL_MAX, type ExamArea, type ExamSummary } from '../../features/progress/progressSummary';
import { formatShortDate } from './formatDate';

const TREND_LIMIT = 6;
/** Height of a full (40/40) bar in the 136px chart, leaving room for the value label. */
const BAR_MAX = 108;

function insight(exam: ExamSummary): string | null {
  if (exam.counted.length < 2) return null;
  const latest = exam.counted[0];
  const first = exam.counted[exam.counted.length - 1];
  const d = latest.total - first.total;
  const since = `since your first Exam Sim on ${formatShortDate(first.date)}`;
  if (d > 0) return `Up ${d} mark${d === 1 ? '' : 's'} ${since}.`;
  if (d < 0) return `Down ${-d} mark${d === -1 ? '' : 's'} ${since}. One sitting is a small sample — the next one counts too.`;
  return `The same total as your first Exam Sim on ${formatShortDate(first.date)}.`;
}

/**
 * Exam (frame 3a): the latest /40 at 52px with a plain-English trend, a bar
 * chart of the last six counted Exam Sims (latest solid, earlier soft with a
 * progress inset, growing from 0), the marks by scored area with the weakest
 * flagged, and a note on uncounted practice attempts.
 */
export function ExamProgress({ exam }: { exam: ExamSummary }) {
  const navigate = useNavigate();
  const latest = exam.counted[0] ?? null;
  const trend = exam.counted.slice(0, TREND_LIMIT).reverse();
  const line = insight(exam);

  return (
    <motion.section
      variants={fadeUp}
      aria-labelledby="progress-exam"
      className="flex min-w-0 flex-[1.5_1_440px] flex-col gap-5 rounded-card border border-hairline bg-surface p-[clamp(20px,3cqw,24px)]"
      data-testid="progress-exam"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="progress-exam" className="text-section text-ink">Exam</h2>
        <span className="text-[13px] text-ink-subtle">Exam Sim marks /{EXAM_TOTAL_MAX}</span>
      </div>

      {latest === null ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-body-s text-ink-muted">
            No Exam Sim result yet. Exam Sim is a full 0520 speaking exam (a role play and two topic conversations)
            marked out of 40, under real exam conditions. You get one sample exam every 7 days.
          </p>
          {exam.practiceExcludedCount > 0 && <PracticeNote count={exam.practiceExcludedCount} />}
          <Button variant="secondary" size="sm" onClick={() => navigate('/exam')}>Start Exam Sim</Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <div className="flex flex-col gap-0.5">
              <span className="flex items-baseline gap-1">
                <CountUp value={latest.total} className="font-numeral text-num-xl text-ink" data-testid="progress-exam-latest" />
                <span className="font-numeral text-[18px] text-ink-subtle">/{EXAM_TOTAL_MAX}</span>
              </span>
              <span className="text-[13px] text-ink-subtle">Latest · {formatShortDate(latest.date)}</span>
            </div>
            {line && <p className="min-w-0 flex-[1_1_220px] text-body-s text-ink-muted [text-wrap:pretty]">{line}</p>}
          </div>

          {trend.length > 1 && (
            <div className="flex flex-col gap-2">
              <ol
                className="grid h-[136px] gap-2 border-b border-hairline-strong"
                style={{ gridTemplateColumns: `repeat(${TREND_LIMIT}, minmax(0, 1fr))` }}
                aria-label="Exam Sim totals, oldest to newest"
              >
                {trend.map((a, i) => {
                  const last = i === trend.length - 1;
                  return (
                    <li key={a.id} className="flex h-full min-w-0 flex-col items-center justify-end gap-1" title={`${a.total}/${EXAM_TOTAL_MAX} · ${formatShortDate(a.date)}`}>
                      <span className={`font-numeral text-caption ${last ? 'text-ink' : 'text-ink-subtle'}`}>{a.total}</span>
                      <motion.span
                        className="block w-full max-w-11 rounded-[6px]"
                        style={{
                          background: last ? 'var(--progress)' : 'var(--progress-soft)',
                          boxShadow: last ? 'none' : 'inset 0 0 0 1px var(--progress)',
                        }}
                        initial={{ height: 0 }}
                        animate={{ height: Math.max(8, (a.total / EXAM_TOTAL_MAX) * BAR_MAX) }}
                        transition={fill(0.26 + i * 0.06)}
                      />
                    </li>
                  );
                })}
              </ol>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${TREND_LIMIT}, minmax(0, 1fr))` }} aria-hidden="true">
                {trend.map((a, i) => (
                  <span
                    key={a.id}
                    className={`truncate text-center text-caption ${i === trend.length - 1 ? 'font-semibold text-ink' : 'text-ink-subtle'}`}
                  >
                    {formatShortDate(a.date)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3.5 border-t border-hairline pt-4">
            {exam.areas.length > 0 ? (
              <>
                <span className="text-eyebrow uppercase text-ink-subtle">
                  By scored area · {formatShortDate((exam.latestWithAreas ?? latest).date)}
                </span>
                {exam.areas.map(area => (
                  <AreaBar key={area.key} area={area} weakest={exam.weakestArea?.key === area.key} />
                ))}
              </>
            ) : (
              <p className="text-body-s text-ink-muted">
                The breakdown by role play, communication and quality of language appears after your next Exam Sim.
              </p>
            )}
            {exam.practiceExcludedCount > 0 && <PracticeNote count={exam.practiceExcludedCount} />}
          </div>
        </>
      )}
    </motion.section>
  );
}

function AreaBar({ area, weakest }: { area: ExamArea; weakest: boolean }) {
  return (
    <div className="flex flex-col gap-1.5" data-testid={`progress-exam-area-${area.key}`}>
      <span className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-[14px] text-ink">
          {area.label}
          {weakest && (
            <span className="inline-flex h-[22px] items-center rounded-pill bg-correction-soft px-2 text-caption font-semibold text-correction-text">
              Weakest
            </span>
          )}
        </span>
        <span className="font-numeral text-[14px] text-ink">{area.mark}<span className="text-ink-subtle">/{area.max}</span></span>
      </span>
      <span className="block h-2 overflow-hidden rounded-pill bg-track">
        <motion.span
          className={`block h-full rounded-pill ${weakest ? 'bg-correction' : 'bg-progress'}`}
          initial={{ width: 0 }}
          animate={{ width: `${(area.mark / area.max) * 100}%` }}
          transition={fill()}
        />
      </span>
    </div>
  );
}

function PracticeNote({ count }: { count: number }) {
  return (
    <p className="text-[13px] text-ink-subtle [text-wrap:pretty]">
      {count} practice {count === 1 ? 'attempt' : 'attempts'} (Coached, or not sat under exam conditions) {count === 1 ? 'isn’t' : 'aren’t'} counted here.
    </p>
  );
}
