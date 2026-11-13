import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { fadeUp } from '../../../components/motion/variants';
import { useFeedbackContext } from '../state/feedbackContext';
import { SnapshotCard } from './SnapshotCard';
import { MarkedUpScript } from './MarkedUpScript';
import { BeforeAfterDiff } from './BeforeAfterDiff';
import { RewriteLadder } from './RewriteLadder';
import { IssueRow } from './IssueRow';
import { BiggestOpportunityCard } from './BiggestOpportunityCard';
import { CorrectionsCard } from './CorrectionsCard';
import { ExpansionIdeasCard } from './ExpansionIdeasCard';
import { VocabularyCard } from './VocabularyCard';
import { SelfCorrectionCard } from './SelfCorrectionCard';
import { selectCardPlan } from '../state/selectors';
import type { MarkingLevel } from '../../../domain/learn/marking/markingLevel';
import type { CoachingIssue, FeedbackV2 } from '../../../types';

interface Props {
  feedback: FeedbackV2;
  transcript?: string;
  majorIssues: CoachingIssue[];
  polishIssues: CoachingIssue[];
  onIssueClick: (issueId: string) => void;
  /** learn-marking §8.2 — see SnapshotCard. */
  markingLevel?: MarkingLevel;
  /** The Predict results card, when the learner answered any check. */
  predictions?: ReactNode;
}

/**
 * Docs Stage 6 — the "Full report" segment. Progressive disclosure, not a
 * wall: opens with summary, marked-up script, before/after diff and the
 * ladder; corrections are listed compactly with quote + fix, lessons stay
 * collapsed per-row unless opened. It holds what the coach view does not
 * show: the one-focus line, every correction with its lesson and — only here
 * since 2026-11-13 — vocabulary upgrades, expansion ideas and the model answer.
 */
export function ReportView({ feedback, transcript, majorIssues, polishIssues, onIssueClick, markingLevel, predictions }: Props) {
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

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-3">
      <SnapshotCard feedback={feedback} markingLevel={markingLevel} />

      {predictions}

      <SelfCorrectionCard selfCorrections={feedback.selfCorrections} />

      <BiggestOpportunityCard opportunity={feedback.biggest_opportunity} />

      <MarkedUpScript
        transcript={transcript ?? ''}
        feedback={feedback}
        onIssueClick={onIssueClick}
      />

      <BeforeAfterDiff
        transcript={transcript ?? ''}
        improvedAnswer={feedback.improved_answer}
        changes={feedback.changes}
        issues={majorIssues}
      />

      {feedback.expansionLevels && feedback.expansionLevels.length > 0 && (
        <RewriteLadder levels={feedback.expansionLevels} title="A more developed version" />
      )}

      {allIssues.length > 0 && (
        <div className="rounded-xl surface p-4">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-eyebrow text-ink-subtle uppercase">
              Corrections ({allIssues.length})
            </p>
            {withLessons >= 2 && (
              <button
                onClick={() => setLessonCommand((c) => ({ open: !lessonsOpen, seq: (c?.seq ?? 0) + 1 }))}
                className="flex items-center gap-1 text-xs font-medium text-action-text hover:text-action-text transition-colors"
              >
                {lessonsOpen ? <ChevronsDownUp size={11} /> : <ChevronsUpDown size={11} />}
                {lessonsOpen ? 'Close all lessons' : 'Open all lessons'}
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {allIssues.map(issue => (
              <IssueRow
                key={issue.id}
                issue={issue}
                isSelected={state.selectedIssueId === issue.id}
                lessonDefaultOpen={cardPlan.lessonsDefaultOpen}
                lessonCommand={lessonCommand}
              />
            ))}
          </div>
        </div>
      )}

      {/* No corrections[] (older backend, offline): the legacy grammar list. */}
      {allIssues.length === 0 && (
        <CorrectionsCard issues={[]} feedback={feedback} />
      )}

      {cardPlan.showExpansionIdeas && (
        <ExpansionIdeasCard ideas={feedback.expansion_ideas} defaultOpen={cardPlan.lessonsDefaultOpen} />
      )}

      <VocabularyCard feedback={feedback} />
    </motion.div>
  );
}
