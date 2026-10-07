import { motion } from 'framer-motion';
import { GraduationCap, User, Brain, MicOff } from 'lucide-react';
import type { FeedbackV2 } from '../../../types';
import { FeedbackFooter } from './FeedbackFooter';
import { RewriteLadder } from './RewriteLadder';

interface Props {
  feedback: FeedbackV2;
  transcript: string;
  onRetry: () => void;
  onComplete: () => void;
  modelAnswer?: string;
}

function Tier0Card({ onRetry, onComplete, modelAnswer }: { onRetry: () => void; onComplete: () => void; modelAnswer?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl surface-raised p-6 space-y-5"
    >
      <div className="flex flex-col items-center text-center space-y-3 py-2">
        <div className="w-12 h-12 rounded-full bg-track flex items-center justify-center">
          <MicOff size={20} className="text-ink-muted" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Je n'ai pas entendu de réponse.</p>
          <p className="text-[11px] text-ink-muted mt-1">No audio was detected or the transcription was empty.</p>
        </div>
      </div>
      <FeedbackFooter onRetry={onRetry} onComplete={onComplete} modelAnswer={modelAnswer} />
    </motion.div>
  );
}

function Tier1Card({ feedback, transcript, onRetry, onComplete, modelAnswer }: Props) {
  const word = transcript.trim().split(/\s+/)[0]?.replace(/[.,!?;:]/g, '') ?? transcript.trim();
  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
  const layer = feedback.coachingLayer;
  const levels = feedback.expansionLevels ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Minimal response banner */}
      <div className="rounded-xl surface-raised p-4 border border-amber-500/20">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
            <GraduationCap size={14} className="text-reward-text" />
          </div>
          <div>
            <p className="text-xs font-semibold text-reward-text mb-0.5">Réponse minimale</p>
            <p className="text-[11px] text-ink-muted leading-relaxed">
              Tu as donné une réponse de {wordCount === 1 ? 'un seul mot' : `${wordCount} mots`}. Je comprends le sujet, mais je ne peux pas évaluer ta grammaire, ta structure ou ta fluidité.
            </p>
          </div>
        </div>
      </div>

      {/* What you said */}
      <div className="rounded-xl surface-raised p-4">
        <p className="text-eyebrow text-ink-muted uppercase mb-2">Your answer</p>
        <p className="text-base text-ink font-mono font-semibold">"{transcript.trim()}"</p>
      </div>

      {/* Teacher → Examiner → Coach pipeline */}
      {layer && (
        <div className="rounded-xl surface-raised p-4 space-y-3.5">
          <p className="text-eyebrow text-ink-muted uppercase">Coaching feedback</p>

          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
              <User size={10} className="text-progress-text" />
            </div>
            <div>
              <p className="text-eyebrow text-progress-text uppercase mb-0.5">Teacher</p>
              <p className="text-[10px] text-ink-muted leading-relaxed">{layer.teacher}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
              <GraduationCap size={10} className="text-reward-text" />
            </div>
            <div>
              <p className="text-eyebrow text-reward-text uppercase mb-0.5">Examiner</p>
              <p className="text-[10px] text-ink-muted leading-relaxed italic">{layer.examiner}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0 mt-0.5">
              <Brain size={10} className="text-action-text" />
            </div>
            <div>
              <p className="text-eyebrow text-action-text uppercase mb-0.5">Coach</p>
              <p className="text-[10px] text-ink-muted leading-relaxed">{layer.coach}</p>
            </div>
          </div>
        </div>
      )}

      {/* Expansion levels */}
      <RewriteLadder levels={levels} title={`How to expand "${word}" into a full answer`} />

      {/* Examiner insight */}
      {feedback.examiner?.examinerInsight && (
        <div className="rounded-xl surface-raised p-3.5 border border-amber-500/15">
          <p className="text-eyebrow text-reward-text uppercase mb-1">Key improvement</p>
          <p className="text-[10px] text-reward-text leading-relaxed">{feedback.examiner.examinerInsight}</p>
        </div>
      )}

      <FeedbackFooter onRetry={onRetry} onComplete={onComplete} modelAnswer={modelAnswer} />
    </motion.div>
  );
}

export function MinimalResponseCard({ feedback, transcript, onRetry, onComplete, modelAnswer }: Props) {
  if (feedback.responseTier === 0) {
    return <Tier0Card onRetry={onRetry} onComplete={onComplete} modelAnswer={modelAnswer} />;
  }
  return <Tier1Card feedback={feedback} transcript={transcript} onRetry={onRetry} onComplete={onComplete} modelAnswer={modelAnswer} />;
}
