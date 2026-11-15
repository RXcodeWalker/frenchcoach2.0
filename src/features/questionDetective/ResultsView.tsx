import { RotateCcw, Trophy } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/layout/PageShell';
import { Stat } from '../../components/ui/Stat';
import { useSfxOnChange } from '../../services/sound/useSfx';
import { IconChip, Rise } from './parts';

interface Props {
  correct: number;
  total: number;
  mixupNote: string | null;
  newBest: boolean;
  onAgain: () => void;
  onHome: () => void;
}

function lineFor(correct: number, total: number): string {
  if (correct === total) return 'Every answer matched its question word.';
  if (correct >= Math.ceil(total * 0.6)) return 'Good detective work. A few words still mix you up.';
  return 'The toolkit has a card for each word. Another round will help.';
}

export function ResultsView({ correct, total, mixupNote, newBest, onAgain, onHome }: Props) {
  useSfxOnChange('complete', `${correct}/${total}`);
  return (
    <PageShell maxWidth="sm" gap={16}>
      <Rise className="flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5 shadow-card">
        <div className="flex items-center gap-3">
          <IconChip icon={<Trophy size={18} />} tone="progress" size={40} />
          <h2 className="text-title text-ink">Round over</h2>
        </div>
        <p className="font-numeral text-num-l text-ink" data-testid="detective-score">
          {correct} <span className="text-ink-muted">of {total}</span>
        </p>
        <p className="text-body-s text-ink-muted">{lineFor(correct, total)}</p>
        {newBest && (
          <div>
            <Stat role="progress" soft>New personal best on this device</Stat>
          </div>
        )}
        {mixupNote && <p className="rounded-control bg-info-soft p-3 text-body-s text-ink">{mixupNote}</p>}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="primary" size="lg" onClick={onAgain} data-shortcut="continue">
            <RotateCcw size={16} aria-hidden="true" /> Play again
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={onHome}>Back to the desk</Button>
        </div>
      </Rise>
    </PageShell>
  );
}
