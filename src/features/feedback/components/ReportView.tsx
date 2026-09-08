import { motion } from 'framer-motion';
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { fadeUp } from '../../../components/motion/variants';
import { useFeedbackContext } from '../state/feedbackContext';
import { SnapshotCard } from './SnapshotCard';
import { MarkedUpScript } from './MarkedUpScript';
import { BeforeAfterDiff } from './BeforeAfterDiff';
import { RewriteLadder } from './RewriteLadder';
import { IssueRow } from './IssueRow';
import type { CoachingIssue, FeedbackV2 } from '../../../types';

interface Props {
  feedback: FeedbackV2;
  transcript?: string;
  majorIssues: CoachingIssue[];
  polishIssues: CoachingIssue[];
  onIssueClick: (issueId: string) => void;
}

/**
 * Docs Stage 6 — the "Full report" segment. Progressive disclosure, not a
 * wall: opens with summary, marked-up script, before/after diff and the
 * ladder; corrections are listed compactly with quote + fix, lessons stay
 * collapsed per-row unless "expand all" is on.
 */
export function ReportView({ feedback, transcript, majorIssues, polishIssues, onIssueClick }: Props) {
  const { state, dispatch } = useFeedbackContext();
  const allIssues = [...majorIssues, ...polishIssues];
  const expandAll = state.expandAllLessons;

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-3">
      <SnapshotCard feedback={feedback} />

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
        <div className="rounded-xl glass p-4">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[9px] font-bold text-ink-subtle uppercase tracking-wider">
              Corrections ({allIssues.length})
            </p>
            <button
              onClick={() => dispatch({ type: 'SET_EXPAND_ALL_LESSONS', value: !expandAll })}
              className="flex items-center gap-1 text-[9px] font-medium text-violet-400 hover:text-violet-300 transition-colors"
            >
              {expandAll ? <ChevronsDownUp size={11} /> : <ChevronsUpDown size={11} />}
              {expandAll ? 'Collapse all' : 'Expand all'}
            </button>
          </div>
          <div className="space-y-1.5">
            {allIssues.map(issue => (
              <IssueRow
                key={issue.id}
                issue={issue}
                isSelected={state.selectedIssueId === issue.id}
                lessonForceOpen={expandAll ? true : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
