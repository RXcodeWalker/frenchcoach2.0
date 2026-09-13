import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useRecording } from '../features/recording/useRecording';
import { SpeakingConsentGate } from '../components/SpeakingConsentGate';
import { RecordingPanel } from './learn/RecordingPanel';
import { getQuestionById } from '../data/gameData';
import { getAIFeedback } from '../services/api/apiClient';
import { buildSkillContext, detectAvoidance } from '../services/coaching/diagnosticEngine';
import { observeAttempt } from '../services/coach/sessionOrchestrator';
import { deriveAbility } from '../domain/learn/ability/deriveAbility';
import { isUnscored } from '../domain/scoring';
import { STORAGE_KEYS, storageSetRaw } from '../services/persistence/storage';
import { isSafeReturnTo } from '../utils/routeSafety';
import type { Aim } from '../domain/learn/selection/sessionTarget';
import type { Question } from '../types';

/** One question per CognitiveDemand, all in one well-covered base topic (docs
 * §4.4) — resolved by id, not hardcoded, so a future content edit that
 * removes/renumbers an id fails loudly instead of silently diagnosing wrong. */
const DIAGNOSTIC_QUESTION_IDS = ['sch_01', 'sch_02', 'sch_03', 'sch_10', 'sch_11'];
const MAX_RETRIES_PER_QUESTION = 2;

type QuestionStatus = 'pending' | 'recording' | 'submitting' | 'retry' | 'done';

function bucketAim(abilityScore: number): Aim {
  if (abilityScore < 4.0) return 'comfortable';
  if (abilityScore > 6.5) return 'push';
  return 'balanced';
}

export function OnboardingPlacement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawReturnTo = searchParams.get('returnTo');
  const destination = isSafeReturnTo(rawReturnTo) ? rawReturnTo : '/';

  const { dispatch } = useApp();
  const { consentStatus } = useAuth();
  const recording = useRecording(consentStatus === 'pending');

  // One sessionId for the whole diagnostic attempt (docs §4.4).
  const [sessionId] = useState(() => `diag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [status, setStatus] = useState<QuestionStatus>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Per-question-index "already submitted" flag — the only guard against a
  // double observeAttempt call, since appendEvidenceEvents doesn't dedupe.
  const submittedIndexesRef = useState(() => new Set<number>())[0];

  const questions = useMemo<Question[]>(() => {
    const resolved = DIAGNOSTIC_QUESTION_IDS.map(id => getQuestionById(id)).filter(
      (q): q is Question => q !== undefined,
    );
    if (resolved.length !== DIAGNOSTIC_QUESTION_IDS.length) {
      throw new Error('Placement diagnostic question set is incomplete — content ids drifted from the corpus.');
    }
    return resolved;
  }, []);

  const currentQuestion = questions[questionIndex];
  const isLastQuestion = questionIndex === questions.length - 1;

  const finishIncomplete = useCallback(() => {
    // Partial real evidence from completed questions is fine and desired —
    // just no final aim-seeding on an incomplete run (docs §4.4).
    navigate(destination, { replace: true });
  }, [navigate, destination]);

  const advanceOrFinish = useCallback(async (finalAbilitySnapshot?: Parameters<typeof deriveAbility>[0]) => {
    if (isLastQuestion) {
      if (finalAbilitySnapshot) {
        const result = deriveAbility(finalAbilitySnapshot);
        const aim = bucketAim(result.abilityScore);
        storageSetRaw(STORAGE_KEYS.aim, aim);
        dispatch({ type: 'SET_AIM', aim });
      }
      navigate(destination, { replace: true });
      return;
    }
    setQuestionIndex(i => i + 1);
    setRetryCount(0);
    setStatus('pending');
    setErrorMessage(null);
  }, [isLastQuestion, dispatch, navigate, destination]);

  const skipQuestion = useCallback(() => {
    // Skipped question -> the diagnostic never reaches "all 5 successfully
    // answered", so no aim-seeding happens even if later questions succeed.
    if (isLastQuestion) {
      finishIncomplete();
      return;
    }
    setQuestionIndex(i => i + 1);
    setRetryCount(0);
    setStatus('pending');
    setErrorMessage(null);
  }, [isLastQuestion, finishIncomplete]);

  const handleStop = useCallback(async () => {
    // Set the guard synchronously, before any await — otherwise two rapid
    // calls both pass this check while the first is still awaiting
    // recording.stop()/getAIFeedback(), and both would call observeAttempt.
    if (submittedIndexesRef.has(questionIndex)) return;
    submittedIndexesRef.add(questionIndex);
    setStatus('submitting');

    const transcript = (await recording.stop()).trim();

    if (!transcript || recording.sttError) {
      // Not a real submission — let a retry on this question through.
      submittedIndexesRef.delete(questionIndex);
      setErrorMessage("That didn't record — try again.");
      if (retryCount + 1 >= MAX_RETRIES_PER_QUESTION) {
        skipQuestion();
      } else {
        setRetryCount(r => r + 1);
        setStatus('retry');
      }
      return;
    }

    let fb;
    try {
      const skillContext = buildSkillContext();
      fb = await getAIFeedback(transcript, currentQuestion, skillContext, undefined, 'groq');
    } catch {
      submittedIndexesRef.delete(questionIndex);
      setErrorMessage("That didn't record — try again.");
      if (retryCount + 1 >= MAX_RETRIES_PER_QUESTION) {
        skipQuestion();
      } else {
        setRetryCount(r => r + 1);
        setStatus('retry');
      }
      return;
    }

    const unscored = isUnscored(fb);
    const finalScore = fb.scores.overall;
    const avoidanceSignals = detectAvoidance(transcript, currentQuestion);

    const { beliefSnapshot } = observeAttempt({
      sessionId,
      question: currentQuestion,
      feedback: fb,
      avoidanceSignals,
      transcript,
      finalScore,
      mode: 'diagnostic',
      topicKey: currentQuestion.topicKey,
    });

    if (unscored) {
      // Real evidence was still appended above, but an offline-placeholder
      // score doesn't count toward "the diagnostic is complete" — retry-then-skip.
      submittedIndexesRef.delete(questionIndex);
      setErrorMessage('Feedback is unavailable right now — try again.');
      if (retryCount + 1 >= MAX_RETRIES_PER_QUESTION) {
        skipQuestion();
      } else {
        setRetryCount(r => r + 1);
        setStatus('retry');
      }
      return;
    }

    setStatus('done');
    await advanceOrFinish(isLastQuestion ? beliefSnapshot : undefined);
  }, [
    recording, questionIndex, retryCount, currentQuestion, sessionId,
    isLastQuestion, advanceOrFinish, skipQuestion, submittedIndexesRef,
  ]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <p className="text-center text-xs text-ink-muted mb-2">
          Question {questionIndex + 1} of {questions.length}
        </p>
        <h1 className="text-xl font-black text-white mb-1 text-center">Quick placement check</h1>
        <p className="text-sm text-ink-muted text-center mb-6">
          Answer a few questions out loud so your coach can start you at the right level.
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={questionIndex}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="rounded-xl surface p-5 mb-4"
          >
            <p className="text-white font-semibold text-center">{currentQuestion.text}</p>
          </motion.div>
        </AnimatePresence>

        {errorMessage && status === 'retry' && (
          <p className="text-center text-xs text-amber-400 mb-3">{errorMessage}</p>
        )}

        <SpeakingConsentGate>
          <RecordingPanel
            isActive={status === 'pending' || status === 'recording' || status === 'retry'}
            recording={recording}
            onStop={handleStop}
          />
        </SpeakingConsentGate>

        {status === 'submitting' && (
          <p className="text-center text-xs text-ink-muted mt-4 flex items-center justify-center gap-2">
            <Mic size={12} className="animate-pulse" /> Scoring your answer…
          </p>
        )}

        <button
          onClick={finishIncomplete}
          className="mt-6 w-full py-2 rounded-xl font-semibold text-xs text-ink-muted hover:text-ink-muted transition-colors"
        >
          Skip diagnostic
        </button>
      </div>
    </div>
  );
}
