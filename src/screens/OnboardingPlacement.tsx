import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { EASE, EASE_SPRING, enter, enterReduced, stagger } from '../components/motion/variants';
import { useSfxOnChange } from '../services/sound/useSfx';
import { measuredLevelDisplay } from '../domain/learn/ability/levelLabel';
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
import { track } from '../services/telemetry/telemetryService';

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
  // Set when all five questions are done: the check ends on its own "here's where you start" moment
  // instead of dropping the learner onto Home with no sign it worked.
  const [result, setResult] = useState<{ band: string; caption: string; answered: number } | null>(null);
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

  // Questions answered and marked in this run, for placement_completed.
  const answeredCountRef = useRef(0);
  useEffect(() => {
    track({ name: 'placement_started', props: {} });
  }, []);

  const finishIncomplete = useCallback(() => {
    // Partial real evidence from completed questions is fine and desired —
    // just no final aim-seeding on an incomplete run (docs §4.4).
    track({ name: 'placement_completed', props: { questions_answered: answeredCountRef.current, skipped: true } });
    navigate(destination, { replace: true });
  }, [navigate, destination]);

  const advanceOrFinish = useCallback(async (finalAbilitySnapshot?: Parameters<typeof deriveAbility>[0]) => {
    if (isLastQuestion) {
      track({ name: 'placement_completed', props: { questions_answered: answeredCountRef.current, skipped: false } });
      if (finalAbilitySnapshot) {
        const ability = deriveAbility(finalAbilitySnapshot);
        const aim = bucketAim(ability.abilityScore);
        storageSetRaw(STORAGE_KEYS.aim, aim);
        dispatch({ type: 'SET_AIM', aim });
        // A starting point, worded by the same confidence-gated read-out Learn uses — never a mark or band.
        const { band, caption } = measuredLevelDisplay(ability);
        setResult({ band, caption, answered: answeredCountRef.current });
        return;
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
      fb = await getAIFeedback(transcript, currentQuestion, skillContext, undefined, 'groq', undefined, undefined, undefined, 'placement');
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
    answeredCountRef.current += 1;
    await advanceOrFinish(isLastQuestion ? beliefSnapshot : undefined);
  }, [
    recording, questionIndex, retryCount, currentQuestion, sessionId,
    isLastQuestion, advanceOrFinish, skipQuestion, submittedIndexesRef,
  ]);

  const reduced = useReducedMotion();
  const total = questions.length;
  // Neutral cue, the same one that closes a Learn session: it never depends on how the answers went.
  useSfxOnChange(result ? 'complete' : null, result !== null, 150);

  if (result) {
    const item = reduced ? enterReduced : enter;
    return (
      <div className="min-h-screen bg-bg px-4 pb-12 pt-6 sm:pt-10">
        <motion.section
          variants={stagger}
          initial="hidden"
          animate="show"
          aria-labelledby="ob-place-done-h"
          data-testid="placement-result"
          className="mx-auto w-full max-w-[520px]"
        >
          <motion.div variants={item} className="mb-6">
            <motion.span
              aria-hidden="true"
              initial={reduced ? false : { scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, transition: { duration: 0.52, ease: EASE_SPRING } }}
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-pill bg-progress-soft text-progress-text"
            >
              <Check size={28} strokeWidth={2.5} />
            </motion.span>
            <p className="mb-2 text-eyebrow uppercase text-progress-text">Level check complete</p>
            <h1 id="ob-place-done-h" className="text-title text-ink sm:text-h2">Your coach knows where to start.</h1>
            <p className="mt-2 text-body-base text-ink-muted">
              You answered {result.answered} of {total} questions out loud. There are no marks — this only sets your first questions.
            </p>
          </motion.div>

          <motion.div variants={item} className="surface mb-6 rounded-card p-5">
            <p className="text-eyebrow uppercase text-ink-subtle">Your starting level</p>
            <p className="mt-2 text-subtitle text-ink">{result.band}</p>
            <p className="mt-1 text-body-s text-ink-muted">{result.caption}</p>
          </motion.div>

          <motion.div variants={item}>
            <Button size="lg" className="w-full" onClick={() => navigate(destination, { replace: true })} data-testid="placement-result-continue">
              Go to my plan
            </Button>
          </motion.div>
        </motion.section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg px-4 pb-12 pt-6 sm:pt-10">
      <div className="mx-auto w-full max-w-[520px]">
        <header className="mb-8">
          <p className="mb-3 text-eyebrow uppercase text-action-text">
            Placement check · Question {questionIndex + 1} of {total}
          </p>
          <div
            className="flex gap-1.5"
            role="progressbar"
            aria-label="Placement progress"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={questionIndex + 1}
          >
            {questions.map((q, i) => (
              <div
                key={q.id}
                className={`h-1.5 flex-1 rounded-pill transition-colors duration-slide ease-slide ${
                  i <= questionIndex ? 'bg-action' : 'bg-track'
                }`}
              />
            ))}
          </div>
        </header>

        <div className="mb-6">
          <h1 className="text-title text-ink sm:text-h2">Quick placement check</h1>
          <p className="mt-2 text-body-base text-ink-muted">
            Answer a few questions out loud so your coach can start you at the right level. There are no marks here.
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={questionIndex}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: EASE } }}
            exit={{ opacity: 0, transition: { duration: 0.12, ease: EASE } }}
            className="surface mb-4 rounded-card p-5"
          >
            <p className="text-eyebrow uppercase text-ink-subtle">Say it out loud</p>
            <p className="mt-2 text-subtitle text-ink">{currentQuestion.text}</p>
          </motion.div>
        </AnimatePresence>

        {errorMessage && status === 'retry' && (
          <p role="alert" className="mb-3 rounded-control border border-reward bg-reward-soft p-3 text-body-s text-reward-text">
            {errorMessage}
          </p>
        )}

        <SpeakingConsentGate>
          <RecordingPanel
            isActive={status === 'pending' || status === 'recording' || status === 'retry'}
            recording={recording}
            onStop={handleStop}
            processing={status === 'submitting' ? 2 : null}
          />
        </SpeakingConsentGate>

        <div className="mt-6 flex justify-center">
          <Button variant="quiet" onClick={finishIncomplete}>
            Skip diagnostic
          </Button>
        </div>
      </div>
    </div>
  );
}
