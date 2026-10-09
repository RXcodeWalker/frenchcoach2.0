import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Loader2, Mic2 } from 'lucide-react';
import { CollapsibleCard } from '../../components/ui/CollapsibleCard';
import { GuardianConsentNotice } from '../../components/GuardianConsentNotice';
import { stagger } from '../../components/motion/variants';
import { FeedbackProvider, useFeedbackContext } from './state/feedbackContext';
import { useFeedbackState } from './hooks/useFeedbackState';
import { SnapshotCard } from './components/SnapshotCard';
import { BeforeAfterDiff } from './components/BeforeAfterDiff';
import { ReportView } from './components/ReportView';
import { FIX_FIRST_HEADING } from './coachPoints';
import { VocabularyCard } from './components/VocabularyCard';
import { ExpansionIdeasCard } from './components/ExpansionIdeasCard';
import { PronunciationCard } from './components/PronunciationCard';
import { AzurePronunciationCard } from './components/AzurePronunciationCard';
import { FeedbackFooter } from './components/FeedbackFooter';
import { MinimalResponseCard } from './components/MinimalResponseCard';
import { OfflineLimitationsBanner } from '../../screens/learn/OfflineLimitationsBanner';
import { SIGNED_OUT_FEEDBACK_REASON } from '../../services/api/apiClient';
import { FailoverBadge } from '../../screens/learn/FailoverBadge';
import type { FeedbackV2 } from '../../types';
import type { PronunciationAssessment } from '../../domain/pronunciation/types';
import type { QuestionDemands } from '../../domain/learn/demand/types';
import { buildCoachTeacherScript } from './teacher/buildTeacherScript';
import type { FirstId } from './teacher/firsts';
import { PredictCard } from './teacher/PredictCard';
import {
  calibrationLines,
  predictionChecks,
  type PredictionAnswer,
  type PredictionCheck,
  type PredictionCheckId,
} from './teacher/predictionQuestions';
import { TeacherConversation } from './teacher/TeacherConversation';
import { useElapsedMs } from './teacher/useElapsedMs';

/** Docs Stage 6 — segmented control at the top of the feedback stack. Same FeedbackV2, no new route. */
function ViewModeToggle() {
  const { state, dispatch } = useFeedbackContext();
  return (
    <div className="flex p-0.5 rounded-lg surface-recessed w-fit">
      {(['coach', 'report'] as const).map(mode => (
        <button
          key={mode}
          onClick={() => dispatch({ type: 'SET_VIEW_MODE', mode })}
          aria-pressed={state.viewMode === mode}
          className={`px-3 py-1.5 rounded-md text-eyebrow uppercase transition-colors ${
            state.viewMode === mode
              ? 'bg-violet-500/20 text-action-text'
              : 'text-ink-muted hover:text-ink-muted'
          }`}
        >
          {mode === 'coach' ? 'Coach' : 'Full report'}
        </button>
      ))}
    </div>
  );
}

interface Props {
  feedback: FeedbackV2 | null;
  isLoading?: boolean;
  /**
   * The streamed sections. Not rendered since Batch 6b: they have not been
   * through filterCoachFeedback, so nothing in them is shown until the final,
   * filtered feedback arrives.
   */
  partialFeedback?: Partial<FeedbackV2> | null;
  streamPhase?: 'transcribing' | 'generating' | 'complete' | null;
  transcript?: string;
  modelAnswer?: string;
  onRetry: () => void;
  onComplete: () => void;
  /** Azure pronunciation (Learn-only). When present/pending, suppresses the legacy 0-10 card. */
  pronunciationResult?: PronunciationAssessment | null;
  /**
   * 'signed-out' is distinct from 'failed': the assessment endpoint requires a
   * signed-in account (Phase 3 AI-cost quota), so telling a guest the service
   * "didn't respond in time" would send them to retry forever.
   * 'consent-required': the backend's consent gate refused the audio (a
   * `pending` under-13 account) — guardian copy, never a retry.
   */
  pronunciationStatus?: PronunciationStatus;
  /** The question's demands (`Question.demands`) — they choose the Predict checks. */
  demands?: Pick<QuestionDemands, 'cognitiveDemand' | 'timeFrames'> | null;
  /** `state.profile.username`; the teacher says it at most once, and only if it reads as a name. */
  learnerName?: string | null;
  /** The active repeated-mistake problem (only when `isRecurring`), for the teacher's memory line. */
  recurring?: { nodeId: string; label: string; times: number | null } | null;
  /** The follow-up Learn will ask when "Next question" is tapped, only when it will (Batch 6c). */
  nextQuestion?: string | null;
  /** Milestones Learn has proven are firsts for this answer (Batch 6c). */
  firsts?: readonly FirstId[];
}

export type PronunciationStatus = 'idle' | 'pending' | 'done' | 'failed' | 'signed-out' | 'consent-required';

function FeedbackContent({
  feedback, transcript, modelAnswer, onRetry, onComplete,
  pronunciationResult, pronunciationStatus, learnerName, recurring, nextQuestion, firsts, checks, answers,
}: Pick<Props, 'transcript' | 'modelAnswer' | 'onRetry' | 'onComplete' | 'pronunciationResult' | 'pronunciationStatus' | 'learnerName' | 'recurring' | 'nextQuestion' | 'firsts'> & {
  feedback: FeedbackV2;
  checks: readonly PredictionCheck[];
  answers: Partial<Record<PredictionCheckId, PredictionAnswer>>;
}) {
  const { state, majorIssues, polishIssues, openCardFromIssue } = useFeedbackState(feedback);

  // The teacher's script is built from the feedback that already passed the filters.
  const lines = useMemo(
    () =>
      buildCoachTeacherScript(feedback, {
        transcript: transcript ?? '',
        name: learnerName,
        recurring,
        calibration: calibrationLines(checks, answers, transcript ?? ''),
        secondTake: true,
        nextQuestion,
        firsts,
      }),
    [feedback, transcript, learnerName, recurring, nextQuestion, firsts, checks, answers],
  );

  const renderSection = (section: 'say-it-better' | 'go-further'): ReactNode =>
    section === 'say-it-better' ? (
      transcript ? (
        <BeforeAfterDiff
          transcript={transcript}
          improvedAnswer={feedback.improved_answer}
          changes={feedback.changes}
          title="Say it better"
        />
      ) : null
    ) : (
      <section aria-label="Go further" className="space-y-2">
        <p className="text-eyebrow uppercase text-ink-muted">Go further</p>
        <VocabularyCard feedback={feedback} />
        <ExpansionIdeasCard ideas={feedback.expansion_ideas} />
      </section>
    );

  if (feedback.responseTier === 0 || feedback.responseTier === 1) {
    return (
      <MinimalResponseCard
        feedback={feedback}
        transcript={transcript ?? ''}
        onRetry={onRetry}
        onComplete={onComplete}
        modelAnswer={modelAnswer}
      />
    );
  }

  const isOffline = feedback.engineMeta?.actualEngine === 'offline';
  const offlineBecauseSignedOut = feedback.engineMeta?.failoverReason === SIGNED_OUT_FEEDBACK_REASON;

  if (state.viewMode === 'report') {
    return (
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
        {isOffline && <OfflineLimitationsBanner signedOut={offlineBecauseSignedOut} />}
        <FailoverBadge engineMeta={feedback.engineMeta} />
        <ViewModeToggle />
        <ReportView
          feedback={feedback}
          transcript={transcript}
          majorIssues={majorIssues}
          polishIssues={polishIssues}
          onIssueClick={openCardFromIssue}
        />
        <FeedbackFooter onRetry={onRetry} onComplete={onComplete} modelAnswer={modelAnswer} />
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-3"
    >
      {isOffline && <OfflineLimitationsBanner signedOut={offlineBecauseSignedOut} />}
      <FailoverBadge engineMeta={feedback.engineMeta} />
      <ViewModeToggle />

      {/* Learn Batch 6b — the teacher's conversation: your answer → opening →
          what you did well → fix these first (as "Try it first" nudges) → also
          worth fixing → say it better → go further → a repeated mistake. The
          score line moves under the talk. Lessons and the one-focus line live
          in the Full report. */}
      <TeacherConversation
        lines={lines}
        revealKey={feedback}
        tryFirstHeading={FIX_FIRST_HEADING}
        renderSection={renderSection}
      />

      <SnapshotCard feedback={feedback} variant="line" />

      {/* lint:pronunciation-start — pronunciation branch is out of Batch 5 scope; block untouched */}
      {/* Pronunciation — Azure (0-100, real acoustic analysis) supersedes the legacy
          0-10 Gemini-prompt field whenever a Learn attempt has an audio blob. Never
          rendered together: mixing scales on one screen would mislead the learner. */}
      {pronunciationStatus && pronunciationStatus !== 'idle' ? (
        pronunciationResult ? (
          <AzurePronunciationCard
            result={pronunciationResult}
            correctedSentence={feedback.improved_answer ?? feedback.rephrase}
          />
        ) : pronunciationStatus === 'pending' ? (
          <div className="rounded-xl surface p-4 flex items-center gap-2.5">
            <Loader2 size={14} className="text-cyan-400 animate-spin shrink-0" />
            <p className="text-[10px] text-ink-muted">Analysing pronunciation…</p>
          </div>
        ) : pronunciationStatus === 'signed-out' ? (
          <CollapsibleCard
            title="Pronunciation Analysis"
            icon={<Mic2 size={13} className="text-cyan-400" />}
            defaultOpen={true}
            className="border border-cyan-500/15"
          >
            <div className="px-1 py-2">
              <p className="text-[10px] font-semibold text-ink-muted">Sign in for pronunciation analysis.</p>
              <p className="text-[9px] text-ink-muted mt-1">
                Pronunciation scoring runs on your account, so it's not available while you're practising as a guest.
                Create a free account or sign in, and it'll run on your next answer.
              </p>
              <Link
                to="/login"
                className="inline-block mt-2 text-[9px] font-semibold text-cyan-300 underline underline-offset-2"
              >
                Sign in
              </Link>
            </div>
          </CollapsibleCard>
        ) : pronunciationStatus === 'consent-required' ? (
          <GuardianConsentNotice />
        ) : pronunciationStatus === 'failed' ? (
          <CollapsibleCard
            title="Pronunciation Analysis"
            icon={<Mic2 size={13} className="text-cyan-400" />}
            defaultOpen={true}
            className="border border-cyan-500/15"
          >
            <div className="px-1 py-2">
              <p className="text-[10px] font-semibold text-ink-muted">Pronunciation analysis isn't available right now.</p>
              <p className="text-[9px] text-ink-muted mt-1">
                Our pronunciation service didn't respond in time — this can happen when it's just waking up.
                Your recording and the rest of your feedback are safe. Try your next answer and it should be back.
              </p>
            </div>
          </CollapsibleCard>
        ) : null
      ) : (
        <PronunciationCard feedback={feedback} />
      )}
      {/* lint:pronunciation-end */}

      <FeedbackFooter
        onRetry={onRetry}
        onComplete={onComplete}
        modelAnswer={modelAnswer}
      />
    </motion.div>
  );
}

export function FeedbackExperience({
  feedback, streamPhase, transcript, modelAnswer, onRetry, onComplete,
  pronunciationResult, pronunciationStatus, demands, learnerName, recurring, nextQuestion, firsts,
}: Props) {
  const checks = useMemo(() => predictionChecks(demands), [demands]);
  const [answers, setAnswers] = useState<Partial<Record<PredictionCheckId, PredictionAnswer>>>({});
  const waiting = !feedback;
  const elapsedMs = useElapsedMs(waiting);

  // Predictions are session state for one attempt: a new wait starts with none.
  useEffect(() => {
    if (waiting) setAnswers({});
  }, [waiting]);

  // Nothing streamed is shown: the partial sections have not been through
  // filterCoachFeedback, so the wait is spent on the Predict card instead.
  if (!feedback) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <PredictCard
          checks={checks}
          answers={answers}
          onAnswer={(id, answer) => setAnswers((a) => ({ ...a, [id]: answer }))}
          phase={streamPhase}
          elapsedMs={elapsedMs}
          register="coach"
        />
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
          pronunciationResult={pronunciationResult}
          pronunciationStatus={pronunciationStatus}
          learnerName={learnerName}
          recurring={recurring}
          nextQuestion={nextQuestion}
          firsts={firsts}
          checks={checks}
          answers={answers}
        />
      </FeedbackProvider>
    </AnimatePresence>
  );
}
