import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { fill } from '../motion/variants';

export interface Objective {
  id: string;
  text: string;
  isCompleted: boolean;
}

interface MissionObjectivesListProps {
  objectives: Objective[];
}

/**
 * The mission checklist (Design System v2): a card with a tick per
 * objective and a progress bar that fills with the `fill` motion.
 */
export const MissionObjectivesList: React.FC<MissionObjectivesListProps> = ({ objectives }) => {
  const reduced = useReducedMotion();
  const done = objectives.filter((o) => o.isCompleted).length;
  const percent = Math.round((done / (objectives.length || 1)) * 100);

  return (
    <section aria-labelledby="mission-objectives" className="flex flex-col gap-4 rounded-card surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="mission-objectives" className="text-section text-ink">Your mission</h3>
        {objectives.length > 0 && <span className="font-numeral text-caption text-ink-subtle">{done} of {objectives.length}</span>}
      </div>

      {objectives.length === 0 && <p className="text-body-s text-ink-subtle">Your missions appear once the conversation starts.</p>}

      <ul className="flex flex-col gap-2.5">
        {objectives.map((obj) => (
          <li key={obj.id} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill transition-colors duration-state ease-smooth ${
                obj.isCompleted ? 'bg-progress text-action-ink' : 'border border-hairline-strong'
              }`}
            >
              {obj.isCompleted && <Check size={12} strokeWidth={3} />}
            </span>
            <span className={`text-body-s ${obj.isCompleted ? 'text-ink-subtle line-through' : 'text-ink'}`}>
              {obj.text}
              {obj.isCompleted && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        ))}
      </ul>

      {objectives.length > 0 && (
      <div
        role="progressbar"
        aria-label="Mission progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="relative h-1.5 overflow-hidden rounded-pill bg-track"
      >
        <motion.span
          className="absolute inset-y-0 left-0 rounded-pill bg-progress"
          initial={{ width: reduced ? `${percent}%` : 0 }}
          animate={{ width: `${percent}%` }}
          transition={reduced ? { duration: 0 } : fill(0)}
        />
      </div>
      )}
    </section>
  );
};
