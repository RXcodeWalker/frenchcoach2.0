/**
 * Phase 3 Batch A: one criterion's block of the post-marking exam report —
 * "What you did well", "Mistakes" (grouped by category) and "Next step" with
 * the descriptor it aims at. Display only: it renders the validated report
 * (src/domain/examFeedback) and never shows or computes a mark.
 */
import { ArrowRight, Check, MessageCircle, MessagesSquare, SpellCheck, Target } from 'lucide-react';
import { ERROR_CATEGORY_LABELS, type ErrorCategory } from '../../domain/examFeedback/shared/errorCategories';
import type { ExamFeedbackClaim, ExamFeedbackNextStep, ExamFeedbackSoundAlikeNote } from '../../domain/examFeedback/types';

export interface CriterionMistake {
  quote: string;
  correction: string;
  /** Absent when the report could not be generated (uncategorised envelope errors). */
  category?: ErrorCategory;
}

interface Props {
  title: string;
  /** Picks the section's icon. */
  area?: 'rolePlay' | 'communication' | 'qualityOfLanguage';
  strengths: ExamFeedbackClaim[];
  /** Omit for a criterion that lists no mistakes (Communication). */
  mistakes?: CriterionMistake[];
  /** Words the recording left uncertain, copied from the marker's excused errors (ADR 0011). */
  soundAlikeNotes?: ExamFeedbackSoundAlikeNote[];
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
    <div className="space-y-2.5">
      {groupByCategory(mistakes).map(([label, items]) => (
        <div key={label} className="space-y-1.5">
          <span className="inline-flex items-center gap-1 rounded-pill bg-correction-soft px-2 py-0.5 text-caption font-semibold text-correction-text">
            {label}
            {items.length > 1 && <span className="font-numeral">× {items.length}</span>}
          </span>
          <ul className="space-y-1">
            {items.map((m, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-1.5 text-body-s leading-relaxed">
                <span className="text-ink-muted line-through decoration-correction decoration-2">{m.quote}</span>
                <ArrowRight size={13} className="shrink-0 self-center text-ink-subtle" aria-hidden="true" />
                <span className="font-semibold text-progress-text">{m.correction}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

const ICON = { rolePlay: MessagesSquare, communication: MessageCircle, qualityOfLanguage: SpellCheck } as const;

export function ExamCriterionFeedback({ title, area, strengths, mistakes, soundAlikeNotes, nextStep }: Props) {
  const Icon = area ? ICON[area] : MessageCircle;
  const empty = strengths.length === 0 && !(mistakes && mistakes.length) && !(soundAlikeNotes && soundAlikeNotes.length) && !nextStep;
  return (
    <section aria-label={title} className="rounded-card border border-hairline bg-surface p-4 space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-info-soft text-info-text" aria-hidden="true">
          <Icon size={18} />
        </span>
        <h4 className="text-section text-ink">{title}</h4>
      </div>

      {empty && <p className="text-body-s text-ink-subtle">The examiner had nothing to add for this part.</p>}

      {strengths.length > 0 && (
        <div className="space-y-2">
          <p className="text-eyebrow uppercase text-progress-text">What you did well</p>
          <ul className="space-y-2">
            {strengths.map((s, i) => (
              <li key={i} className="flex gap-2.5">
                <Check size={16} className="mt-0.5 shrink-0 text-progress-text" aria-hidden="true" />
                <div className="min-w-0 space-y-1">
                  <p className="text-body-s text-ink">{s.claim}</p>
                  <p className="inline-block rounded-control bg-progress-soft px-2 py-1 text-body-s text-ink">&ldquo;{s.quote}&rdquo;</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mistakes && mistakes.length > 0 && (
        <div className="space-y-2">
          <p className="text-eyebrow uppercase text-correction-text">Mistakes</p>
          <MistakeList mistakes={mistakes} />
        </div>
      )}

      {soundAlikeNotes && soundAlikeNotes.length > 0 && (
        <div className="space-y-1.5" data-testid="sound-alike-notes">
          <p className="text-eyebrow uppercase text-info-text">Words to say clearly</p>
          {soundAlikeNotes.map((n, i) => (
            <p key={i} className="text-body-s text-ink-muted leading-relaxed">
              The recording was unclear here: &ldquo;{n.quote}&rdquo; might have been{' '}
              <em className="text-ink">{n.correction}</em>. Make sure you say it clearly.
            </p>
          ))}
        </div>
      )}

      {nextStep && (
        <div className="space-y-1.5 rounded-control border border-action bg-action-soft p-3">
          <p className="flex items-center gap-1.5 text-eyebrow uppercase text-action-text">
            <Target size={13} aria-hidden="true" />
            Next step
          </p>
          <p className="text-body-s text-ink">
            {nextStep.claim}
            {nextStep.quote && <span className="text-ink-muted"> &ldquo;{nextStep.quote}&rdquo;</span>}
          </p>
          <p className="text-caption text-ink-muted leading-relaxed">{`Target: ${nextStep.targetDescriptor} (${nextStep.targetSource})`}</p>
        </div>
      )}
    </section>
  );
}
