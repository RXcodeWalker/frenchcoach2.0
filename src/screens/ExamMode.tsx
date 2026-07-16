import { useRef, useState } from 'react';
import { track } from '../services/telemetry/telemetryService';
import confetti from 'canvas-confetti';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getSkillProfile } from '../services/coaching/diagnosticEngine';
import { awardXP, checkAchievements, getProgressionState } from '../services/progression/progressionService';
import { recordSession as persistSession } from '../services/analytics/analyticsService';
import { buildAchievementContext } from '../services/coach/achievementContextBuilder';
import type { Session } from '../types/index';
import { useRecording } from '../features/recording/useRecording';
import { useSessionClock } from '../features/recording/useSessionClock';
import { ExamIntro } from './exam/ExamIntro';
import { ExamResults } from './exam/ExamResults';
import { ExamRunner } from './exam/ExamRunner';
import { TranscriptReview } from './exam/TranscriptReview';
import { SimulationSession } from '../services/exam/simulationSession';
import { saveConductLog } from '../services/exam/conductLogStore';
import { saveStoredTranscript } from '../services/exam/localTranscriptStore';
import { isExaminerVoiceMuted, setExaminerVoiceMuted, stopExaminerVoice, speakExaminerText } from '../services/exam/examinerVoice';
import { getOriginalQuestionSet } from '../data/exam/bank/loader';
import type { ExaminerAction } from '../domain/igcse/session/types';
import type { SessionTranscript } from '../domain/igcse/stt/types';
import { ExamGreeting } from './exam/ExamGreeting';

type ExamState = 'intro' | 'greeting' | 'running' | 'review' | 'results';

const GREETING_TEXT = 'Bonjour ! Comment ça va ? Es-tu prêt ? On va commencer.';

export function ExamMode() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [examState, setExamState] = useState<ExamState>('intro');
  const [action, setAction] = useState<ExaminerAction | null>(null);
  const [voiceMuted, setVoiceMuted] = useState(isExaminerVoiceMuted());
  const [transcript, setTranscript] = useState<SessionTranscript | null>(null);
  const [pendingSilentSkip, setPendingSilentSkip] = useState(false);

  const recording = useRecording();
  const clock = useSessionClock();
  const sessionRef = useRef<SimulationSession | null>(null);
  const sessionIdRef = useRef<string>('');
  const turnStartRef = useRef<number>(0);

  const enterGreeting = () => {
    setExamState('greeting');
    void speakExaminerText(GREETING_TEXT);
  };

  const startExam = async () => {
    // Discard the greeting's reply entirely — abort any in-progress recognizer
    // so it never overlaps with the first real turn's recording.
    if (recording.isRecording) {
      await recording.stop();
    }

    const sessionId = `exam-sim-${Date.now()}`;
    sessionIdRef.current = sessionId;
    clock.start();

    const questionSet = await getOriginalQuestionSet('original-practice-001');
    if (!questionSet) {
      throw new Error('ExamMode: question set "original-practice-001" could not be resolved (backend and offline fixture both failed)');
    }

    const session = new SimulationSession(sessionId, questionSet, clock.nowS, {
      onExaminerAction: (a) => setAction(a),
    });
    sessionRef.current = session;
    setExamState('running');

    const firstAction = await session.begin();
    setAction(firstAction);
    turnStartRef.current = clock.nowS();
    recording.start();
  };

  const handleSubmitTurn = async () => {
    const session = sessionRef.current;
    if (!session) return;

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

    turnStartRef.current = clock.nowS();
    recording.start();
  };

  const handleKeepTrying = () => {
    setPendingSilentSkip(false);
    turnStartRef.current = clock.nowS();
    recording.start();
  };

  const handleSkipQuestion = async () => {
    const session = sessionRef.current;
    if (!session) return;
    setPendingSilentSkip(false);

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

    turnStartRef.current = clock.nowS();
    recording.start();
  };

  const handleRequestRepeat = async () => {
    const session = sessionRef.current;
    if (!session) return;

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

    turnStartRef.current = clock.nowS();
    recording.start();
  };

  const finishSession = async (session: SimulationSession) => {
    stopExaminerVoice();
    saveConductLog(session.getConductLog());
    const built = await session.buildTranscript();
    setTranscript(built);
    setExamState('review');
  };

  const handleReviewConfirm = (finalTranscript: SessionTranscript) => {
    saveStoredTranscript(finalTranscript);
    setTranscript(finalTranscript);
    setExamState('results');

    const candidateUtterances = finalTranscript.utterances.filter((u) => u.role === 'candidate');
    const totalSec = candidateUtterances.reduce((sum, u) => sum + (u.endS - u.startS), 0);
    const wordCount = candidateUtterances.reduce((sum, u) => sum + u.text.trim().split(/\s+/).filter(Boolean).length, 0);

    const appSession: Session = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      mode: 'exam',
      wordCount,
      score: 0,
      xpEarned: 0,
      durationSec: Math.round(totalSec),
      createdAt: new Date().toISOString(),
    };

    persistSession(appSession);
    const xpResult = awardXP(5, state.profile.streak_days);
    const { level: newLevel } = getProgressionState();
    const newUnlockedAchievementIds = checkAchievements(
      buildAchievementContext({
        finalScore: 5,
        streakDays: state.profile.streak_days,
        totalSessionsAfter: state.profile.sessions_count + 1,
        topicsUsed: [],
        beliefSnapshot: null,
        examCompleted: true,
        examType: 'igcse',
      }),
    );

    track({ name: 'session_completed', props: { mode: 'exam', score: 0, duration_sec: totalSec, xp_gain: xpResult.gain } });
    for (const id of newUnlockedAchievementIds) {
      track({ name: 'achievement_unlocked', props: { achievement_id: id, mode: 'exam', session_count: state.profile.sessions_count + 1 } });
    }

    dispatch({ type: 'ADD_SESSION', session: { ...appSession, xpEarned: xpResult.gain }, xpResult, newUnlockedAchievementIds, newLevelName: newLevel.name, xpAnimX: 70, xpAnimY: 20 });
    dispatch({ type: 'UPDATE_SKILL_PROFILE', skillProfile: getSkillProfile() });
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
  };

  const toggleVoice = () => {
    const next = !voiceMuted;
    setExaminerVoiceMuted(next);
    setVoiceMuted(next);
  };

  if (examState === 'intro') return <ExamIntro onStart={enterGreeting} onBack={() => navigate('/')} />;

  if (examState === 'greeting') {
    return <ExamGreeting recording={recording} onContinue={() => void startExam()} />;
  }

  if (examState === 'review' && transcript) {
    return <TranscriptReview transcript={transcript} onConfirm={handleReviewConfirm} />;
  }

  if (examState === 'results' && transcript) {
    return (
      <ExamResults
        transcript={transcript}
        onRetake={() => setExamState('intro')}
        onHome={() => navigate('/')}
      />
    );
  }

  return (
    <ExamRunner
      action={action}
      elapsedS={recording.elapsedTime}
      recording={recording}
      onSubmitTurn={() => void handleSubmitTurn()}
      onRequestRepeat={() => void handleRequestRepeat()}
      onExit={() => navigate('/')}
      voiceMuted={voiceMuted}
      onToggleVoice={toggleVoice}
      pendingSilentSkip={pendingSilentSkip}
      onKeepTrying={handleKeepTrying}
      onSkipQuestion={() => void handleSkipQuestion()}
    />
  );
}
