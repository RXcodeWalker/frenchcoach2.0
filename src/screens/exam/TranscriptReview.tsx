import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Pencil, ArrowLeft, Mic, Type } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { SessionTranscript } from '../../domain/igcse/stt/types';
import { ExitConfirmDialog } from './ExitConfirmDialog';

interface Props {
  transcript: SessionTranscript;
  onConfirm: (finalTranscript: SessionTranscript) => void;
  onExit: () => void;
  /** Step 5: Exam Sim is read-only here — marked exactly as recorded, like the real exam. */
  coached: boolean;
}

const PART_LABEL: Record<string, string> = {
  rolePlay: 'Role Play',
  topic1: 'Topic 1',
  topic2: 'Topic 2',
};

/** 04 §6.1 transcript-review step: candidate sees the assembled transcript and may correct it; edits set userCorrected: true. */
export function TranscriptReview({ transcript, onConfirm, onExit, coached }: Props) {
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
    <div data-hatch="immersive" className="min-h-screen bg-bg pb-24 md:pb-8">
      <motion.div
        className="max-w-2xl mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Pencil size={16} className="text-ink-subtle" />
            <h1 className="text-title text-ink">Review Your Transcript</h1>
          </div>
          <button
            onClick={() => setShowExitConfirm(true)}
            className="flex items-center gap-1.5 text-ink-subtle hover:text-ink transition-colors duration-state ease-smooth text-body-s"
          >
            <ArrowLeft size={12} /> Exit
          </button>
        </div>
        <p className="text-body-s text-ink-muted">
          {coached
            ? 'Check what was recorded for each answer. Correct anything the microphone misheard before scoring.'
            : 'In Exam Sim your answers are marked exactly as recorded, like the real exam.'}
        </p>

        <div className="space-y-3">
          {candidateUtterances.map((u, i) => (
            <div key={u.utteranceId} className="rounded-card surface p-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-eyebrow uppercase text-ink-subtle">
                  {PART_LABEL[u.part] ?? u.part} · Answer {i + 1}
                </p>
                <span className="flex items-center gap-1 text-eyebrow uppercase text-ink-subtle">
                  {u.inputMode === 'text' ? <Type size={11} /> : <Mic size={11} />}
                  {u.inputMode === 'text' ? 'Typed' : 'Spoken'}
                </span>
              </div>
              {coached ? (
                <textarea
                  value={edits[u.utteranceId]}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [u.utteranceId]: e.target.value }))}
                  className="w-full bg-transparent border border-hairline rounded-control p-2.5 text-body-base text-ink resize-none focus:outline-none focus:border-action/40"
                  rows={2}
                />
              ) : (
                <p className="text-body-base text-ink">{u.text}</p>
              )}
            </div>
          ))}
        </div>

        <Button variant="primary" size="lg" onClick={handleConfirm} className="w-full">
          <Check size={15} /> {coached ? 'Confirm & Finish' : 'Submit for marking'}
        </Button>
      </motion.div>

      <ExitConfirmDialog
        open={showExitConfirm}
        onCancel={() => setShowExitConfirm(false)}
        onConfirm={onExit}
      />
    </div>
  );
}
