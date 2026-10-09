import React from 'react';
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
import { FeedbackPointList } from './components/FeedbackPointList';
import { coachPointGroups } from './coachPoints';
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

function CardSkeleton() {
  return (
    <div className="rounded-xl surface-raised p-5 animate-pulse">
      <div className="h-3 bg-track rounded w-1/3 mb-3" />
      <div className="space-y-2">
        <div className="h-2.5 bg-track rounded w-full" />
        <div className="h-2.5 bg-track rounded w-4/5" />
        <div className="h-2.5 bg-track rounded w-3/5" />
      </div>
    </div>
  );
}

function SectionGate({ ready, children }: { ready: boolean; children: React.ReactNode }) {
  if (ready) return <>{children}</>;
  return <CardSkeleton />;
}

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
}

export type PronunciationStatus = 'idle' | 'pending' | 'done' | 'failed' | 'signed-out' | 'consent-required';

/** Vocabulary upgrades or expansion ideas to show under "Go further". */
function hasGoFurther(feedback: FeedbackV2): boolean {
  return (
    (feedback.vocabularyV2?.length ?? 0) > 0 ||
    (feedback.vocabulary?.length ?? 0) > 0 ||
    (feedback.expansion_ideas?.length ?? 0) > 0
  );
}

function FeedbackContent({
  feedback, transcript, modelAnswer, onRetry, onComplete,
  pronunciationResult, pronunciationStatus,
}: Omit<Props, 'isLoading' | 'feedback'> & { feedback: FeedbackV2 }) {
  const { state, majorIssues, polishIssues, openCardFromIssue } = useFeedbackState(feedback);

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

      {/* Learn Batch 6a — score line → what you did well (every strength) →
          fix these first (2) → also worth fixing (every other fix) → say it
          better → go further (vocabulary, expansion ideas). Lessons and the
          one-focus line live in the Full report. */}
      <SnapshotCard feedback={feedback} variant="line" />

      <FeedbackPointList groups={coachPointGroups(feedback)} />

      {transcript && (
        <BeforeAfterDiff
          transcript={transcript}
          improvedAnswer={feedback.improved_answer}
          changes={feedback.changes}
          title="Say it better"
        />
      )}

      {hasGoFurther(feedback) && (
        <section aria-label="Go further" className="space-y-2">
          <p className="text-eyebrow uppercase text-ink-muted">Go further</p>
          <VocabularyCard feedback={feedback} />
          <ExpansionIdeasCard ideas={feedback.expansion_ideas} />
        </section>
      )}

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
  feedback, isLoading, partialFeedback, streamPhase, transcript, modelAnswer, onRetry, onComplete,
  pronunciationResult, pronunciationStatus,
}: Props) {
  const p = partialFeedback;
  const isStreaming = !feedback && p != null;

  // Full spinner: no partial data yet
  if ((isLoading && !isStreaming) || (!feedback && !isStreaming)) {
    const phaseLabel = streamPhase === 'transcribing'
      ? 'Transcribing your recording…'
      : streamPhase === 'generating'
      ? 'Generating feedback…'
      : 'Analysing your response…';
    return (
      <motion.div
        className="rounded-xl surface-raised p-8 flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Loader2 size={24} className="text-action-text animate-spin" />
        <p className="text-sm text-ink-muted">{phaseLabel}</p>
      </motion.div>
    );
  }

  // Progressive reveal: partial data streaming in. Only the score line — the
  // streamed sections have not been through filterCoachFeedback yet, so a
  // strength shown here could be one the filter later drops (Batch 6a).
  if (isStreaming && p) {
    return (
      <AnimatePresence>
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          <SectionGate ready={!!p.scores}>
            <SnapshotCard feedback={p as FeedbackV2} variant="line" />
          </SectionGate>
          <CardSkeleton />
          <CardSkeleton />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <FeedbackProvider>
        <FeedbackContent
          feedback={feedback!}
          transcript={transcript}
          modelAnswer={modelAnswer}
          onRetry={onRetry}
          onComplete={onComplete}
          pronunciationResult={pronunciationResult}
          pronunciationStatus={pronunciationStatus}
        />
      </FeedbackProvider>
    </AnimatePresence>
  );
}
