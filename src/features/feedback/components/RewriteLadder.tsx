import { Layers } from 'lucide-react';
import { BreakdownCard } from './BreakdownCard';
import type { ExpansionLevel } from '../../../types';

const STEP: Record<ExpansionLevel['level'], string> = {
  1: 'bg-track text-ink-muted',
  2: 'bg-info-soft text-info-text',
  3: 'bg-action-soft text-action-text',
};

export function ExpansionLevelRow({ lvl, isLast }: { lvl: ExpansionLevel; isLast: boolean }) {
  return (
    <li className="relative flex items-start gap-3 pb-3 last:pb-0">
      {!isLast && <span aria-hidden="true" className="absolute left-3 top-7 bottom-0 w-px bg-hairline" />}
      <span className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-pill font-numeral text-caption font-semibold ${STEP[lvl.level]}`}>
        {lvl.level}
      </span>
      <div className="min-w-0 flex-1">
        <p lang="fr" className="break-words text-body-s text-ink">{lvl.sentence}</p>
        <p className="mt-0.5 text-caption text-ink-muted">+ {lvl.addedWhat}</p>
      </div>
    </li>
  );
}

interface Props {
  levels: ExpansionLevel[];
  title: string;
}

/** The same idea built up one step at a time. */
export function RewriteLadder({ levels, title }: Props) {
  if (levels.length === 0) return null;
  return (
    <BreakdownCard title={title} icon={Layers} tone="info" subtitle="Your idea, built up one step at a time">
      <ol>
        {levels.map((lvl, i) => (
          <ExpansionLevelRow key={lvl.level} lvl={lvl} isLast={i === levels.length - 1} />
        ))}
      </ol>
    </BreakdownCard>
  );
}
