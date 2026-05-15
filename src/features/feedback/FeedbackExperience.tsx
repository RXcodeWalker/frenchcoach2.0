import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { stagger } from '../../components/motion/variants';
import { FeedbackProvider } from './state/feedbackContext';
import { useFeedbackState } from './hooks/useFeedbackState';
import { SnapshotCard } from './components/SnapshotCard';
import { AnnotatedTranscript } from './components/AnnotatedTranscript';
import { TopPriorityCard } from './components/TopPriorityCard';
import { StrongestMomentCard } from './components/StrongestMomentCard';
import { CorrectionsCard } from './components/CorrectionsCard';
import { VocabularyCard } from './components/VocabularyCard';
import { StyleStructureCard } from './components/StyleStructureCard';
import { ExaminerNotebookCard } from './components/ExaminerNotebookCard';
import { DeepAnalysisToggle } from './components/DeepAnalysisToggle';
import { DeepAnalysisCard } from './components/DeepAnalysisCard';
import { FeedbackFooter } from './components/FeedbackFooter';
import { PersonalizedContextBanner } from './components/PersonalizedContextBanner';
import { AvoidanceCard } from './components/AvoidanceCard';
import { PronunciationCard } from './components/PronunciationCard';
import { generateCoachingNarrative } from '../../services/coaching/diagnosticEngine';
import type { FeedbackV2 } from '../../types';

interface Props {
  feedback: FeedbackV2 | null;
  isLoading?: boolean;
  transcript?: string;
  modelAnswer?: string;
  onRetry: () => void;
  onComplete: () => void;
}

function FeedbackContent({ feedback, transcript, modelAnswer, onRetry, onComplete }: Omit<Props, 'isLoading' | 'feedback'> & { feedback: FeedbackV2 }) {
  const {
    state, topPriority, majorIssues, polishIssues, showExaminerNotebook, openCardFromIssue,
  } = useFeedbackState(feedback);

  const narrative = feedback.skillContextUsed ? generateCoachingNarrative() : undefined;

  // Read sessionsAnalyzed from localStorage for the banner
  let sessionsAnalyzed = 0;
  try {
    const raw = localStorage.getItem('frenchCoach_sde');
    if (raw) sessionsAnalyzed = (JSON.parse(raw) as { sessionsAnalyzed?: number }).sessionsAnalyzed ?? 0;
  } catch {}

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-3"
    >
      {feedback.skillContextUsed && sessionsAnalyzed > 0 && (
        <PersonalizedContextBanner
          sessionsAnalyzed={sessionsAnalyzed}
          narrative={narrative}
        />
      )}

      <SnapshotCard feedback={feedback} />

      {feedback.avoidanceReport && feedback.avoidanceReport.length > 0 && (
        <AvoidanceCard entries={feedback.avoidanceReport} />
      )}

      {transcript && (
        <AnnotatedTranscript
          transcript={transcript}
          feedback={feedback}
          onIssueClick={openCardFromIssue}
        />
      )}

      {topPriority && (
        <TopPriorityCard
          issue={topPriority}
          isSelected={state.selectedIssueId === topPriority.id}
        />
      )}

      <StrongestMomentCard feedback={feedback} transcript={transcript} />

      <CorrectionsCard
        issues={majorIssues}
        feedback={feedback}
        topPriorityId={feedback.topPriorityIssueId}
      />

      <VocabularyCard feedback={feedback} />

      <PronunciationCard feedback={feedback} />

      <StyleStructureCard feedback={feedback} polishIssues={polishIssues} />

      {showExaminerNotebook && feedback.examiner && (
        <ExaminerNotebookCard examiner={feedback.examiner} />
      )}

      <DeepAnalysisToggle />
      <DeepAnalysisCard feedback={feedback} />

      <FeedbackFooter
        onRetry={onRetry}
        onComplete={onComplete}
        modelAnswer={modelAnswer}
      />
    </motion.div>
  );
}

export function FeedbackExperience({ feedback, isLoading, transcript, modelAnswer, onRetry, onComplete }: Props) {
  if (isLoading || !feedback) {
    return (
      <motion.div
        className="rounded-xl glass-elevated p-8 flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Loader2 size={24} className="text-violet-400 animate-spin" />
        <p className="text-sm text-slate-500">Analysing your response…</p>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <FeedbackProvider>
        <FeedbackContent
          feedback={feedback}
          transcript={transcript}
          modelAnswer={modelAnswer}
          onRetry={onRetry}
          onComplete={onComplete}
        />
      </FeedbackProvider>
    </AnimatePresence>
  );
}
