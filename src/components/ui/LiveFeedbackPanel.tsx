import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronRight, Loader2, RotateCcw } from 'lucide-react';
import type React from 'react';
import { isUnscored } from '../../domain/scoring';
import { StrongestMomentCard } from '../../features/feedback/components/StrongestMomentCard';
import { BiggestOpportunityCard } from '../../features/feedback/components/BiggestOpportunityCard';
import { enter, enterReduced } from '../motion/variants';
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
  const reduced = useReducedMotion();

  if (entries.length === 0) {
    return (
      <div className="rounded-card surface-recessed p-5">
        <p className="text-body-s text-ink-subtle">Coaching notes will appear here after your first answer.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence initial={false}>
        {entries.map((entry) => (
          <motion.div key={entry.turnKey} variants={reduced ? enterReduced : enter} initial="hidden" animate="show" exit={{ opacity: 0 }}>
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

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 rounded-card surface p-4">
      <h4 className="text-eyebrow uppercase text-ink-subtle">{title}</h4>
      {children}
    </section>
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
      <div role="status" className="flex items-center gap-3 rounded-card surface p-4">
        <Loader2 size={18} className="shrink-0 animate-spin text-ink-subtle" aria-hidden="true" />
        <p className="text-body-s text-ink-muted">Checking your answer…</p>
      </div>
    );
  }

  const feedback = entry.feedback;

  if (isUnscored(feedback)) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-card surface p-4">
          <p className="text-label text-ink">Practised offline — not graded</p>
          <p className="mt-1 text-body-s text-ink-muted">
            No AI grader was reachable for this attempt, so no score was assigned.
          </p>
        </div>
        {canRedo && <RedoButton onRedo={onRedo} redosLeft={redosLeft} />}
      </div>
    );
  }

  const suggestion = feedback.improved_answer ?? feedback.rephrase;

  return (
    <div className="flex flex-col gap-3">
      <StrongestMomentCard feedback={feedback} transcript={entry.transcript} />
      <BiggestOpportunityCard opportunity={feedback.biggest_opportunity} />

      {suggestion && (
        <Block title="You could have said">
          <p className="font-exam text-body-s text-ink">{suggestion}</p>
        </Block>
      )}

      {feedback.grammar.critical.length > 0 && (
        <Block title="Corrections">
          {feedback.grammar.critical.map((err, i) => (
            <div key={i} className="flex flex-col gap-0.5 rounded-control bg-correction-soft p-3">
              <p className="text-label text-correction-text">{err.theme}</p>
              <p className="text-body-s text-ink-muted">{err.diagnostic}</p>
              <p className="text-body-s text-progress-text">{err.correction}</p>
            </div>
          ))}
        </Block>
      )}

      {feedback.vocabulary.length > 0 && (
        <Block title="Vocabulary upgrades">
          {feedback.vocabulary.map((v, i) => (
            <div key={i} className="flex items-center gap-2 rounded-control surface-recessed p-2.5 text-body-s">
              <span className="text-ink-subtle line-through">{v.basic}</span>
              <ChevronRight size={12} aria-hidden="true" className="text-ink-subtle" />
              <span className="font-semibold text-progress-text">{v.upgrade}</span>
            </div>
          ))}
        </Block>
      )}

      {feedback.style.length > 0 && (
        <Block title="Style tips">
          {feedback.style.map((s, i) => (
            <div key={i} className="flex flex-col gap-0.5 rounded-control surface-recessed p-2.5">
              <span className="text-label text-action-text">{s.label}</span>
              <span className="text-body-s text-ink-muted">{s.suggestion}</span>
            </div>
          ))}
        </Block>
      )}

      {canRedo && <RedoButton onRedo={onRedo} redosLeft={redosLeft} />}
    </div>
  );
}

function RedoButton({ onRedo, redosLeft }: { onRedo: () => void; redosLeft: number }) {
  return (
    <button
      type="button"
      onClick={onRedo}
      className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-control border border-hairline-strong px-4 text-[14px] font-semibold text-ink
        transition-[background-color,transform] duration-state ease-smooth hover:bg-track active:scale-[.97]"
    >
      <RotateCcw size={14} aria-hidden="true" /> Redo ({redosLeft} left)
    </button>
  );
}
