import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/layout/PageShell';
import { Stat } from '../../components/ui/Stat';
import { useSfxOnChange } from '../../services/sound/useSfx';

interface Props {
  correct: number;
  total: number;
  mixupNote: string | null;
  newBest: boolean;
  onAgain: () => void;
  onHome: () => void;
}

export function ResultsView({ correct, total, mixupNote, newBest, onAgain, onHome }: Props) {
  useSfxOnChange('complete', `${correct}/${total}`);
  return (
    <PageShell maxWidth="sm">
      <h2 className="text-title text-ink">Round over</h2>
      <Stat role="progress" soft>
        {correct} of {total} right
      </Stat>
      {newBest && <p className="text-label text-progress-text">A new personal best on this device.</p>}
      {mixupNote && <p className="text-label text-ink-muted">{mixupNote}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="primary" size="lg" onClick={onAgain}>Play again</Button>
        <Button type="button" variant="secondary" size="lg" onClick={onHome}>Back to the desk</Button>
      </div>
    </PageShell>
  );
}
