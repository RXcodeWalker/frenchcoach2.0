import { motion } from 'framer-motion';
import { Trophy, Download } from 'lucide-react';
import type { SessionTranscript } from '../../domain/igcse/stt/types';
import { downloadConductLog } from '../../services/exam/conductLogStore';

interface Props {
  transcript: SessionTranscript;
  onRetake: () => void;
  onHome: () => void;
}

export function ExamResults({ transcript, onRetake, onHome }: Props) {
  const candidateUtterances = transcript.utterances.filter((u) => u.role === 'candidate');
  const totalSpeakingS = candidateUtterances.reduce((sum, u) => sum + (u.endS - u.startS), 0);

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <motion.div
        className="max-w-2xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative overflow-hidden rounded-2xl glass-elevated border-amber-500/15 p-8 text-center">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/3 to-transparent pointer-events-none" />
          <div className="relative">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <Trophy size={36} className="mx-auto text-amber-400 mb-3" style={{ filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.4))' }} />
            </motion.div>
            <h2 className="text-2xl font-black text-white mb-1">Practice Session Complete</h2>
            <p className="font-bold text-sm mb-4 text-slate-400">Component 3: Speaking (practice, not a grade prediction)</p>

            <div className="flex items-center justify-center gap-6 mb-2">
              <div className="text-center">
                <div className="text-3xl font-black text-white">{candidateUtterances.length}</div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Answers Given</p>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div className="text-center">
                <div className="text-3xl font-black text-white">{Math.round(totalSpeakingS)}s</div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Speaking Time</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl glass p-5">
          <h3 className="font-bold text-slate-500 text-[10px] uppercase tracking-wider mb-3">Transcript Saved</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Your session transcript has been saved locally. Full AI grading (against the audited Cambridge 0520 rubric) is not yet available in this build.
          </p>
        </div>

        {import.meta.env.DEV && (
          <button
            onClick={() => downloadConductLog(transcript.sessionId)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl glass-subtle text-slate-400 hover:text-white text-[11px] font-semibold transition-colors"
          >
            <Download size={13} /> Download session log (JSON)
          </button>
        )}

        <div className="flex gap-2">
          <motion.button onClick={onRetake} className="flex-1 py-3 rounded-xl glass-subtle text-white font-bold text-xs" whileTap={{ scale: 0.97 }}>New Mock Exam</motion.button>
          <motion.button onClick={onHome} className="flex-1 btn-primary py-3 rounded-xl font-bold text-xs" whileTap={{ scale: 0.97 }}>Dashboard</motion.button>
        </div>
      </motion.div>
    </div>
  );
}
