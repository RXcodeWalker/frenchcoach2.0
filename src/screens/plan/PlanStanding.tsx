import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUp, ChevronRight } from 'lucide-react';
import { fadeUp, fill } from '../../components/motion/variants';
import { EXAM_TOTAL_MAX } from '../../features/progress/progressSummary';
import { MIN_TREND_SAMPLES, type ExamStanding, type SkillRow, type SkillStanding } from '../../features/myPlan/planModel';
import { formatShortDate } from '../progress/formatDate';
import { plural } from './formatDay';

const TREND_TEXT = { up: 'Rising', down: 'Falling', same: 'About the same' } as const;
const BAR_COLOUR = { progress: 'var(--progress)', info: 'var(--info-text)', correction: 'var(--correction)' } as const;
const SKILL_TREND_TEXT = { improving: 'improving', declining: 'slipping', steady: 'steady' } as const;

function Bar({ share, tone, delay }: { share: number; tone: 'progress' | 'info' | 'correction'; delay: number }) {
  return (
    <span className="block h-2 overflow-hidden rounded-pill bg-track" aria-hidden="true">
      <motion.span
        className="block h-full rounded-pill"
        style={{ background: BAR_COLOUR[tone] }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(2, Math.min(100, share * 100))}%` }}
        transition={fill(delay)}
      />
    </span>
  );
}

function ExamPart({ exam }: { exam: ExamStanding }) {
  const latest = exam.totals[exam.totals.length - 1] ?? null;
  return (
    <div className="flex flex-col gap-4" data-testid="plan-exam-standing">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-[15px] font-semibold text-ink">Exam Sim marks</h3>
        <span className="text-[13px] text-ink-subtle">Counted Exam Sims only · /{EXAM_TOTAL_MAX}</span>
      </div>

      {latest === null ? (
        <p className="text-body-s text-ink-muted [text-wrap:pretty]">
          No counted Exam Sim yet. Your first one shows which of the three marked areas your marks come from.
        </p>
      ) : (
        <>
          <ol className="flex flex-wrap gap-2" aria-label="Counted Exam Sim totals, oldest to newest">
            {exam.totals.map((t, i) => {
              const newest = i === exam.totals.length - 1;
              return (
                <li
                  key={t.id}
                  className={`flex min-w-[64px] flex-col items-center gap-0.5 rounded-control px-2.5 py-2 ${newest ? 'bg-progress-soft' : 'bg-surface-recessed'}`}
                >
                  <span className={`font-numeral text-[17px] ${newest ? 'text-progress-text' : 'text-ink'}`}>{t.total}</span>
                  <span className="text-caption text-ink-subtle">{formatShortDate(t.date)}</span>
                </li>
              );
            })}
          </ol>
          {exam.trend ? (
            <p className="inline-flex flex-wrap items-center gap-x-1.5 text-body-s text-ink" data-testid="plan-exam-trend">
              {exam.trend.direction === 'up' ? <ArrowUp size={14} className="text-progress-text" aria-hidden="true" />
                : exam.trend.direction === 'down' ? <ArrowDown size={14} className="text-ink-subtle" aria-hidden="true" />
                  : <ArrowRight size={14} className="text-ink-subtle" aria-hidden="true" />}
              <span>
                {TREND_TEXT[exam.trend.direction]}: your last {exam.trend.perSide} averaged {exam.trend.to}/{EXAM_TOTAL_MAX},
                the {exam.trend.perSide} before them {exam.trend.from}/{EXAM_TOTAL_MAX}.
              </span>
            </p>
          ) : (
            <p className="text-[13px] text-ink-subtle [text-wrap:pretty]" data-testid="plan-exam-no-trend">
              No trend yet: one exam can go up or down by chance. After {plural(exam.moreForTrend, 'more counted Exam Sim')} I can
              compare your last {MIN_TREND_SAMPLES} with the {MIN_TREND_SAMPLES} before them.
            </p>
          )}

          {exam.areas.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-hairline pt-4">
              <span className="text-eyebrow uppercase text-ink-subtle">By scored area · your latest counted Exam Sim</span>
              {exam.areas.map((a, i) => (
                <div key={a.key} className="flex flex-col gap-1.5">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3 text-[14px] text-ink">
                    <span>{a.label}</span>
                    <span className="font-numeral text-ink-muted">
                      {a.mark}/{a.max}
                      {a.recentSharePct !== null && <span className="text-ink-subtle"> · about {a.recentSharePct}% across recent Exam Sims</span>}
                    </span>
                  </span>
                  <Bar share={a.mark / a.max} tone="progress" delay={0.22 + i * 0.06} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {exam.practiceExcluded > 0 && (
        <p className="text-[13px] text-ink-subtle">
          {plural(exam.practiceExcluded, 'practice exam')} (Coached, typed, resumed or started early) {exam.practiceExcluded === 1 ? 'is' : 'are'} left out.
        </p>
      )}
    </div>
  );
}

function SkillList({ title, rows, tone, note }: { title: string; rows: SkillRow[]; tone: 'progress' | 'info' | 'correction'; note: string }) {
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h4 className="text-eyebrow uppercase text-ink-subtle">{title}</h4>
        <p className="text-caption text-ink-subtle">{note}</p>
      </div>
      {rows.map((k, i) => (
        <div key={k.id} className="flex flex-col gap-1.5" data-testid={`plan-skill-${k.id}`}>
          <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[14px] text-ink">
            <span>{k.label}</span>
            <span className="flex items-baseline gap-3">
              <span className="font-numeral text-[13px] text-ink-muted">
                {k.masteryPct}% · {plural(k.answers, 'answer')}
                {k.trend && <span className="text-ink-subtle"> · {SKILL_TREND_TEXT[k.trend]}</span>}
              </span>
              {k.to && tone !== 'progress' && (
                <Link to={k.to} className="inline-flex min-h-8 items-center gap-0.5 text-[13px] font-medium text-action-text">
                  Practise<ChevronRight size={14} aria-hidden="true" />
                </Link>
              )}
            </span>
          </span>
          <Bar share={k.masteryPct / 100} tone={tone} delay={0.22 + i * 0.04} />
        </div>
      ))}
    </div>
  );
}

function SkillPart({ skills, hasHistory }: { skills: SkillStanding; hasHistory: boolean }) {
  const placed = skills.workOn.length + skills.building.length + skills.secure.length;
  return (
    <div className="flex flex-col gap-5" data-testid="plan-skill-standing">
      <div className="flex flex-col gap-1">
        <h3 className="text-[15px] font-semibold text-ink">Your French, skill by skill</h3>
        <p className="text-[13px] text-ink-subtle [text-wrap:pretty]">
          How often each skill was right in your recent answers — recent answers count most. A practice reading, not a mark.
        </p>
      </div>
      {placed === 0 ? (
        <p className="text-body-s text-ink-muted [text-wrap:pretty]">
          {hasHistory
            ? 'Not enough answers yet to say which skills are secure. A few more Learn answers and they will appear here.'
            : 'Answer a few Learn questions and your skills will appear here — which are secure and which to work on.'}
        </p>
      ) : (
        <>
          <SkillList title="Work on" rows={skills.workOn} tone="correction" note="Your coach targets these first." />
          <SkillList title="Getting there" rows={skills.building} tone="info" note="Right more often than not — keep using them." />
          <SkillList title="Secure" rows={skills.secure} tone="progress" note="Right most of the time, on plenty of answers." />
        </>
      )}
      {skills.tooEarly > 0 && placed > 0 && (
        <p className="text-[13px] text-ink-subtle">
          {plural(skills.tooEarly, 'other skill')} {skills.tooEarly === 1 ? 'has' : 'have'} too few answers to place yet.
        </p>
      )}
    </div>
  );
}

/** Where you stand: the counted exam marks and every language skill the learner model holds. */
export function PlanStanding({ exam, skills, hasHistory }: { exam: ExamStanding; skills: SkillStanding; hasHistory: boolean }) {
  return (
    <motion.section
      variants={fadeUp}
      aria-labelledby="plan-standing"
      className="flex flex-col gap-6 rounded-card border border-hairline bg-surface p-[clamp(20px,3cqw,24px)]"
      data-testid="plan-standing"
    >
      <h2 id="plan-standing" className="text-section text-ink">Where you stand</h2>
      <ExamPart exam={exam} />
      <div className="border-t border-hairline pt-5">
        <SkillPart skills={skills} hasHistory={hasHistory} />
      </div>
    </motion.section>
  );
}
