import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, AlertTriangle } from 'lucide-react';
import { ScrollingWaveform } from '../../features/recording/ScrollingWaveform';
import { formatTime } from '../../domain/time';
import type { RecordingState } from '../../features/recording/useRecording';

interface Props {
  isActive: boolean;
  recording: RecordingState;
  onStop: () => void;
}

export function RecordingPanel({ isActive, recording, onStop }: Props) {
  if (!isActive) return null;
  return (
    <motion.div
      className="relative overflow-hidden rounded-xl glass p-6 md:p-7"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {!recording.sttSupported && (
        <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25">
          <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-300 leading-snug">
            This browser doesn't support live speech transcription. Try Chrome or Edge for the best experience.
          </p>
        </div>
      )}
      {recording.sttSupported && recording.sttError && (
        <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25">
          <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-300 leading-snug">
            Speech recognition error ({recording.sttError}). Your recording may not have been transcribed.
          </p>
        </div>
      )}

      <ScrollingWaveform isRecording={recording.isRecording} source={recording.micLevel} />

      <AnimatePresence>
        {recording.isRecording && (
          <motion.div
            className="text-center mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <span className="text-2xl font-black text-white tabular-nums">{formatTime(recording.elapsedTime)}</span>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-slate-500">Recording</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-center">
        <motion.button
          onClick={recording.isRecording ? onStop : recording.start}
          className={`relative w-14 h-14 rounded-full flex items-center justify-center ${
            recording.isRecording
              ? 'bg-red-500 shadow-[0_0_24px_rgba(239,68,68,0.4)]'
              : 'bg-gradient-to-br from-violet-electric to-indigo-500 shadow-[0_0_20px_rgba(124,58,237,0.3)]'
          }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {recording.isRecording ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-white" />}
          {recording.isRecording && <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-20" />}
        </motion.button>
      </div>

      <p className="text-center text-[10px] text-slate-600 mt-3">
        {recording.isRecording ? 'Tap to stop' : 'Tap to start recording'}
      </p>
    </motion.div>
  );
}
