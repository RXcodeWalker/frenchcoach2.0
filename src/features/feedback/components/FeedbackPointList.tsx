import type { ReactNode } from 'react';
import { Check, PenLine, X } from 'lucide-react';

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
/** The roomy (Learn) form: a calmer quote colour from the role tokens. */
const QUOTE_CLASS_ROOMY = 'exam-quote italic text-ink-muted';

// Compact (the exam's Coached rail) keeps its tinted panels; exam-voice.css recolours them by fb-good/fb-bad.
const TONE_CLASS: Record<PointTone, string> = {
  good: 'fb-good bg-emerald-500/15 border-emerald-600/40',
  bad: 'fb-bad bg-rose-500/10 border-rose-500/35',
};
const TONE_HEADING: Record<PointTone, string> = {
  good: 'text-emerald-700 dark:text-emerald-300',
  bad: 'text-rose-700 dark:text-rose-300',
};
const TONE_TILE: Record<PointTone, string> = {
  good: 'bg-progress-soft text-progress-text',
  bad: 'bg-correction-soft text-correction-text',
};

export function PointSection({
  heading,
  tone,
  compact,
  aside,
  children,
}: {
  heading: string;
  tone: PointTone;
  compact: boolean;
  /** Right side of the heading (the roomy form only), e.g. a "1 of 2 tried" meter. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  if (compact) {
    return (
      <div className={`rounded-xl border p-3 space-y-2 ${TONE_CLASS[tone]}`}>
        <p className={`fb-heading flex items-center gap-1.5 uppercase text-eyebrow ${TONE_HEADING[tone]}`}>
          {tone === 'good' ? <Check size={11} aria-hidden="true" /> : <X size={11} aria-hidden="true" />}
          {heading}
        </p>
        {children}
      </div>
    );
  }
  return (
    <div className={`fb-${tone} rounded-card border border-hairline bg-surface p-4`}>
      <div className="mb-3 flex items-center gap-2.5">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-pill ${TONE_TILE[tone]}`} aria-hidden="true">
          {tone === 'good' ? <Check size={15} /> : <PenLine size={14} />}
        </span>
        <p className="fb-heading min-w-0 flex-1 text-section text-ink">{heading}</p>
        {aside}
      </div>
      <div className="divide-y divide-hairline [&>*]:py-3 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">{children}</div>
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
  if (compact) {
    return (
      <Anchor quote={point.quote} active={!!hl && hl === point.quote}>
        <p className="text-[11px] text-ink leading-relaxed">{point.claim}</p>
        {point.quote && <p className={`text-[10px] ${QUOTE_CLASS}`}>« {point.quote} »</p>}
        {point.note && <p className="text-[10px] text-ink-muted">{point.note}</p>}
      </Anchor>
    );
  }
  return (
    <Anchor quote={point.quote} active={!!hl && hl === point.quote}>
      {point.quote && (
        <p lang="fr" className="text-body-base font-semibold text-progress-text">
          « {point.quote} »
        </p>
      )}
      <p className="text-body-s text-ink">{point.claim}</p>
      {point.note && <p className="text-body-s text-ink-muted">{point.note}</p>}
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
  if (compact) {
    return (
      <Anchor quote={point.quote} active={!!hl && hl === point.quote}>
        <p className="text-[11px] leading-relaxed">
          <span className={`${QUOTE_CLASS} line-through decoration-correction-text`}>« {point.quote} »</span>
          <span className="text-ink-muted mx-1.5" aria-hidden="true">
            →
          </span>
          <span className="text-ink font-semibold">{point.correction}</span>
          {action && <span className="ml-1.5 align-middle">{action}</span>}
        </p>
        {point.why && <p className="text-[10px] text-ink-muted">{point.why}</p>}
        {point.tag && (
          <span className="inline-block rounded-full surface-recessed px-2 py-0.5 font-bold text-ink-muted text-[9px]">{point.tag}</span>
        )}
      </Anchor>
    );
  }
  return (
    <Anchor quote={point.quote} active={!!hl && hl === point.quote}>
      <p lang="fr" className="text-body-base leading-snug">
        <span className={`${QUOTE_CLASS_ROOMY} line-through decoration-correction-text decoration-2`}>« {point.quote} »</span>
        <span className="mx-1.5 text-ink-subtle" aria-hidden="true">
          →
        </span>
        <span className="font-semibold text-progress-text">{point.correction}</span>
        {action && <span className="ml-1.5 align-middle">{action}</span>}
      </p>
      {(point.why || point.tag) && (
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-body-s text-ink-muted">
          {point.why && <span>{point.why}</span>}
          {point.tag && (
            <span className="rounded-pill surface-recessed px-2 py-0.5 text-caption font-semibold text-ink-muted">{point.tag}</span>
          )}
        </p>
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
