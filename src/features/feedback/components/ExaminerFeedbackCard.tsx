import type { ReactNode } from 'react';
import { Check, GraduationCap, Loader2, X } from 'lucide-react';
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
  /** The quote the learner clicked in the transcript; its row is highlighted. */
  highlightedQuote?: string | null;
}

type Tone = 'good' | 'bad';

const QUOTE_CLASS = 'exam-quote text-amber-700 dark:text-amber-300/80 italic';

const TONE_CLASS: Record<Tone, string> = {
  good: 'fb-good bg-emerald-500/15 border-emerald-600/40',
  bad: 'fb-bad bg-rose-500/10 border-rose-500/35',
};
const TONE_HEADING: Record<Tone, string> = {
  good: 'text-emerald-700 dark:text-emerald-300',
  bad: 'text-rose-700 dark:text-rose-300',
};

function Section({ heading, tone, compact, children }: { heading: string; tone: Tone; compact: boolean; children: ReactNode }) {
  return (
    <div className={`rounded-xl border ${compact ? 'p-3 space-y-2' : 'p-4 space-y-2.5'} ${TONE_CLASS[tone]}`}>
      <p className={`fb-heading flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${TONE_HEADING[tone]}`}>
        {tone === 'good' ? <Check size={11} aria-hidden="true" /> : <X size={11} aria-hidden="true" />}
        {heading}
      </p>
      {children}
    </div>
  );
}

/** A quote-anchored row: carries the quote so a transcript click can find and highlight it. */
function Anchor({ quote, active, children }: { quote?: string | null; active: boolean; children: ReactNode }) {
  return (
    <div
      data-quote={quote ?? undefined}
      className={`space-y-1 rounded-lg transition-shadow duration-state ease-smooth ${
        active ? 'ring-2 ring-action bg-white/50 p-1.5 -m-1.5' : ''
      }`}
    >
      {children}
    </div>
  );
}

function CitedClaim({ item, compact, hl }: { item: ExaminerCitedClaim; compact: boolean; hl?: string | null }) {
  return (
    <Anchor quote={item.quote} active={!!hl && hl === item.quote}>
      <p className={compact ? 'text-[11px] text-ink leading-relaxed' : 'text-xs text-ink leading-relaxed'}>{item.claim}</p>
      <p className={compact ? `text-[10px] ${QUOTE_CLASS}` : `text-[11px] ${QUOTE_CLASS}`}>« {item.quote} »</p>
    </Anchor>
  );
}

function ErrorRow({ item, compact, hl }: { item: ExaminerErrorItem; compact: boolean; hl?: string | null }) {
  return (
    <Anchor quote={item.quote} active={!!hl && hl === item.quote}>
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
    </Anchor>
  );
}

function FeedbackSections({ result, compact, hl }: { result: ExaminerFeedback; compact: boolean; hl?: string | null }) {
  if (result.profile === 'learn') {
    const descriptor = result.nextStep ? findExaminerDescriptor(result.nextStep.descriptorId) : undefined;
    return (
      <>
        {result.strengths.length > 0 && (
          <Section heading="What worked" tone="good" compact={compact}>
            {result.strengths.map((s, i) => (
              <CitedClaim key={i} item={s} compact={compact} hl={hl} />
            ))}
          </Section>
        )}
        {result.errors.length > 0 && (
          <Section heading="Mistakes to fix" tone="bad" compact={compact}>
            {result.errors.map((e, i) => (
              <ErrorRow key={i} item={e} compact={compact} hl={hl} />
            ))}
          </Section>
        )}
        {result.nextStep && (
          <Section heading="Your next step" tone="good" compact={compact}>
            <Anchor quote={result.nextStep.quote} active={!!hl && hl === result.nextStep.quote}>
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
            </Anchor>
          </Section>
        )}
      </>
    );
  }

  if (result.turnKind === 'topic') {
    return result.errors.length > 0 ? (
      <Section heading="Mistakes to fix" tone="bad" compact={compact}>
        {result.errors.map((e, i) => (
          <ErrorRow key={i} item={e} compact={compact} hl={hl} />
        ))}
      </Section>
    ) : null;
  }

  return (
    <>
      {(result.task || result.clarity) && (
        <Section heading="No problem — correct" tone="good" compact={compact}>
          {result.task && <CitedClaim item={result.task} compact={compact} hl={hl} />}
          {result.clarity && <CitedClaim item={result.clarity} compact={compact} hl={hl} />}
        </Section>
      )}
      {result.error && (
        <Section heading="Mistakes to fix" tone="bad" compact={compact}>
          <ErrorRow item={result.error} compact={compact} hl={hl} />
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
  highlightedQuote,
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

      <FeedbackSections result={result} compact={compact} hl={highlightedQuote} />

      {isEmpty && <p className="text-xs text-ink-muted text-center py-4">{emptyMessage}</p>}
    </div>
  );
}
