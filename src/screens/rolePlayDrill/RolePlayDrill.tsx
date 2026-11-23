import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useShowNavRail } from '../../components/layout/shellChrome';
import { STORY_CARDS, type StoryCard, type StoryTask } from '../../data/storyCards';
import { ROLE_PLAY_CARD_PARAM, homeworkIdFromSearch } from '../../features/homework/homework';
import { useMyHomework } from '../../features/homework/useMyHomework';
import { useRecording } from '../../features/recording/useRecording';
import { getSessionHistory } from '../../services/analytics/analyticsService';
import { recordDrillAnswer } from '../../services/coach/drillAnswerRecorder';
import { checkAnswer, repeatLine, MAX_SILENT_TRIES, type AnswerCheck } from '../../domain/rolePlayDrill/checkAnswer';
import { TurnAttemptTracker } from '../../domain/turnAttempts';
import { cardProgress, pickNextCard } from '../../features/rolePlayDrill/drillProgress';
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
import type { DrillExchange } from './DrillAnswerCard';

/** Pacing fallback when muted or no fr-* voice is installed, so silence doesn't collapse the beat a spoken line would otherwise hold. */
const SILENT_TYPING_MS = 900;

/** The examiner's closing line once the last exchange is answered. */
export const CLOSING_LINE = "Merci, c'est la fin du jeu de rôle.";

type Phase = 'pick' | 'card' | 'talk';

/** What the attempt tracker holds for one exchange: the task and how long the take ran. */
interface DrillAttempt {
  task: StoryTask;
  durationSec: number;
}

/** Whether the examiner can actually be heard on this device right now. */
function canHearExaminer(): boolean {
  return hasFrenchVoice() && !isExaminerVoiceMuted();
}

/**
 * Role-play drill (formerly Story Mode): Part 1 of the 0520 speaking test on
 * its own. Pick a card, read it, then answer the examiner's five exchanges.
 * Each answer is checked on the device (domain/rolePlayDrill/checkAnswer.ts) —
 * which parts of the task it communicated, never a mark — so the drill calls no
 * AI and spends no quota. It lives under Exam (`/exam/role-play`) but is
 * practice: no /40, no exam allowance, and each answer is an ordinary `story`
 * Session (score null) with full-credit XP when every part was covered and
 * participation XP otherwise.
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
  const [exchanges, setExchanges] = useState<DrillExchange[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  /** Listen-only practice: the examiner's lines are heard, not shown, until revealed. */
  const [showText, setShowText] = useState(true);
  /** Exam conditions: no Try again, and the per-answer cards wait for the last exchange. */
  const [examConditions, setExamConditions] = useState(false);
  /** Bumped whenever a session may have been recorded, so card progress re-reads the history. */
  const [historyVersion, setHistoryVersion] = useState(0);

  // The side rail shows on the card list, like the exam chooser — never mid-role-play.
  useShowNavRail(phase === 'pick');

  const progress = useMemo(
    () => cardProgress(STORY_CARDS, getSessionHistory().map((s) => s.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- historyVersion is the re-read trigger
    [historyVersion],
  );

  const trackerRef = useRef(new TurnAttemptTracker<DrillAttempt, AnswerCheck>());
  const tracker = trackerRef.current;
  /** Non-null while re-recording an earlier exchange (tapping "Try again"). */
  const redoTargetRef = useRef<number | null>(null);
  /** Nothing-heard takes per exchange; the examiner asks again until MAX_SILENT_TRIES. */
  const silentTriesRef = useRef(new Map<number, number>());
  /** Guards async NPC lines against a card change or exit mid-line. */
  const runRef = useRef(0);
  /** The latest app state, for commits that fire from an unmount or pagehide. */
  const stateRef = useRef(state);
  stateRef.current = state;

  // Homework (features/homework): `?card=<id>&assignment=<id>` opens the card a teacher
  // set. The id counts only once my_assignments() confirms it is this learner's
  // role-play homework on that card; each answer then carries `assignmentId`.
  const location = useLocation();
  const linkParams = new URLSearchParams(location.search);
  const linkedCardId = linkParams.get(ROLE_PLAY_CARD_PARAM);
  const requestedHomeworkId = homeworkIdFromSearch(location.search);
  const { assignments: myHomework } = useMyHomework(requestedHomeworkId !== null);
  const homework = requestedHomeworkId
    ? myHomework?.find((a) => a.id === requestedHomeworkId && a.kind === 'role_play') ?? null
    : null;
  const homeworkRef = useRef(homework);
  homeworkRef.current = homework;

  /**
   * Records every checked answer once — XP, Session, achievements — and locks it
   * so it can no longer be retried. Answers are held until the learner moves on
   * (next card, leave, restart, or the page closing) so "Try again" stays
   * available on any exchange of the card just played; a missed exchange writes
   * nothing, so it never ticks the card's "done" progress.
   */
  const commitAll = (forCard: StoryCard | null) => {
    if (!forCard) return;
    let committed = 0;
    forCard.tasks.forEach((_, step) => {
      const record = tracker.lock(step);
      if (record === null || record.language === null) return;
      const { task, durationSec } = record.question;
      const live = stateRef.current;
      const hw = homeworkRef.current;
      const result = recordDrillAnswer({
        cardId: forCard.id,
        step,
        questionText: task.promptFr,
        transcript: record.transcript,
        durationSec,
        complete: record.language.complete,
        streakDays: live.profile.streak_days,
        totalSessionsBefore: live.profile.sessions_count + committed,
        ...(hw && hw.rolePlayCardId === forCard.id ? { assignmentId: hw.id } : {}),
      });
      committed += 1;
      dispatch({
        type: 'ADD_SESSION',
        session: result.session,
        xpResult: result.xpResult,
        newUnlockedAchievementIds: result.newUnlockedAchievementIds,
        newLevelName: result.newLevelName,
      });
    });
    if (committed > 0) setHistoryVersion((v) => v + 1);
  };
  const commitAllRef = useRef(commitAll);
  commitAllRef.current = commitAll;
  const cardRef = useRef(card);
  cardRef.current = card;

  // Never lose the answers just given: leaving the screen or closing the page records them.
  useEffect(() => {
    const onPageHide = () => commitAllRef.current(cardRef.current);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      commitAllRef.current(cardRef.current);
      stopExaminerVoice();
    };
  }, []);

  const linkedCardOpenedRef = useRef(false);
  useEffect(() => {
    if (linkedCardOpenedRef.current || !linkedCardId) return;
    const linked = STORY_CARDS.find((c) => c.id === linkedCardId);
    if (!linked) return;
    linkedCardOpenedRef.current = true;
    openCard(linked);
  }, [linkedCardId]);

  const openCard = (next: StoryCard) => {
    stopExaminerVoice();
    setCard(next);
    setPhase('card');
    window.scrollTo?.({ top: 0 });
  };

  const backToList = () => {
    commitAll(card);
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
    commitAll(card);
    // Must run inside this click's user gesture — Chrome/Edge boot TTS lazily on the first speak().
    primeExaminerVoice();
    runRef.current += 1;
    const run = runRef.current;
    trackerRef.current = new TurnAttemptTracker<DrillAttempt, AnswerCheck>();
    silentTriesRef.current = new Map();
    redoTargetRef.current = null;
    setMessages([]);
    setExchanges([]);
    setNotice(null);
    setCurrentStep(0);
    setFinished(false);
    setPhase('talk');
    window.scrollTo?.({ top: 0 });
    const first = card.tasks[0];
    if (first) void speakNpcLine(first.promptFr, run);
  };

  const upsertExchange = (exchange: DrillExchange) => {
    setExchanges((prev) => {
      const next = prev.filter((e) => e.step !== exchange.step);
      next.push(exchange);
      return next.sort((a, b) => a.step - b.step);
    });
  };

  /** Holds a checked answer for the step (committed later by commitAll). */
  const holdAnswer = (step: number, task: StoryTask, transcript: string, durationSec: number, check: AnswerCheck, isRedo: boolean) => {
    const seq = trackerRef.current.begin(step, transcript, { task, durationSec }, isRedo);
    trackerRef.current.resolve(step, seq, check);
    upsertExchange({ step, status: 'answered', transcript, check });
  };

  /** The examiner moves to the next question, or closes the role play after the last one. */
  const advanceFrom = async (step: number, forCard: StoryCard, run: number) => {
    const nextStep = step + 1;
    setCurrentStep(nextStep);
    const nextTask = forCard.tasks[nextStep];
    if (nextTask) {
      await speakNpcLine(nextTask.promptFr, run);
    } else {
      await speakNpcLine(CLOSING_LINE, run);
      if (runRef.current !== run) return;
      setFinished(true);
    }
  };

  const startRecording = () => {
    setNotice(null);
    // The examiner's own voice would otherwise be transcribed by the live mic.
    stopExaminerVoice();
    void recording.start();
  };

  const handleStopRecording = async () => {
    if (!card) return;
    const run = runRef.current;
    const redoTarget = redoTargetRef.current;
    const durationSec = recording.elapsedTime;
    const transcript = await recording.stop();
    if (runRef.current !== run) return;

    if (redoTarget !== null) {
      redoTargetRef.current = null;
      const task = card.tasks[redoTarget];
      if (!task) return;
      const check = checkAnswer(transcript, task);
      if (!check.heard) {
        setNotice('Nothing was heard, so your earlier answer stands.');
        return;
      }
      holdAnswer(redoTarget, task, transcript, durationSec, check, true);
      setMessages((prev) => {
        const has = prev.some((m) => m.stepIndex === redoTarget && m.sender === 'user');
        return has
          ? prev.map((m) => (m.stepIndex === redoTarget && m.sender === 'user' ? { ...m, text: transcript } : m))
          : prev;
      });
      return;
    }

    const step = currentStep;
    const task = card.tasks[step];
    if (!task) return;
    const check = checkAnswer(transcript, task);

    if (!check.heard) {
      // Nothing usable: not recorded. Ask again, then move on and count it missed.
      const tries = (silentTriesRef.current.get(step) ?? 0) + 1;
      silentTriesRef.current.set(step, tries);
      if (tries < MAX_SILENT_TRIES) {
        await speakNpcLine(repeatLine(task.promptFr), run);
        return;
      }
      addMessage({ text: '', sender: 'user', stepIndex: step });
      upsertExchange({ step, status: 'missed', transcript: '', check });
      await advanceFrom(step, card, run);
      return;
    }

    addMessage({ text: transcript, sender: 'user', stepIndex: step });
    holdAnswer(step, task, transcript, durationSec, check, false);
    await advanceFrom(step, card, run);
  };

  const canTryAgain = (step: number) => {
    if (examConditions || recording.isRecording || isTyping) return false;
    if (!exchanges.some((e) => e.step === step)) return false;
    return tracker.get(step)?.locked !== true;
  };

  const handleTryAgain = (step: number) => {
    if (!canTryAgain(step)) return;
    redoTargetRef.current = step;
    setNotice(null);
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
        examConditions={examConditions}
        onExamConditionsChange={setExamConditions}
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
      exchanges={exchanges}
      examConditions={examConditions}
      canTryAgain={canTryAgain}
      onTryAgain={handleTryAgain}
      notice={notice}
      onReplay={replayLine}
      onExit={backToList}
      onAgain={startCard}
      onNext={() => {
        commitAll(card);
        const next = pickNextCard(STORY_CARDS, progress, card.id);
        if (next) openCard(next);
      }}
    />
  );
}
