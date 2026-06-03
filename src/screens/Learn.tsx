import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { TOPICS } from '../data/gameData';
import { useItem, awardXP, checkAchievements, getProgressionState } from '../services/progression/progressionService';
import { recordSession as persistSession } from '../services/analytics/analyticsService';
import { getAIFeedback } from '../services/api/apiClient';
import { getSkillProfile, buildSkillContext, detectAvoidance, runAfterSession } from '../services/coaching/diagnosticEngine';
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
import { FailoverToast } from './learn/FailoverToast';
import { buildSessionQuestions, makeSessionQuestion, SESSION_TARGET } from '../utils/sessionBuilder';
import { DIFFICULTY_CONFIG } from '../utils/difficultyConfig';
import { updateTopicMastery } from '../services/analytics/analyticsService';
import { computeXPGain } from '../domain/xp';
import type { Topic, Session, FeedbackV2, ActiveSession, SessionMode, SessionQuestion, AIEngine, EngineResult } from '../types/index';

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
  // Per-question evaluation cache: Map<AIEngine, EngineResult>
  const [engineResults, setEngineResults] = useState<Map<AIEngine, EngineResult>>(new Map());
  const [activeResultEngine, setActiveResultEngine] = useState<AIEngine | null>(null);
  const [isReEvaluating, setIsReEvaluating] = useState(false);
  const [reEvaluatingEngine, setReEvaluatingEngine] = useState<AIEngine | null>(null);
  // Failover toast
  const [showFailoverToast, setShowFailoverToast] = useState(false);
  const [failoverInfo, setFailoverInfo] = useState<{ requested: AIEngine; actual: AIEngine; reason?: string } | null>(null);

  const recording = useRecording();

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

    const questions = buildSessionQuestions(
      selectedTopic.key,
      mode,
      skillProfile,
      topicMastery[selectedTopic.key] ?? null,
      selectedDifficulty,
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

  const startSingleQuestion = () => startSession('quick');

  // ── Recording + evaluation ────────────────────────────────────────────────────

  const handleStopRecording = async () => {
    if (!activeSession || !currentQuestion) return;

    const transcript = await recording.stop();
    setLearnState('feedback');
    setIsLoadingFeedback(true);
    // Clear stale cache when a new recording is made
    setEngineResults(new Map());
    setActiveResultEngine(null);
    setShowFailoverToast(false);

    const elapsed = recording.elapsedTime;
    const skillContext = buildSkillContext();
    const avoidanceSignals = detectAvoidance(transcript, currentQuestion, DIFFICULTY_CONFIG[selectedDifficulty].expectations);

    let fb: FeedbackV2;
    try {
      fb = await getAIFeedback(transcript, currentQuestion, skillContext, recording.audioBlob ?? undefined, selectedEngine, selectedDifficulty);
      if (avoidanceSignals.length > 0 && !fb.avoidanceReport?.length) {
        fb = { ...fb, avoidanceReport: avoidanceSignals, skillContextUsed: true };
      } else if (skillContext.sessionsAnalyzed > 0) {
        fb = { ...fb, skillContextUsed: true };
      }
    } catch {
      fb = {
        scores: { overall: 5, communication: 5, language: 5, fluency: 5 },
        grammar: { critical: [], polish: [] },
        vocabulary: [], style: [], fillers: [],
        wordCount: transcript.split(/\s+/).filter(Boolean).length,
        cefrLevel: 'A2',
        avoidanceReport: avoidanceSignals,
      };
    }

    // Detect failover and show toast
    const meta = fb.engineMeta;
    if (meta?.fallbackUsed && meta.actualEngine !== meta.requestedEngine) {
      setFailoverInfo({ requested: meta.requestedEngine, actual: meta.actualEngine, reason: meta.failoverReason });
      setShowFailoverToast(true);
    }

    // Store in cache using the actual engine that ran
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

    let finalScore = fb.scores.overall;
    let usedShield = false;

    if (finalScore < 8.5 && (profile.inventory['perfect_shield'] || 0) > 0) {
      finalScore = Math.max(8.5, finalScore + 2);
      usedShield = true;
      if (useItem('perfect_shield')) {
        dispatch({ type: 'USE_ITEM', itemId: 'perfect_shield' });
      }
    }

    if (usedShield) { /* shield used — score boosted */ }

    const { gain: xpGain, gemsGain: gemGain } = computeXPGain(finalScore, profile.streak_days);

    const session: Session = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      mode: 'practice',
      topicKey: selectedTopic?.key,
      questionText: currentQuestion.text,
      transcript,
      wordCount: fb.wordCount,
      score: finalScore,
      xpEarned: xpGain,
      durationSec: elapsed,
      feedback: fb,
      createdAt: new Date().toISOString(),
    };

    // Orchestrate side effects before dispatch so the reducer stays pure
    persistSession(session);
    const xpResult = awardXP(finalScore, profile.streak_days);
    const { level: newLevel } = getProgressionState();
    const newUnlockedAchievementIds = checkAchievements({
      score: finalScore,
      mode: 'practice',
      totalSessions: profile.sessions_count + 1,
      topicsUsed: selectedTopic ? [selectedTopic.key] : undefined,
    });
    runAfterSession(fb, avoidanceSignals);

    dispatch({ type: 'ADD_SESSION', session, xpResult, newUnlockedAchievementIds, newLevelName: newLevel.name, xpAnimX: 60, xpAnimY: 30 });
    dispatch({ type: 'UPDATE_SKILL_PROFILE', skillProfile: getSkillProfile() });

    setFeedback(fb);
    setIsLoadingFeedback(false);

    setActiveSession(prev => {
      if (!prev) return prev;
      const attemptIndex = isRetry ? 2 : 1;
      const attempt = { transcript, score: finalScore, xpEarned: xpGain, feedback: fb, durationSec: elapsed, attemptIndex };
      const updatedQuestions = [...prev.questions];
      const sq = { ...updatedQuestions[prev.currentIndex] };
      sq.attempts = [...sq.attempts, attempt];
      sq.bestScore = Math.max(sq.bestScore, finalScore);
      updatedQuestions[prev.currentIndex] = sq;

      const newStreak = finalScore >= 7 ? prev.answerStreak + 1 : 0;
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

      // Show failover toast if needed
      if (meta.fallbackUsed && actualEngine !== engine) {
        setFailoverInfo({ requested: engine, actual: actualEngine, reason: meta.failoverReason });
        setShowFailoverToast(true);
      }
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
    setShowHint(false);
    setIsRetry(false);
    // Clear evaluation cache for the next question
    setEngineResults(new Map());
    setActiveResultEngine(null);
    setShowFailoverToast(false);

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
    const avgScore = completedQs.length > 0
      ? completedQs.reduce((a, q) => a + q.bestScore, 0) / completedQs.length
      : 0;

    const priorAvg = existing?.averageScore ?? avgScore;
    const priorSessions = existing?.sessionsCompleted ?? 0;
    const newAvg = priorSessions > 0
      ? (priorAvg * priorSessions + avgScore) / (priorSessions + 1)
      : avgScore;

    const wasMastered = existing?.mastered ?? false;
    const nowMastered = !wasMastered && newAvg >= 7.5 && allAnswered.length >= 10;

    const entry = {
      topicKey: selectedTopic.key,
      sessionsCompleted: (existing?.sessionsCompleted ?? 0) + 1,
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
    setShowHint(false);
    setEngineResults(new Map());
    setActiveResultEngine(null);
    setShowFailoverToast(false);
    recording.stop();
    setLearnState('question');
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
    ? activeSession.questions
        .filter(q => q.status === 'completed')
        .reduce((a, q) => a + q.bestScore, 0) / activeSession.questionsCompleted
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

      {/* Failover toast */}
      {failoverInfo && (
        <FailoverToast
          show={showFailoverToast}
          requestedEngine={failoverInfo.requested}
          actualEngine={failoverInfo.actual}
          reason={failoverInfo.reason}
          onDismiss={() => setShowFailoverToast(false)}
        />
      )}

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

              <RecordingPanel
                isActive={learnState === 'question' || learnState === 'recording'}
                recording={recording}
                onStop={handleStopRecording}
              />

              {learnState === 'feedback' && (
                <FeedbackExperience
                  feedback={feedback}
                  isLoading={isLoadingFeedback}
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
                />
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

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
