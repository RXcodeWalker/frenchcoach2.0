import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowLeft, MessageSquare, Star, ChevronRight } from 'lucide-react';
import { useApp, dispatchAddXP } from '../context/AppContext';
import roleplays from '../data/raw/roleplays.json';
import allQuestions from '../data/raw/questions.json';
import { useRecording } from '../features/recording/useRecording';
import { getAIFeedback, getRoleplayTurn } from '../services/api/apiClient';
import { VisualNovelView } from '../components/ui/VisualNovelView';
import type { Expression } from '../components/ui/CharacterAvatar';
import type { Objective } from '../components/ui/MissionObjectivesList';
import type { FeedbackV2, Question, Session } from '../types';
import { orchestrateAttempt } from '../services/coach/sessionOrchestrator';
import { getSkillProfile } from '../services/coaching/diagnosticEngine';
import { isUnscored } from '../domain/scoring';
import { buildTier0Result } from '../services/coaching/responseTier';
import { computeXPGain, computeParticipationXPGain } from '../domain/xp';
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

interface Roleplay {
  id: string;
  scenario: string;
  candidate_role?: string;
  examiner_role?: string;
  question_ids: string[];
}

interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  timestamp: number;
}

export function StoryMode() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const recording = useRecording();
  
  const [selectedStory, setSelectedStory] = useState<Roleplay | null>(null);
  const [isPrepping, setIsPrepping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [showFeedback, setShowFeedbackV2] = useState(false);
  const [lastFeedback, setLastFeedbackV2] = useState<FeedbackV2 | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [expression, setExpression] = useState<Expression>('neutral');
  const [, setOverallScore] = useState(0);
  const [, setIsFinished] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

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
    stopExaminerVoice();
    recording.start();
  };

  const selectStory = (story: Roleplay) => {
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
    setShowFeedbackV2(false);
    setLastFeedbackV2(null);
    setOverallScore(0);
    setIsFinished(false);
    setExpression('happy');

    // Initialize Objectives
    const objs: Objective[] = selectedStory.question_ids.map((qid, i) => {
      const q = allQuestions.find(item => item.id === qid);
      return {
        id: qid,
        text: q?.instruction || `Complete part ${i + 1} of the exchange`,
        isCompleted: false
      };
    });
    setObjectives(objs);

    const firstQId = selectedStory.question_ids[0];
    const question = allQuestions.find(q => q.id === firstQId);

    if (question) {
      void speakNpcLine(question.text);
    }
  };

  const addMessage = (text: string, sender: 'ai' | 'user') => {
    const newMessage: Message = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      sender,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMessage]);
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

  const handleStopRecording = async () => {
    if (!selectedStory) return;

    setIsProcessing(true);
    const transcript = await recording.stop();
    const wordCount = transcript.split(/\s+/).filter(Boolean).length;

    const currentQId = selectedStory.question_ids[currentStep];
    const question = allQuestions.find(q => q.id === currentQId) as Question | undefined;

    let fb: FeedbackV2;
    if (!question) {
      // roleplays.json ↔ questions.json join is broken for most rows (Stage
      // 10 retires it) — when this step's question doesn't resolve, there is
      // nothing to score against. Report it honestly rather than fabricating
      // a mark or crashing getAIFeedback on a missing question.
      fb = { ...buildTier0Result(), unscored: 'evaluation_failed', wordCount };
    } else {
      try {
        fb = await getAIFeedback(transcript, question);
      } catch {
        fb = { ...buildTier0Result(), unscored: 'no_llm_offline', wordCount };
      }
    }

    setIsProcessing(false);
    addMessage(transcript, 'user');
    setLastFeedbackV2(fb);
    setShowFeedbackV2(true);

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
      id: `story-${Date.now()}-${currentStep}`,
      mode: 'story',
      topicKey: selectedStory.id,
      questionText: question?.text,
      transcript,
      wordCount: fb.wordCount,
      score: unscored ? null : finalScore,
      xpEarned: xpGain.gain,
      durationSec: recording.elapsedTime,
      feedback: fb,
      createdAt: new Date().toISOString(),
    };

    // All progression side effects (XP, session record, evidence/beliefs,
    // achievements) flow through the same contract every other mode uses —
    // never a raw dispatchAddXP from this runtime.
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

  const handleRetryTurn = () => {
    // No outcome log exists on this runtime (unlike the graph-based roleplay
    // session) — retry means "let the user re-record this same question,"
    // discarding the just-scored attempt rather than replaying an outcome.
    setShowFeedbackV2(false);
    setLastFeedbackV2(null);
    setMessages(prev => prev.slice(0, -1));
    setExpression('neutral');
  };

  const handleNextStep = async () => {
    if (!selectedStory) return;

    // Check if we should use LLM fallback for off-script response
    const lastCommScore = lastFeedback?.scores.communication || 0;
    const isOffScript = lastCommScore < 4;

    if (isOffScript && currentStep < selectedStory.question_ids.length) {
      setIsTyping(true);
      setShowFeedbackV2(false);
      try {
        const history: { speaker: 'examiner' | 'student'; text: string }[] = messages.map(m => ({
          speaker: m.sender === 'ai' ? 'examiner' : 'student',
          text: m.text
        }));
        
        const turn = await getRoleplayTurn({
          scenario_id: 'custom',
          turn_history: history,
          student_transcript: messages[messages.length - 1].text,
          is_final_turn: currentStep === selectedStory.question_ids.length - 1
        });

        await speakNpcLine(turn.reply);
        setExpression('thinking');
        // We stay on the current step if they are off-script to let them try again
        // or we can move forward if the LLM guided them back.
        // For now, let's keep them on the step until they pass.
        return; 
      } catch (e) {
        console.error("LLM Fallback failed:", e);
      }
    }

    // Mark current objective as completed
    const currentQId = selectedStory?.question_ids[currentStep];
    setObjectives(prev => prev.map(obj => 
      obj.id === currentQId ? { ...obj, isCompleted: true } : obj
    ));

    setShowFeedbackV2(false);
    setLastFeedbackV2(null);
    setExpression('neutral');
    const nextStep = currentStep + 1;
    
    if (nextStep < selectedStory.question_ids.length) {
      setCurrentStep(nextStep);
      const nextQId = selectedStory.question_ids[nextStep];
      const question = allQuestions.find(q => q.id === nextQId);

      if (question) {
        await speakNpcLine(question.text);
        setExpression('happy');
      }
    } else {
      await speakNpcLine("Excellent travail ! L'échange est terminé.");
      setExpression('excited');
      setIsFinished(true);
      dispatchAddXP(dispatch, 50, 'story');
    }
  };

  if (!selectedStory) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <button 
            onClick={() => navigate('/explore')}
            className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white">Story Mode</h1>
            <p className="text-sm text-slate-500">Immerse yourself in interactive French scenarios.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roleplays.map((story) => (
            <motion.button
              key={story.id}
              onClick={() => selectStory(story as Roleplay)}
              className="glass-elevated p-6 text-left group hover:border-emerald-500/30 transition-all relative overflow-hidden"
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
              {story.candidate_role && (
                <p className="text-xs text-slate-400 mb-4 line-clamp-1"><b>Role:</b> {story.candidate_role}</p>
              )}
              <div className="flex items-center justify-between mt-6 relative z-10">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                  <MessageSquare size={12} />
                  {story.question_ids.length} Exchanges
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
            className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"
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

  const currentQId = selectedStory.question_ids[currentStep];
  const currentQuestionData = allQuestions.find(q => q.id === currentQId) as
    | { instruction?: string }
    | undefined;

  return (
    <VisualNovelView
      topic={selectedStory.scenario}
      npc={{ nameFr: selectedStory.examiner_role || 'Friend', emoji: '👤' }}
      expression={expression}
      messages={messages}
      objectives={objectives}
      currentInstruction={currentQuestionData?.instruction}
      isTyping={isTyping}
      isProcessing={isProcessing}
      recording={{ ...recording, start: startRecording }}
      showFeedback={showFeedback}
      lastFeedback={lastFeedback}
      onStopRecording={handleStopRecording}
      onRetry={handleRetryTurn}
      onNextStep={handleNextStep}
      onExit={() => {
        stopExaminerVoice();
        setSelectedStory(null);
      }}
    />
  );
}

/**
 * Interim prep block for the roleplays.json-driven exam cards. Not
 * ScenarioPrepScreen: that component now speaks the registry's ScenarioMeta /
 * VocabEntry[] / Mission[] shapes (Stage 7 of the Explore & Roleplay
 * overhaul), and StoryMode has none of that — no deck, and its "missions"
 * are just per-question `instruction` strings on Roleplay.question_ids.
 * Stage 10 (Story Mode rebuild, tracked separately) replaces roleplays.json
 * with roleplayCards.ts's `prompt_en` task list and gives this screen a real
 * mission briefing; until then this is deliberately minimal.
 */
function StoryModePrep({
  story,
  onReady,
  onCancel,
}: {
  story: Roleplay;
  onReady: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="h-full flex flex-col bg-navy/60 backdrop-blur-xl rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
      <div className="p-8 pb-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">Roleplay Card</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            {story.question_ids.length} exchange{story.question_ids.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-xs font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest"
        >
          Cancel
        </button>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        <p className="text-sm text-slate-300 leading-relaxed bg-white/5 border border-white/10 rounded-2xl p-4">
          {story.scenario}
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
