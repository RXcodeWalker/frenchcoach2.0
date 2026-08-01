import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { TOPICS } from '../data/gameData';
import { consumeItem } from '../services/progression/progressionService';
import { getAIFeedback, streamFeedback, getExaminerFeedback } from '../services/api/apiClient';
import { assessPronunciation } from '../services/pronunciation/pronunciationClient';
import type { PronunciationAssessment } from '../domain/pronunciation/types';
import { ExaminerFeedbackCard } from '../features/feedback/components/ExaminerFeedbackCard';
import type { ExaminerFeedback } from '../services/coaching/examinerFeedback';
import { getSkillProfile, buildSkillContext, detectAvoidance } from '../services/coaching/diagnosticEngine';
import { orchestrateAttempt } from '../services/coach/sessionOrchestrator';
import { getActiveRecommendation, setRecommendationStatus, generateRecommendation } from '../services/coach/recommendationEngine';
import { getDailyPlan, invalidateDailyPlan } from '../services/coach/decisionEngine';
import { recordIntervention, recordInterventionOutcome } from '../services/coach/interventionService';
import { getSkillLabel } from '../services/coach/skillGraph';
import { MicroDrillModal } from '../components/ui/MicroDrillModal';
import type { LearningProblem } from '../types/intervention';
import { useRecording } from '../features/recording/useRecording';
import { TopicGrid } from './learn/TopicGrid';
import { QuestionCard } from './learn/QuestionCard';
import { RecordingPanel } from './learn/RecordingPanel';
import { FeedbackExperience } from '../features/feedback';
import { TopContextBar } from '../components/TopContextBar';
import { SessionStartScreen } from './learn/SessionStartScreen';
import { SessionProgressBar } from './learn/SessionProgressBar';
import { SessionSummary } from './learn/SessionSummary';
import { MidSessionToast } from './learn/MidSessionToast';
import { StreakToast } from './learn/StreakToast';
import { buildSessionQuestions, makeSessionQuestion, SESSION_TARGET } from '../utils/sessionBuilder';
import { track } from '../services/telemetry/telemetryService';
import { DIFFICULTY_CONFIG } from '../utils/difficultyConfig';
import { updateTopicMastery } from '../services/analytics/analyticsService';
import { computeXPGain, computeParticipationXPGain } from '../domain/xp';
import { isUnscored, averageRealScores } from '../domain/scoring';
import type { Topic, Session, FeedbackV2, ActiveSession, SessionMode, SessionQuestion, AIEngine, EngineResult, FeedbackMode } from '../types/index';

type LearnState = 'topics' | 'session_start' | 'question' | 'recording' | 'feedback' | 'session_summary';

export function Learn() {
  const { state, dispatch } = useApp();
  const { profile, skillProfile, topicMastery, preferredEngine, selectedDifficulty } = state;

  const [learnState, setLearnState] = useState<LearnState>('topics');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackV2 | null>(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [isRetry, setIsRetry] = useState(false);
  const [showMidToast, setShowMidToast] = useState(false);
  const [showStreakToast, setShowStreakToast] = useState(false);

  // Engine selection state
  const [selectedEngine, setSelectedEngine] = useState<AIEngine>(preferredEngine);
  // Coach voice (free-form scores) vs examiner voice (Cambridge descriptor language, no marks).
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>('coach');
  // Per-question evaluation cache: Map<AIEngine, EngineResult>
  const [engineResults, setEngineResults] = useState<Map<AIEngine, EngineResult>>(new Map());
  const [activeResultEngine, setActiveResultEngine] = useState<AIEngine | null>(null);
  const [isReEvaluating, setIsReEvaluating] = useState(false);
  const [reEvaluatingEngine, setReEvaluatingEngine] = useState<AIEngine | null>(null);
  // E1: honest error state when feedback could not be produced at all — never a fabricated score.
  const [feedbackErrorMessage, setFeedbackErrorMessage] = useState<string | null>(null);
  // Examiner mode result — separate from FeedbackV2 (which always carries a numeric
  // score); examiner mode must never fabricate one. No session/XP finalization runs
  // for an examiner-mode attempt — there is no score to record.
  const [examinerStatus, setExaminerStatus] = useState<'idle' | 'pending' | 'done' | 'failed'>('idle');
  const [examinerFeedbackResult, setExaminerFeedbackResult] = useState<ExaminerFeedback | null>(null);
  const [drillSkillId, setDrillSkillId] = useState<string | null>(null);
  const [showDrillModal, setShowDrillModal] = useState(false);
  const [activeProblem, setActiveProblem] = useState<LearningProblem | null>(null);
  const [drillInterventionId, setDrillInterventionId] = useState<string | null>(null);

  // Streaming progressive reveal
  const [partialFeedback, setPartialFeedback] = useState<Partial<FeedbackV2> | null>(null);
  const [streamPhase, setStreamPhase] = useState<'transcribing' | 'generating' | 'complete' | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  // Azure pronunciation (Learn-only; separate lifecycle from the coaching stream —
  // never delays feedback, never blurs into FeedbackV2's legacy 0-10 field).
  const [pronunciationStatus, setPronunciationStatus] = useState<'idle' | 'pending' | 'done' | 'failed'>('idle');
  const [pronunciationResult, setPronunciationResult] = useState<PronunciationAssessment | null>(null);
  const pronunciationAbortRef = useRef<AbortController | null>(null);
  // Single generation counter guarding both the feedback stream and the pronunciation
  // call — belt-and-braces alongside AbortController so a race can never write stale
  // state even if an abort signal is slow to land.
  const attemptIdRef = useRef(0);

  const recording = useRecording();

  // Abort stream + pronunciation call on unmount
  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
      pronunciationAbortRef.current?.abort();
    };
  }, []);

  const currentQuestion = activeSession
    ? activeSession.questions[activeSession.currentIndex]?.question ?? null
    : null;

  // ── Engine preference change ──────────────────────────────────────────────────

  const handleEngineChange = (engine: AIEngine) => {
    setSelectedEngine(engine);
    dispatch({ type: 'SET_AI_ENGINE', engine });
  };

  // ── Topic selection ───────────────────────────────────────────────────────────

  const selectTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    setLearnState('session_start');
  };

  // ── Session start ─────────────────────────────────────────────────────────────

  const startSession = useCallback((mode: SessionMode) => {
    if (!selectedTopic) return;

    // Coach loop: let the active recommendation + daily plan blend bias this
    // session toward skills/topics flagged from previous evidence.
    const recommendation = getActiveRecommendation();
    const focusedSkillId = recommendation?.targetSkillIds?.[0] ?? null;
    if (focusedSkillId) {
      dispatch({ type: 'SET_FOCUSED_SKILL', skillId: focusedSkillId });
      setRecommendationStatus('accepted');
    }

    const dailyPlan = getDailyPlan();
    const sessionBlend = dailyPlan?.sessionBlend ?? null;

    const questions = buildSessionQuestions(
      selectedTopic.key,
      mode,
      skillProfile,
      topicMastery[selectedTopic.key] ?? null,
      selectedDifficulty,
      focusedSkillId,
      sessionBlend,
    );

    const target = mode === 'full_topic' ? questions.length : SESSION_TARGET[mode];
    const sessionQuestions: SessionQuestion[] = questions.slice(0, target).map(makeSessionQuestion);

    const session: ActiveSession = {
      id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      topicKey: selectedTopic.key,
      mode,
      targetCount: sessionQuestions.length,
      questions: sessionQuestions,
      currentIndex: 0,
      questionsCompleted: 0,
      answerStreak: 0,
      bestStreak: 0,
      xpAccumulated: 0,
      gemsAccumulated: 0,
      totalWords: 0,
      startedAt: new Date().toISOString(),
      skillSnapshot: JSON.parse(JSON.stringify(skillProfile)),
    };

    setActiveSession(session);
    dispatch({ type: 'START_SESSION', session });
    setShowHint(false);
    setFeedback(null);
    setIsRetry(false);
    // Clear evaluation cache for the new session
    setEngineResults(new Map());
    setActiveResultEngine(null);
    setLearnState('question');
  }, [selectedTopic, skillProfile, topicMastery, dispatch]);

  const startSingleQuestion = () => startSession('single');

  // ── Recording + evaluation ────────────────────────────────────────────────────

  // Not memoized — called only from handleStopRecording
  const _finalizeAnswer = (
    fb: FeedbackV2,
    transcript: string,
    elapsed: number,
    avoidanceSignals: ReturnType<typeof detectAvoidance>,
    skillContext: ReturnType<typeof buildSkillContext>,
  ) => {
    if (!activeSession || !currentQuestion) return;

    // Apply avoidance signals
    if (avoidanceSignals.length > 0 && !fb.avoidanceReport?.length) {
      fb = { ...fb, avoidanceReport: avoidanceSignals, skillContextUsed: true };
    } else if (skillContext.sessionsAnalyzed > 0) {
      fb = { ...fb, skillContextUsed: true };
    }

    const meta = fb.engineMeta;
    const actualEngine = meta?.actualEngine ?? selectedEngine;
    const result: EngineResult = { engine: actualEngine, feedback: fb, meta: meta ?? {
      requestedEngine: selectedEngine,
      actualEngine,
      fallbackUsed: false,
      latencyMs: 0,
      evaluatedAt: new Date().toISOString(),
    }};
    setEngineResults(new Map([[actualEngine, result]]));
    setActiveResultEngine(actualEngine);

    // The discriminant for "was this attempt actually graded" is feedback.unscored,
    // never scores.overall's numeric value (Phase 4b) — a real graded 0 is a
    // legitimate bad answer, while an offline placeholder 0 must never reach XP,
    // Session.score, or achievements as if it were a real mark.
    const unscored = isUnscored(fb);
    const finalScore = fb.scores.overall;

    // E3: perfect_shield boosts XP/rewards only, and only when there's a real
    // score to boost — it never fabricates a score for an unscored attempt.
    let xpScore = finalScore;
    if (!unscored && finalScore < 8.5 && (profile.inventory['perfect_shield'] || 0) > 0) {
      xpScore = Math.max(8.5, finalScore + 2);
      // eslint-disable-next-line react-hooks/rules-of-hooks
      if (consumeItem('perfect_shield')) {
        dispatch({ type: 'USE_ITEM', itemId: 'perfect_shield' });
      }
    }

    const { gain: xpGain, gemsGain: gemGain } = unscored
      ? computeParticipationXPGain(profile.streak_days)
      : computeXPGain(xpScore, profile.streak_days);

    const session: Session = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      mode: 'practice',
      topicKey: selectedTopic?.key,
      questionText: currentQuestion.text,
      transcript,
      wordCount: fb.wordCount,
      score: unscored ? null : finalScore,
      xpEarned: xpGain,
      durationSec: elapsed,
      feedback: fb,
      createdAt: new Date().toISOString(),
    };

    const orchestration = orchestrateAttempt({
      session,
      question: currentQuestion,
      feedback: fb,
      avoidanceSignals,
      transcript,
      durationSec: elapsed,
      mode: 'practice',
      topicsUsed: selectedTopic ? [selectedTopic.key] : undefined,
      finalScore,
      streakDays: profile.streak_days,
      totalSessionsBefore: profile.sessions_count,
    });

    track({ name: 'session_completed', props: { mode: 'practice', score: unscored ? null : finalScore, duration_sec: elapsed, xp_gain: orchestration.xpResult.gain, topic_key: selectedTopic?.key } });
    if (fb.engineMeta) {
      track({ name: 'feedback_received', props: { engine: fb.engineMeta.actualEngine, fallback_used: fb.engineMeta.fallbackUsed, score: unscored ? null : finalScore, latency_ms: fb.engineMeta.latencyMs, response_tier: fb.responseTier ?? 2 } });
    }
    for (const id of orchestration.newUnlockedAchievementIds) {
      track({ name: 'achievement_unlocked', props: { achievement_id: id, mode: 'practice', session_count: profile.sessions_count + 1 } });
    }

    dispatch({
      type: 'ADD_SESSION',
      session,
      xpResult: orchestration.xpResult,
      newUnlockedAchievementIds: orchestration.newUnlockedAchievementIds,
      newLevelName: orchestration.newLevelName,
      xpAnimX: 60,
      xpAnimY: 30,
    });
    dispatch({ type: 'UPDATE_SKILL_PROFILE', skillProfile: getSkillProfile() });

    setDrillSkillId(orchestration.drillSkillId);
    setActiveProblem(orchestration.activeProblem);
    setDrillInterventionId(null);
    setShowDrillModal(false);
    setFeedback(fb);
    setIsLoadingFeedback(false);
    setPartialFeedback(null);
    setStreamPhase('complete');

    setActiveSession(prev => {
      if (!prev) return prev;
      const attemptIndex = isRetry ? 2 : 1;
      const attemptScore = unscored ? null : finalScore;
      const attempt = { transcript, score: attemptScore, xpEarned: xpGain, feedback: fb, durationSec: elapsed, attemptIndex };
      const updatedQuestions = [...prev.questions];
      const sq = { ...updatedQuestions[prev.currentIndex] };
      sq.attempts = [...sq.attempts, attempt];
      sq.bestScore = attemptScore === null
        ? sq.bestScore
        : Math.max(sq.bestScore ?? attemptScore, attemptScore);
      updatedQuestions[prev.currentIndex] = sq;
      // An unscored attempt neither extends nor breaks the correct-answer
      // streak — there's no real score to judge it against.
      const newStreak = unscored ? prev.answerStreak : (finalScore >= 7 ? prev.answerStreak + 1 : 0);
      const newBestStreak = Math.max(prev.bestStreak, newStreak);
      return {
        ...prev,
        questions: updatedQuestions,
        xpAccumulated: prev.xpAccumulated + xpGain,
        gemsAccumulated: prev.gemsAccumulated + gemGain,
        answerStreak: newStreak,
        bestStreak: newBestStreak,
      };
    });
  };

  const handleStopRecording = async () => {
    if (!activeSession || !currentQuestion) return;

    // New attempt: abort any previous in-flight stream + pronunciation call
    streamAbortRef.current?.abort();
    pronunciationAbortRef.current?.abort();
    const controller = new AbortController();
    streamAbortRef.current = controller;
    const myAttemptId = ++attemptIdRef.current;

    const transcript = await recording.stop();
    setLearnState('feedback');
    setIsLoadingFeedback(true);
    setPartialFeedback(null);
    setStreamPhase(null);
    setEngineResults(new Map());
    setActiveResultEngine(null);
    setPronunciationStatus('idle');
    setPronunciationResult(null);
    setExaminerStatus('idle');
    setExaminerFeedbackResult(null);

    // Fire Azure pronunciation assessment concurrently — never awaited before
    // rendering feedback. The blob resolves asynchronously inside MediaRecorder's
    // onstop, so audioBlobPromise() (not recording.audioBlob) is the only
    // reliable way to get it for THIS attempt.
    void (async () => {
      const blob = await recording.audioBlobPromise();
      if (!blob || myAttemptId !== attemptIdRef.current) return;

      const pronunciationController = new AbortController();
      pronunciationAbortRef.current = pronunciationController;
      setPronunciationStatus('pending');
      try {
        const result = await assessPronunciation({
          audioBlob: blob,
          targetText: transcript,
          source: 'learn',
        });
        if (myAttemptId !== attemptIdRef.current) return;
        setPronunciationResult(result);
        setPronunciationStatus('done');
      } catch {
        if (myAttemptId !== attemptIdRef.current) return;
        setPronunciationStatus('failed');
      } finally {
        if (myAttemptId === attemptIdRef.current) {
          pronunciationAbortRef.current = null;
        }
      }
    })();

    // Examiner mode: entirely separate from the coach path below — no
    // streaming, no XP/session finalization (there is no score to record),
    // no offline fallback voice. A total failure surfaces the honest error
    // card with a "switch to coach mode" escape hatch.
    if (feedbackMode === 'examiner') {
      setIsLoadingFeedback(false);
      setExaminerStatus('pending');
      try {
        const result = await getExaminerFeedback(transcript, currentQuestion, controller.signal);
        if (myAttemptId !== attemptIdRef.current) return;
        setExaminerFeedbackResult(result);
        setExaminerStatus('done');
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        if (myAttemptId !== attemptIdRef.current) return;
        setExaminerStatus('failed');
      }
      return;
    }

    const elapsed = recording.elapsedTime;
    const skillContext = buildSkillContext();
    const avoidanceSignals = detectAvoidance(transcript, currentQuestion, DIFFICULTY_CONFIG[selectedDifficulty].expectations);

    // Offline is a local, instant evaluation — streamFeedback always calls the
    // network endpoint regardless of enginePreference, so it must never be used
    // for 'offline' (that silently produced a Groq result the first time and
    // required a manual "re-evaluate offline" to get the real offline score).
    if (selectedEngine === 'offline') {
      setIsLoadingFeedback(true);
      setPartialFeedback(null);
      try {
        const fb = await getAIFeedback(transcript, currentQuestion, skillContext, recording.audioBlob ?? undefined, selectedEngine, selectedDifficulty);
        _finalizeAnswer(fb, transcript, elapsed, avoidanceSignals, skillContext);
      } catch (fallbackErr) {
        console.warn('[Learn] offline feedback unavailable:', fallbackErr);
        setIsLoadingFeedback(false);
        setFeedbackErrorMessage('Could not get feedback for that answer. Check your connection and try again.');
        setLearnState('question');
      }
      return;
    }

    const t0 = Date.now();
    let tFirstChunk = 0;
    let tFirstCard = 0;
    let sectionsStreamed = false;

    try {
      await streamFeedback(
        transcript,
        currentQuestion,
        skillContext,
        recording.audioBlob ?? undefined,
        selectedEngine,
        selectedDifficulty,
        controller.signal,
        {
          onStatus: (phase) => {
            setStreamPhase(phase);
            if (!tFirstChunk) tFirstChunk = Date.now();
          },
          onTranscript: () => {
            if (!tFirstChunk) tFirstChunk = Date.now();
          },
          onSection: (_, data) => {
            if (!tFirstChunk) tFirstChunk = Date.now();
            if (!tFirstCard) tFirstCard = Date.now();
            sectionsStreamed = true;
            setIsLoadingFeedback(false);
            setPartialFeedback(data as Partial<FeedbackV2>);
          },
          onComplete: (fb) => {
            const tComplete = Date.now();
            track({
              name: 'feedback_stream_timing',
              props: {
                engine: selectedEngine,
                ttfb_ms: tFirstChunk ? tFirstChunk - t0 : tComplete - t0,
                ttfc_ms: tFirstCard ? tFirstCard - t0 : tComplete - t0,
                total_ms: tComplete - t0,
                sections_streamed: sectionsStreamed,
              },
            });
            _finalizeAnswer(fb, transcript, elapsed, avoidanceSignals, skillContext);
          },
          onError: (msg) => {
            console.warn('[Stream] section error:', msg);
          },
        },
      );
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      // Fallback to non-streaming path
      console.warn('[Stream] falling back to getAIFeedback:', err);
      setIsLoadingFeedback(true);
      setPartialFeedback(null);
      try {
        const fb = await getAIFeedback(transcript, currentQuestion, skillContext, recording.audioBlob ?? undefined, selectedEngine, selectedDifficulty);
        _finalizeAnswer(fb, transcript, elapsed, avoidanceSignals, skillContext);
      } catch (fallbackErr) {
        // E1: total failure — no real feedback exists. Show an honest error and let the
        // candidate retry, rather than inventing a score that flows into XP/achievements/
        // the coach loop as if it were a real assessment.
        console.warn('[Learn] feedback unavailable:', fallbackErr);
        setIsLoadingFeedback(false);
        setFeedbackErrorMessage('Could not get feedback for that answer. Check your connection and try again.');
        setLearnState('question');
      }
    }
  };

  // ── Re-evaluate with a different engine (reuses saved transcript) ─────────────

  const handleReEvaluate = useCallback(async (engine: AIEngine) => {
    if (!currentQuestion) return;

    // Cache hit — instant switch, no API call
    const cached = engineResults.get(engine);
    if (cached) {
      setFeedback(cached.feedback);
      setActiveResultEngine(engine);
      return;
    }

    // Block duplicate in-flight requests
    if (isReEvaluating) return;

    const transcript = recording.transcript;
    if (!transcript) return;

    setIsReEvaluating(true);
    setReEvaluatingEngine(engine);

    try {
      const skillContext = buildSkillContext();
      const fb = await getAIFeedback(transcript, currentQuestion, skillContext, undefined, engine, selectedDifficulty);

      const meta = fb.engineMeta ?? {
        requestedEngine: engine,
        actualEngine: engine,
        fallbackUsed: false,
        latencyMs: 0,
        evaluatedAt: new Date().toISOString(),
      };
      const actualEngine = meta.actualEngine;
      const result: EngineResult = { engine: actualEngine, feedback: fb, meta };

      setEngineResults(prev => new Map(prev).set(actualEngine, result));
      setActiveResultEngine(actualEngine);
      setFeedback(fb);
    } finally {
      setIsReEvaluating(false);
      setReEvaluatingEngine(null);
    }
  }, [currentQuestion, engineResults, isReEvaluating, recording.transcript]);

  const handleSwitchEngine = useCallback((engine: AIEngine) => {
    const cached = engineResults.get(engine);
    if (cached) {
      setFeedback(cached.feedback);
      setActiveResultEngine(engine);
    }
  }, [engineResults]);

  // ── Recovery drill (intervention loop) ────────────────────────────────────────

  const openDrill = () => {
    if (activeProblem) {
      const intervention = recordIntervention({
        problemId: activeProblem.id,
        nodeId: activeProblem.nodeId,
        deliveredInSessionId: activeSession?.id,
      });
      setDrillInterventionId(intervention.id);
    }
    setShowDrillModal(true);
  };

  const handleDrillComplete = (result: { correct: number; total: number; immediateSuccess: number }) => {
    if (activeProblem && drillInterventionId) {
      recordInterventionOutcome({
        interventionId: drillInterventionId,
        problemId: activeProblem.id,
        nodeId: activeProblem.nodeId,
        correct: result.correct,
        total: result.total,
        immediateSuccess: result.immediateSuccess,
      });
      // Refresh the coach's recommendation + daily plan from the updated problem
      // status so the next Home/Learn surface reflects the drill outcome.
      generateRecommendation();
      invalidateDailyPlan();
    }
  };

  // ── Advance to next question or end session ───────────────────────────────────

  const advanceQuestion = () => {
    if (!activeSession) return;

    const updatedQuestions = [...activeSession.questions];
    updatedQuestions[activeSession.currentIndex] = {
      ...updatedQuestions[activeSession.currentIndex],
      status: 'completed',
    };

    const newCompleted = activeSession.questionsCompleted + 1;
    const newIndex = activeSession.currentIndex + 1;
    const isLast = newIndex >= activeSession.targetCount;

    const updatedSession: ActiveSession = {
      ...activeSession,
      questions: updatedQuestions,
      currentIndex: newIndex,
      questionsCompleted: newCompleted,
    };

    setActiveSession(updatedSession);
    dispatch({ type: 'UPDATE_ACTIVE_SESSION', session: updatedSession });

    setFeedback(null);
    setDrillSkillId(null);
    setActiveProblem(null);
    setDrillInterventionId(null);
    setShowDrillModal(false);
    setShowHint(false);
    setIsRetry(false);
    // Clear evaluation cache for the next question
    setEngineResults(new Map());
    setActiveResultEngine(null);
    setExaminerStatus('idle');
    setExaminerFeedbackResult(null);

    const streak = updatedSession.answerStreak;
    if (streak === 3 || streak === 5) {
      setShowStreakToast(true);
    }

    if (newCompleted === Math.floor(activeSession.targetCount / 2) && activeSession.targetCount >= 4) {
      setShowMidToast(true);
    }

    if (isLast) {
      endSession(updatedSession);
    } else {
      setLearnState('question');
    }
  };

  const endSession = (session: ActiveSession) => {
    if (!selectedTopic) return;

    dispatch({ type: 'END_SESSION' });

    const completedQs = session.questions.filter(q => q.status === 'completed');
    const newAnsweredIds = completedQs.map(q => q.question.id);
    const existing = topicMastery[selectedTopic.key];
    const allAnswered = Array.from(new Set([...(existing?.uniqueQuestionsAnswered ?? []), ...newAnsweredIds]));
    // null when every question this session was unscored (offline) — a
    // session with no real scores must not fold a phantom 0 into the running
    // topic average or nudge the mastery threshold.
    const avgScore = averageRealScores(completedQs.map(q => q.bestScore));

    const priorAvg = existing?.averageScore ?? avgScore ?? 0;
    // Weight by scoredSessionsCompleted, not sessionsCompleted — a fully-
    // unscored (offline) session must not dilute the running average's
    // denominator (A6). Falls back to sessionsCompleted for entries written
    // before this field existed.
    const priorScoredSessions = existing?.scoredSessionsCompleted ?? existing?.sessionsCompleted ?? 0;
    const newAvg = avgScore === null
      ? priorAvg
      : priorScoredSessions > 0
      ? (priorAvg * priorScoredSessions + avgScore) / (priorScoredSessions + 1)
      : avgScore;

    const wasMastered = existing?.mastered ?? false;
    const nowMastered = !wasMastered && newAvg >= 7.5 && allAnswered.length >= 10;

    const entry = {
      topicKey: selectedTopic.key,
      sessionsCompleted: (existing?.sessionsCompleted ?? 0) + 1,
      scoredSessionsCompleted: priorScoredSessions + (avgScore === null ? 0 : 1),
      uniqueQuestionsAnswered: allAnswered,
      averageScore: newAvg,
      lastSessionAt: new Date().toISOString(),
      mastered: wasMastered || nowMastered,
      masteredAt: nowMastered ? new Date().toISOString() : existing?.masteredAt,
      badge: (wasMastered || nowMastered) ? ('gold' as const) : undefined,
    };

    updateTopicMastery(entry);
    dispatch({ type: 'UPDATE_TOPIC_MASTERY', entry, justMastered: nowMastered });

    setLearnState('session_summary');
  };

  const handleEndSessionEarly = () => {
    if (activeSession) {
      endSession(activeSession);
    }
  };

  const handleRetry = () => {
    setIsRetry(true);
    setFeedback(null);
    setDrillSkillId(null);
    setActiveProblem(null);
    setDrillInterventionId(null);
    setShowDrillModal(false);
    setShowHint(false);
    setEngineResults(new Map());
    setActiveResultEngine(null);
    setExaminerStatus('idle');
    setExaminerFeedbackResult(null);
    recording.stop();
    setLearnState('question');
  };

  const handleSwitchToCoachMode = () => {
    setFeedbackMode('coach');
    handleRetry();
  };

  const handleContinueTopic = () => {
    if (selectedTopic) {
      setActiveSession(null);
      setLearnState('session_start');
    }
  };

  const handleNewTopic = () => {
    setActiveSession(null);
    setSelectedTopic(null);
    setLearnState('topics');
  };

  const handleHome = () => {
    setActiveSession(null);
    setSelectedTopic(null);
    setLearnState('topics');
  };

  const handleBack = () => {
    if (learnState === 'session_start') {
      setSelectedTopic(null);
      setLearnState('topics');
    } else if (learnState === 'question' || learnState === 'recording') {
      if (activeSession && activeSession.questionsCompleted > 0) {
        handleEndSessionEarly();
      } else {
        setActiveSession(null);
        setLearnState('topics');
      }
    } else {
      setActiveSession(null);
      setLearnState('topics');
    }
  };

  const topicData = selectedTopic ? TOPICS.find(t => t.key === selectedTopic.key) ?? selectedTopic : null;
  const midAvg = activeSession && activeSession.questionsCompleted > 0
    ? averageRealScores(
        activeSession.questions
          .filter(q => q.status === 'completed')
          .map(q => q.bestScore),
      )
    : null;

  return (
    <div className="flex flex-col min-h-screen">
      <TopContextBar
        title={learnState === 'topics' ? 'Learning Hub' : (selectedTopic?.label ?? 'Practice')}
        subtitle={learnState === 'topics' ? 'Choose a topic to begin' : 'Active Session'}
        showBack={learnState !== 'topics'}
        onBack={handleBack}
      />

      {/* Mid-session toasts */}
      <MidSessionToast
        show={showMidToast}
        questionsCompleted={activeSession?.questionsCompleted ?? 0}
        targetCount={activeSession?.targetCount ?? 0}
        avgScore={midAvg}
        onDismiss={() => setShowMidToast(false)}
      />
      <StreakToast
        show={showStreakToast}
        streak={activeSession?.answerStreak ?? 0}
        onDismiss={() => setShowStreakToast(false)}
      />

      {/* E1: honest feedback-failure toast — no fabricated score behind it */}
      <AnimatePresence>
        {feedbackErrorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 right-4 z-50 max-w-xs w-full"
          >
            <div className="rounded-2xl glass-elevated border border-red-400/20 p-4 shadow-xl">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-red-300">Feedback unavailable</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{feedbackErrorMessage}</p>
                </div>
                <button
                  onClick={() => setFeedbackErrorMessage(null)}
                  className="flex-shrink-0 p-1 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-6 py-6 md:py-8">
        <AnimatePresence mode="wait">

          {learnState === 'topics' && (
            <motion.div key="topics" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <TopicGrid onSelect={selectTopic} selectedDifficulty={selectedDifficulty} />
            </motion.div>
          )}

          {learnState === 'session_start' && selectedTopic && (
            <motion.div key="session_start" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <SessionStartScreen
                topic={selectedTopic}
                topicMastery={topicMastery[selectedTopic.key] ?? null}
                selectedEngine={selectedEngine}
                onEngineChange={handleEngineChange}
                selectedDifficulty={selectedDifficulty}
                onDifficultyChange={(tier) => dispatch({ type: 'SET_DIFFICULTY', tier })}
                onStart={startSession}
                onSingleQuestion={startSingleQuestion}
                onBack={() => { setSelectedTopic(null); setLearnState('topics'); }}
                coachRecommendation={getActiveRecommendation()}
              />
            </motion.div>
          )}

          {(learnState === 'question' || learnState === 'recording' || learnState === 'feedback') && activeSession && (
            <motion.div
              key="practice"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Progress bar */}
              {activeSession.targetCount > 1 && topicData && (
                <SessionProgressBar
                  session={activeSession}
                  topicLabel={topicData.label}
                  topicIcon={topicData.icon}
                  selectedEngine={selectedEngine}
                  isEvaluating={isLoadingFeedback || isReEvaluating}
                  onEngineSwitch={handleEngineChange}
                  onEndSession={handleEndSessionEarly}
                />
              )}

              {currentQuestion && (
                <QuestionCard
                  question={currentQuestion}
                  showHint={showHint}
                  onToggleHint={() => setShowHint(!showHint)}
                />
              )}

              {(learnState === 'question' || learnState === 'recording') && (
                <div className="flex items-center justify-center gap-1.5 -mb-1">
                  {(['coach', 'examiner'] as const).map((mode) => {
                    const disabled = isLoadingFeedback || recording.isRecording;
                    const active = feedbackMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        disabled={disabled}
                        onClick={() => !disabled && setFeedbackMode(mode)}
                        title={mode === 'examiner' ? 'Cambridge examiner-style commentary — no marks' : 'Free-form coaching feedback'}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-colors ${
                          active
                            ? mode === 'examiner'
                              ? 'border-amber-400/50 text-amber-300 bg-amber-400/10'
                              : 'border-violet-400/50 text-violet-300 bg-violet-400/10'
                            : 'border-transparent text-slate-500 hover:text-slate-300'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {mode === 'examiner' ? 'Examiner voice' : 'Coach voice'}
                      </button>
                    );
                  })}
                </div>
              )}

              <RecordingPanel
                isActive={learnState === 'question' || learnState === 'recording'}
                recording={recording}
                onStop={handleStopRecording}
              />

              {learnState === 'feedback' && drillSkillId && !showDrillModal && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl glass-elevated border-rose-500/25 space-y-3"
                >
                  <p className="text-sm text-white font-semibold leading-snug">
                    You&apos;ve struggled with {getSkillLabel(drillSkillId)} a few times recently.
                  </p>
                  <p className="text-xs text-slate-400">
                    A quick recovery drill can lock in the pattern before you move on.
                  </p>
                  <button
                    type="button"
                    onClick={openDrill}
                    className="w-full py-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold text-sm hover:bg-rose-500/25 transition-colors"
                  >
                    Start recovery drill
                  </button>
                </motion.div>
              )}

              {learnState === 'feedback' && feedbackMode === 'examiner' && (
                <div className="space-y-3">
                  <ExaminerFeedbackCard
                    status={examinerStatus === 'idle' ? 'pending' : examinerStatus}
                    result={examinerFeedbackResult}
                    onSwitchToCoach={handleSwitchToCoachMode}
                    onRetry={handleRetry}
                  />
                  {examinerStatus === 'done' && (
                    <button
                      type="button"
                      onClick={advanceQuestion}
                      className="w-full py-3 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 font-bold text-sm hover:bg-violet-500/25 transition-colors"
                    >
                      Continue
                    </button>
                  )}
                </div>
              )}

              {learnState === 'feedback' && feedbackMode === 'coach' && (
                <FeedbackExperience
                  feedback={feedback}
                  isLoading={isLoadingFeedback}
                  partialFeedback={partialFeedback}
                  streamPhase={streamPhase}
                  transcript={recording.transcript}
                  modelAnswer={currentQuestion?.modelAnswer}
                  engineResults={engineResults}
                  activeEngine={activeResultEngine}
                  isReEvaluating={isReEvaluating}
                  reEvaluatingEngine={reEvaluatingEngine}
                  onRetry={handleRetry}
                  onComplete={advanceQuestion}
                  onReEvaluate={handleReEvaluate}
                  onSwitchEngine={handleSwitchEngine}
                  pronunciationResult={pronunciationResult}
                  pronunciationStatus={pronunciationStatus}
                />
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showDrillModal && drillSkillId && (
          <MicroDrillModal
            skillId={drillSkillId}
            onClose={() => setShowDrillModal(false)}
            onComplete={handleDrillComplete}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {learnState === 'session_summary' && activeSession && selectedTopic && (
          <SessionSummary
            session={activeSession}
            currentSkillProfile={state.skillProfile}
            topicLabel={selectedTopic.label}
            topicIcon={selectedTopic.icon}
            topicMastery={topicMastery[selectedTopic.key] ?? null}
            onContinueTopic={handleContinueTopic}
            onNewTopic={handleNewTopic}
            onHome={handleHome}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
