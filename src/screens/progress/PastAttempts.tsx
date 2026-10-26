import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fadeUp } from '../../components/motion/variants';
import { EXAM_TOTAL_MAX, type PastAttempt } from '../../features/progress/progressSummary';
import { formatShortDate } from './formatDate';

export const PAST_ATTEMPTS_PAGE = 20;
const TRANSCRIPT_PREVIEW = 300;

/** Past attempts: every Learn answer and exam attempt, newest first, each expandable to what was stored. */
export function PastAttempts({ attempts }: { attempts: PastAttempt[] }) {
  const [shown, setShown] = useState(PAST_ATTEMPTS_PAGE);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <motion.section variants={fadeUp} aria-labelledby="progress-history" data-testid="progress-history">
      <h2 id="progress-history" className="text-eyebrow uppercase text-ink-subtle mb-2.5">Past attempts</h2>
      <div className="surface-recessed rounded-card overflow-hidden">
        {attempts.length === 0 ? (
          <p className="px-4 py-4 text-body-s text-ink-muted">
            Your Learn answers and exams will be listed here.{' '}
            <Link to="/learn" className="text-action-text">Answer a Learn question</Link>
            {' '}or{' '}
            <Link to="/exam" className="text-action-text">sit an Exam Sim</Link>.
          </p>
        ) : (
          <ul className="divide-y divide-hairline">
            {attempts.slice(0, shown).map(a => (
              <AttemptRow key={a.id} attempt={a} open={openId === a.id} onToggle={() => setOpenId(openId === a.id ? null : a.id)} />
            ))}
          </ul>
        )}
      </div>
      {attempts.length > shown && (
        <button
          type="button"
          onClick={() => setShown(n => n + PAST_ATTEMPTS_PAGE)}
          className="mt-2 min-h-[44px] text-body-s text-action-text"
        >
          Show more ({attempts.length - shown} older)
        </button>
      )}
    </motion.section>
  );
}

function AttemptRow({ attempt, open, onToggle }: { attempt: PastAttempt; open: boolean; onToggle: () => void }) {
  const detailId = `attempt-${attempt.id}`;
  return (
    <li data-testid="progress-attempt">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={detailId}
        className="w-full min-h-[44px] px-4 py-2.5 flex items-center gap-3 text-left hover:bg-[color-mix(in_srgb,var(--ink)_2%,transparent)]"
      >
        <span className="w-14 shrink-0 text-eyebrow text-ink-subtle">{formatShortDate(attempt.date)}</span>
        <span className="flex-1 min-w-0 text-body-s text-ink truncate">
          {attempt.kind === 'exam' ? 'Exam' : attempt.topicLabel}
          {attempt.kind === 'exam' && (
            <span className={`ml-2 text-eyebrow uppercase ${attempt.counted ? 'text-progress-text' : 'text-ink-subtle'}`}>
              {attempt.counted ? 'Exam Sim' : 'Practice · not counted'}
            </span>
          )}
          {attempt.kind === 'learn' && <span className="ml-2 text-eyebrow uppercase text-ink-subtle">Learn answer</span>}
        </span>
        <span className="font-numeral text-body-s text-ink tabular-nums shrink-0">
          {attempt.kind === 'exam'
            ? attempt.total === null ? 'Not marked' : `${attempt.total}/${EXAM_TOTAL_MAX}`
            : attempt.score === null ? 'Not scored' : `${attempt.score.toFixed(1)}/10`}
        </span>
        <ChevronDown size={14} className={`shrink-0 text-ink-subtle transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div id={detailId} className="px-4 pb-4 space-y-2 text-body-s text-ink-muted">
          {attempt.kind === 'exam' ? <ExamDetail attempt={attempt} /> : <LearnDetail attempt={attempt} />}
        </div>
      )}
    </li>
  );
}

function ExamDetail({ attempt }: { attempt: Extract<PastAttempt, { kind: 'exam' }> }) {
  return (
    <>
      {!attempt.counted && <p>This attempt was practice (Coached, or not sat under exam conditions), so it isn't in your Exam figures.</p>}
      {attempt.total === null && <p>This attempt couldn't be marked.</p>}
      {attempt.areas.length > 0 ? (
        <ul className="space-y-1">
          {attempt.areas.map(area => (
            <li key={area.key} className="flex justify-between gap-2">
              <span>{area.label}</span>
              <span className="font-numeral tabular-nums text-ink">{area.mark}/{area.max}</span>
            </li>
          ))}
        </ul>
      ) : attempt.total !== null ? (
        <p>Only the total was saved for this attempt.</p>
      ) : null}
    </>
  );
}

function LearnDetail({ attempt }: { attempt: Extract<PastAttempt, { kind: 'learn' }> }) {
  const transcript = attempt.transcript.length > TRANSCRIPT_PREVIEW
    ? `${attempt.transcript.slice(0, TRANSCRIPT_PREVIEW)}…`
    : attempt.transcript;
  return (
    <>
      {attempt.questionText && <p className="text-ink">{attempt.questionText}</p>}
      {transcript && <p lang="fr" className="italic">“{transcript}”</p>}
      {attempt.feedbackSummary && <p><span className="text-ink-subtle">Feedback: </span>{attempt.feedbackSummary}</p>}
      {attempt.score !== null && <p className="text-ink-subtle">Score shown at Exam standard.</p>}
    </>
  );
}
