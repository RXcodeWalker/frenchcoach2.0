import type { ReactNode } from 'react';
import { GraduationCap, Loader2 } from 'lucide-react';
import {
  findExaminerDescriptor,
  isExaminerFeedbackEmpty,
  type ExaminerCitedClaim,
  type ExaminerErrorItem,
  type ExaminerFeedback,
} from '../../../services/coaching/examinerFeedback';
import { ERROR_CATEGORY_LABELS } from '../../../domain/examFeedback/shared/errorCategories';

interface Props {
  /** 'quota-exhausted': today's AI feedback allowance is used up (HTTP 429) — no retry offered. */
  status: 'pending' | 'done' | 'failed' | 'quota-exhausted';
  result: ExaminerFeedback | null;
  onSwitchToCoach: () => void;
  onRetry: () => void;
  /** Exam mode has no "coach mode" to switch to — hides that escape hatch on the failed state. */
  hideSwitchToCoach?: boolean;
  /**
   * 'compact' is for the live corrections rail and the results replay: same
   * content and the same pending / failed / quota states, tighter layout, and
   * no header or descriptor line. It is a prop, not a second component.
   */
  variant?: 'full' | 'compact';
}

const QUOTE_CLASS = 'text-amber-700 dark:text-amber-300/80 italic';

function Section({ heading, compact, children }: { heading: string; compact: boolean; children: ReactNode }) {
  return (
    <div className={compact ? 'rounded-xl surface-raised p-3 space-y-2' : 'rounded-xl surface-raised p-4 space-y-2.5'}>
      <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">{heading}</p>
      {children}
    </div>
  );
}

function CitedClaim({ item, compact }: { item: ExaminerCitedClaim; compact: boolean }) {
  return (
    <div className="space-y-1">
      <p className={compact ? 'text-[11px] text-ink leading-relaxed' : 'text-xs text-ink leading-relaxed'}>{item.claim}</p>
      <p className={compact ? `text-[10px] ${QUOTE_CLASS}` : `text-[11px] ${QUOTE_CLASS}`}>« {item.quote} »</p>
    </div>
  );
}

function ErrorRow({ item, compact }: { item: ExaminerErrorItem; compact: boolean }) {
  return (
    <div className="space-y-1">
      <p className={compact ? 'text-[11px] leading-relaxed' : 'text-xs leading-relaxed'}>
        <span className={`${QUOTE_CLASS} line-through decoration-rose-400/70`}>« {item.quote} »</span>
        <span className="text-ink-muted mx-1.5" aria-hidden="true">
          →
        </span>
        <span className="text-ink font-semibold">{item.correction}</span>
      </p>
      <span className="inline-block rounded-full surface-recessed px-2 py-0.5 text-[9px] font-bold text-ink-muted">
        {ERROR_CATEGORY_LABELS[item.category]}
      </span>
    </div>
  );
}

function FeedbackSections({ result, compact }: { result: ExaminerFeedback; compact: boolean }) {
  if (result.profile === 'learn') {
    const descriptor = result.nextStep ? findExaminerDescriptor(result.nextStep.descriptorId) : undefined;
    return (
      <>
        {result.strengths.length > 0 && (
          <Section heading="What worked" compact={compact}>
            {result.strengths.map((s, i) => (
              <CitedClaim key={i} item={s} compact={compact} />
            ))}
          </Section>
        )}
        {result.errors.length > 0 && (
          <Section heading="Mistakes to fix" compact={compact}>
            {result.errors.map((e, i) => (
              <ErrorRow key={i} item={e} compact={compact} />
            ))}
          </Section>
        )}
        {result.nextStep && (
          <Section heading="Your next step" compact={compact}>
            <div className="space-y-1">
              <p className={compact ? 'text-[11px] text-ink leading-relaxed' : 'text-xs text-ink leading-relaxed'}>
                {result.nextStep.claim}
              </p>
              {result.nextStep.quote && (
                <p className={compact ? `text-[10px] ${QUOTE_CLASS}` : `text-[11px] ${QUOTE_CLASS}`}>
                  « {result.nextStep.quote} »
                </p>
              )}
              {!compact && descriptor && (
                <p className="text-[10px] text-ink-muted">
                  Descriptor to aim for: “{descriptor.text}” (Teacher/Examiner Notes p.{descriptor.page})
                </p>
              )}
            </div>
          </Section>
        )}
      </>
    );
  }

  if (result.turnKind === 'topic') {
    return result.errors.length > 0 ? (
      <Section heading="Mistakes to fix" compact={compact}>
        {result.errors.map((e, i) => (
          <ErrorRow key={i} item={e} compact={compact} />
        ))}
      </Section>
    ) : null;
  }

  return (
    <>
      {(result.task || result.clarity) && (
        <Section heading="This task" compact={compact}>
          {result.task && <CitedClaim item={result.task} compact={compact} />}
          {result.clarity && <CitedClaim item={result.clarity} compact={compact} />}
        </Section>
      )}
      {result.error && (
        <Section heading="Mistakes to fix" compact={compact}>
          <ErrorRow item={result.error} compact={compact} />
        </Section>
      )}
    </>
  );
}

/**
 * Renders examiner-voice practice commentary: what worked, the mistakes to
 * fix (quote → correction · category) and one next step, every claim
 * quote-verified against the transcript, NO mark/band/total anywhere
 * ("practice feedback in examiner language, not a grade prediction"). Its own
 * component, not a FeedbackV2-shaped card — that type always carries a numeric
 * score, and this mode must never fabricate one.
 */
export function ExaminerFeedbackCard({
  status,
  result,
  onSwitchToCoach,
  onRetry,
  hideSwitchToCoach,
  variant = 'full',
}: Props) {
  const compact = variant === 'compact';
  const stateBox = compact ? 'rounded-xl surface-raised p-4' : 'rounded-xl surface-raised p-6';

  if (status === 'pending') {
    return (
      <div className={`${compact ? 'rounded-xl surface-raised p-4' : 'rounded-xl surface-raised p-8'} flex flex-col items-center gap-3`}>
        <Loader2 size={compact ? 18 : 24} className="text-amber-400 animate-spin" />
        <p className="text-sm text-ink-muted">Preparing examiner commentary…</p>
      </div>
    );
  }

  if (status === 'quota-exhausted') {
    return (
      <div className={`${stateBox} space-y-2 text-center`}>
        <p className="text-sm text-ink-muted font-semibold">You've used today's AI feedback allowance.</p>
        <p className="text-xs text-ink-muted">It resets at midnight UTC.</p>
      </div>
    );
  }

  if (status === 'failed' || !result) {
    return (
      <div className={`${stateBox} space-y-3 text-center`}>
        <p className="text-sm text-ink-muted font-semibold">
          Couldn't produce evidence-backed examiner feedback for this answer.
        </p>
        <p className="text-xs text-ink-muted">
          This can happen when an answer is too short to quote from directly.
        </p>
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 rounded-xl surface-recessed text-xs font-bold text-ink-muted hover:bg-white/5 transition-colors"
          >
            Try again
          </button>
          {!hideSwitchToCoach && (
            <button
              type="button"
              onClick={onSwitchToCoach}
              className="px-4 py-2 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-bold hover:bg-violet-500/25 transition-colors"
            >
              Switch to coach mode
            </button>
          )}
        </div>
      </div>
    );
  }

  const isEmpty = isExaminerFeedbackEmpty(result);
  const emptyMessage =
    result.profile === 'rail' && result.turnKind === 'topic'
      ? 'No clear mistakes to fix in this answer.'
      : 'No examiner commentary for this answer.';

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {!compact && (
        <div className="flex items-center gap-2 px-1">
          <GraduationCap size={14} className="text-amber-400" />
          <p className="text-[11px] font-bold text-ink-muted">Examiner commentary</p>
          <span className="text-[9px] text-ink-muted ml-auto">Practice feedback — not a grade prediction</span>
        </div>
      )}

      <FeedbackSections result={result} compact={compact} />

      {isEmpty && <p className="text-xs text-ink-muted text-center py-4">{emptyMessage}</p>}
    </div>
  );
}
