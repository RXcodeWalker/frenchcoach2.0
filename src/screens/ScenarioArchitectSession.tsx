import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Bot,
  Target,
  Loader2,
  Mic,
  Square,
  Book,
  Lightbulb,
  Volume2,
  VolumeX,
  Keyboard,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Wand2,
  X,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { useRecording } from '../features/recording/useRecording';
import { Waveform } from '../features/recording/Waveform';
import { useApp, dispatchAddXP } from '../context/AppContext';
import { roleplayTurn, getAIFeedback } from '../services/api/apiClient';
import { observeAttempt } from '../services/coach/sessionOrchestrator';
import { getSkillProfile } from '../services/coaching/diagnosticEngine';
import { recordRoleplayComplete } from '../services/progression/progressionService';
import { recordSession } from '../services/analytics/analyticsService';
import { TTS } from '../services/tts/ttsService';
import type { FeedbackV2, GeneratedScenario, Session } from '../types';
import {
  XP_MISSION_BONUS,
  XP_PER_OBJECTIVE,
  SUGGESTED_TURN_BUDGET,
  isTtsMuted,
  mergeUniqueNotes,
  resolveCompletedObjectives,
  setTtsMuted,
  tipsFromFeedback,
  withDifficultyPersona,
  type ArchitectDifficulty,
  type ArchitectSessionConfig,
  type MissionLanguageNote,
} from '../features/scenarioArchitect';
import { loadDraft, saveDraft } from '../features/scenarioArchitect/persistence';

interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  tip?: string | null;
}

type Phase = 'briefing' | 'playing' | 'complete';

function newId() {
  return Math.random().toString(36).substring(2, 9);
}

export function ScenarioArchitectSession() {
  const location = useLocation();
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const recording = useRecording();
  const scrollRef = useRef<HTMLDivElement>(null);
  const startedAtRef = useRef(Date.now());
  const missionLoggedRef = useRef(false);

  const config = useMemo(() => {
    const state = location.state as ArchitectSessionConfig | { customScenario?: GeneratedScenario } | null;
    if (!state) return null;
    if ('customScenario' in state && state.customScenario && 'difficulty' in state) {
      return state as ArchitectSessionConfig;
    }
    if ('customScenario' in state && state.customScenario) {
      // Legacy navigation from older callers
      return {
        customScenario: state.customScenario,
        description: loadDraft()?.description ?? '',
        difficulty: 'standard' as ArchitectDifficulty,
        skipBriefing: false,
      };
    }
    // Resume from draft
    const draft = loadDraft();
    if (draft?.scenario) {
      return {
        customScenario: draft.scenario,
        description: draft.description,
        difficulty: draft.difficulty,
        skipBriefing: false,
      };
    }
    return null;
  }, [location.state]);

  const customScenario = config?.customScenario ?? null;
  const difficulty: ArchitectDifficulty = config?.difficulty ?? 'standard';

  const [phase, setPhase] = useState<Phase>(() =>
    config?.skipBriefing ? 'playing' : 'briefing'
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedObjectives, setCompletedObjectives] = useState<number[]>([]);
  const [justCompleted, setJustCompleted] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showObjectives, setShowObjectives] = useState(false);
  const [showVocab, setShowVocab] = useState(difficulty === 'supported');
  const [hint, setHint] = useState<string | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [idleOfferHint, setIdleOfferHint] = useState(false);
  const [ttsMuted, setTtsMutedState] = useState(() => isTtsMuted());
  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [languageNotes, setLanguageNotes] = useState<MissionLanguageNote[]>([]);
  const [modelLine, setModelLine] = useState<string | null>(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [usedVocab, setUsedVocab] = useState<Set<string>>(() => new Set());

  const studentTurns = messages.filter(m => m.sender === 'user').length;
  const showWrapNudge =
    phase === 'playing' &&
    studentTurns >= SUGGESTED_TURN_BUDGET &&
    completedObjectives.length < (customScenario?.objectives.length ?? 0);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const speakNpc = useCallback(
    (text: string) => {
      if (ttsMuted || !TTS.isSupported()) return;
      const rate = difficulty === 'supported' ? 0.8 : difficulty === 'immersion' ? 1.0 : 0.9;
      void TTS.speak(text, { rate }).catch(() => undefined);
    },
    [ttsMuted, difficulty]
  );

  const addMessage = useCallback((text: string, sender: 'ai' | 'user', tip?: string | null) => {
    setMessages(prev => [...prev, { id: newId(), text, sender, tip: tip ?? null }]);
  }, []);

  // Redirect if nothing to play
  useEffect(() => {
    if (!config || !customScenario) {
      navigate('/scenario-architect');
    }
  }, [config, customScenario, navigate]);

  // Start opening line once playing
  useEffect(() => {
    if (!customScenario || phase !== 'playing' || conversationStarted) return;
    setConversationStarted(true);
    startedAtRef.current = Date.now();
    setIsTyping(true);
    const t = window.setTimeout(() => {
      setIsTyping(false);
      addMessage(customScenario.opening_line, 'ai');
      speakNpc(customScenario.opening_line);
    }, 1200);
    return () => window.clearTimeout(t);
  }, [customScenario, phase, conversationStarted, addMessage, speakNpc]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, toast]);

  // Idle hint offer
  useEffect(() => {
    if (phase !== 'playing' || isTyping || isProcessing || recording.isRecording || hintUsed) {
      setIdleOfferHint(false);
      return;
    }
    const t = window.setTimeout(() => setIdleOfferHint(true), 20000);
    return () => window.clearTimeout(t);
  }, [phase, isTyping, isProcessing, recording.isRecording, hintUsed, messages.length]);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const completeMission = useCallback(
    (finalCompleted: number[], notes: MissionLanguageNote[], earnedXp: number) => {
      if (missionLoggedRef.current || !customScenario) return;
      missionLoggedRef.current = true;

      const bonus = XP_MISSION_BONUS;
      dispatchAddXP(dispatch, bonus);
      const totalXp = earnedXp + bonus;
      setXpEarned(totalXp);

      recordRoleplayComplete();

      const durationSec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
      const transcripts = messagesRef.current.filter(m => m.sender === 'user').map(m => m.text);
      const wordCount = transcripts.join(' ').split(/\s+/).filter(Boolean).length;
      const session: Session = {
        id: `scenario-architect-${Date.now()}`,
        mode: 'roleplay',
        topicKey: customScenario.title,
        questionText: customScenario.scenario,
        transcript: transcripts.join('\n'),
        wordCount,
        score: null,
        xpEarned: totalXp,
        durationSec,
        createdAt: new Date().toISOString(),
      };
      recordSession(session);

      setLanguageNotes(notes);
      setCompletedObjectives(finalCompleted);
      setShowConfetti(true);
      setPhase('complete');
      window.setTimeout(() => setShowConfetti(false), 2500);
    },
    [customScenario, dispatch]
  );

  const applyObjectiveProgress = useCallback(
    (
      nextCompleted: number[],
      notes: MissionLanguageNote[],
      opts?: { forceDone?: boolean }
    ) => {
      if (!customScenario) return;

      const newly = nextCompleted.filter(i => !completedObjectives.includes(i));
      let earned = xpEarned;
      if (newly.length > 0) {
        const gain = newly.length * XP_PER_OBJECTIVE;
        earned += gain;
        setXpEarned(earned);
        dispatchAddXP(dispatch, gain);
        const last = newly[newly.length - 1];
        setJustCompleted(last);
        showToast(`Objective ${last + 1} cleared`);
        window.setTimeout(() => setJustCompleted(null), 1200);
      }
      setCompletedObjectives(nextCompleted);

      const allDone =
        opts?.forceDone ||
        nextCompleted.length >= customScenario.objectives.length;
      if (allDone) {
        completeMission(nextCompleted, notes, earned);
      }
    },
    [customScenario, completedObjectives, xpEarned, dispatch, showToast, completeMission]
  );

  const processTurn = async (transcript: string) => {
    if (!customScenario || !config) return;
    const trimmed = transcript.trim();
    if (!trimmed) {
      showToast("Didn't catch that — try again");
      return;
    }

    setIsProcessing(true);
    setHint(null);
    setHintUsed(false);
    setIdleOfferHint(false);

    try {
      addMessage(trimmed, 'user');

      // Vocab used tracking
      const lower = trimmed.toLowerCase();
      setUsedVocab(prev => {
        const next = new Set(prev);
        for (const v of customScenario.key_vocab) {
          if (lower.includes(v.fr.toLowerCase())) next.add(v.fr);
        }
        return next;
      });

      setIsTyping(true);
      const turnHistory = messages.map(m => ({
        speaker: (m.sender === 'ai' ? 'examiner' : 'student') as 'examiner' | 'student',
        text: m.text,
      }));

      const scenarioForApi = withDifficultyPersona(customScenario, difficulty);

      let data: Awaited<ReturnType<typeof roleplayTurn>>;
      try {
        data = await roleplayTurn('custom', turnHistory, trimmed, scenarioForApi, {
          difficulty,
        });
      } catch (err) {
        console.error(err);
        setIsTyping(false);
        showToast("NPC didn't reply — retry");
        return;
      }

      setIsTyping(false);
      addMessage(data.reply, 'ai');
      speakNpc(data.reply);
      if (data.hint) setHint(data.hint);

      let fb: FeedbackV2;
      try {
        const diffNum = difficulty === 'supported' ? 1 : difficulty === 'immersion' ? 3 : 2;
        fb = await getAIFeedback(trimmed, {
          id: 'scenario-architect',
          text: customScenario.title,
          topicKey: 'scenario',
          hint: '',
          difficulty: diffNum as 1 | 2 | 3,
          followUps: [],
          modelAnswer: '',
          keyVocab: customScenario.key_vocab,
        });
      } catch {
        fb = {
          scores: { overall: 0, communication: 0, language: 0, fluency: 0 },
          unscored: 'evaluation_failed',
          grammar: { critical: [], polish: [] },
          vocabulary: [],
          style: [],
          fillers: [],
          wordCount: trimmed.split(/\s+/).filter(Boolean).length,
          cefrLevel: 'A2',
        };
      }

      observeAttempt({
        sessionId: `scenario-architect-${Date.now()}-${messages.length}`,
        question: null,
        feedback: fb,
        transcript: trimmed,
        finalScore: fb.scores.overall,
        mode: 'scenario-architect',
        topicKey: customScenario.title,
      });
      dispatch({ type: 'UPDATE_SKILL_PROFILE', skillProfile: getSkillProfile() });

      const tipNotes = tipsFromFeedback(fb);
      const mergedNotes = mergeUniqueNotes(languageNotes, tipNotes, 3);
      setLanguageNotes(mergedNotes);
      if (fb.improved_answer || fb.rephrase) {
        setModelLine(fb.improved_answer || fb.rephrase || null);
      }
      if (tipNotes[0]) {
        setMessages(prev => {
          const copy = [...prev];
          // Attach tip to the user message we just added (last user msg)
          for (let i = copy.length - 1; i >= 0; i--) {
            if (copy[i].sender === 'user') {
              copy[i] = { ...copy[i], tip: tipNotes[0].text };
              break;
            }
          }
          return copy;
        });
      }

      const studentTranscripts = [
        ...messages.filter(m => m.sender === 'user').map(m => m.text),
        trimmed,
      ];
      const nextCompleted = resolveCompletedObjectives({
        objectives: customScenario.objectives,
        keyVocab: customScenario.key_vocab,
        studentTranscripts,
        alreadyCompleted: completedObjectives,
        apiCompleted: data.completed_objectives ?? null,
        missionDone: data.is_done,
      });

      applyObjectiveProgress(nextCompleted, mergedNotes, { forceDone: data.is_done });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStopRecording = async () => {
    setIsProcessing(true);
    try {
      const transcript = await recording.stop();
      await processTurn(transcript);
    } catch (err) {
      console.error(err);
      showToast("Didn't catch that — try again");
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim() || isProcessing || isTyping) return;
    const value = textInput;
    setTextInput('');
    await processTurn(value);
  };

  const handleRevealHint = () => {
    if (hint) {
      setHintUsed(true);
      setIdleOfferHint(false);
      showToast(hint);
    } else if (customScenario) {
      const next = customScenario.objectives.findIndex((_, i) => !completedObjectives.includes(i));
      if (next >= 0) {
        setHintUsed(true);
        showToast(`Focus: ${customScenario.objectives[next]}`);
      }
    }
  };

  const handleEndSession = () => {
    if (phase === 'playing' && messages.some(m => m.sender === 'user') && !showEndConfirm) {
      setShowEndConfirm(true);
      return;
    }
    // Preserve scenario in draft
    if (customScenario && config) {
      saveDraft({
        description: config.description,
        scenario: customScenario,
        difficulty,
      });
    }
    TTS.stop();
    navigate('/scenario-architect');
  };

  const resetForReplay = (next: ArchitectSessionConfig) => {
    TTS.stop();
    missionLoggedRef.current = false;
    setMessages([]);
    setCompletedObjectives([]);
    setJustCompleted(null);
    setHint(null);
    setHintUsed(false);
    setIdleOfferHint(false);
    setLanguageNotes([]);
    setModelLine(null);
    setXpEarned(0);
    setUsedVocab(new Set());
    setShowVocab(next.difficulty === 'supported');
    setConversationStarted(false);
    setShowConfetti(false);
    setPhase(next.skipBriefing ? 'playing' : 'briefing');
    navigate('/scenario-architect/session', { state: next, replace: true });
  };

  const handleReplay = () => {
    if (!customScenario || !config) return;
    resetForReplay({ ...config, skipBriefing: true });
  };

  const handleHarderReplay = () => {
    if (!customScenario || !config) return;
    const nextDiff: ArchitectDifficulty =
      difficulty === 'supported' ? 'standard' : 'immersion';
    resetForReplay({ ...config, difficulty: nextDiff, skipBriefing: true });
  };

  const handleTwist = () => {
    if (!config) return;
    saveDraft({
      description: `${config.description} Make it more dramatic.`,
      scenario: null,
      difficulty,
    });
    navigate(`/scenario-architect?prompt=${encodeURIComponent(`${config.description} Make it more dramatic.`)}`);
  };

  if (!customScenario || !config) return null;

  const briefingVocab = customScenario.key_vocab.slice(0, 3);

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-2rem)] flex flex-col pt-4 relative px-4">
      {/* Toasts */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-white shadow-xl max-w-sm text-center"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confetti burst */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-[55] overflow-hidden"
          >
            {Array.from({ length: 24 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute w-2 h-2 rounded-sm"
                style={{
                  left: `${8 + (i * 37) % 84}%`,
                  top: '-8%',
                  background: ['#10b981', '#8b5cf6', '#f59e0b', '#38bdf8'][i % 4],
                }}
                animate={{ y: '110vh', rotate: 360 + i * 20, opacity: [1, 1, 0] }}
                transition={{ duration: 1.6 + (i % 5) * 0.15, ease: 'easeIn' }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Briefing */}
      {phase === 'briefing' && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex items-center justify-center"
        >
          <Card variant="elevated" className="w-full max-w-lg p-8 space-y-6 border-violet-500/20">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest">
                Mission Briefing
              </p>
              <h2 className="text-2xl font-black text-white italic">{customScenario.title}</h2>
              <p className="text-slate-400 text-sm leading-relaxed">{customScenario.scenario}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">You will talk to</p>
              <p className="text-white font-black">{customScenario.npc_name}</p>
              <p className="text-xs text-slate-500 italic">{customScenario.npc_personality}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Succeed by</p>
              <ul className="space-y-1.5">
                {customScenario.objectives.map((o, i) => (
                  <li key={i} className="text-sm text-slate-300 flex gap-2">
                    <span className="text-emerald-500 font-black">{i + 1}.</span>
                    {o}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Starter vocab</p>
              <div className="flex flex-wrap gap-2">
                {briefingVocab.map(v => (
                  <span
                    key={v.fr}
                    className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-xs"
                  >
                    <span className="font-black text-white italic">{v.fr}</span>
                    {difficulty !== 'immersion' && (
                      <span className="text-slate-500 ml-1.5">{v.en}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Tip: reply to {customScenario.npc_name} in French. Aim for about {SUGGESTED_TURN_BUDGET}{' '}
              turns.
            </p>
            <button
              onClick={() => setPhase('playing')}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl uppercase italic tracking-widest"
            >
              Begin
            </button>
            <button
              onClick={() => navigate('/scenario-architect')}
              className="w-full py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white"
            >
              Back to preview
            </button>
          </Card>
        </motion.div>
      )}

      {/* Playing */}
      {phase === 'playing' && (
        <>
          <div className="flex-shrink-0 mb-4">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={handleEndSession}
                className="flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest"
              >
                <ArrowLeft size={14} /> End session
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const next = !ttsMuted;
                    setTtsMutedState(next);
                    setTtsMuted(next);
                    if (next) TTS.stop();
                  }}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white"
                  aria-label={ttsMuted ? 'Unmute NPC voice' : 'Mute NPC voice'}
                >
                  {ttsMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                    Live
                  </span>
                </div>
              </div>
            </div>

            <Card variant="subtle" className="p-4 border-white/5 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-white/5 shrink-0">
                    <User size={20} className="text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-black text-white italic tracking-tight truncate">
                      {customScenario.npc_name}
                    </h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter truncate">
                      {customScenario.title}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">
                    Objectives
                  </span>
                  <div className="flex gap-1">
                    {customScenario.objectives.map((_, i) => (
                      <motion.div
                        key={i}
                        animate={
                          justCompleted === i
                            ? { scale: [1, 1.4, 1] }
                            : { scale: 1 }
                        }
                        className={`w-4 h-1.5 rounded-full transition-all duration-500 ${
                          completedObjectives.includes(i)
                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                            : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {showWrapNudge && (
                <p className="text-[10px] text-amber-400/90 font-bold uppercase tracking-wider">
                  Wrap up soon — finish remaining objectives or end the session
                </p>
              )}
            </Card>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto space-y-6 mb-4 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
          >
            <div className="max-w-2xl mx-auto space-y-6">
              <AnimatePresence initial={false}>
                {messages.map(msg => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex ${msg.sender === 'ai' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center border ${
                          msg.sender === 'ai'
                            ? 'bg-violet-500/10 border-violet-500/20 text-violet-400'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {msg.sender === 'ai' ? <Bot size={16} /> : <User size={16} />}
                      </div>
                      <div className="space-y-1.5">
                        <div
                          className={`p-4 rounded-2xl text-sm md:text-base ${
                            msg.sender === 'ai'
                              ? 'bg-white/5 border border-white/5 text-slate-200 rounded-tl-none'
                              : 'bg-emerald-600 text-white font-medium rounded-tr-none shadow-lg shadow-emerald-600/10'
                          }`}
                        >
                          {msg.text}
                        </div>
                        {msg.tip && (
                          <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 max-w-xs">
                            {msg.tip}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                        <Bot size={16} />
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5 rounded-tl-none flex gap-1 items-center">
                        <span
                          className="w-1 h-1 bg-slate-500 rounded-full animate-bounce"
                          style={{ animationDelay: '0ms' }}
                        />
                        <span
                          className="w-1 h-1 bg-slate-500 rounded-full animate-bounce"
                          style={{ animationDelay: '150ms' }}
                        />
                        <span
                          className="w-1 h-1 bg-slate-500 rounded-full animate-bounce"
                          style={{ animationDelay: '300ms' }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Input */}
          <div className="flex-shrink-0 pb-4 space-y-3">
            <div className="max-w-2xl mx-auto">
              {(idleOfferHint || (difficulty === 'supported' && hint && !hintUsed)) && (
                <button
                  onClick={handleRevealHint}
                  className="mb-3 flex items-center gap-2 text-[10px] font-black text-amber-400 uppercase tracking-widest hover:text-amber-300"
                >
                  <Lightbulb size={12} /> Need a nudge?
                </button>
              )}

              {recording.isRecording ? (
                <Card
                  variant="elevated"
                  className="p-6 border-emerald-500/30 bg-emerald-500/[0.02]"
                >
                  <div className="flex flex-col items-center gap-6">
                    <div className="w-full h-12 flex items-center justify-center">
                      <Waveform
                        isRecording={true}
                        source={recording.micLevel}
                        data={recording.waveData}
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handleStopRecording}
                        disabled={isProcessing}
                        className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-xl shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
                      >
                        {isProcessing ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Square size={24} className="fill-white" />
                        )}
                      </button>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                          Listening...
                        </span>
                        <span className="text-xs text-slate-500 font-bold uppercase italic">
                          Respond in French
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : textMode ? (
                <div className="flex gap-2">
                  <input
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') void handleTextSubmit();
                    }}
                    disabled={isTyping || isProcessing}
                    placeholder="Type your French reply…"
                    className="flex-1 px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/40"
                  />
                  <button
                    onClick={() => void handleTextSubmit()}
                    disabled={isTyping || isProcessing || !textInput.trim()}
                    className="px-5 py-4 rounded-2xl bg-emerald-600 disabled:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest"
                  >
                    Send
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => recording.start()}
                    disabled={isTyping || isProcessing}
                    className="flex-1 flex items-center justify-center gap-3 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/20 transition-all uppercase italic tracking-widest group"
                  >
                    <Mic size={20} className="group-hover:scale-110 transition-transform" />
                    Tap to Speak
                  </button>

                  <button
                    onClick={() => setShowObjectives(true)}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-500 hover:text-white transition-colors"
                    aria-label="Show objectives"
                  >
                    <Target size={20} />
                  </button>

                  <button
                    onClick={() => setShowVocab(v => !v)}
                    className={`p-4 rounded-2xl border transition-colors ${
                      showVocab
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'
                    }`}
                    aria-label="Toggle vocab cheat sheet"
                  >
                    <Book size={20} />
                  </button>

                  <button
                    onClick={() => setTextMode(true)}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-500 hover:text-white transition-colors"
                    aria-label="Type instead"
                  >
                    <Keyboard size={20} />
                  </button>
                </div>
              )}

              {textMode && !recording.isRecording && (
                <button
                  onClick={() => setTextMode(false)}
                  className="mt-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white"
                >
                  Use microphone
                </button>
              )}
            </div>

            <AnimatePresence>
              {showVocab && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="max-w-2xl mx-auto overflow-hidden"
                >
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-wrap gap-2">
                    <span className="w-full text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Cheat sheet
                    </span>
                    {customScenario.key_vocab.map(v => (
                      <span
                        key={v.fr}
                        className={`px-2 py-1 rounded-lg text-xs border ${
                          usedVocab.has(v.fr)
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                            : 'border-white/5 bg-black/20 text-slate-300'
                        }`}
                      >
                        <span className="font-black italic">{v.fr}</span>
                        {difficulty !== 'immersion' && (
                          <span className="text-slate-500 ml-1">{v.en}</span>
                        )}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Mission complete */}
      {phase === 'complete' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex items-center justify-center"
        >
          <Card variant="elevated" className="w-full max-w-lg p-8 space-y-6 border-emerald-500/30">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 mb-2">
                <Sparkles size={28} />
              </div>
              <h2 className="text-2xl font-black text-white italic tracking-tight">
                Mission Complete
              </h2>
              <p className="text-slate-400 text-sm">{customScenario.title}</p>
            </div>

            <div className="space-y-2">
              {customScenario.objectives.map((obj, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span className={completedObjectives.includes(i) ? '' : 'text-slate-500'}>
                    {obj}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                  Turns
                </p>
                <p className="text-xl font-black text-white">{studentTurns}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                  XP earned
                </p>
                <p className="text-xl font-black text-emerald-400">+{xpEarned}</p>
              </div>
            </div>

            {languageNotes.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Things to improve
                </p>
                {languageNotes.map((n, i) => (
                  <p key={i} className="text-xs text-slate-300 p-2.5 rounded-xl bg-white/5 border border-white/5">
                    {n.text}
                  </p>
                ))}
              </div>
            )}

            {modelLine && (
              <div className="space-y-2 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest">
                  Say this better
                </p>
                <p className="text-sm text-white italic">{modelLine}</p>
                <button
                  onClick={() => {
                    setTextMode(true);
                    setPhase('playing');
                    missionLoggedRef.current = true; // don't re-complete
                    setConversationStarted(true);
                    showToast('Try saying the improved line aloud');
                  }}
                  className="text-[10px] font-black text-emerald-400 uppercase tracking-widest hover:text-emerald-300"
                >
                  Practice once more
                </button>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={handleReplay}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl uppercase text-xs tracking-widest"
              >
                <RotateCcw size={14} /> Replay scene
              </button>
              <button
                onClick={handleHarderReplay}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-white/5 border border-white/10 text-white font-black rounded-2xl uppercase text-xs tracking-widest hover:bg-white/10"
              >
                Harder NPC
              </button>
              <div className="space-y-2 pt-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
                  Mission Director — next scene
                </p>
                {[
                  'The other person becomes impatient.',
                  'You forgot your wallet / tickets.',
                  'A surprise complication appears.',
                ].map(fork => (
                  <button
                    key={fork}
                    onClick={() => {
                      const nextPrompt = `${config.description} Continue the story: ${fork}`;
                      saveDraft({
                        description: nextPrompt,
                        scenario: null,
                        difficulty,
                      });
                      navigate(`/scenario-architect?prompt=${encodeURIComponent(nextPrompt)}`);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-slate-200 hover:bg-violet-500/15"
                  >
                    {fork}
                  </button>
                ))}
              </div>
              <button
                onClick={handleTwist}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-white/5 border border-white/10 text-slate-300 font-black rounded-2xl uppercase text-xs tracking-widest hover:bg-white/10"
              >
                <Wand2 size={14} /> Twist it
              </button>
              <button
                onClick={() => {
                  saveDraft({
                    description: config.description,
                    scenario: customScenario,
                    difficulty,
                  });
                  navigate('/scenario-architect');
                }}
                className="w-full py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white"
              >
                New scenario
              </button>
              <button
                onClick={() => navigate('/explore')}
                className="w-full py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-white"
              >
                Back to Explore
              </button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Objectives sheet */}
      <AnimatePresence>
        {showObjectives && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
            onClick={() => setShowObjectives(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-white/10 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">
                  Objectives
                </span>
                <button onClick={() => setShowObjectives(false)} className="text-slate-500 hover:text-white">
                  <X size={16} />
                </button>
              </div>
              {customScenario.objectives.map((obj, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-2 h-2 rounded-full ${
                      completedObjectives.includes(i) ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      completedObjectives.includes(i)
                        ? 'text-slate-500 line-through'
                        : 'text-slate-200'
                    }`}
                  >
                    {obj}
                  </span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End confirm */}
      <AnimatePresence>
        {showEndConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border border-white/10 space-y-4">
              <p className="text-white font-black">End this session?</p>
              <p className="text-sm text-slate-400">
                Your scenario will be saved so you can resume from the builder.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-slate-300 font-black text-xs uppercase tracking-widest"
                >
                  Keep playing
                </button>
                <button
                  onClick={() => {
                    setShowEndConfirm(false);
                    if (customScenario) {
                      saveDraft({
                        description: config.description,
                        scenario: customScenario,
                        difficulty,
                      });
                    }
                    TTS.stop();
                    navigate('/scenario-architect');
                  }}
                  className="flex-1 py-3 rounded-xl bg-red-500/80 text-white font-black text-xs uppercase tracking-widest"
                >
                  End session
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
