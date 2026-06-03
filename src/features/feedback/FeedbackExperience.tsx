import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { stagger } from '../../components/motion/variants';
import { FeedbackProvider } from './state/feedbackContext';
import { useFeedbackState } from './hooks/useFeedbackState';
import { SnapshotCard } from './components/SnapshotCard';
import { AnnotatedTranscript } from './components/AnnotatedTranscript';
import { StrongestMomentCard } from './components/StrongestMomentCard';
import { BiggestOpportunityCard } from './components/BiggestOpportunityCard';
import { ImprovedAnswerCard } from './components/ImprovedAnswerCard';
import { CorrectionsCard } from './components/CorrectionsCard';
import { ExpansionIdeasCard } from './components/ExpansionIdeasCard';
import { AdvancedAnswerCard } from './components/AdvancedAnswerCard';
import { VocabularyCard } from './components/VocabularyCard';
import { PronunciationCard } from './components/PronunciationCard';
import { FeedbackFooter } from './components/FeedbackFooter';
import { MinimalResponseCard } from './components/MinimalResponseCard';
import { OfflineLimitationsBanner } from '../../screens/learn/OfflineLimitationsBanner';
import { ReEvaluateBar } from '../../screens/learn/ReEvaluateBar';
import type { FeedbackV2, AIEngine, EngineResult } from '../../types';

// Deprecated components — kept as files, no longer rendered in the main flow.
// To re-enable any of them, import and add back to FeedbackContent.
// - PersonalizedContextBanner (replaced by backend coaching voice in cards)
// - AvoidanceCard (replaced by BiggestOpportunityCard)
// - TopPriorityCard (merged into CorrectionsCard's critical section)
// - StyleStructureCard (replaced by CorrectionsCard's polish section)
// - ExaminerNotebookCard (framing moved to tutor-voice cards)
// - DeepAnalysisToggle + DeepAnalysisCard (backend owns this now)

interface Props {
  feedback: FeedbackV2 | null;
  isLoading?: boolean;
  transcript?: string;
  modelAnswer?: string;
  engineResults: Map<AIEngine, EngineResult>;
  activeEngine: AIEngine | null;
  isReEvaluating: boolean;
  reEvaluatingEngine: AIEngine | null;
  onRetry: () => void;
  onComplete: () => void;
  onReEvaluate: (engine: AIEngine) => void;
  onSwitchEngine: (engine: AIEngine) => void;
}

function FeedbackContent({
  feedback, transcript, modelAnswer, onRetry, onComplete,
  engineResults, activeEngine, isReEvaluating, reEvaluatingEngine,
  onReEvaluate, onSwitchEngine,
}: Omit<Props, 'isLoading' | 'feedback'> & { feedback: FeedbackV2 }) {
  const { majorIssues, polishIssues, openCardFromIssue } = useFeedbackState(feedback);

  if (feedback.responseTier === 0 || feedback.responseTier === 1) {
    return (
      <MinimalResponseCard
        feedback={feedback}
        transcript={transcript ?? ''}
        onRetry={onRetry}
        onComplete={onComplete}
      />
    );
  }

  const isOffline = feedback.engineMeta?.actualEngine === 'offline';

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-3"
    >
      {isOffline && <OfflineLimitationsBanner />}

      {/* Scores near the top — quick orientation before coaching content */}
      <SnapshotCard feedback={feedback} />

      {/* Coaching priority 1: what went well */}
      <StrongestMomentCard feedback={feedback} transcript={transcript} />

      {/* Coaching priority 2: single most important improvement */}
      <BiggestOpportunityCard opportunity={feedback.biggest_opportunity} />

      {/* Coaching priority 3: before → after comparison */}
      <ImprovedAnswerCard
        originalTranscript={transcript ?? ''}
        improvedAnswer={feedback.improved_answer}
        rephrase={feedback.rephrase}
        formattedTranscript={feedback.formatted_transcript}
      />

      {/* Annotated transcript — clickable error highlighting */}
      {transcript && (
        <AnnotatedTranscript
          transcript={transcript}
          feedback={feedback}
          onIssueClick={openCardFromIssue}
        />
      )}

      {/* Corrections: critical (open) + polish/next-level (collapsed) */}
      <CorrectionsCard
        issues={majorIssues}
        polishIssues={polishIssues}
        feedback={feedback}
      />

      {/* How to extend — expansion ideas (collapsed) */}
      <ExpansionIdeasCard ideas={feedback.expansion_ideas} />

      {/* Advanced version (collapsed) */}
      <AdvancedAnswerCard advancedAnswer={feedback.advanced_answer} />

      {/* Vocabulary upgrades */}
      <VocabularyCard feedback={feedback} />

      {/* Pronunciation */}
      <PronunciationCard feedback={feedback} />

      <ReEvaluateBar
        engineResults={engineResults}
        activeEngine={activeEngine}
        isReEvaluating={isReEvaluating}
        reEvaluatingEngine={reEvaluatingEngine}
        onSwitchEngine={onSwitchEngine}
        onReEvaluate={onReEvaluate}
      />

      <FeedbackFooter
        onRetry={onRetry}
        onComplete={onComplete}
        modelAnswer={modelAnswer}
      />
    </motion.div>
  );
}

export function FeedbackExperience({
  feedback, isLoading, transcript, modelAnswer, onRetry, onComplete,
  engineResults, activeEngine, isReEvaluating, reEvaluatingEngine,
  onReEvaluate, onSwitchEngine,
}: Props) {
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
          engineResults={engineResults}
          activeEngine={activeEngine}
          isReEvaluating={isReEvaluating}
          reEvaluatingEngine={reEvaluatingEngine}
          onReEvaluate={onReEvaluate}
          onSwitchEngine={onSwitchEngine}
        />
      </FeedbackProvider>
    </AnimatePresence>
  );
}
