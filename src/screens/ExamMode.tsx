import { useEffect, useRef, useState } from 'react';
import { track, captureError } from '../services/telemetry/telemetryService';
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
import {
  saveStoredTranscript,
  getStoredTranscript,
  getPendingScoreSessionId,
  setPendingScoreSessionId,
  clearPendingScoreSessionId,
} from '../services/exam/localTranscriptStore';
import { isExaminerVoiceMuted, setExaminerVoiceMuted, stopExaminerVoice, speakExaminerText } from '../services/exam/examinerVoice';
import { wait, PRE_SPEECH_LEAD_MS, PRE_LISTEN_PAUSE_MS } from '../services/exam/examinerPacing';
import { pingScoringServiceHealth, submitForScoring, pollScoreStatus, isTerminalScoringStatus, ScoringApiError } from '../services/exam/scoringApiClient';
import {
  initialScoringMachineState,
  transitionScoringMachine,
  recoveringBackoffMs,
  type ScoringMachineState,
} from '../services/exam/examScoringMachine';
import { pingInterpretServiceHealth } from '../services/exam/interpretUtterance';
import { getOriginalQuestionSet, getAuthoredQuestionSet, listPublishedQuestionSetIdsWithRetry } from '../data/exam/bank/loader';
import type { ExaminerAction } from '../domain/igcse/session/types';
import type { SessionTranscript } from '../domain/igcse/stt/types';
import type { EnvelopeView } from '../domain/igcse/envelope/envelopeView';
import type { AuthoredQuestionSet, RolePlayScenario } from '../data/exam/bank/types';
import { ExamGreeting } from './exam/ExamGreeting';
import { ExamSelect } from './exam/ExamSelect';
import { RolePlayCardPreview } from './exam/RolePlayCardPreview';
import { ExitConfirmDialog } from './exam/ExitConfirmDialog';

type ExamState = 'select' | 'intro' | 'greeting' | 'card' | 'running' | 'review' | 'scoring' | 'results';

interface RolePlayMeta {
  title: string;
  setup: string;
  taskIds: string[];
}

/** A8: exam duration (10-15 min) only marginally exceeds Render free tier's ~15 min idle window — the keepalive is what guarantees warmth by the time scoring is needed. */
const KEEPALIVE_INTERVAL_MS = 5 * 60 * 1000;

export const GREETING_TEXT = 'Bonjour ! Comment ça va ? Es-tu prêt ? On va commencer.';

export function ExamMode() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [examState, setExamState] = useState<ExamState>('select');
  const [action, setAction] = useState<ExaminerAction | null>(null);
  const [voiceMuted, setVoiceMuted] = useState(isExaminerVoiceMuted());
  const [transcript, setTranscript] = useState<SessionTranscript | null>(null);
  const [pendingSilentSkip, setPendingSilentSkip] = useState(false);
  const [scoringMachine, setScoringMachine] = useState<ScoringMachineState>(initialScoringMachineState());
  const [envelopeView, setEnvelopeView] = useState<EnvelopeView | null>(null);
  const [rolePlayScenario, setRolePlayScenario] = useState<RolePlayScenario | undefined>(undefined);
  const [rolePlayMeta, setRolePlayMeta] = useState<RolePlayMeta | undefined>(undefined);
  const [showScoringExitConfirm, setShowScoringExitConfirm] = useState(false);

  const recording = useRecording();
  const clock = useSessionClock();
  const totalClock = useElapsedClock();
  const sessionRef = useRef<SimulationSession | null>(null);
  const sessionIdRef = useRef<string>('');
  const turnStartRef = useRef<number>(0);
  const selectedQuestionSetIdRef = useRef<string | undefined>(undefined);
  const selectedAuthoredSetRef = useRef<AuthoredQuestionSet | undefined>(undefined);
  const turnBusyRef = useRef(false);
  const startExamBusyRef = useRef(false);

  // A8: keepalive ping while the exam runs, so the scoring service stays warm
  // through the ~15 min Render free-tier idle window until scoring is needed.
  useEffect(() => {
    if (examState !== 'running') return;
    const interval = setInterval(pingScoringServiceHealth, KEEPALIVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [examState]);

  // Reliability plan §D: resume-on-reload. A reload during 'scoring' (or
  // after a failure) used to drop the user back to 'select' with the pending
  // session forgotten even though its transcript was already saved. On
  // mount, if a pending sessionId exists, skip Queued/Submitting entirely —
  // call GET /score first, exactly like the mid-session recovery path,
  // never blindly re-POST on reload.
  useEffect(() => {
    const pendingSessionId = getPendingScoreSessionId();
    if (!pendingSessionId) return;
    const stored = getStoredTranscript(pendingSessionId);
    if (!stored) {
      clearPendingScoreSessionId();
      return;
    }
    setTranscript(stored);
    setExamState('scoring');
    setScoringMachine({ phase: 'WaitingForScore', attempt: 1 });
  }, []);

  const enterGreeting = () => {
    // Fresh attempt (first run, or a retake reusing this same mounted component) —
    // clear the startExam re-entrancy guard so the new attempt can actually start.
    startExamBusyRef.current = false;
    setExamState('greeting');
    void (async () => {
      await wait(PRE_SPEECH_LEAD_MS);
      await speakExaminerText(GREETING_TEXT);
    })();
  };

  const enterCardPreview = async () => {
    let scenario: RolePlayScenario | undefined = selectedAuthoredSetRef.current?.content.rolePlay;

    if (!scenario) {
      const publishedIds = await listPublishedQuestionSetIdsWithRetry();
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
    // Guards against a double-click on "Begin" re-entering this whole async
    // flow — without this, two overlapping runs would each speak the first
    // question and each start a recording, sounding like everything was
    // read/started twice.
    if (startExamBusyRef.current) return;
    startExamBusyRef.current = true;

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
        setup: rolePlayScenario.setup,
        taskIds: rolePlayScenario.tasks.map((t) => t.questionId),
      });
    }

    const session = new SimulationSession(sessionId, questionSet, clock.nowS, {
      onExaminerAction: (a) => setAction(a),
    });
    sessionRef.current = session;
    setExamState('running');

    // The candidate already read the setup untimed on the preparation card —
    // it's shown again in the ExamRunner header, but never spoken here; the
    // examiner's first spoken line is the first role-play question itself.
    setRolePlayScenario(undefined);

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
        skipConfirmed: true,
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
    setPendingScoreSessionId(finalTranscript.sessionId);
    setTranscript(finalTranscript);
    setExamState('scoring');
    setScoringMachine({ phase: 'Submitting', attempt: 1 });
  };

  /**
   * Reliability plan §B: the manual "Retry Scoring" backstop from
   * FailedTerminal — re-enters Submitting. Also reachable from the resume-
   * on-reload effect, which enters WaitingForScore directly instead.
   */
  const retryScoring = () => {
    if (!transcript) return;
    setScoringMachine((s) => transitionScoringMachine(s, { type: 'RETRY' }));
  };

  const scoringFailedTerminal = scoringMachine.phase === 'FailedTerminal' ? scoringMachine.reason : null;

  // Reliability plan §B driver: runs the effect appropriate to whichever
  // phase the machine just entered, then dispatches the resulting event.
  // POST /score only ever fires here from Submitting — reached from Queued,
  // or from WaitingForScore/Recovering's POLL_NOT_FOUND, or from a manual
  // RETRY — never from an ambiguous client error and never while a poll
  // result places the last attempt inside the staleness window (202).
  useEffect(() => {
    if (!transcript) return;
    let cancelled = false;

    if (scoringMachine.phase === 'Submitting') {
      void (async () => {
        let result: Awaited<ReturnType<typeof submitForScoring>>;
        try {
          result = await submitForScoring(transcript);
        } catch (err) {
          if (cancelled) return;
          captureError(err, { stage: 'submitForScoring', sessionId: transcript.sessionId });
          if (err instanceof ScoringApiError && isTerminalScoringStatus(err.status)) {
            setScoringMachine((s) => transitionScoringMachine(s, { type: 'SUBMIT_TERMINAL_ERROR', reason: err.message }));
          } else {
            setScoringMachine((s) => transitionScoringMachine(s, { type: 'SUBMIT_AMBIGUOUS_ERROR' }));
          }
          return;
        }
        if (cancelled) return;
        if (result.status === 'done') {
          setEnvelopeView(result.envelope);
          setScoringMachine((s) => transitionScoringMachine(s, { type: 'SUBMIT_OK' }));
        } else {
          setScoringMachine((s) => transitionScoringMachine(s, { type: 'SUBMIT_IN_PROGRESS' }));
        }
      })();
      return () => { cancelled = true; };
    }

    if (scoringMachine.phase === 'WaitingForScore' || scoringMachine.phase === 'Recovering') {
      const delayMs = scoringMachine.phase === 'Recovering' ? recoveringBackoffMs(scoringMachine.pollCount) : 0;
      const timeoutId = setTimeout(() => {
        void (async () => {
          let result: Awaited<ReturnType<typeof pollScoreStatus>>;
          try {
            result = await pollScoreStatus(transcript.sessionId);
          } catch (err) {
            if (cancelled) return;
            captureError(err, { stage: 'pollScoreStatus', sessionId: transcript.sessionId });
            const reason = err instanceof ScoringApiError ? err.message : 'Scoring failed unexpectedly.';
            if (err instanceof ScoringApiError && isTerminalScoringStatus(err.status)) {
              setScoringMachine((s) => transitionScoringMachine(s, { type: 'POLL_TERMINAL_ERROR', reason }));
            } else {
              // Ambiguous — stay put; the next scheduled poll will retry.
            }
            return;
          }
          if (cancelled) return;
          if (result.status === 'done') {
            setEnvelopeView(result.envelope);
            setScoringMachine((s) => transitionScoringMachine(s, { type: 'POLL_DONE' }));
          } else if (result.status === 'in_progress') {
            setScoringMachine((s) => transitionScoringMachine(s, { type: 'POLL_IN_PROGRESS' }));
          } else {
            setScoringMachine((s) => transitionScoringMachine(s, { type: 'POLL_NOT_FOUND' }));
          }
        })();
      }, delayMs);
      return () => { cancelled = true; clearTimeout(timeoutId); };
    }

    if (scoringMachine.phase === 'Completed') {
      clearPendingScoreSessionId();
      finishWithScore(transcript, envelopeView);
    }

    if (scoringMachine.phase === 'FailedTerminal') {
      captureError(new Error(scoringMachine.reason), { stage: 'scoringFailedTerminal', sessionId: transcript.sessionId });
      setEnvelopeView(null);
      setExamState('results');
    }

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoringMachine, transcript]);

  const finishWithScore = (finalTranscript: SessionTranscript, view: EnvelopeView | null) => {
    // Score UI state is set first and unconditionally — everything below is
    // XP/achievement/analytics side effects. A bug in any of it must never
    // make a successfully-scored exam look like the score was lost.
    setEnvelopeView(view);
    setExamState('results');

    try {
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
      } else {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } }); // lighter — completion only, no score claim
      }
    } catch (err) {
      captureError(err, { stage: 'finishWithScore.sideEffects', sessionId: finalTranscript.sessionId });
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
    return <ExamGreeting recording={recording} greetingText={GREETING_TEXT} onContinue={() => void enterCardPreview()} />;
  }

  if (examState === 'card' && rolePlayScenario) {
    return <RolePlayCardPreview scenario={rolePlayScenario} onBegin={() => void startExam()} />;
  }

  if (examState === 'review' && transcript) {
    return <TranscriptReview transcript={transcript} onConfirm={handleReviewConfirm} onExit={() => navigate('/')} />;
  }

  if (examState === 'scoring') {
    // Reliability plan §C: the loading state reflects the real phase instead
    // of one static spinner for a process that can legitimately run for minutes.
    const isRecovering = scoringMachine.phase === 'Recovering' || scoringMachine.phase === 'WaitingForScore';
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-3 max-w-xs">
          <div className="w-10 h-10 mx-auto border-2 border-violet-electric/30 border-t-violet-electric rounded-full animate-spin" />
          <p className="text-sm font-bold text-white">{isRecovering ? 'Still working…' : 'Scoring your session…'}</p>
          <p className="text-[11px] text-slate-500">
            {isRecovering
              ? 'Your answers are safe — checking again shortly.'
              : 'This can take up to a minute.'}
          </p>
          <button
            onClick={() => setShowScoringExitConfirm(true)}
            className="text-[10px] text-slate-600 hover:text-white transition-colors underline underline-offset-2"
          >
            Exit
          </button>
        </div>
        <ExitConfirmDialog
          open={showScoringExitConfirm}
          onCancel={() => setShowScoringExitConfirm(false)}
          onConfirm={() => navigate('/')}
        />
      </div>
    );
  }

  if (examState === 'results' && transcript) {
    return (
      <ExamResults
        transcript={transcript}
        envelopeView={envelopeView}
        scoringError={scoringFailedTerminal}
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
      rolePlaySetup={rolePlayMeta?.setup}
      taskProgress={taskProgress}
    />
  );
}
