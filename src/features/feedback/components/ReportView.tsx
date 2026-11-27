import { useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronsDownUp, ChevronsUpDown, ListChecks } from 'lucide-react';
import { fill, stagger } from '../../../components/motion/variants';
import { useFeedbackContext } from '../state/feedbackContext';
import { MarkedUpScript } from './MarkedUpScript';
import { RewriteLadder } from './RewriteLadder';
import { IssueRow } from './IssueRow';
import { BiggestOpportunityCard } from './BiggestOpportunityCard';
import { CorrectionsCard } from './CorrectionsCard';
import { ExpansionIdeasCard } from './ExpansionIdeasCard';
import { VocabularyCard } from './VocabularyCard';
import { SelfCorrectionCard } from './SelfCorrectionCard';
import { AnswerFeaturesCard } from './AnswerFeaturesCard';
import { ModelAnswerCard } from './ModelAnswerCard';
import { BreakdownCard } from './BreakdownCard';
import { correctionTypes, type CorrectionType } from './correctionTypes';
import { selectCardPlan } from '../state/selectors';
import type { CoachingIssue, FeedbackV2 } from '../../../types';

interface Props {
  feedback: FeedbackV2;
  transcript?: string;
  majorIssues: CoachingIssue[];
  polishIssues: CoachingIssue[];
  onIssueClick: (issueId: string) => void;
  /** The Predict results card, when the learner answered any check. */
  predictions?: ReactNode;
  /** The question's authored model answer. */
  modelAnswer?: string;
}

/** Segment colours for the mistakes-by-type bar, in rank order (role tokens only). */
const TYPE_SWATCH = ['bg-correction', 'bg-reward', 'bg-action', 'bg-info-text', 'bg-progress', 'bg-ink-subtle'];

/** A stacked bar of the corrections by type: where this answer's fixes cluster. Counts only. */
function TypeBar({ types, total }: { types: CorrectionType[]; total: number }) {
  const reduced = useReducedMotion() ?? false;
  // Only a real pattern is worth a chart: two or more types, and at least one that repeats.
  if (types.length < 2 || !types.some((t) => t.count > 1)) return null;
  return (
    <div className="mb-3 space-y-2" data-testid="correction-types">
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-pill" aria-hidden="true">
        {types.map((t, i) => (
          <motion.span
            key={t.label}
            className={`h-full ${TYPE_SWATCH[i % TYPE_SWATCH.length]}`}
            initial={{ width: reduced ? `${(t.count / total) * 100}%` : 0 }}
            animate={{ width: `${(t.count / total) * 100}%` }}
            transition={reduced ? { duration: 0 } : fill(0.2 + i * 0.06)}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-label="Corrections by type">
        {types.map((t, i) => (
          <li key={t.label} className="flex items-center gap-1.5 text-caption text-ink-muted">
            <span className={`h-2 w-2 rounded-pill ${TYPE_SWATCH[i % TYPE_SWATCH.length]}`} aria-hidden="true" />
            {t.label} <span className="font-numeral text-ink">{t.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The "Breakdown" tab (was the Full report). Its job is the evidence and the
 * reference material — not the conversation, which lives only in the Coach
 * tab. The score is in the hero above both tabs, so it is not repeated here,
 * and the improved answer lives only in the Coach tab's "Say it better" (the
 * marked-up answer is where the corrections are seen in place).
 *
 * In order: the one next step → your predictions → what the answer does → the
 * slips you fixed yourself → the answer marked up → every correction with its
 * lesson, grouped by type → a more developed version → vocabulary upgrades →
 * ideas to extend → the model answer.
 */
export function ReportView({ feedback, transcript, majorIssues, polishIssues, onIssueClick, predictions, modelAnswer }: Props) {
  const { state } = useFeedbackContext();
  const allIssues = [...majorIssues, ...polishIssues];
  const cardPlan = selectCardPlan(feedback);
  // "Open all / Close all lessons" (owner report 2026-11-13: "Expand all" often
  // did nothing). It only appears when two or more corrections have a lesson
  // to open, its label follows what the lessons really show (they start open
  // on a "deep" answer), and it sets each lesson once — tapping one lesson
  // still toggles it.
  const withLessons = allIssues.filter((i) => i.mini_lesson || i.teachMe).length;
  const [lessonCommand, setLessonCommand] = useState<{ open: boolean; seq: number } | null>(null);
  const lessonsOpen = lessonCommand ? lessonCommand.open : cardPlan.lessonsDefaultOpen;
  const answer = feedback.gradedTranscript?.trim() ? feedback.gradedTranscript : (transcript ?? '');

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
      <BiggestOpportunityCard opportunity={feedback.biggest_opportunity} />

      {predictions}

      <AnswerFeaturesCard transcript={answer} />

      <SelfCorrectionCard selfCorrections={feedback.selfCorrections} />

      <MarkedUpScript transcript={transcript ?? ''} feedback={feedback} onIssueClick={onIssueClick} />

      {allIssues.length > 0 && (
        <BreakdownCard
          title="Corrections"
          icon={ListChecks}
          tone="correction"
          count={allIssues.length}
          aside={
            withLessons >= 2 ? (
              <button
                type="button"
                onClick={() => setLessonCommand((c) => ({ open: !lessonsOpen, seq: (c?.seq ?? 0) + 1 }))}
                className="flex shrink-0 items-center gap-1 rounded-pill px-2 py-1 text-label text-action-text transition-colors duration-state hover:bg-action-soft"
              >
                {lessonsOpen ? <ChevronsDownUp size={14} /> : <ChevronsUpDown size={14} />}
                {lessonsOpen ? 'Close all lessons' : 'Open all lessons'}
              </button>
            ) : undefined
          }
        >
          <TypeBar types={correctionTypes(allIssues)} total={allIssues.length} />
          <ul className="space-y-2">
            {allIssues.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                isSelected={state.selectedIssueId === issue.id}
                lessonDefaultOpen={cardPlan.lessonsDefaultOpen}
                lessonCommand={lessonCommand}
              />
            ))}
          </ul>
        </BreakdownCard>
      )}

      {/* No corrections[] (older backend, offline): the legacy grammar list. */}
      {allIssues.length === 0 && <CorrectionsCard issues={[]} feedback={feedback} />}

      {feedback.expansionLevels && feedback.expansionLevels.length > 0 && (
        <RewriteLadder levels={feedback.expansionLevels} title="A more developed version" />
      )}

      <VocabularyCard feedback={feedback} />

      {cardPlan.showExpansionIdeas && (
        <ExpansionIdeasCard ideas={feedback.expansion_ideas} defaultOpen={cardPlan.lessonsDefaultOpen} />
      )}

      <ModelAnswerCard modelAnswer={modelAnswer} />
    </motion.div>
  );
}
