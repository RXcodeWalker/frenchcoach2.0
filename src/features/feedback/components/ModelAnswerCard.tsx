import { BookOpen } from 'lucide-react';
import { BreakdownCard } from './BreakdownCard';

/** The question's authored model answer, closed until asked for (it is one way to answer, not the only one). */
export function ModelAnswerCard({ modelAnswer }: { modelAnswer?: string }) {
  if (!modelAnswer?.trim()) return null;
  return (
    <BreakdownCard title="Model answer" icon={BookOpen} tone="neutral" collapsible={{ defaultOpen: false }} subtitle="One strong way to answer this question">
      <p lang="fr" className="rounded-control surface-recessed px-3.5 py-3 text-body-s text-ink">
        {modelAnswer}
      </p>
    </BreakdownCard>
  );
}
