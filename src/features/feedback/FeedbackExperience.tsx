import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { playSfx } from '../../services/sound/sfx';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight, LayoutList, Loader2, Mic2 } from 'lucide-react';
import { CollapsibleCard } from '../../components/ui/CollapsibleCard';
import { GuardianConsentNotice } from '../../components/GuardianConsentNotice';
import { stagger } from '../../components/motion/variants';
import { FeedbackProvider, useFeedbackContext } from './state/feedbackContext';
import { useFeedbackState } from './hooks/useFeedbackState';
import { FeedbackHero, type FeedbackTally, type TallyTarget } from './components/FeedbackHero';
import { Segmented } from '../../components/ui/Segmented';
import { LevelNeedsCard } from './components/LevelNeedsCard';
import type { MarkingLevel } from '../../domain/learn/marking/markingLevel';
import { BeforeAfterDiff } from './components/BeforeAfterDiff';
import { ReportView } from './components/ReportView';
import { FIX_FIRST_HEADING, breakdownSummary, coachPointGroups, selectCoachFixes, whatWorkedGroup } from './coachPoints';
import { PronunciationCard } from './components/PronunciationCard';
import { AzurePronunciationCard } from './components/AzurePronunciationCard';
import { HowItSounded } from '../pronunciation/HowItSounded';
import { SayItBetterActions } from './components/SayItBetterActions';
import type { HeardAsNote } from '../../domain/transcription/misheardExpressions';
import { FeedbackFooter } from './components/FeedbackFooter';
import { MinimalResponseCard } from './components/MinimalResponseCard';
import { OfflineLimitationsBanner } from '../../screens/learn/OfflineLimitationsBanner';
import { SIGNED_OUT_FEEDBACK_REASON } from '../../services/api/apiClient';
import { track } from '../../services/telemetry/telemetryService';
import { FailoverBadge } from '../../screens/learn/FailoverBadge';
import type { FeedbackV2 } from '../../types';
import type { PronunciationAssessment } from '../../domain/pronunciation/types';
import type { QuestionDemands } from '../../domain/learn/demand/types';
import { buildCoachTeacherScript } from './teacher/buildTeacherScript';
import { PredictionResults } from './teacher/PredictionResults';
import type { FirstId } from './teacher/firsts';
import { SaveToNotebook } from './teacher/SaveToNotebook';
import type { NotebookDraft, NotebookQuestionRef } from '../../domain/learn/notebook/notebook';
import { PredictCard } from './teacher/PredictCard';
import {
  calibrationLines,
  fixesFromGroups,
  predictionChecks,
  type PredictionAnswer,
  type PredictionCheck,
  type PredictionCheckId,
} from './teacher/predictionQuestions';
import { TeacherConversation } from './teacher/TeacherConversation';
import { useElapsedMs } from './teacher/useElapsedMs';

/**
 * Docs Stage 6 — the two tabs, one job each (no item in both): Coach is the
 * teacher's conversation and the practice; Breakdown is the evidence and the
 * reference (marked-up answer, every correction with its lesson, vocabulary,
 * ideas, the model answer). The score sits above both, in the hero.
 */
function ViewModeTabs() {
  const { state, dispatch } = useFeedbackContext();
  return (
    <Segmented
      label="Feedback view"
      value={state.viewMode}
      onChange={(mode) => dispatch({ type: 'SET_VIEW_MODE', mode })}
      testIdPrefix="feedback-tab"
      options={[
        { id: 'coach', label: 'Coach' },
        { id: 'report', label: 'Breakdown' },
      ]}
    />
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
  demands?: (Pick<QuestionDemands, 'cognitiveDemand' | 'timeFrames'> & Partial<Pick<QuestionDemands, 'structures'>>) | null;
  /** `state.profile.username`; the teacher says it at most once, and only if it reads as a name. */
  learnerName?: string | null;
  /** The active repeated-mistake problem (only when `isRecurring`), for the teacher's memory line. */
  recurring?: { nodeId: string; label: string; times: number | null } | null;
  /** The follow-up Learn will ask when "Next question" is tapped, only when it will (Batch 6c). */
  nextQuestion?: string | null;
  /** Milestones Learn has proven are firsts for this answer (Batch 6c). */
  firsts?: readonly FirstId[];
  /**
   * Keep-this-answer for the learner's exam notebook (Batch 6d). Absent for a
   * follow-up turn, which has no stable question of its own. `onSave` is the only
   * write, and Learn only calls the reducer when the learner taps Save.
   */
  notebook?: {
    question: NotebookQuestionRef;
    signedIn: boolean;
    /** The answer already saved for this question, if any. */
    savedAnswer: string | null;
    onSave: (draft: NotebookDraft) => void;
  } | null;
  /**
   * learn-marking §8.2 — the learner's marking level, passed only while the
   * marking dial is live. Changes only the score shown; the notebook offer
   * stays on the Exam-standard score (§8.1).
   */
  markingLevel?: MarkingLevel;
  /**
   * pronunciation-lab Stage 3 — passed only while `pronunciationLab` is live:
   * the "How it sounded" card replaces the Azure / legacy pronunciation cards,
   * and the `pronunciationResult`/`pronunciationStatus` props are ignored
   * (Learn no longer asks for a free-answer analysis, owner D1).
   */
  howItSounded?: {
    answerBlob: Blob | null;
    /** Fixed expressions the recogniser misheard; the feedback was given on what the learner meant. */
    heardAs?: readonly HeardAsNote[];
    onPractiseOpened?: () => void;
  };
  /** What "Get new feedback" costs, for its confirm dialog (Learn says how many answers are left). */
  retryNote?: string;
}

/** An answer at or above this overall score is offered to the notebook (the same line as `scoreTone`'s "good"). */
const NOTEBOOK_HIGH_SCORE = 8;

export type PronunciationStatus = 'idle' | 'pending' | 'done' | 'failed' | 'signed-out' | 'consent-required';

function FeedbackContent({
  feedback, transcript, modelAnswer, onRetry, onComplete,
  pronunciationResult, pronunciationStatus, learnerName, recurring, nextQuestion, firsts, notebook, markingLevel, howItSounded, retryNote, checks, answers,
}: Pick<Props, 'transcript' | 'modelAnswer' | 'onRetry' | 'onComplete' | 'pronunciationResult' | 'pronunciationStatus' | 'learnerName' | 'recurring' | 'nextQuestion' | 'firsts' | 'notebook' | 'markingLevel' | 'howItSounded' | 'retryNote'> & {
  feedback: FeedbackV2;
  checks: readonly PredictionCheck[];
  answers: Partial<Record<PredictionCheckId, PredictionAnswer>>;
}) {
  const { state, majorIssues, polishIssues, openCardFromIssue } = useFeedbackState(feedback);
  const { dispatch } = useFeedbackContext();
  // The answer as it was confirmed and marked (the backend echoes it): formatted
  // and the text every quote was grounded in. The caller's copy can be the raw
  // live captions (unpunctuated, lower case), which is what "Your answer" used
  // to show (owner report 2026-11-13).
  const answerText = feedback.gradedTranscript?.trim() ? feedback.gradedTranscript : (transcript ?? '');
  // The notebook offer appears after a Second take or a high-scoring answer.
  const [tookSecondTake, setTookSecondTake] = useState(false);
  // Each bump asks the "How it sounded" card to open its practice (the Say-it-better card's button).
  const [practiseSignal, setPractiseSignal] = useState(0);
  // Each bump shows the whole conversation at once (a hero count was tapped).
  const [showAllSignal, setShowAllSignal] = useState(0);

  // The hero's counts jump to their part of the feedback: strengths and fixes are in the
  // conversation (shown in full first), the self-fixes card is in the Breakdown.
  const jumpTo = (to: TallyTarget) => {
    const mode = to === 'self' ? 'report' : 'coach';
    dispatch({ type: 'SET_VIEW_MODE', mode });
    if (mode === 'coach') setShowAllSignal((n) => n + 1);
    const selectors = to === 'fixes' ? ['fixes', 'more-fixes'] : [to];
    setTimeout(() => {
      for (const sel of selectors) {
        const el = document.querySelector<HTMLElement>(`[data-section="${sel}"]`);
        if (el) {
          const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
          el.scrollIntoView?.({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
          return;
        }
      }
    }, 60);
  };

  // Each answered Predict check, judged against the answer and the filtered fixes.
  const calibration = useMemo(
    () => calibrationLines(checks, answers, answerText, fixesFromGroups(coachPointGroups(feedback))),
    [checks, answers, answerText, feedback],
  );

  // The teacher's script is built from the feedback that already passed the filters.
  const lines = useMemo(
    () =>
      buildCoachTeacherScript(feedback, {
        transcript: answerText,
        name: learnerName,
        recurring,
        calibration,
        secondTake: true,
        nextQuestion,
        firsts,
      }),
    [feedback, answerText, learnerName, recurring, nextQuestion, firsts, calibration],
  );

  // Vocabulary, extension ideas and the model answer live only in the Full
  // report (owner, 2026-11-13: one place, not both); the script no longer
  // places "Go further" in the conversation.
  const correctedSentence = feedback.improved_answer?.trim() ?? '';
  const renderSection = (section: 'say-it-better' | 'go-further'): ReactNode =>
    section === 'say-it-better' && answerText ? (
      <BeforeAfterDiff
        transcript={answerText}
        improvedAnswer={feedback.improved_answer}
        changes={feedback.changes}
        title="Say it better"
      >
        {/* With the Lab live, hear and say the rewrite right here; "How it sounded" below does the rest. */}
        {howItSounded && correctedSentence ? (
          <SayItBetterActions sentence={correctedSentence} onPractise={() => setPractiseSignal((n) => n + 1)} />
        ) : null}
      </BeforeAfterDiff>
    ) : null;

  if (feedback.responseTier === 0 || feedback.responseTier === 1) {
    return (
      <MinimalResponseCard
        feedback={feedback}
        transcript={answerText}
        onRetry={onRetry}
        onComplete={onComplete}
        modelAnswer={modelAnswer}
      />
    );
  }

  const isOffline = feedback.engineMeta?.actualEngine === 'offline';
  const offlineBecauseSignedOut = feedback.engineMeta?.failoverReason === SIGNED_OUT_FEEDBACK_REASON;

  const tally: FeedbackTally = {
    strengths: whatWorkedGroup(feedback).points.length,
    fixes: selectCoachFixes(feedback).length,
    selfCorrections: feedback.selfCorrections?.length ?? 0,
  };
  const reportCounts = breakdownSummary(feedback, !!modelAnswer);

  const header = (
    <>
      {isOffline && <OfflineLimitationsBanner signedOut={offlineBecauseSignedOut} />}
      <FailoverBadge engineMeta={feedback.engineMeta} />
      <FeedbackHero feedback={feedback} markingLevel={markingLevel} tally={tally} onJump={jumpTo} />
      <ViewModeTabs />
    </>
  );

  if (state.viewMode === 'report') {
    return (
      <div className="space-y-3">
        {header}
        <ReportView
          feedback={feedback}
          transcript={answerText}
          majorIssues={majorIssues}
          polishIssues={polishIssues}
          onIssueClick={openCardFromIssue}
          predictions={<PredictionResults lines={calibration} />}
          modelAnswer={modelAnswer}
        />
        <FeedbackFooter onRetry={onRetry} onComplete={onComplete} retryNote={retryNote} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {header}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-3"
      >
      {/* Learn Batch 6b — the teacher's conversation: your answer → opening →
          what you did well → fix these first (as "Try it first" nudges) → also
          worth fixing → say it better → a repeated mistake → second take. The
          score is in the hero above both tabs (2026-11-27 redesign). Lessons
          and the one-focus line live in the Breakdown. */}
      <TeacherConversation
        lines={lines}
        revealKey={feedback}
        showAllSignal={showAllSignal}
        tryFirstHeading={FIX_FIRST_HEADING}
        renderSection={renderSection}
        onSecondTake={() => {
          setTookSecondTake(true);
          // A count only: SecondTake itself stays analytics-free, and nothing about the take is sent.
          track({ name: 'second_take_used', props: {} });
        }}
        after={
          notebook ? (
            <SaveToNotebook
              feedback={feedback}
              question={notebook.question}
              signedIn={notebook.signedIn}
              offered={tookSecondTake || (feedback.scores?.overall ?? 0) >= NOTEBOOK_HIGH_SCORE}
              savedAnswer={notebook.savedAnswer}
              onSave={notebook.onSave}
            />
          ) : null
        }
      />

      {/* learn-marking §6.1 — Coach style only (the Examiner style never gets a marking level). */}
      {markingLevel && (
        <LevelNeedsCard feedback={feedback} markingLevel={markingLevel} transcript={answerText} />
      )}

      {howItSounded ? (
        <HowItSounded
          answerBlob={howItSounded.answerBlob}
          heardAs={howItSounded.heardAs}
          sentence={feedback.improved_answer || feedback.rephrase || ''}
          onPractiseOpened={howItSounded.onPractiseOpened}
          openSignal={practiseSignal}
        />
      ) : (
        <>
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
        </>
      )}

      {reportCounts.length > 0 && (
        <button
          type="button"
          onClick={() => {
            dispatch({ type: 'SET_VIEW_MODE', mode: 'report' });
            window.scrollTo?.({ top: 0, behavior: 'smooth' });
          }}
          className="group flex w-full items-center gap-3 rounded-card border border-hairline bg-surface p-4 text-left transition-colors duration-state hover:border-hairline-strong"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-action-soft text-action-text" aria-hidden="true">
            <LayoutList size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-section text-ink">Open the Breakdown</span>
            <span className="block text-caption text-ink-muted">{reportCounts.join(' · ')}</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-ink-subtle" aria-hidden="true" />
        </button>
      )}
      </motion.div>

      <FeedbackFooter onRetry={onRetry} onComplete={onComplete} retryNote={retryNote} />
    </div>
  );
}

export function FeedbackExperience({
  feedback, streamPhase, transcript, modelAnswer, onRetry, onComplete,
  pronunciationResult, pronunciationStatus, demands, learnerName, recurring, nextQuestion, firsts, notebook, markingLevel, howItSounded, retryNote,
}: Props) {
  const checks = useMemo(() => predictionChecks(demands), [demands]);
  const [answers, setAnswers] = useState<Partial<Record<PredictionCheckId, PredictionAnswer>>>({});
  const waiting = !feedback;
  const elapsedMs = useElapsedMs(waiting);

  // "Your feedback is here" — only when it arrives while this screen is open, never when it is reopened.
  // Neutral by design: the cue says nothing about how the answer went.
  const wasWaiting = useRef(false);
  useEffect(() => {
    if (wasWaiting.current && !waiting) playSfx('ready');
    wasWaiting.current = waiting;
  }, [waiting]);

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
          markingLevel={markingLevel}
          howItSounded={howItSounded}
          retryNote={retryNote}
          firsts={firsts}
          notebook={notebook}
          checks={checks}
          answers={answers}
        />
      </FeedbackProvider>
    </AnimatePresence>
  );
}
