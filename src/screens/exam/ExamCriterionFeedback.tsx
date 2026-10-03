/**
 * Phase 3 Batch A: one criterion's block of the post-marking exam report —
 * "What you did well", "Mistakes" (grouped by category) and "Next step" with
 * the descriptor it aims at. Display only: it renders the validated report
 * (src/domain/examFeedback) and never shows or computes a mark.
 */
import { ERROR_CATEGORY_LABELS, type ErrorCategory } from '../../domain/examFeedback/shared/errorCategories';
import type { ExamFeedbackClaim, ExamFeedbackNextStep } from '../../domain/examFeedback/types';

export interface CriterionMistake {
  quote: string;
  correction: string;
  /** Absent when the report could not be generated (uncategorised envelope errors). */
  category?: ErrorCategory;
}

interface Props {
  title: string;
  strengths: ExamFeedbackClaim[];
  /** Omit for a criterion that lists no mistakes (Communication). */
  mistakes?: CriterionMistake[];
  nextStep: ExamFeedbackNextStep | null;
}

function groupByCategory(mistakes: CriterionMistake[]): [string, CriterionMistake[]][] {
  const groups = new Map<string, CriterionMistake[]>();
  for (const m of mistakes) {
    const label = m.category ? ERROR_CATEGORY_LABELS[m.category] : 'Uncategorised';
    groups.set(label, [...(groups.get(label) ?? []), m]);
  }
  return [...groups.entries()];
}

export function MistakeList({ mistakes }: { mistakes: CriterionMistake[] }) {
  return (
    <div className="space-y-2">
      {groupByCategory(mistakes).map(([label, items]) => (
        <div key={label} className="space-y-1">
          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-500/10 text-red-300 border border-red-500/20">
            {label}
          </span>
          {items.map((m, i) => (
            <p key={i} className="text-[11px] text-ink-muted leading-relaxed">
              <span className="line-through decoration-red-400/60">&ldquo;{m.quote}&rdquo;</span>
              {' → '}
              <span className="text-white">{m.correction}</span>
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

export function ExamCriterionFeedback({ title, strengths, mistakes, nextStep }: Props) {
  return (
    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5 space-y-3">
      <h4 className="text-[11px] font-bold text-white">{title}</h4>

      {strengths.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">What you did well</p>
          {strengths.map((s, i) => (
            <p key={i} className="text-[11px] text-ink-muted leading-relaxed">
              {s.claim} <span className="italic text-ink-subtle">&ldquo;{s.quote}&rdquo;</span>
            </p>
          ))}
        </div>
      )}

      {mistakes && mistakes.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Mistakes</p>
          <MistakeList mistakes={mistakes} />
        </div>
      )}

      {nextStep && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Next step</p>
          <p className="text-[11px] text-ink-muted leading-relaxed">
            {nextStep.claim}
            {nextStep.quote && <span className="italic text-ink-subtle"> &ldquo;{nextStep.quote}&rdquo;</span>}
          </p>
          <p className="text-[10px] text-ink-subtle leading-relaxed">
            Target: {nextStep.targetDescriptor} ({nextStep.targetSource})
          </p>
        </div>
      )}
    </div>
  );
}
