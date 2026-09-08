import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowLeft, MessageSquare, Star, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { STORY_CARDS, type StoryCard } from '../data/storyCards';
import { useRecording } from '../features/recording/useRecording';
import { getAIFeedback } from '../services/api/apiClient';
import { VisualNovelView } from '../components/ui/VisualNovelView';
import type { PanelEntry } from '../components/ui/LiveFeedbackPanel';
import type { Expression } from '../components/ui/CharacterAvatar';
import type { Objective } from '../components/ui/MissionObjectivesList';
import type { FeedbackV2, Question, Session } from '../types';
import { orchestrateAttempt } from '../services/coach/sessionOrchestrator';
import { getSkillProfile } from '../services/coaching/diagnosticEngine';
import { isUnscored } from '../domain/scoring';
import { buildTier0Result } from '../services/coaching/responseTier';
import { computeXPGain, computeParticipationXPGain } from '../domain/xp';
import { TurnAttemptTracker, MAX_REDOS } from '../domain/turnAttempts';
import {
  primeExaminerVoice,
  speakExaminerText,
  stopExaminerVoice,
  getExaminerVoiceGeneration,
  isExaminerVoiceMuted,
  hasFrenchVoice,
} from '../services/exam/examinerVoice';

/** Pacing fallback when muted or no fr-* voice is installed, so silence doesn't collapse the beat a spoken line would otherwise hold. */
const SILENT_TYPING_MS = 900;

interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  timestamp: number;
  /** Set on a user message: the task index it answers. Lets a redo replace
   *  this exact message in place rather than popping the array's tail (which
   *  would be wrong once the next NPC line has already been appended after it). */
  stepIndex?: number;
}

/** A story-mode "language" result — mirrors roleplay's LanguageResult union
 *  (scored / unscored / pending) but keyed to a bare FeedbackV2 since Story
 *  Mode has no graph-runtime TurnOutcome to store it on. */
type StoryLanguageResult =
  | { kind: 'scored'; feedback: FeedbackV2 }
  | { kind: 'unscored'; feedback: FeedbackV2 }
  | { kind: 'pending' };

/**
 * Narrow adapter from a StoryCard task to the minimal Question shape
 * getAIFeedback reads (id, text, topicKey, difficulty, modelAnswer, keyVocab).
 * Same precedent as toScoringInput.ts (the graph-runtime equivalent) and
 * Learn.tsx's follow-up question (id: `${baseQuestion.id}::followup`) — a
 * narrow derived Question, not a synthetic lie.
 *
 * `topicKey` here only feeds evidenceBuilder's topic attribution
 * (`session.topicKey ?? question?.topicKey`) for skill diagnostics — it is
 * NOT what gates the review pool. recordReviewFailure only fires on
 * `session.topicKey` (sessionOrchestrator.ts), which this screen leaves
 * unset below, so a synthetic `story:*` id can never enter reviewPool and
 * sit there unresolvable — same reasoning as toScoringInput.ts leaving
 * Session.topicKey undefined for the graph runtime.
 */
function toStoryQuestion(card: StoryCard, task: StoryCard['tasks'][number]): Question {
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

export function StoryMode() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const recording = useRecording();

  const [selectedStory, setSelectedStory] = useState<StoryCard | null>(null);
  const [isPrepping, setIsPrepping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [panelEntries, setPanelEntries] = useState<PanelEntry[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [expression, setExpression] = useState<Expression>('neutral');
  const [, setOverallScore] = useState(0);
  const [, setIsFinished] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const trackerRef = useRef(new TurnAttemptTracker<Question | undefined, StoryLanguageResult>());
  const tracker = trackerRef.current;
  /** Non-null while re-recording a prior step — set by tapping "Redo" in the
   *  panel, consumed by handleStopRecording. */
  const redoTargetRef = useRef<number | null>(null);
  /** The most recently answered step's key, locked the instant the *next*
   *  fresh (non-redo) recording starts — mirrors RoleplaySession's pattern. */
  const lastLockedStepRef = useRef<number | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // The NPC's own voice would otherwise be picked up and transcribed by the
  // live mic — cancel it the instant recording begins.
  useEffect(() => {
    return () => stopExaminerVoice();
  }, []);

  const startRecording = () => {
    // Locking is a synchronous flag flip on the *previous* step's key, done
    // the instant a fresh (non-redo) recording begins — it never waits on
    // that step's feedback to arrive.
    if (lastLockedStepRef.current !== null) {
      lockStep(lastLockedStepRef.current);
      lastLockedStepRef.current = null;
    }
    stopExaminerVoice();
    recording.start();
  };

  const selectStory = (story: StoryCard) => {
    setSelectedStory(story);
    setIsPrepping(true);
  };

  const startStory = () => {
    if (!selectedStory) return;
    // Must run inside this click handler's user gesture — Chrome/Edge boot
    // the TTS engine lazily on the first speak() of a page.
    primeExaminerVoice();
    setIsPrepping(false);
    setCurrentStep(0);
    setMessages([]);
    setPanelEntries([]);
    setOverallScore(0);
    setIsFinished(false);
    setExpression('happy');
    trackerRef.current = new TurnAttemptTracker<Question | undefined, StoryLanguageResult>();
    redoTargetRef.current = null;

    const objs: Objective[] = selectedStory.tasks.map((task, i) => ({
      id: `${selectedStory.id}:${task.taskId}`,
      text: task.promptEn || `Complete part ${i + 1} of the exchange`,
      isCompleted: false,
    }));
    setObjectives(objs);

    const firstTask = selectedStory.tasks[0];
    if (firstTask) {
      void speakNpcLine(firstTask.promptFr);
    }
  };

  const addMessage = (text: string, sender: 'ai' | 'user', stepIndex?: number) => {
    const newMessage: Message = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      sender,
      timestamp: Date.now(),
      ...(stepIndex !== undefined ? { stepIndex } : {}),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  /** Redo replaces the tagged message at `stepIndex` in place — never pops
   *  the array's tail, since the next scripted NPC line may already have
   *  been appended after it (dialogue no longer waits on feedback). */
  const replaceMessageAtStep = (stepIndex: number, text: string) => {
    setMessages(prev => prev.map(m => (m.stepIndex === stepIndex && m.sender === 'user' ? { ...m, text } : m)));
  };

  const upsertPanelEntry = (entryPatch: PanelEntry) => {
    setPanelEntries(prev => {
      const idx = prev.findIndex(e => e.turnKey === entryPatch.turnKey);
      if (idx === -1) return [...prev, entryPatch];
      const next = [...prev];
      next[idx] = entryPatch;
      return next;
    });
  };

  /**
   * Shows typing dots for the duration of the NPC line's speech, then adds it
   * to the transcript. Falls back to a fixed pacing delay when muted or no
   * fr-* voice is installed, so the beat doesn't collapse into an instant cut.
   */
  const speakNpcLine = async (text: string) => {
    setIsTyping(true);
    if (hasFrenchVoice() && !isExaminerVoiceMuted()) {
      // No superseded-generation guard here: `stopExaminerVoice()` (unmount,
      // exit, or the mic starting) only ever cuts the audio early — the line
      // itself still needs to land in the transcript and hand control back
      // to the user, so this always finishes below rather than bailing out.
      await speakExaminerText(text, getExaminerVoiceGeneration());
    } else {
      await new Promise(resolve => setTimeout(resolve, SILENT_TYPING_MS));
    }
    setIsTyping(false);
    addMessage(text, 'ai');
  };

  /** All progression side effects (XP, session record, evidence/beliefs,
   *  achievements) — moved here from the old synchronous handler so both the
   *  fresh-answer and redo paths trigger it identically, only once locked
   *  and resolved (see TurnAttemptTracker). */
  const runOrchestration = (stepIndex: number, transcript: string, question: Question | undefined, language: StoryLanguageResult) => {
    if (language.kind === 'pending') return;
    const fb = language.feedback;

    const unscored = isUnscored(fb);
    const finalScore = fb.scores.overall;
    if (!unscored) {
      setOverallScore(prev => prev + finalScore);
    }

    // Update expression based on feedback — a placeholder offline score must
    // never drive the "confused" reaction; stay neutral instead.
    if (unscored) setExpression('thinking');
    else if (finalScore >= 8) setExpression('excited');
    else if (finalScore >= 6) setExpression('happy');
    else if (finalScore <= 3) setExpression('confused');
    else setExpression('thinking');

    const xpGain = unscored
      ? computeParticipationXPGain(state.profile.streak_days)
      : computeXPGain(finalScore, state.profile.streak_days);

    const session: Session = {
      id: `story-${Date.now()}-${stepIndex}`,
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
  };

  const lockStep = (stepIndex: number) => {
    const record = tracker.lock(stepIndex);
    if (record === null || record.language === null || record.language.kind === 'pending') return;
    runOrchestration(stepIndex, record.transcript, record.question, record.language);
  };

  const submitAnswer = (stepIndex: number, transcript: string, question: Question | undefined, isRedo: boolean) => {
    const attemptSeq = tracker.begin(stepIndex, transcript, question, isRedo);
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
      const language: StoryLanguageResult = isUnscored(fb) ? { kind: 'unscored', feedback: fb } : { kind: 'scored', feedback: fb };

      const record = tracker.resolve(stepIndex, attemptSeq, language);
      if (record === null) return; // stale — a redo has since superseded this attempt

      upsertPanelEntry({ turnKey: stepIndex, transcript: record.transcript, status: 'resolved', feedback: fb });
      runOrchestration(stepIndex, record.transcript, record.question, record.language as StoryLanguageResult);
    })();
  };

  const handleStopRecording = async () => {
    if (!selectedStory) return;

    const redoTarget = redoTargetRef.current;

    if (redoTarget !== null) {
      redoTargetRef.current = null;
      const transcript = await recording.stop();
      const redoneTask = selectedStory.tasks[redoTarget];
      const question = redoneTask ? toStoryQuestion(selectedStory, redoneTask) : undefined;

      replaceMessageAtStep(redoTarget, transcript);
      submitAnswer(redoTarget, transcript, question, true);
      return;
    }

    const transcript = await recording.stop();
    const currentTask = selectedStory.tasks[currentStep];
    const question = currentTask ? toStoryQuestion(selectedStory, currentTask) : undefined;

    addMessage(transcript, 'user', currentStep);
    submitAnswer(currentStep, transcript, question, false);
    lastLockedStepRef.current = currentStep;

    // Mark current objective as completed and advance — the dialogue moves
    // on immediately rather than waiting for feedback to come back.
    const currentObjId = currentTask ? `${selectedStory.id}:${currentTask.taskId}` : undefined;
    setObjectives(prev => prev.map(obj =>
      obj.id === currentObjId ? { ...obj, isCompleted: true } : obj
    ));
    setExpression('neutral');
    const nextStep = currentStep + 1;

    if (nextStep < selectedStory.tasks.length) {
      setCurrentStep(nextStep);
      const nextTask = selectedStory.tasks[nextStep];
      if (nextTask) {
        await speakNpcLine(nextTask.promptFr);
        setExpression('happy');
      }
    } else {
      await speakNpcLine("Excellent travail ! L'échange est terminé.");
      setExpression('excited');
      setIsFinished(true);
      // Story end locks the final step the same way normal advance does —
      // no separate "next mic-start" will ever come to trigger it.
      if (lastLockedStepRef.current !== null) {
        lockStep(lastLockedStepRef.current);
        lastLockedStepRef.current = null;
      }
    }
  };

  const handleRedo = (stepIndex: number) => {
    if (!tracker.canRedo(stepIndex)) return;
    redoTargetRef.current = stepIndex;
    stopExaminerVoice();
    recording.start();
  };

  if (!selectedStory) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate('/explore')}
            className="p-2 rounded-lg hover:bg-white/5 text-ink-muted transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white">Story Mode</h1>
            <p className="text-sm text-ink-muted">Immerse yourself in interactive French scenarios.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STORY_CARDS.map((story) => (
            <motion.button
              key={story.id}
              onClick={() => selectStory(story)}
              className="surface-raised p-6 text-left group hover:border-emerald-500/30 transition-all relative overflow-hidden"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/10">
                  <BookOpen size={24} />
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => (
                    <Star key={i} size={10} className={i <= 2 ? 'text-emerald-400 fill-emerald-400' : 'text-slate-800'} />
                  ))}
                </div>
              </div>
              <h3 className="font-bold text-white mb-2 line-clamp-2 relative z-10">{story.scenario}</h3>
              <p className="text-xs text-ink-muted mb-4 line-clamp-1"><b>Role:</b> {story.npc.nameFr}</p>
              <div className="flex items-center justify-between mt-6 relative z-10">
                <span className="text-[10px] font-bold text-ink-subtle uppercase tracking-widest flex items-center gap-1.5">
                  <MessageSquare size={12} />
                  {story.tasks.length} Exchanges
                </span>
                <div className="text-emerald-400 flex items-center gap-1 text-[10px] font-bold">
                  PLAY <ChevronRight size={14} />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  if (isPrepping) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 h-[calc(100vh-2rem)] flex flex-col">
        <div className="mb-6 flex items-center gap-3">
           <button
            onClick={() => {
              setIsPrepping(false);
              setSelectedStory(null);
            }}
            className="p-2 rounded-lg hover:bg-white/5 text-ink-muted transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-black text-white uppercase italic">Prep Phase</h2>
        </div>
        <div className="flex-1 overflow-hidden">
          <StoryModePrep
            story={selectedStory}
            onReady={startStory}
            onCancel={() => {
              setIsPrepping(false);
              setSelectedStory(null);
            }}
          />
        </div>
      </div>
    );
  }

  const currentTask = selectedStory.tasks[currentStep];

  return (
    <VisualNovelView
      topic={selectedStory.scenario}
      npc={selectedStory.npc}
      expression={expression}
      messages={messages.map(({ text, sender }) => ({ text, sender }))}
      objectives={objectives}
      currentInstruction={currentTask?.promptEn}
      isTyping={isTyping}
      recording={{ ...recording, start: startRecording }}
      panelEntries={panelEntries}
      canRedo={(stepIndex) => tracker.canRedo(stepIndex)}
      redosLeft={(stepIndex) => MAX_REDOS - (tracker.get(stepIndex)?.retryCount ?? 0)}
      onStopRecording={handleStopRecording}
      onRedo={handleRedo}
      onExit={() => {
        stopExaminerVoice();
        setSelectedStory(null);
      }}
    />
  );
}

function StoryModePrep({
  story,
  onReady,
  onCancel,
}: {
  story: StoryCard;
  onReady: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="h-full flex flex-col bg-navy/60 backdrop-blur-xl rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
      <div className="p-8 pb-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">Roleplay Card</h2>
          <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">
            {story.tasks.length} exchange{story.tasks.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-xs font-black text-ink-muted hover:text-white transition-colors uppercase tracking-widest"
        >
          Cancel
        </button>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        <p className="text-sm text-ink-muted leading-relaxed bg-white/5 border border-white/10 rounded-2xl p-4">
          {story.scenario}
        </p>
        <p className="text-xs text-ink-muted mt-4">
          You'll be speaking with <span className="text-ink-muted font-bold">{story.npc.nameFr}</span>.
        </p>
      </div>

      <div className="p-8 pt-0">
        <button
          onClick={onReady}
          className="w-full py-5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-violet-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 uppercase italic tracking-wider group"
        >
          Start Roleplay
          <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
