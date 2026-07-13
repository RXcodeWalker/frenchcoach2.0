import { motion } from 'framer-motion';
import { Mic, MicOff, ArrowLeft, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { Waveform } from '../../features/recording/Waveform';
import { formatTime } from '../../domain/time';
import type { RecordingState } from '../../features/recording/useRecording';
import type { ExaminerAction } from '../../domain/igcse/session/types';

interface Props {
  action: ExaminerAction | null;
  elapsedS: number;
  recording: RecordingState;
  onSubmitTurn: () => void;
  onRequestRepeat: () => void;
  onExit: () => void;
  voiceMuted: boolean;
  onToggleVoice: () => void;
  pendingSilentSkip: boolean;
  onKeepTrying: () => void;
  onSkipQuestion: () => void;
}

const PART_LABEL: Record<string, string> = {
  rolePlay: 'Part 1: Role Play',
  topic1: 'Part 2: Topic Conversation 1',
  topic2: 'Part 3: Topic Conversation 2',
};

const ACTION_LABEL: Record<string, string> = {
  READ_MAIN: 'Examiner',
  REPEAT: 'Examiner (repeating)',
  READ_ALTERNATIVE: 'Examiner (alternative question)',
  EXTENSION_PROMPT: 'Examiner',
  FURTHER_QUESTION: 'Examiner',
};

export function ExamRunner({
  action,
  elapsedS,
  recording,
  onSubmitTurn,
  onRequestRepeat,
  onExit,
  voiceMuted,
  onToggleVoice,
  pendingSilentSkip,
  onKeepTrying,
  onSkipQuestion,
}: Props) {
  const part = action?.part ?? 'rolePlay';
  const phaseLabel = PART_LABEL[part] ?? part;
  const examinerLabel = action ? (ACTION_LABEL[action.kind] ?? 'Examiner') : 'Examiner';

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
          {['rolePlay', 'topic1', 'topic2'].map((p) => (
            <div key={p} className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
              part === p ? 'bg-violet-electric text-white' : 'bg-navy-400 text-slate-500'
            }`}>
              {p === 'rolePlay' ? 'Role Play' : p === 'topic1' ? 'Topic 1' : 'Topic 2'}
            </div>
          ))}
        </div>
        <button onClick={onToggleVoice} className="text-slate-600 hover:text-white transition-colors">
          {voiceMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 max-w-2xl mx-auto w-full">
        <motion.div
          className="mb-4 px-3 py-1 rounded-full text-[9px] font-bold border bg-violet-electric/8 text-violet-400 border-violet-electric/15"
          key={phaseLabel}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {phaseLabel}
        </motion.div>

        <div className="w-full rounded-xl glass-elevated p-5 mb-5 text-center">
          <p className="text-[9px] text-slate-700 uppercase tracking-wider mb-1.5">{examinerLabel}</p>
          <p className="text-base font-bold text-white leading-relaxed">{action?.text ?? '…'}</p>
        </div>

        <div className="w-full space-y-4">
          {pendingSilentSkip ? (
            <motion.div
              className="w-full rounded-xl glass-elevated p-5 text-center space-y-3"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <p className="text-sm font-semibold text-white">We didn't hear an answer</p>
              <p className="text-[10px] text-slate-500">Keep trying to record, or skip this question.</p>
              <div className="flex items-center justify-center gap-3 pt-1">
                <motion.button
                  onClick={onKeepTrying}
                  className="px-4 py-2 rounded-lg bg-gradient-to-br from-violet-electric to-indigo-500 text-white transition-all font-semibold text-[10px]"
                  whileTap={{ scale: 0.95 }}
                >
                  Keep trying
                </motion.button>
                <motion.button
                  onClick={onSkipQuestion}
                  className="px-4 py-2 rounded-lg glass-subtle hover:bg-white/[0.04] text-slate-400 transition-all font-semibold text-[10px]"
                  whileTap={{ scale: 0.95 }}
                >
                  Skip question
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <>
              <Waveform data={recording.waveData} isRecording={recording.isRecording} variant="exam" />
              <div className="text-center text-[10px] text-slate-600 tabular-nums">{formatTime(Math.round(elapsedS))}</div>
              <div className="flex items-center justify-center gap-3">
                <motion.button
                  onClick={recording.isRecording ? undefined : recording.start}
                  disabled={recording.isRecording}
                  className={`relative w-14 h-14 rounded-full flex items-center justify-center ${
                    recording.isRecording
                      ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                      : 'bg-gradient-to-br from-violet-electric to-indigo-500 shadow-[0_0_20px_rgba(124,58,237,0.3)]'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {recording.isRecording ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-white" />}
                  {recording.isRecording && <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-20" />}
                </motion.button>

                {recording.isRecording ? (
                  <motion.button
                    onClick={onSubmitTurn}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg glass-subtle hover:bg-white/[0.04] text-white transition-all font-semibold text-[10px]"
                    whileTap={{ scale: 0.95 }}
                  >
                    Stop &amp; Submit
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={onRequestRepeat}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg glass-subtle hover:bg-white/[0.04] text-slate-400 transition-all font-semibold text-[10px]"
                    whileTap={{ scale: 0.95 }}
                  >
                    <RotateCcw size={11} /> Repeat question
                  </motion.button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
