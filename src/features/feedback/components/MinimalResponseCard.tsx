import { motion } from 'framer-motion';
import { ArrowRight, GraduationCap, User, Brain, MicOff } from 'lucide-react';
import type { FeedbackV2, ExpansionLevel } from '../../../types';
import { FeedbackFooter } from './FeedbackFooter';

interface Props {
  feedback: FeedbackV2;
  transcript: string;
  onRetry: () => void;
  onComplete: () => void;
  modelAnswer?: string;
}

function ExpansionLevelRow({ lvl, isLast }: { lvl: ExpansionLevel; isLast: boolean }) {
  const colors = {
    1: { bg: 'bg-slate-700/60', text: 'text-slate-300', num: 'bg-slate-600/80 text-slate-400' },
    2: { bg: 'bg-blue-500/8 border border-blue-500/15', text: 'text-blue-300', num: 'bg-blue-500/20 text-blue-400' },
    3: { bg: 'bg-violet-500/8 border border-violet-500/15', text: 'text-violet-300', num: 'bg-violet-500/20 text-violet-400' },
  }[lvl.level];

  return (
    <div className={`flex items-start gap-2.5 p-2.5 rounded-lg ${colors.bg}`}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 mt-0.5 ${colors.num}`}>
        {lvl.level}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[10px] font-medium font-mono break-words ${colors.text}`}>{lvl.sentence}</p>
        <p className="text-[8px] text-slate-500 mt-0.5">+ {lvl.addedWhat}</p>
      </div>
      {!isLast && <ArrowRight size={9} className="text-slate-600 mt-1 shrink-0" />}
    </div>
  );
}

function Tier0Card({ onRetry, onComplete, modelAnswer }: { onRetry: () => void; onComplete: () => void; modelAnswer?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl glass-elevated p-6 space-y-5"
    >
      <div className="flex flex-col items-center text-center space-y-3 py-2">
        <div className="w-12 h-12 rounded-full bg-slate-700/60 flex items-center justify-center">
          <MicOff size={20} className="text-slate-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-200">Je n'ai pas entendu de réponse.</p>
          <p className="text-[11px] text-slate-500 mt-1">No audio was detected or the transcription was empty.</p>
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
      <div className="rounded-xl glass-elevated p-4 border border-amber-500/20">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
            <GraduationCap size={14} className="text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-300 mb-0.5">Réponse minimale</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Tu as donné une réponse de {wordCount === 1 ? 'un seul mot' : `${wordCount} mots`}. Je comprends le sujet, mais je ne peux pas évaluer ta grammaire, ta structure ou ta fluidité.
            </p>
          </div>
        </div>
      </div>

      {/* What you said */}
      <div className="rounded-xl glass-elevated p-4">
        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-2">Your answer</p>
        <p className="text-base text-slate-100 font-mono font-semibold">"{transcript.trim()}"</p>
      </div>

      {/* Teacher → Examiner → Coach pipeline */}
      {layer && (
        <div className="rounded-xl glass-elevated p-4 space-y-3.5">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Coaching feedback</p>

          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
              <User size={10} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-[8px] text-emerald-400 uppercase tracking-wide font-bold mb-0.5">Teacher</p>
              <p className="text-[10px] text-slate-300 leading-relaxed">{layer.teacher}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
              <GraduationCap size={10} className="text-amber-400" />
            </div>
            <div>
              <p className="text-[8px] text-amber-400 uppercase tracking-wide font-bold mb-0.5">Examiner</p>
              <p className="text-[10px] text-slate-300 leading-relaxed italic">{layer.examiner}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0 mt-0.5">
              <Brain size={10} className="text-violet-400" />
            </div>
            <div>
              <p className="text-[8px] text-violet-400 uppercase tracking-wide font-bold mb-0.5">Coach</p>
              <p className="text-[10px] text-slate-300 leading-relaxed">{layer.coach}</p>
            </div>
          </div>
        </div>
      )}

      {/* Expansion levels */}
      {levels.length > 0 && (
        <div className="rounded-xl glass-elevated p-4 space-y-2">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-3">
            How to expand "{word}" into a full answer
          </p>
          <div className="space-y-2">
            {levels.map((lvl, i) => (
              <ExpansionLevelRow key={lvl.level} lvl={lvl} isLast={i === levels.length - 1} />
            ))}
          </div>
        </div>
      )}

      {/* Examiner insight */}
      {feedback.examiner?.examinerInsight && (
        <div className="rounded-xl glass-elevated p-3.5 border border-amber-500/15">
          <p className="text-[9px] text-amber-400/70 uppercase tracking-wide font-bold mb-1">Key improvement</p>
          <p className="text-[10px] text-amber-200 leading-relaxed">{feedback.examiner.examinerInsight}</p>
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
