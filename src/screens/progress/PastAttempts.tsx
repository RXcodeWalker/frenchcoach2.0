import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { enter, fadeUp, slide } from '../../components/motion/variants';
import { Segmented } from '../../components/ui/Segmented';
import { TopicChip } from '../../components/ui/TopicChip';
import { TOPICS } from '../../data/gameData';
import { EXAM_TOTAL_MAX, type PastAttempt } from '../../features/progress/progressSummary';
import { formatShortDate } from './formatDate';

export const PAST_ATTEMPTS_PAGE = 20;
const TRANSCRIPT_PREVIEW = 300;

type Filter = 'all' | 'learn' | 'exam';

/**
 * Past attempts (frame 3a): every Learn answer and exam attempt, newest
 * first, filtered by kind, each row expandable to what was stored, paged.
 */
export function PastAttempts({ attempts }: { attempts: PastAttempt[] }) {
  const [shown, setShown] = useState(PAST_ATTEMPTS_PAGE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const visible = filter === 'all' ? attempts : attempts.filter(a => a.kind === filter);

  return (
    <motion.section variants={fadeUp} aria-labelledby="progress-history" className="flex flex-col gap-3" data-testid="progress-history">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1">
        <h2 id="progress-history" className="text-eyebrow uppercase text-ink-subtle">Past attempts</h2>
        {attempts.length > 0 && (
          <Segmented
            label="Show"
            value={filter}
            onChange={(f) => { setFilter(f); setOpenId(null); }}
            height={36}
            className="w-[240px] max-w-full"
            options={[{ id: 'all', label: 'All' }, { id: 'learn', label: 'Learn' }, { id: 'exam', label: 'Exam' }]}
          />
        )}
      </div>
      <div className="overflow-hidden rounded-card border border-hairline bg-surface">
        {attempts.length === 0 ? (
          <p className="px-4 py-4 text-body-s text-ink-muted">
            Your Learn answers and exams will be listed here.{' '}
            <Link to="/learn" className="font-semibold text-action-text">Answer a Learn question</Link>
            {' '}or{' '}
            <Link to="/exam" className="font-semibold text-action-text">sit an Exam Sim</Link>.
          </p>
        ) : visible.length === 0 ? (
          <p className="px-4 py-4 text-body-s text-ink-muted">
            {filter === 'exam' ? 'No exam attempts yet.' : 'No Learn answers yet.'}
          </p>
        ) : (
          <ul>
            {visible.slice(0, shown).map((a, i) => (
              <AttemptRow
                key={a.id}
                attempt={a}
                first={i === 0}
                open={openId === a.id}
                onToggle={() => setOpenId(openId === a.id ? null : a.id)}
              />
            ))}
          </ul>
        )}
      </div>
      {visible.length > shown && (
        <button
          type="button"
          onClick={() => setShown(n => n + PAST_ATTEMPTS_PAGE)}
          className="min-h-11 self-start rounded-control px-3 text-[14px] font-semibold text-action-text transition-colors duration-state ease-smooth hover:bg-action-soft"
        >
          Show more ({visible.length - shown} older)
        </button>
      )}
    </motion.section>
  );
}

function AttemptRow({ attempt, first, open, onToggle }: { attempt: PastAttempt; first: boolean; open: boolean; onToggle: () => void }) {
  const detailId = `attempt-${attempt.id}`;
  const isExam = attempt.kind === 'exam';
  const scored = isExam ? attempt.total !== null : attempt.score !== null;
  const frLabel = !isExam ? TOPICS.find(t => t.key === attempt.topicKey)?.label ?? attempt.topicLabel : '';
  return (
    <li data-testid="progress-attempt" className={first ? '' : 'border-t border-hairline'}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={detailId}
        className="flex min-h-[60px] w-full items-center gap-3 px-[clamp(16px,3cqw,20px)] py-2.5 text-left text-ink
          transition-colors duration-state ease-smooth hover:bg-surface-recessed"
      >
        <span className="w-12 shrink-0 font-numeral text-[13px] text-ink-subtle">{formatShortDate(attempt.date)}</span>
        {isExam ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control bg-action-soft text-action-text" aria-hidden="true">
            <GraduationCap size={14} />
          </span>
        ) : (
          <TopicChip topicKey={attempt.topicKey} size={28} />
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[14px] font-semibold leading-[1.35]">{isExam ? 'Exam Sim' : frLabel}</span>
          <span className={`text-caption leading-[1.35] ${isExam && attempt.counted ? 'text-progress-text' : 'text-ink-subtle'}`}>
            {isExam ? (attempt.counted ? 'Counted in your Exam figures' : 'Practice · not counted') : 'Learn answer'}
          </span>
        </span>
        <span className={`shrink-0 whitespace-nowrap ${scored ? 'font-numeral text-[14px] text-ink' : 'text-[13px] text-ink-subtle'}`}>
          {isExam
            ? attempt.total === null ? 'Not marked' : `${attempt.total}/${EXAM_TOTAL_MAX}`
            : attempt.score === null ? 'Not scored' : `${attempt.score.toFixed(1)}/10`}
        </span>
        <motion.span className="flex shrink-0 text-ink-subtle" animate={{ rotate: open ? 180 : 0 }} transition={slide} aria-hidden="true">
          <ChevronDown size={16} />
        </motion.span>
      </button>
      {open && (
        <motion.div
          id={detailId}
          variants={enter}
          initial="hidden"
          animate="show"
          className="mx-[clamp(16px,3cqw,20px)] mb-4 flex flex-col gap-2 rounded-control border border-hairline bg-surface-recessed px-4 py-3.5 text-body-s text-ink-muted"
        >
          {attempt.kind === 'exam' ? <ExamDetail attempt={attempt} /> : <LearnDetail attempt={attempt} />}
        </motion.div>
      )}
    </li>
  );
}

function ExamDetail({ attempt }: { attempt: Extract<PastAttempt, { kind: 'exam' }> }) {
  return (
    <>
      {attempt.total === null && <p>This attempt couldn't be marked.</p>}
      {attempt.areas.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {attempt.areas.map(area => (
            <li key={area.key} className="flex justify-between gap-2">
              <span>{area.label}</span>
              <span className="font-numeral text-ink">{area.mark}/{area.max}</span>
            </li>
          ))}
        </ul>
      ) : attempt.total !== null ? (
        <p>Only the total was saved for this attempt.</p>
      ) : null}
      {!attempt.counted && (
        <p className="text-ink-subtle">This attempt was practice (Coached, or not sat under exam conditions), so it isn't in your Exam figures.</p>
      )}
    </>
  );
}

function LearnDetail({ attempt }: { attempt: Extract<PastAttempt, { kind: 'learn' }> }) {
  const transcript = attempt.transcript.length > TRANSCRIPT_PREVIEW
    ? `${attempt.transcript.slice(0, TRANSCRIPT_PREVIEW)}…`
    : attempt.transcript;
  return (
    <>
      {attempt.questionText && <p lang="fr" className="font-semibold text-ink">{attempt.questionText}</p>}
      {transcript && <p lang="fr" className="italic">“{transcript}”</p>}
      {attempt.feedbackSummary && <p><span className="text-ink-subtle">Feedback · </span>{attempt.feedbackSummary}</p>}
      {attempt.score !== null && <p className="text-ink-subtle">Score shown at Exam standard.</p>}
    </>
  );
}
