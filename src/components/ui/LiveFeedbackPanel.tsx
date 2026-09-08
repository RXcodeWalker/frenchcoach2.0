import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, XCircle, CheckCircle, Loader2, RotateCcw, MessageCircleQuestion } from 'lucide-react';
import { isUnscored } from '../../domain/scoring';
import { StrongestMomentCard } from '../../features/feedback/components/StrongestMomentCard';
import { BiggestOpportunityCard } from '../../features/feedback/components/BiggestOpportunityCard';
import type { FeedbackV2 } from '../../types';

export interface PanelEntry {
  turnKey: number;
  transcript: string;
  status: 'pending' | 'resolved';
  feedback: FeedbackV2 | null;
}

interface Props {
  entries: PanelEntry[];
  canRedo: (turnKey: number) => boolean;
  redosLeft: (turnKey: number) => number;
  onRedo: (turnKey: number) => void;
}

export function LiveFeedbackPanel({ entries, canRedo, redosLeft, onRedo }: Props) {
  if (entries.length === 0) {
    return (
      <div className="glass-elevated rounded-3xl p-6 border-white/5 bg-navy/40 backdrop-blur-md">
        <p className="text-[10px] font-bold text-ink-subtle uppercase tracking-widest text-center">
          Coaching notes will appear here after your first answer
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence initial={false}>
        {entries.map((entry) => (
          <motion.div
            key={entry.turnKey}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <LiveFeedbackEntry
              entry={entry}
              canRedo={canRedo(entry.turnKey)}
              redosLeft={redosLeft(entry.turnKey)}
              onRedo={() => onRedo(entry.turnKey)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function LiveFeedbackEntry({
  entry,
  canRedo,
  redosLeft,
  onRedo,
}: {
  entry: PanelEntry;
  canRedo: boolean;
  redosLeft: number;
  onRedo: () => void;
}) {
  if (entry.status === 'pending' || !entry.feedback) {
    return (
      <div className="rounded-xl glass-elevated p-5 flex items-center gap-3">
        <Loader2 size={18} className="text-violet-400 animate-spin shrink-0" />
        <p className="text-xs text-ink-muted">AI evaluating…</p>
      </div>
    );
  }

  const feedback = entry.feedback;

  if (isUnscored(feedback)) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl glass-elevated p-5">
          <p className="text-sm text-ink-muted font-semibold">Practiced offline — not graded</p>
          <p className="text-[11px] text-ink-muted mt-1 leading-snug">
            No AI grader was reachable for this attempt, so no score was assigned.
          </p>
        </div>
        {canRedo && <RedoButton onRedo={onRedo} redosLeft={redosLeft} />}
      </div>
    );
  }

  const suggestion = feedback.improved_answer ?? feedback.rephrase;

  return (
    <div className="space-y-3">
      <StrongestMomentCard feedback={feedback} transcript={entry.transcript} />
      <BiggestOpportunityCard opportunity={feedback.biggest_opportunity} />

      {suggestion && (
        <div className="rounded-xl glass p-4">
          <p className="text-[9px] font-bold text-ink-subtle uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <MessageCircleQuestion size={11} /> You could have said…
          </p>
          <p className="text-[11px] text-emerald-300 leading-relaxed italic">{suggestion}</p>
        </div>
      )}

      {feedback.grammar.critical.length > 0 && (
        <div className="rounded-xl glass p-4">
          <p className="text-[9px] font-bold text-ink-subtle uppercase tracking-wider mb-2.5">Corrections</p>
          {feedback.grammar.critical.map((err, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/5 border border-red-500/10 mb-1.5">
              <XCircle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-semibold text-red-300">{err.theme}</p>
                <p className="text-[10px] text-ink-muted mt-0.5">{err.diagnostic}</p>
                <p className="text-[10px] text-emerald-400 mt-0.5"><CheckCircle size={9} className="inline mr-1" />{err.correction}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {feedback.vocabulary.length > 0 && (
        <div className="rounded-xl glass p-4">
          <p className="text-[9px] font-bold text-ink-subtle uppercase tracking-wider mb-2.5">Vocabulary Upgrades</p>
          {feedback.vocabulary.map((v, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg glass-subtle mb-1">
              <span className="text-[10px] text-ink-subtle line-through">{v.basic}</span>
              <ChevronRight size={9} className="text-ink-subtle" />
              <span className="text-[10px] text-emerald-400 font-medium">{v.upgrade}</span>
            </div>
          ))}
        </div>
      )}

      {feedback.style.length > 0 && (
        <div className="rounded-xl glass p-4">
          <p className="text-[9px] font-bold text-ink-subtle uppercase tracking-wider mb-2.5">Style Tips</p>
          {feedback.style.map((s, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg glass-subtle mb-1">
              <span className="text-[10px] font-semibold text-violet-300">{s.label}</span>
              <span className="text-[10px] text-ink-muted">{s.suggestion}</span>
            </div>
          ))}
        </div>
      )}

      {canRedo && <RedoButton onRedo={onRedo} redosLeft={redosLeft} />}
    </div>
  );
}

function RedoButton({ onRedo, redosLeft }: { onRedo: () => void; redosLeft: number }) {
  return (
    <motion.button
      onClick={onRedo}
      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl glass-subtle text-white font-semibold text-xs"
      whileTap={{ scale: 0.97 }}
    >
      <RotateCcw size={12} /> Redo ({redosLeft} left)
    </motion.button>
  );
}
