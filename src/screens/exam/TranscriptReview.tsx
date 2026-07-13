import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Pencil } from 'lucide-react';
import type { SessionTranscript } from '../../domain/igcse/stt/types';

interface Props {
  transcript: SessionTranscript;
  onConfirm: (finalTranscript: SessionTranscript) => void;
}

/** 04 §6.1 transcript-review step: candidate sees the assembled transcript and may correct it; edits set userCorrected: true. */
export function TranscriptReview({ transcript, onConfirm }: Props) {
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
        <div className="flex items-center gap-2 mb-2">
          <Pencil size={16} className="text-violet-400" />
          <h1 className="text-lg font-black text-white uppercase tracking-tight">Review Your Transcript</h1>
        </div>
        <p className="text-[11px] text-slate-500 mb-4">
          Check what was recorded for each answer. Correct anything the microphone misheard before scoring.
        </p>

        <div className="space-y-3">
          {candidateUtterances.map((u, i) => (
            <div key={u.utteranceId} className="rounded-xl glass p-4">
              <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1.5">
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
    </div>
  );
}
