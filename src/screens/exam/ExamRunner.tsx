import { motion } from 'framer-motion';
import { ChevronRight, Mic, MicOff, ArrowLeft } from 'lucide-react';
import { Waveform } from '../../features/recording/Waveform';
import { formatTime } from '../../domain/time';
import type { RecordingState } from '../../features/recording/useRecording';

interface ExamRunnerQuestion {
  text: string;
  keyVocab?: string[];
}

interface Props {
  examState: 'prep' | 'roleplay' | 'topic1' | 'topic2';
  currentIndex: number;
  totalQuestions: number;
  timeLeft: number;
  timerPercent: number;
  timerColor: string;
  currentQuestion: ExamRunnerQuestion;
  recording: RecordingState;
  onNextQuestion: () => void;
  onExit: () => void;
  onSkipPrep?: () => void;
  roleplayScenario?: string;
  roleplayCandidateRole?: string;
}

export function ExamRunner({ 
  examState, currentIndex, totalQuestions, timeLeft, timerPercent, timerColor, 
  currentQuestion, recording, onNextQuestion, onExit, onSkipPrep, roleplayScenario,
  roleplayCandidateRole
}: Props) {
  const phaseLabel = {
    prep: 'Preparation Phase',
    roleplay: 'Part 1: Role Play',
    topic1: 'Part 2: Topic Conversation 1',
    topic2: 'Part 3: Topic Conversation 2'
  }[examState];

  return (
    <div className="fixed inset-0 bg-navy flex flex-col z-40">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.03] glass">
        <motion.button
          onClick={onExit}
          className="flex items-center gap-1.5 text-slate-600 hover:text-white transition-colors text-[10px]"
          whileHover={{ x: -2 }}
        >
          <ArrowLeft size={12} /> Exit
        </motion.button>
        <div className="flex items-center gap-1.5">
          {['roleplay', 'topic1', 'topic2'].map((phase, i) => (
            <div key={phase} className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
              examState === phase ? 'bg-primary text-white' : 'bg-navy-400 text-slate-500'
            }`}>
              Phase {i + 1}
            </div>
          ))}
        </div>
        <span className="text-[10px] text-slate-600 font-medium">
          {examState === 'roleplay' ? `Q${currentIndex + 1}/${totalQuestions}` : 'Conversation'}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 max-w-2xl mx-auto w-full">
        <div className="relative mb-6">
          <svg width={120} height={120} className="-rotate-90">
            <circle cx={60} cy={60} r={50} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={5} />
            <motion.circle
              cx={60} cy={60} r={50}
              fill="none"
              stroke={timerColor}
              strokeWidth={5}
              strokeDasharray={314.16}
              strokeLinecap="round"
              animate={{ strokeDashoffset: 314.16 - (timerPercent / 100) * 314.16 }}
              transition={{ duration: 1, ease: 'linear' }}
              style={{ filter: `drop-shadow(0 0 8px ${timerColor})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              key={timeLeft}
              className="text-3xl font-black text-white tabular-nums"
              initial={{ scale: 1.1, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.15 }}
            >
              {formatTime(timeLeft)}
            </motion.span>
            <span className="text-[9px] text-slate-600 mt-0.5">{examState === 'prep' ? 'Remaining' : 'Phase Time'}</span>
          </div>
        </div>

        <motion.div
          className={`mb-4 px-3 py-1 rounded-full text-[9px] font-bold border ${
            examState === 'prep' ? 'bg-amber-500/8 text-amber-400 border-amber-500/15' : 'bg-primary/8 text-primary border-primary/15'
          }`}
          key={examState}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {phaseLabel}
        </motion.div>

        {examState === 'prep' && (
          <div className="w-full text-center space-y-6">
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-[8px] font-bold uppercase rounded-bl-lg">
                Your Role: {roleplayCandidateRole}
              </div>
              <h3 className="text-primary text-[10px] font-bold uppercase tracking-widest mb-3">Your Role Play Scenario</h3>
              <p className="text-lg text-white font-medium leading-relaxed">{roleplayScenario}</p>
            </div>
            
            <div className="space-y-3">
              <p className="text-[10px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                You have 10 minutes to prepare your answers. You can make notes, but you won't be able to use them during the actual test.
              </p>
              <button 
                onClick={onSkipPrep}
                className="px-6 py-2.5 bg-white text-navy font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors shadow-lg shadow-white/5"
              >
                Start Exam Now
              </button>
            </div>
          </div>
        )}

        {examState !== 'prep' && (
          <>
            <div className="w-full rounded-xl glass-elevated p-5 mb-5 text-center">
              <p className="text-[9px] text-slate-700 uppercase tracking-wider mb-1.5">
                {examState === 'roleplay' ? `Prompt ${currentIndex + 1}` : 'Conversation Question'}
              </p>
              <p className="text-base font-bold text-white leading-relaxed">{currentQuestion.text}</p>
              {currentQuestion.keyVocab && (
                <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                  {currentQuestion.keyVocab.map(word => (
                    <span key={word} className="text-[9px] px-1.5 py-0.5 rounded-md bg-primary/8 text-primary border border-primary/12">{word}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="w-full space-y-4">
              <Waveform data={recording.waveData} isRecording={recording.isRecording} variant="exam" />
              <div className="flex items-center justify-center gap-3">
                <motion.button
                  onClick={recording.isRecording ? recording.stop : recording.start}
                  className={`relative w-14 h-14 rounded-full flex items-center justify-center ${
                    recording.isRecording
                      ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                      : 'bg-gradient-to-br from-primary to-primary-variant shadow-[0_0_20px_rgba(var(--color-primary),0.3)]'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {recording.isRecording ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-white" />}
                  {recording.isRecording && <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-20" />}
                </motion.button>
                <motion.button
                  onClick={onNextQuestion}
                  disabled={!recording.hasRecorded}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all font-semibold text-[10px] ${
                    recording.hasRecorded 
                      ? 'glass-subtle hover:bg-white/[0.04] text-white' 
                      : 'bg-white/5 text-slate-600 cursor-not-allowed'
                  }`}
                  whileTap={recording.hasRecorded ? { scale: 0.95 } : {}}
                >
                  {examState === 'topic2' && timeLeft <= 0 ? 'Submit Exam' : 'Next'} <ChevronRight size={11} />
                </motion.button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

