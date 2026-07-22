import { useEffect, useRef, useState } from 'react';
import { track } from '../services/telemetry/telemetryService';
import confetti from 'canvas-confetti';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getSkillProfile } from '../services/coaching/diagnosticEngine';
import { checkAchievements, getProgressionState, awardParticipationXP } from '../services/progression/progressionService';
import { recordSession as persistSession } from '../services/analytics/analyticsService';
import { buildAchievementContext } from '../services/coach/achievementContextBuilder';
import type { Session } from '../types/index';
import { useRecording } from '../features/recording/useRecording';
import { useSessionClock } from '../features/recording/useSessionClock';
import { useElapsedClock } from '../features/recording/useElapsedClock';
import { ExamIntro } from './exam/ExamIntro';
import { ExamResults } from './exam/ExamResults';
import { ExamRunner } from './exam/ExamRunner';
import { TranscriptReview } from './exam/TranscriptReview';
import { SimulationSession } from '../services/exam/simulationSession';
import { saveConductLog } from '../services/exam/conductLogStore';
import { saveStoredTranscript } from '../services/exam/localTranscriptStore';
import { isExaminerVoiceMuted, setExaminerVoiceMuted, stopExaminerVoice, speakExaminerText } from '../services/exam/examinerVoice';
import { wait, PRE_SPEECH_LEAD_MS, PRE_LISTEN_PAUSE_MS } from '../services/exam/examinerPacing';
import { pingScoringServiceHealth, scoreExamTranscript, ScoringApiError } from '../services/exam/scoringApiClient';
import { pingInterpretServiceHealth } from '../services/exam/interpretUtterance';
import { getOriginalQuestionSet, getAuthoredQuestionSet, listPublishedQuestionSetIds } from '../data/exam/bank/loader';
import type { ExaminerAction } from '../domain/igcse/session/types';
import type { SessionTranscript } from '../domain/igcse/stt/types';
import type { EnvelopeView } from '../domain/igcse/envelope/envelopeView';
import type { AuthoredQuestionSet, RolePlayScenario } from '../data/exam/bank/types';
import { ExamGreeting } from './exam/ExamGreeting';
import { ExamSelect } from './exam/ExamSelect';
import { RolePlayCardPreview } from './exam/RolePlayCardPreview';

type ExamState = 'select' | 'intro' | 'greeting' | 'card' | 'running' | 'review' | 'scoring' | 'results';

interface RolePlayMeta {
  title: string;
  taskIds: string[];
}

/** A8: exam duration (10-15 min) only marginally exceeds Render free tier's ~15 min idle window — the keepalive is what guarantees warmth by the time scoring is needed. */
const KEEPALIVE_INTERVAL_MS = 5 * 60 * 1000;

const GREETING_TEXT = 'Bonjour ! Comment ça va ? Es-tu prêt ? On va commencer.';

export function ExamMode() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [examState, setExamState] = useState<ExamState>('select');
  const [action, setAction] = useState<ExaminerAction | null>(null);
  const [voiceMuted, setVoiceMuted] = useState(isExaminerVoiceMuted());
  const [transcript, setTranscript] = useState<SessionTranscript | null>(null);
  const [pendingSilentSkip, setPendingSilentSkip] = useState(false);
  const [scoringError, setScoringError] = useState<string | null>(null);
  const [envelopeView, setEnvelopeView] = useState<EnvelopeView | null>(null);
  const [rolePlayScenario, setRolePlayScenario] = useState<RolePlayScenario | undefined>(undefined);
  const [rolePlayMeta, setRolePlayMeta] = useState<RolePlayMeta | undefined>(undefined);

  const recording = useRecording();
  const clock = useSessionClock();
  const totalClock = useElapsedClock();
  const sessionRef = useRef<SimulationSession | null>(null);
  const sessionIdRef = useRef<string>('');
  const turnStartRef = useRef<number>(0);
  const selectedQuestionSetIdRef = useRef<string | undefined>(undefined);
  const selectedAuthoredSetRef = useRef<AuthoredQuestionSet | undefined>(undefined);
  const turnBusyRef = useRef(false);

  // A8: keepalive ping while the exam runs, so the scoring service stays warm
  // through the ~15 min Render free-tier idle window until scoring is needed.
  useEffect(() => {
    if (examState !== 'running') return;
    const interval = setInterval(pingScoringServiceHealth, KEEPALIVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [examState]);

  const enterGreeting = () => {
    setExamState('greeting');
    void (async () => {
      await wait(PRE_SPEECH_LEAD_MS);
      await speakExaminerText(GREETING_TEXT);
    })();
  };

  const enterCardPreview = async () => {
    let scenario: RolePlayScenario | undefined = selectedAuthoredSetRef.current?.content.rolePlay;

    if (!scenario) {
      const publishedIds = await listPublishedQuestionSetIds();
      const fallbackId = publishedIds.length > 0
        ? publishedIds[Math.floor(Math.random() * publishedIds.length)]
        : 'original-practice-001';

      selectedQuestionSetIdRef.current = fallbackId;
      const authoredSet = await getAuthoredQuestionSet(fallbackId);
      scenario = authoredSet?.content.rolePlay;
    }

    if (!scenario) {
      throw new Error('ExamMode: role play card could not be resolved (backend and offline fixture both failed)');
    }

    setRolePlayScenario(scenario);
    setExamState('card');
  };

  const startExam = async () => {
    const questionSetId = selectedQuestionSetIdRef.current;
    // A8: the exam itself is the warm-up window — ping now, invisibly, so the
    // service is awake well before the candidate finishes and scoring is requested.
    pingScoringServiceHealth();
    // Change D: warm the understanding-only interpret endpoint the same way, so the
    // first turn's routing round-trip doesn't pay a cold start (falls back deterministically if it does).
    pingInterpretServiceHealth();

    // Discard the greeting's reply entirely — abort any in-progress recognizer
    // so it never overlaps with the first real turn's recording.
    if (recording.isRecording) {
      await recording.stop();
    }

    const sessionId = `exam-sim-${Date.now()}`;
    sessionIdRef.current = sessionId;
    clock.start();
    totalClock.start();

    const questionSet = questionSetId ? await getOriginalQuestionSet(questionSetId) : undefined;

    if (!questionSet) {
      throw new Error(`ExamMode: question set "${questionSetId ?? '(none)'}" could not be resolved (backend and offline fixture both failed)`);
    }

    if (rolePlayScenario) {
      setRolePlayMeta({
        title: rolePlayScenario.title,
        taskIds: rolePlayScenario.tasks.map((t) => t.questionId),
      });
    }
    setRolePlayScenario(undefined);

    const session = new SimulationSession(sessionId, questionSet, clock.nowS, {
      onExaminerAction: (a) => setAction(a),
    });
    sessionRef.current = session;
    setExamState('running');

    const firstAction = await session.begin();
    setAction(firstAction);
    await wait(PRE_LISTEN_PAUSE_MS);
    turnStartRef.current = clock.nowS();
    recording.start();
  };

  const handleSubmitTurn = async () => {
    const session = sessionRef.current;
    if (!session || turnBusyRef.current) return;
    turnBusyRef.current = true;

    try {
      const responseDurationS = Math.max(clock.nowS() - turnStartRef.current, 0.1);
      const transcriptText = await recording.stop();

      if (transcriptText.trim().length === 0) {
        // Don't auto-forward an empty submit as an intentional non-answer — could be an
        // accidental instant Stop & Submit. Ask the candidate to confirm before it drives
        // the reducer's no_response path.
        setPendingSilentSkip(true);
        return;
      }

      const nextAction = await session.submitTurn({
        transcript: transcriptText,
        responseDurationS,
        requestedRepeat: false,
      });
      setAction(nextAction);

      if (session.isComplete) {
        await finishSession(session);
        return;
      }

      await wait(PRE_LISTEN_PAUSE_MS);
      turnStartRef.current = clock.nowS();
      recording.start();
    } finally {
      turnBusyRef.current = false;
    }
  };

  const handleKeepTrying = () => {
    if (turnBusyRef.current) return;
    setPendingSilentSkip(false);
    turnStartRef.current = clock.nowS();
    recording.start();
  };

  const handleSkipQuestion = async () => {
    const session = sessionRef.current;
    if (!session || turnBusyRef.current) return;
    turnBusyRef.current = true;
    setPendingSilentSkip(false);

    try {
      const responseDurationS = Math.max(clock.nowS() - turnStartRef.current, 0.1);
      const nextAction = await session.submitTurn({
        transcript: '',
        responseDurationS,
        requestedRepeat: false,
      });
      setAction(nextAction);

      if (session.isComplete) {
        await finishSession(session);
        return;
      }

      await wait(PRE_LISTEN_PAUSE_MS);
      turnStartRef.current = clock.nowS();
      recording.start();
    } finally {
      turnBusyRef.current = false;
    }
  };

  const handleRequestRepeat = async () => {
    const session = sessionRef.current;
    if (!session || turnBusyRef.current) return;
    turnBusyRef.current = true;

    try {
      const nextAction = await session.submitTurn({
        transcript: '',
        responseDurationS: 0.1,
        requestedRepeat: true,
      });
      setAction(nextAction);

      if (session.isComplete) {
        await finishSession(session);
        return;
      }

      await wait(PRE_LISTEN_PAUSE_MS);
      turnStartRef.current = clock.nowS();
      recording.start();
    } finally {
      turnBusyRef.current = false;
    }
  };

  const finishSession = async (session: SimulationSession) => {
    totalClock.stop();
    stopExaminerVoice();
    saveConductLog(session.getConductLog());
    const built = await session.buildTranscript();
    setTranscript(built);
    setExamState('review');
  };

  const handleReviewConfirm = (finalTranscript: SessionTranscript) => {
    saveStoredTranscript(finalTranscript);
    setTranscript(finalTranscript);
    setExamState('scoring');
    setScoringError(null);
    void runScoring(finalTranscript);
  };

  const runScoring = async (finalTranscript: SessionTranscript) => {
    let view: EnvelopeView | null = null;
    try {
      view = await scoreExamTranscript(finalTranscript);
    } catch (err) {
      const message = err instanceof ScoringApiError ? err.message : 'Scoring failed unexpectedly.';
      setScoringError(message);
      setExamState('results');
      return;
    }
    finishWithScore(finalTranscript, view);
  };

  /** C1/A9: Retry hits the idempotency fast path server-side — a prior timed-out request keeps scoring and persists, so this is typically instant. */
  const retryScoring = () => {
    if (!transcript) return;
    setExamState('scoring');
    setScoringError(null);
    void runScoring(transcript);
  };

  const finishWithScore = (finalTranscript: SessionTranscript, view: EnvelopeView | null) => {
    setEnvelopeView(view);
    setExamState('results');

    const candidateUtterances = finalTranscript.utterances.filter((u) => u.role === 'candidate');
    const totalSec = candidateUtterances.reduce((sum, u) => sum + (u.endS - u.startS), 0);
    const wordCount = candidateUtterances.reduce((sum, u) => sum + u.text.trim().split(/\s+/).filter(Boolean).length, 0);

    // D4: real Cambridge total (/40) when scoring succeeded, rescaled to the app's existing /10
    // Session.score convention (same convention roadmapService.ts already assumes for exam sessions);
    // null when scoring failed — never a fabricated placeholder.
    const finalScore = view ? Math.round((view.total / 40) * 10 * 10) / 10 : null;

    const appSession: Session = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      mode: 'exam',
      wordCount,
      score: finalScore,
      xpEarned: 0,
      durationSec: Math.round(totalSec),
      createdAt: new Date().toISOString(),
    };

    persistSession(appSession);
    // D5: participation XP either way — score-derived XP would need calibration-backed
    // meaning behind a /40 Cambridge total that S6 hasn't established yet (see the
    // "Unvalidated estimate" framing in ExamResults).
    const xpResult = awardParticipationXP(state.profile.streak_days);
    const { level: newLevel } = getProgressionState();
    const newUnlockedAchievementIds = checkAchievements(
      buildAchievementContext({
        finalScore,
        streakDays: state.profile.streak_days,
        totalSessionsAfter: state.profile.sessions_count + 1,
        topicsUsed: [],
        beliefSnapshot: null,
        examCompleted: true,
        examType: 'igcse',
      }),
    );

    track({ name: 'session_completed', props: { mode: 'exam', score: finalScore, duration_sec: totalSec, xp_gain: xpResult.gain } });
    for (const id of newUnlockedAchievementIds) {
      track({ name: 'achievement_unlocked', props: { achievement_id: id, mode: 'exam', session_count: state.profile.sessions_count + 1 } });
    }

    dispatch({ type: 'ADD_SESSION', session: { ...appSession, xpEarned: xpResult.gain }, xpResult, newUnlockedAchievementIds, newLevelName: newLevel.name, xpAnimX: 70, xpAnimY: 20 });
    dispatch({ type: 'UPDATE_SKILL_PROFILE', skillProfile: getSkillProfile() });
    if (finalScore !== null) {
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
    }
  };

  const toggleVoice = () => {
    const next = !voiceMuted;
    setExaminerVoiceMuted(next);
    setVoiceMuted(next);
  };

  if (examState === 'select') {
    return (
      <ExamSelect
        onSelect={(set) => {
          selectedQuestionSetIdRef.current = set.questionSetId;
          selectedAuthoredSetRef.current = set;
          setExamState('intro');
        }}
        onAutoFallback={() => {
          selectedQuestionSetIdRef.current = undefined;
          selectedAuthoredSetRef.current = undefined;
          setExamState('intro');
        }}
      />
    );
  }

  if (examState === 'intro') return <ExamIntro onStart={enterGreeting} onBack={() => navigate('/')} />;

  if (examState === 'greeting') {
    return <ExamGreeting recording={recording} onContinue={() => void enterCardPreview()} />;
  }

  if (examState === 'card' && rolePlayScenario) {
    return <RolePlayCardPreview scenario={rolePlayScenario} onBegin={() => void startExam()} />;
  }

  if (examState === 'review' && transcript) {
    return <TranscriptReview transcript={transcript} onConfirm={handleReviewConfirm} />;
  }

  if (examState === 'scoring') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-3 max-w-xs">
          <div className="w-10 h-10 mx-auto border-2 border-violet-electric/30 border-t-violet-electric rounded-full animate-spin" />
          <p className="text-sm font-bold text-white">Scoring your session…</p>
          <p className="text-[11px] text-slate-500">This can take up to a minute.</p>
        </div>
      </div>
    );
  }

  if (examState === 'results' && transcript) {
    return (
      <ExamResults
        transcript={transcript}
        envelopeView={envelopeView}
        scoringError={scoringError}
        onRetryScoring={retryScoring}
        onRetake={() => {
          selectedQuestionSetIdRef.current = undefined;
          selectedAuthoredSetRef.current = undefined;
          setRolePlayScenario(undefined);
          setRolePlayMeta(undefined);
          setExamState('select');
        }}
        onHome={() => navigate('/')}
      />
    );
  }

  const taskProgress = rolePlayMeta && action
    ? (() => {
        const index = rolePlayMeta.taskIds.indexOf(action.questionId ?? '');
        return index >= 0 ? { index, total: rolePlayMeta.taskIds.length } : undefined;
      })()
    : undefined;

  return (
    <ExamRunner
      action={action}
      elapsedS={recording.elapsedTime}
      totalElapsedS={totalClock.elapsedS}
      recording={recording}
      onSubmitTurn={() => void handleSubmitTurn()}
      onRequestRepeat={() => void handleRequestRepeat()}
      onExit={() => navigate('/')}
      voiceMuted={voiceMuted}
      onToggleVoice={toggleVoice}
      pendingSilentSkip={pendingSilentSkip}
      onKeepTrying={handleKeepTrying}
      onSkipQuestion={() => void handleSkipQuestion()}
      rolePlayTitle={rolePlayMeta?.title}
      taskProgress={taskProgress}
    />
  );
}
