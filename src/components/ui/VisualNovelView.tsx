import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CharacterAvatar, type Expression } from './CharacterAvatar';
import { SpeechBubble } from './SpeechBubble';
import { ScenarioBackground } from './ScenarioBackground';
import { MissionObjectivesList, type Objective } from './MissionObjectivesList';
import { RecordingPanel } from '../../screens/learn/RecordingPanel';
import { FeedbackPanel } from '../../screens/learn/FeedbackPanel';
import { Info, Star, ArrowLeft, Volume2, VolumeX, Repeat } from 'lucide-react';
import type { FeedbackV2 } from '../../types';
import type { RecordingState } from '../../features/recording/useRecording';
import {
  speakExaminerText,
  getExaminerVoiceGeneration,
  setExaminerVoiceMuted,
  isExaminerVoiceMuted,
  hasFrenchVoice,
} from '../../services/exam/examinerVoice';

interface VisualNovelViewProps {
  topic: string;
  role: string;
  expression: Expression;
  messages: { text: string; sender: 'ai' | 'user' }[];
  objectives: Objective[];
  currentInstruction?: string;
  isTyping: boolean;
  isProcessing: boolean;
  recording: RecordingState;
  showFeedback: boolean;
  lastFeedback: FeedbackV2 | null;
  onStopRecording: () => void;
  onNextStep: () => void;
  onExit: () => void;
}

export const VisualNovelView: React.FC<VisualNovelViewProps> = ({
  topic,
  role,
  expression,
  messages,
  objectives,
  currentInstruction,
  isTyping,
  isProcessing,
  recording,
  showFeedback,
  lastFeedback,
  onStopRecording,
  onNextStep,
  onExit,
}) => {
  const latestMessage = messages[messages.length - 1];
  const [muted, setMuted] = useState(isExaminerVoiceMuted());
  const voiceAvailable = hasFrenchVoice();

  const toggleMute = () => {
    const next = !muted;
    setExaminerVoiceMuted(next);
    setMuted(next);
  };

  const replay = () => {
    if (!latestMessage || latestMessage.sender !== 'ai' || muted || !voiceAvailable) return;
    void speakExaminerText(latestMessage.text, getExaminerVoiceGeneration());
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-navy">
      <ScenarioBackground topic={topic} />

      {/* Top Bar */}
      <div className="relative z-20 p-6 flex items-center justify-between">
        <button
          onClick={onExit}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all text-xs font-black text-white uppercase tracking-widest"
        >
          <ArrowLeft size={16} /> Exit Roleplay
        </button>

        <div className="flex gap-2">
          {voiceAvailable && (
            <button
              onClick={toggleMute}
              className="flex items-center justify-center w-9 h-9 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all text-white"
              aria-label={muted ? 'Unmute examiner voice' : 'Mute examiner voice'}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          )}
           <div className="flex items-center gap-1 bg-white/5 px-4 py-2 rounded-full border border-white/10">
            <Star size={14} className="text-amber-400 fill-amber-400" />
            <span className="text-xs font-black text-white italic">LVL 2</span>
          </div>
        </div>
      </div>

      {!voiceAvailable && (
        <div className="relative z-20 -mt-2 px-6">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide text-center">
            No French voice installed — playing text-only
          </p>
        </div>
      )}

      <div className="flex-1 relative flex flex-col md:flex-row items-center justify-center gap-12 px-8 pb-32">
        {/* Left: Character & Speech */}
        <div className="flex-1 flex flex-col items-center justify-center gap-8 w-full">
          <CharacterAvatar role={role} expression={expression} />
          
          <div className="w-full max-w-2xl min-h-[120px]">
            <AnimatePresence mode="wait">
              {isTyping ? (
                <motion.div 
                  key="typing"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="flex justify-center p-8 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 w-fit mx-auto"
                >
                  <div className="flex gap-1.5">
                    {[0, 0.2, 0.4].map(delay => (
                      <motion.div 
                        key={delay}
                        animate={{ y: [0, -6, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay }}
                        className="w-2 h-2 bg-violet-400 rounded-full shadow-[0_0_10px_rgba(167,139,250,0.5)]" 
                      />
                    ))}
                  </div>
                </motion.div>
              ) : latestMessage && latestMessage.sender === 'ai' ? (
                <div className="relative">
                  <SpeechBubble key={latestMessage.text} text={latestMessage.text} sender="ai" name={role} />
                  {voiceAvailable && !muted && (
                    <button
                      onClick={replay}
                      className="absolute -bottom-2 right-6 flex items-center justify-center w-8 h-8 bg-violet-600 hover:bg-violet-500 rounded-full border border-white/10 shadow-lg transition-all text-white"
                      aria-label="Replay examiner's line"
                    >
                      <Repeat size={14} />
                    </button>
                  )}
                </div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Stats & Objectives (Desktop) */}
        <div className="hidden lg:block w-80 shrink-0">
          <MissionObjectivesList objectives={objectives} />
        </div>
      </div>

      {/* Input Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-8 pt-20 bg-gradient-to-t from-navy via-navy/80 to-transparent z-30">
        <div className="max-w-4xl mx-auto">
          {showFeedback && lastFeedback ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <FeedbackPanel 
                feedback={lastFeedback}
                onComplete={onNextStep}
                onRetry={() => {}} 
              />
              <button 
                onClick={onNextStep}
                className="mt-6 w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl shadow-2xl shadow-emerald-500/30 transition-all flex items-center justify-center gap-3 uppercase italic tracking-widest text-sm"
              >
                CONTINUE STORY <ArrowRight size={20} />
              </button>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {currentInstruction && !isTyping && (
                <div className="flex items-center gap-4 p-4 bg-violet-500/10 border border-violet-500/20 rounded-2xl backdrop-blur-md max-w-2xl mx-auto shadow-xl">
                  <div className="p-2 bg-violet-500/20 rounded-xl">
                    <Info size={18} className="text-violet-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-200">{currentInstruction}</p>
                </div>
              )}

              <div className="relative">
                {isProcessing && (
                  <div className="absolute inset-0 z-50 rounded-2xl glass flex flex-col items-center justify-center bg-navy/80 backdrop-blur-sm">
                    <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-3 shadow-[0_0_15px_rgba(139,92,246,0.3)]" />
                    <span className="text-xs font-black text-violet-400 uppercase tracking-widest italic">AI Analyzing Transcript...</span>
                  </div>
                )}
                <div className="shadow-2xl rounded-2xl">
                  <RecordingPanel 
                    isActive={true}
                    recording={recording}
                    onStop={onStopRecording}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

// Internal icon helper
const ArrowRight = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);
