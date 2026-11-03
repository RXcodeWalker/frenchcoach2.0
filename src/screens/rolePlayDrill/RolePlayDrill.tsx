import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useShowNavRail } from '../../components/layout/shellChrome';
import { STORY_CARDS, type StoryCard } from '../../data/storyCards';
import { useRecording } from '../../features/recording/useRecording';
import { getAIFeedback } from '../../services/api/apiClient';
import { getSessionHistory } from '../../services/analytics/analyticsService';
import type { PanelEntry } from '../../components/ui/LiveFeedbackPanel';
import type { FeedbackV2, Question, Session } from '../../types';
import { orchestrateAttempt } from '../../services/coach/sessionOrchestrator';
import { getSkillProfile } from '../../services/coaching/diagnosticEngine';
import { isUnscored } from '../../domain/scoring';
import { buildTier0Result } from '../../services/coaching/responseTier';
import { computeXPGain, computeParticipationXPGain } from '../../domain/xp';
import { TurnAttemptTracker, MAX_REDOS } from '../../domain/turnAttempts';
import { cardProgress, drillSessionId, pickNextCard } from '../../features/rolePlayDrill/drillProgress';
import {
  primeExaminerVoice,
  speakExaminerText,
  stopExaminerVoice,
  getExaminerVoiceGeneration,
  isExaminerVoiceMuted,
  hasFrenchVoice,
} from '../../services/exam/examinerVoice';
import { DrillPicker } from './DrillPicker';
import { DrillCardPrep } from './DrillCardPrep';
import { DrillConversation, type DrillMessage } from './DrillConversation';

/** Pacing fallback when muted or no fr-* voice is installed, so silence doesn't collapse the beat a spoken line would otherwise hold. */
const SILENT_TYPING_MS = 900;

/** The examiner's closing line once the last exchange is answered. */
export const CLOSING_LINE = "Merci, c'est la fin du jeu de rôle.";

type Phase = 'pick' | 'card' | 'talk';

/** Scored / unscored / pending, keyed to a bare FeedbackV2 (the drill has no graph-runtime TurnOutcome). */
type DrillLanguageResult =
  | { kind: 'scored'; feedback: FeedbackV2 }
  | { kind: 'unscored'; feedback: FeedbackV2 }
  | { kind: 'pending' };

/**
 * A card task as the minimal Question getAIFeedback reads. `topicKey` only
 * feeds evidence topic attribution; `Session.topicKey` stays unset below, so
 * a synthetic `story:*` id can never enter the review pool.
 */
function toDrillQuestion(card: StoryCard, task: StoryCard['tasks'][number]): Question {
  return {
    id: `story:${card.id}:${task.taskId}`,
    topicKey: `story:${card.id}`,
    text: task.promptFr,
    hint: task.promptEn ?? '',
    difficulty: 2,
    followUps: [],
    modelAnswer: '',
    keyVocab: [],
  };
}

/** Whether the examiner can actually be heard on this device right now. */
function canHearExaminer(): boolean {
  return hasFrenchVoice() && !isExaminerVoiceMuted();
}

/**
 * Role-play drill (formerly Story Mode): Part 1 of the 0520 speaking test on
 * its own. Pick a card, read it, then answer the examiner's five exchanges
 * with coaching on each answer. It lives under Exam (`/exam/role-play`) but
 * is practice: no /40, no exam allowance, and each answer is an ordinary
 * `story` Session with participation-or-score XP, exactly as Story Mode was.
 */
export function RolePlayDrill() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const { consentStatus } = useAuth();
  const recording = useRecording(consentStatus === 'pending');

  const [phase, setPhase] = useState<Phase>('pick');
  const [card, setCard] = useState<StoryCard | null>(null);
  const [messages, setMessages] = useState<DrillMessage[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [finished, setFinished] = useState(false);
  const [panelEntries, setPanelEntries] = useState<PanelEntry[]>([]);
  /** Listen-only practice: the examiner's lines are heard, not shown, until revealed. */
  const [showText, setShowText] = useState(true);
  /** Bumped whenever a session may have been recorded, so card progress re-reads the history. */
  const [historyVersion, setHistoryVersion] = useState(0);

  // The side rail shows on the card list, like the exam chooser — never mid-role-play.
  useShowNavRail(phase === 'pick');

  const progress = useMemo(
    () => cardProgress(STORY_CARDS, getSessionHistory().map((s) => s.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- historyVersion is the re-read trigger
    [historyVersion],
  );

  const trackerRef = useRef(new TurnAttemptTracker<Question | undefined, DrillLanguageResult>());
  const tracker = trackerRef.current;
  /** Non-null while re-recording an earlier exchange (tapping "Redo"). */
  const redoTargetRef = useRef<number | null>(null);
  /** The last answered step, locked the instant the next fresh recording starts. */
  const lastLockedStepRef = useRef<number | null>(null);
  /** Guards async NPC lines against a card change or exit mid-line. */
  const runRef = useRef(0);

  useEffect(() => () => stopExaminerVoice(), []);

  const openCard = (next: StoryCard) => {
    stopExaminerVoice();
    setCard(next);
    setPhase('card');
    window.scrollTo?.({ top: 0 });
  };

  /** The last answer still waiting for the next mic-start to lock it is locked now, so leaving never loses it. */
  const lockPending = () => {
    if (card && lastLockedStepRef.current !== null) {
      lockStep(card, lastLockedStepRef.current);
      lastLockedStepRef.current = null;
    }
  };

  const backToList = () => {
    lockPending();
    stopExaminerVoice();
    runRef.current += 1;
    if (recording.isRecording) void recording.stop();
    setCard(null);
    setPhase('pick');
    setHistoryVersion((v) => v + 1);
  };

  const addMessage = (msg: Omit<DrillMessage, 'id'>) => {
    setMessages((prev) => [...prev, { ...msg, id: Math.random().toString(36).slice(2, 9) }]);
  };

  /** Shows "speaking" for the length of the line (or a short beat when it can't be heard), then adds it. */
  const speakNpcLine = async (text: string, run: number) => {
    setIsTyping(true);
    if (canHearExaminer()) {
      await speakExaminerText(text, getExaminerVoiceGeneration());
    } else {
      await new Promise((resolve) => setTimeout(resolve, SILENT_TYPING_MS));
    }
    if (runRef.current !== run) return;
    setIsTyping(false);
    addMessage({ text, sender: 'ai' });
  };

  const replayLine = (text: string) => {
    if (recording.isRecording) return;
    stopExaminerVoice();
    void speakExaminerText(text, getExaminerVoiceGeneration());
  };

  const startCard = () => {
    if (!card) return;
    lockPending();
    // Must run inside this click's user gesture — Chrome/Edge boot TTS lazily on the first speak().
    primeExaminerVoice();
    runRef.current += 1;
    const run = runRef.current;
    trackerRef.current = new TurnAttemptTracker<Question | undefined, DrillLanguageResult>();
    redoTargetRef.current = null;
    lastLockedStepRef.current = null;
    setMessages([]);
    setPanelEntries([]);
    setCurrentStep(0);
    setFinished(false);
    setPhase('talk');
    window.scrollTo?.({ top: 0 });
    const first = card.tasks[0];
    if (first) void speakNpcLine(first.promptFr, run);
  };

  const upsertPanelEntry = (entry: PanelEntry) => {
    setPanelEntries((prev) => {
      const idx = prev.findIndex((e) => e.turnKey === entry.turnKey);
      if (idx === -1) return [...prev, entry];
      const next = [...prev];
      next[idx] = entry;
      return next;
    });
  };

  /** Progression side effects (XP, Session, evidence, achievements) — once a step is locked and resolved. */
  const runOrchestration = (
    forCard: StoryCard,
    stepIndex: number,
    transcript: string,
    question: Question | undefined,
    language: DrillLanguageResult,
  ) => {
    if (language.kind === 'pending') return;
    const fb = language.feedback;
    const unscored = isUnscored(fb);
    const finalScore = fb.scores.overall;
    const xpGain = unscored
      ? computeParticipationXPGain(state.profile.streak_days)
      : computeXPGain(finalScore, state.profile.streak_days);

    const session: Session = {
      id: drillSessionId(forCard.id, stepIndex),
      mode: 'story',
      questionText: question?.text,
      transcript,
      wordCount: fb.wordCount,
      score: unscored ? null : finalScore,
      xpEarned: xpGain.gain,
      durationSec: recording.elapsedTime,
      feedback: fb,
      createdAt: new Date().toISOString(),
    };

    const orchestration = orchestrateAttempt({
      session,
      question: question ?? null,
      feedback: fb,
      avoidanceSignals: [],
      transcript,
      durationSec: recording.elapsedTime,
      mode: 'story',
      finalScore,
      streakDays: state.profile.streak_days,
      totalSessionsBefore: state.profile.sessions_count,
    });

    dispatch({
      type: 'ADD_SESSION',
      session,
      xpResult: orchestration.xpResult,
      newUnlockedAchievementIds: orchestration.newUnlockedAchievementIds,
      newLevelName: orchestration.newLevelName,
    });
    dispatch({ type: 'UPDATE_SKILL_PROFILE', skillProfile: getSkillProfile() });
    setHistoryVersion((v) => v + 1);
  };

  const lockStep = (forCard: StoryCard, stepIndex: number) => {
    const record = trackerRef.current.lock(stepIndex);
    if (record === null || record.language === null || record.language.kind === 'pending') return;
    runOrchestration(forCard, stepIndex, record.transcript, record.question, record.language);
  };

  const submitAnswer = (forCard: StoryCard, stepIndex: number, transcript: string, question: Question | undefined, isRedo: boolean) => {
    const attemptTracker = trackerRef.current;
    const run = runRef.current;
    const attemptSeq = attemptTracker.begin(stepIndex, transcript, question, isRedo);
    upsertPanelEntry({ turnKey: stepIndex, transcript, status: 'pending', feedback: null });

    void (async () => {
      const wordCount = transcript.split(/\s+/).filter(Boolean).length;
      let fb: FeedbackV2;
      if (!question) {
        fb = { ...buildTier0Result(), unscored: 'evaluation_failed', wordCount };
      } else {
        try {
          fb = await getAIFeedback(transcript, question);
        } catch {
          fb = { ...buildTier0Result(), unscored: 'no_llm_offline', wordCount };
        }
      }
      const language: DrillLanguageResult = isUnscored(fb) ? { kind: 'unscored', feedback: fb } : { kind: 'scored', feedback: fb };
      if (!attemptTracker.isCurrent(stepIndex, attemptSeq)) return; // a redo has superseded this attempt
      // A card restarted or left since: the answer still counts, but its panel is gone.
      if (runRef.current === run) upsertPanelEntry({ turnKey: stepIndex, transcript, status: 'resolved', feedback: fb });
      const record = attemptTracker.resolve(stepIndex, attemptSeq, language);
      if (record !== null) runOrchestration(forCard, stepIndex, record.transcript, record.question, record.language as DrillLanguageResult);
    })();
  };

  const startRecording = () => {
    lockPending();
    // The examiner's own voice would otherwise be transcribed by the live mic.
    stopExaminerVoice();
    void recording.start();
  };

  const handleStopRecording = async () => {
    if (!card) return;
    const run = runRef.current;
    const redoTarget = redoTargetRef.current;

    if (redoTarget !== null) {
      redoTargetRef.current = null;
      const transcript = await recording.stop();
      const task = card.tasks[redoTarget];
      setMessages((prev) => prev.map((m) => (m.stepIndex === redoTarget && m.sender === 'user' ? { ...m, text: transcript } : m)));
      submitAnswer(card, redoTarget, transcript, task ? toDrillQuestion(card, task) : undefined, true);
      return;
    }

    const transcript = await recording.stop();
    if (runRef.current !== run) return;
    const task = card.tasks[currentStep];
    addMessage({ text: transcript, sender: 'user', stepIndex: currentStep });
    submitAnswer(card, currentStep, transcript, task ? toDrillQuestion(card, task) : undefined, false);
    lastLockedStepRef.current = currentStep;

    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    const nextTask = card.tasks[nextStep];
    if (nextTask) {
      await speakNpcLine(nextTask.promptFr, run);
    } else {
      await speakNpcLine(CLOSING_LINE, run);
      if (runRef.current !== run) return;
      setFinished(true);
      // No later mic-start will come to lock the last step, so lock it here.
      if (lastLockedStepRef.current !== null) {
        lockStep(card, lastLockedStepRef.current);
        lastLockedStepRef.current = null;
      }
    }
  };

  const handleRedo = (stepIndex: number) => {
    if (!tracker.canRedo(stepIndex) || recording.isRecording) return;
    redoTargetRef.current = stepIndex;
    stopExaminerVoice();
    void recording.start();
  };

  if (phase === 'pick' || !card) {
    return (
      <DrillPicker
        cards={STORY_CARDS}
        progress={progress}
        onOpen={openCard}
        onSurprise={() => {
          const next = pickNextCard(STORY_CARDS, progress);
          if (next) openCard(next);
        }}
        onBack={() => navigate('/exam')}
      />
    );
  }

  if (phase === 'card') {
    return (
      <DrillCardPrep
        card={card}
        progress={progress.get(card.id)}
        showText={showText}
        onShowTextChange={setShowText}
        canHear={canHearExaminer()}
        onStart={startCard}
        onBack={backToList}
      />
    );
  }

  return (
    <DrillConversation
      card={card}
      messages={messages}
      currentStep={currentStep}
      isTyping={isTyping}
      finished={finished}
      showText={showText || !canHearExaminer()}
      recording={{ ...recording, start: startRecording }}
      onStopRecording={handleStopRecording}
      panelEntries={panelEntries}
      canRedo={(step) => tracker.canRedo(step) && !recording.isRecording}
      redosLeft={(step) => MAX_REDOS - (tracker.get(step)?.retryCount ?? 0)}
      onRedo={handleRedo}
      onReplay={replayLine}
      onExit={backToList}
      onAgain={startCard}
      onNext={() => {
        const next = pickNextCard(STORY_CARDS, progress, card.id);
        if (next) openCard(next);
      }}
    />
  );
}
