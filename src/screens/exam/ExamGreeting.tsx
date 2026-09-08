import { motion } from 'framer-motion';
import { Mic, MicOff, ArrowRight } from 'lucide-react';
import { ScrollingWaveform } from '../../features/recording/ScrollingWaveform';
import type { RecordingState } from '../../features/recording/useRecording';

interface Props {
  recording: RecordingState;
  greetingText: string;
  onContinue: () => void;
}

/**
 * Non-assessed French greeting (C5). The candidate's reply is never submitted
 * to the session and never logged — it exists only to warm up the mic/voice
 * before the assessed role play begins.
 */
export function ExamGreeting({ recording, greetingText, onContinue }: Props) {
  return (
    <div className="fixed inset-0 bg-navy flex flex-col z-40">
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 max-w-2xl mx-auto w-full">
        <motion.div
          className="mb-4 px-3 py-1 rounded-full text-[9px] font-bold border bg-slate-500/8 text-ink-muted border-slate-500/15"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          Not assessed
        </motion.div>

        <div className="w-full rounded-xl surface-raised p-5 mb-5 text-center">
          <p className="text-[9px] text-ink-subtle uppercase tracking-wider mb-1.5">Examiner</p>
          <p className="text-base font-bold text-white leading-relaxed">
            {greetingText}
          </p>
        </div>

        <div className="w-full space-y-4">
          <ScrollingWaveform isRecording={recording.isRecording} source={recording.micLevel} />

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

            <motion.button
              onClick={onContinue}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg surface-recessed hover:bg-white/[0.04] text-white transition-all font-semibold text-[10px]"
              whileTap={{ scale: 0.95 }}
            >
              Start exam <ArrowRight size={11} />
            </motion.button>
          </div>

          <p className="text-center text-[9px] text-ink-subtle">
            This is a quick warm-up — your reply here isn't recorded or scored.
          </p>
        </div>
      </div>
    </div>
  );
}
