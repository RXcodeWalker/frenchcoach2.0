import { Lightbulb } from 'lucide-react';
import { BreakdownCard } from './BreakdownCard';

interface Props {
  ideas?: string[];
  defaultOpen?: boolean;
}

export function ExpansionIdeasCard({ ideas, defaultOpen = false }: Props) {
  if (!ideas?.length) return null;

  return (
    <BreakdownCard
      title="Ideas to extend your answer"
      icon={Lightbulb}
      tone="info"
      count={ideas.length}
      collapsible={{ defaultOpen }}
    >
      <ol className="space-y-2.5">
        {ideas.map((idea, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-info-soft font-numeral text-caption font-semibold text-info-text">
              {i + 1}
            </span>
            <p className="text-body-s text-ink">{idea}</p>
          </li>
        ))}
      </ol>
    </BreakdownCard>
  );
}
