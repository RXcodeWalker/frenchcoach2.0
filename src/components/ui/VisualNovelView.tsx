import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CharacterAvatar, type CharacterNpc, type Expression } from './CharacterAvatar';
import { SpeechBubble } from './SpeechBubble';
import { ScenarioBackground } from './ScenarioBackground';
import { MissionObjectivesList, type Objective } from './MissionObjectivesList';
import { RecordingPanel } from '../../screens/learn/RecordingPanel';
import { LiveFeedbackPanel, type PanelEntry } from './LiveFeedbackPanel';
import { Info, Star, ArrowLeft, Volume2, VolumeX, Repeat, MessageSquareText } from 'lucide-react';
import type { RecordingState } from '../../features/recording/useRecording';
import { useApp } from '../../context/AppContext';
import {
  speakExaminerText,
  getExaminerVoiceGeneration,
  setExaminerVoiceMuted,
  isExaminerVoiceMuted,
  hasFrenchVoice,
} from '../../services/exam/examinerVoice';

interface VisualNovelViewProps {
  topic: string;
  npc: CharacterNpc;
  expression: Expression;
  messages: { text: string; sender: 'ai' | 'user' }[];
  objectives: Objective[];
  currentInstruction?: string;
  isTyping: boolean;
  recording: RecordingState;
  panelEntries: PanelEntry[];
  canRedo: (turnKey: number) => boolean;
  redosLeft: (turnKey: number) => number;
  onStopRecording: () => void;
  onRedo: (turnKey: number) => void;
  onExit: () => void;
}

export const VisualNovelView: React.FC<VisualNovelViewProps> = ({
  topic,
  npc,
  expression,
  messages,
  objectives,
  currentInstruction,
  isTyping,
  recording,
  panelEntries,
  canRedo,
  redosLeft,
  onStopRecording,
  onRedo,
  onExit,
}) => {
  const latestMessage = messages[messages.length - 1];
  const [muted, setMuted] = useState(isExaminerVoiceMuted());
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const voiceAvailable = hasFrenchVoice();
  const { state: appState } = useApp();

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
            <span className="text-xs font-black text-white italic">{appState.profile.current_level}</span>
          </div>
        </div>
      </div>

      {!voiceAvailable && (
        <div className="relative z-20 -mt-2 px-6">
          <p className="text-[10px] text-ink-muted font-bold uppercase tracking-wide text-center">
            No French voice installed — playing text-only
          </p>
        </div>
      )}

      <div className="flex-1 relative flex flex-col md:flex-row items-center justify-center gap-12 px-8 pb-32">
        {/* Left: Character & Speech */}
        <div className="flex-1 flex flex-col items-center justify-center gap-8 w-full">
          <CharacterAvatar npc={npc} expression={expression} />
          
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
                  <SpeechBubble key={latestMessage.text} text={latestMessage.text} sender="ai" name={npc.nameFr} />
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

        {/* Right: Stats & Objectives + Live Coaching (Desktop) */}
        <div className="hidden lg:block w-80 shrink-0 space-y-4 max-h-full overflow-y-auto">
          <MissionObjectivesList objectives={objectives} />
          <LiveFeedbackPanel entries={panelEntries} canRedo={canRedo} redosLeft={redosLeft} onRedo={onRedo} />
        </div>
      </div>

      {/* Mobile feedback tab */}
      <button
        onClick={() => setMobileSheetOpen(true)}
        className="lg:hidden fixed right-4 bottom-40 z-40 flex items-center justify-center w-11 h-11 bg-violet-600 hover:bg-violet-500 rounded-full border border-white/10 shadow-lg transition-all text-white"
        aria-label="Show coaching notes"
      >
        <MessageSquareText size={18} />
        {panelEntries.some((e) => e.status === 'pending') && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {mobileSheetOpen && (
          <>
            <motion.div
              className="lg:hidden fixed inset-0 z-[90] bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSheetOpen(false)}
            />
            <motion.div
              className="lg:hidden fixed bottom-0 left-0 right-0 z-[95] glass-elevated rounded-t-2xl p-5 pb-8 max-h-[70vh] overflow-y-auto"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100) setMobileSheetOpen(false);
              }}
            >
              <div className="w-10 h-1.5 rounded-full bg-white/10 mx-auto mb-4" />
              <MissionObjectivesList objectives={objectives} />
              <div className="mt-4">
                <LiveFeedbackPanel entries={panelEntries} canRedo={canRedo} redosLeft={redosLeft} onRedo={onRedo} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Input Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-8 pt-20 bg-gradient-to-t from-navy via-navy/80 to-transparent z-30">
        <div className="max-w-4xl mx-auto space-y-6">
          {currentInstruction && !isTyping && (
            <div className="flex items-center gap-4 p-4 bg-violet-500/10 border border-violet-500/20 rounded-2xl backdrop-blur-md max-w-2xl mx-auto shadow-xl">
              <div className="p-2 bg-violet-500/20 rounded-xl">
                <Info size={18} className="text-violet-400" />
              </div>
              <p className="text-sm font-bold text-slate-200">{currentInstruction}</p>
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
      </div>
    </div>
  );
};
