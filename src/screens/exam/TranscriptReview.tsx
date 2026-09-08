import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Pencil, ArrowLeft } from 'lucide-react';
import type { SessionTranscript } from '../../domain/igcse/stt/types';
import { ExitConfirmDialog } from './ExitConfirmDialog';

interface Props {
  transcript: SessionTranscript;
  onConfirm: (finalTranscript: SessionTranscript) => void;
  onExit: () => void;
}

/** 04 §6.1 transcript-review step: candidate sees the assembled transcript and may correct it; edits set userCorrected: true. */
export function TranscriptReview({ transcript, onConfirm, onExit }: Props) {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const candidateUtterances = transcript.utterances.filter((u) => u.role === 'candidate');
  const [edits, setEdits] = useState<Record<string, string>>(() =>
    Object.fromEntries(candidateUtterances.map((u) => [u.utteranceId, u.text])),
  );

  const changed = candidateUtterances.some((u) => edits[u.utteranceId] !== u.text);

  const handleConfirm = () => {
    if (!changed) {
      onConfirm(transcript);
      return;
    }
    const utterances = transcript.utterances.map((u) =>
      u.role === 'candidate' && edits[u.utteranceId] !== u.text
        ? { ...u, text: edits[u.utteranceId] }
        : u,
    );
    onConfirm({ ...transcript, utterances, userCorrected: true });
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <motion.div
        className="max-w-2xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Pencil size={16} className="text-violet-400" />
            <h1 className="text-lg font-black text-white uppercase tracking-tight">Review Your Transcript</h1>
          </div>
          <button
            onClick={() => setShowExitConfirm(true)}
            className="flex items-center gap-1.5 text-ink-subtle hover:text-white transition-colors text-[10px]"
          >
            <ArrowLeft size={12} /> Exit
          </button>
        </div>
        <p className="text-[11px] text-ink-muted mb-4">
          Check what was recorded for each answer. Correct anything the microphone misheard before scoring.
        </p>

        <div className="space-y-3">
          {candidateUtterances.map((u, i) => (
            <div key={u.utteranceId} className="rounded-xl surface p-4">
              <p className="text-[9px] text-ink-subtle uppercase tracking-wider mb-1.5">
                {u.part} · Answer {i + 1}
              </p>
              <textarea
                value={edits[u.utteranceId]}
                onChange={(e) => setEdits((prev) => ({ ...prev, [u.utteranceId]: e.target.value }))}
                className="w-full bg-white/[0.03] border border-white/5 rounded-lg p-2.5 text-sm text-white resize-none focus:outline-none focus:border-violet-electric/40"
                rows={2}
              />
            </div>
          ))}
        </div>

        <motion.button
          onClick={handleConfirm}
          className="w-full btn-primary py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          whileTap={{ scale: 0.97 }}
        >
          <Check size={15} /> Confirm &amp; Finish
        </motion.button>
      </motion.div>

      <ExitConfirmDialog
        open={showExitConfirm}
        onCancel={() => setShowExitConfirm(false)}
        onConfirm={onExit}
      />
    </div>
  );
}
