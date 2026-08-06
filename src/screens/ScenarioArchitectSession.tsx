import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Bot,
  Target,
  Loader2,
  Mic,
  Square
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { useRecording } from '../features/recording/useRecording';
import { Waveform } from '../features/recording/Waveform';
import { useApp, dispatchAddXP } from '../context/AppContext';
import { roleplayTurn, getAIFeedback } from '../services/api/apiClient';
import { observeAttempt } from '../services/coach/sessionOrchestrator';
import { getSkillProfile } from '../services/coaching/diagnosticEngine';
import {
  resolveObjectiveProgress,
  objectiveClearedLabel,
} from '../services/scenarioArchitect/objectiveProgress';
import { ObjectiveClearedToast } from './scenarioArchitect/ObjectiveClearedToast';
import type { FeedbackV2, GeneratedScenario } from '../types';

interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  timestamp: number;
}

const XP_PER_OBJECTIVE = 20;

export function ScenarioArchitectSession() {
  const location = useLocation();
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const recording = useRecording();
  const scrollRef = useRef<HTMLDivElement>(null);

  const customScenario = location.state?.customScenario as GeneratedScenario;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedObjectives, setCompletedObjectives] = useState<number[]>([]);
  const [clearedToast, setClearedToast] = useState<{ label: string; detail: string } | null>(null);
  const toastQueueRef = useRef<{ label: string; detail: string }[]>([]);

  const enqueueClearedToasts = (items: { label: string; detail: string }[]) => {
    if (items.length === 0) return;
    toastQueueRef.current.push(...items);
    setClearedToast(prev => prev ?? toastQueueRef.current.shift() ?? null);
  };

  const dismissClearedToast = () => {
    const next = toastQueueRef.current.shift() ?? null;
    setClearedToast(next);
  };

  useEffect(() => {
    if (!customScenario) {
      navigate('/scenario-architect');
      return;
    }

    // Start the conversation with the opening line
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMessage(customScenario.opening_line, 'ai');
    }, 1500);
  }, [customScenario, navigate]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const addMessage = (text: string, sender: 'ai' | 'user') => {
    const newMessage: Message = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      sender,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const applyObjectiveProgress = (
    turn: { is_done: boolean; completed_objectives?: number[] | null },
    studentUtterances: string[],
    previouslyCompleted: number[],
  ): number[] => {
    if (!customScenario) return previouslyCompleted;

    const { completed, newlyCompleted } = resolveObjectiveProgress({
      objectives: customScenario.objectives,
      previouslyCompleted,
      studentUtterances,
      turn,
      keyVocab: customScenario.key_vocab,
    });

    if (newlyCompleted.length > 0) {
      setCompletedObjectives(completed);
      dispatchAddXP(dispatch, XP_PER_OBJECTIVE * newlyCompleted.length);
      enqueueClearedToasts(
        newlyCompleted.map(index => ({
          label: objectiveClearedLabel(index),
          detail: customScenario.objectives[index] ?? '',
        })),
      );
    }

    return completed;
  };

  const handleStopRecording = async () => {
    if (!customScenario) return;
    
    setIsProcessing(true);
    try {
      const transcript = await recording.stop();
      if (!transcript.trim()) {
        setIsProcessing(false);
        return;
      }
      
      addMessage(transcript, 'user');

      const priorStudentUtterances = messages
        .filter(m => m.sender === 'user')
        .map(m => m.text);
      const studentUtterances = [...priorStudentUtterances, transcript];
      
      // Call AI for reply
      setIsTyping(true);
      const turnHistory = messages.map(m => ({
        speaker: m.sender === 'ai' ? 'examiner' : 'student' as 'examiner' | 'student',
        text: m.text
      }));

      const data = await roleplayTurn(
        'custom',
        turnHistory,
        transcript,
        customScenario,
        { completedObjectives },
      );

      setIsTyping(false);
      addMessage(data.reply, 'ai');

      // Content-based / AI-signaled objective completion (MH1) — not turn counting
      applyObjectiveProgress(
        {
          is_done: Boolean(data.is_done),
          completed_objectives: data.completed_objectives,
        },
        studentUtterances,
        completedObjectives,
      );

      // Get AI feedback for coach evidence (fire-and-forget side effect)
      let fb: FeedbackV2;
      try {
        fb = await getAIFeedback(transcript, { id: 'scenario-architect', text: customScenario.title, topicKey: 'scenario', hint: '', difficulty: 2, followUps: [], modelAnswer: '', keyVocab: [] });
      } catch {
        fb = { scores: { overall: 0, communication: 0, language: 0, fluency: 0 }, unscored: 'evaluation_failed', grammar: { critical: [], polish: [] }, vocabulary: [], style: [], fillers: [], wordCount: transcript.split(/\s+/).filter(Boolean).length, cefrLevel: 'A2' };
      }
      observeAttempt({
        sessionId: `scenario-architect-${Date.now()}-${messages.length}`,
        question: null,
        feedback: fb,
        transcript,
        finalScore: fb.scores.overall,
        mode: 'scenario-architect',
        topicKey: customScenario.title,
      });
      dispatch({ type: 'UPDATE_SKILL_PROFILE', skillProfile: getSkillProfile() });

    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!customScenario) return null;

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-2rem)] flex flex-col pt-4 relative px-4">
      <ObjectiveClearedToast
        label={clearedToast?.label ?? null}
        detail={clearedToast?.detail}
        onDismiss={dismissClearedToast}
      />

      {/* Header */}
      <div className="flex-shrink-0 mb-6">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => navigate('/scenario-architect')}
            className="flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest"
          >
            <ArrowLeft size={14} /> ABORT SESSION
          </button>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Live Interaction</span>
            </div>
          </div>
        </div>

        <Card variant="subtle" className="p-4 border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-white/5">
              <User size={20} className="text-slate-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white italic tracking-tight">{customScenario.npc_name}</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{customScenario.title}</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Objectives</span>
              <div className="flex gap-1">
                {customScenario.objectives.map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-4 h-1 rounded-full transition-all duration-500 ${
                      completedObjectives.includes(i) ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-800'
                    }`} 
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-6 mb-6 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        <div className="max-w-2xl mx-auto space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.sender === 'ai' ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center border ${
                    msg.sender === 'ai' ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}>
                    {msg.sender === 'ai' ? <Bot size={16} /> : <User size={16} />}
                  </div>
                  <div className={`p-4 rounded-2xl text-sm md:text-base ${
                    msg.sender === 'ai' 
                      ? 'bg-white/5 border border-white/5 text-slate-200 rounded-tl-none' 
                      : 'bg-emerald-600 text-white font-medium rounded-tr-none shadow-lg shadow-emerald-600/10'
                  }`}>
                    {msg.text}
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
                    <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 pb-6">
        <div className="max-w-2xl mx-auto">
          {recording.isRecording ? (
            <Card variant="elevated" className="p-6 border-emerald-500/30 bg-emerald-500/[0.02]">
              <div className="flex flex-col items-center gap-6">
                <div className="w-full h-12 flex items-center justify-center">
                  <Waveform isRecording={true} />
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleStopRecording}
                    disabled={isProcessing}
                    className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-xl shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" /> : <Square size={24} className="fill-white" />}
                  </button>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Listening...</span>
                    <span className="text-xs text-slate-500 font-bold uppercase italic">Respond in French</span>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <div className="flex items-center gap-4">
              <button
                onClick={() => recording.start()}
                disabled={isTyping || isProcessing}
                className="flex-1 flex items-center justify-center gap-3 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/20 transition-all uppercase italic tracking-widest group"
              >
                <Mic size={20} className="group-hover:scale-110 transition-transform" />
                Tap to Speak
              </button>
              
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-500 hover:text-white transition-colors cursor-help group relative">
                <Target size={20} />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 p-4 bg-slate-900 border border-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                  <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest block mb-2">Objectives</span>
                  <div className="space-y-2">
                    {customScenario.objectives.map((obj, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${completedObjectives.includes(i) ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                        <span className={`text-[10px] font-bold ${completedObjectives.includes(i) ? 'text-slate-200 line-through' : 'text-slate-400'}`}>{obj}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
