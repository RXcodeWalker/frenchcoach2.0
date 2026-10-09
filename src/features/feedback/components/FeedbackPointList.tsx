import type { ReactNode } from 'react';
import { Check, X } from 'lucide-react';

/**
 * The quote-anchored point list shared by both feedback voices (Learn
 * overhaul Batch 4): "What worked" claims and "fix" rows (quote → correction,
 * an optional one-line why and a tag). Presentation only — it never computes,
 * filters or adds a claim, and it renders no mark, band or score (ADR 0005), so
 * the examiner voice can use it unchanged.
 */

export type PointTone = 'good' | 'bad';

export type FeedbackPoint =
  | {
      kind: 'claim';
      claim: string;
      /** Shown under the claim in « »; omit when the claim quotes inline. */
      quote?: string | null;
      /** A muted line under the quote (the examiner's descriptor line). */
      note?: string;
    }
  | {
      kind: 'fix';
      quote: string;
      correction: string;
      /** One sentence: why it is wrong. */
      why?: string;
      /** A short category label chip. */
      tag?: string;
    };

export interface FeedbackPointGroup {
  heading: string;
  tone: PointTone;
  points: FeedbackPoint[];
}

const QUOTE_CLASS = 'exam-quote text-amber-700 dark:text-amber-300/80 italic';

const TONE_CLASS: Record<PointTone, string> = {
  good: 'fb-good bg-emerald-500/15 border-emerald-600/40',
  bad: 'fb-bad bg-rose-500/10 border-rose-500/35',
};
const TONE_HEADING: Record<PointTone, string> = {
  good: 'text-emerald-700 dark:text-emerald-300',
  bad: 'text-rose-700 dark:text-rose-300',
};

export function PointSection({ heading, tone, compact, children }: { heading: string; tone: PointTone; compact: boolean; children: ReactNode }) {
  return (
    <div className={`rounded-xl border ${compact ? 'p-3 space-y-2' : 'p-4 space-y-2.5'} ${TONE_CLASS[tone]}`}>
      <p className={`fb-heading flex items-center gap-1 text-eyebrow uppercase ${TONE_HEADING[tone]}`}>
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

export function ClaimRow({ point, compact, hl }: { point: Extract<FeedbackPoint, { kind: 'claim' }>; compact: boolean; hl?: string | null }) {
  return (
    <Anchor quote={point.quote} active={!!hl && hl === point.quote}>
      <p className={compact ? 'text-[11px] text-ink leading-relaxed' : 'text-xs text-ink leading-relaxed'}>{point.claim}</p>
      {point.quote && (
        <p className={compact ? `text-[10px] ${QUOTE_CLASS}` : `text-[11px] ${QUOTE_CLASS}`}>« {point.quote} »</p>
      )}
      {point.note && <p className="text-[10px] text-ink-muted">{point.note}</p>}
    </Anchor>
  );
}

export function FixRow({
  point,
  compact,
  hl,
  action,
}: {
  point: Extract<FeedbackPoint, { kind: 'fix' }>;
  compact: boolean;
  hl?: string | null;
  /** Sits at the end of the correction line — the teacher's "hear it" button. */
  action?: ReactNode;
}) {
  return (
    <Anchor quote={point.quote} active={!!hl && hl === point.quote}>
      <p className={compact ? 'text-[11px] leading-relaxed' : 'text-xs leading-relaxed'}>
        <span className={`${QUOTE_CLASS} line-through decoration-correction-text`}>« {point.quote} »</span>
        <span className="text-ink-muted mx-1.5" aria-hidden="true">
          →
        </span>
        <span className="text-ink font-semibold">{point.correction}</span>
        {action && <span className="ml-1.5 align-middle">{action}</span>}
      </p>
      {point.why && <p className={compact ? 'text-[10px] text-ink-muted' : 'text-[11px] text-ink-muted'}>{point.why}</p>}
      {point.tag && (
        <span className="inline-block rounded-full surface-recessed px-2 py-0.5 text-[9px] font-bold text-ink-muted">
          {point.tag}
        </span>
      )}
    </Anchor>
  );
}

export function FeedbackPointList({
  groups,
  compact = false,
  highlightedQuote,
}: {
  groups: FeedbackPointGroup[];
  compact?: boolean;
  /** The quote the learner clicked in the transcript; its row is highlighted. */
  highlightedQuote?: string | null;
}) {
  return (
    <>
      {groups
        .filter((g) => g.points.length > 0)
        .map((g) => (
          <PointSection key={g.heading} heading={g.heading} tone={g.tone} compact={compact}>
            {g.points.map((p, i) =>
              p.kind === 'claim' ? (
                <ClaimRow key={i} point={p} compact={compact} hl={highlightedQuote} />
              ) : (
                <FixRow key={i} point={p} compact={compact} hl={highlightedQuote} />
              ),
            )}
          </PointSection>
        ))}
    </>
  );
}
