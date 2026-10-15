// DEV-ONLY: Junior playtest read-out (junior-track "Playtest gate"). Shows this device's
// local outcome tally against the documented thresholds. Adult-facing, read-only; it sends
// nothing anywhere. Route is registered only when import.meta.env.DEV is true (see App.tsx).
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { GATE_THRESHOLDS, gateReadout } from '../domain/junior/tally';

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function JuniorPlaytest() {
  const { state } = useApp();
  const { outcomeTally, silentTries } = state.junior;
  const readout = gateReadout(outcomeTally, silentTries);

  return (
    <main data-testid="junior-playtest" className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-6 text-ink">
      <Link to="/junior" className="text-label text-action-text">← Junior home</Link>
      <h1 className="text-title">Junior playtest read-out</h1>
      <p className="text-body text-ink-muted">
        This device only. Read it after each child has played, then clear site data before the next child so the tallies don&apos;t mix.
      </p>
      <dl className="grid grid-cols-2 gap-2">
        <dt>Got it</dt><dd data-testid="pt-got">{outcomeTally.got}</dd>
        <dt>Almost</dt><dd data-testid="pt-almost">{outcomeTally.almost}</dd>
        <dt>None</dt><dd data-testid="pt-none">{outcomeTally.none}</dd>
        <dt>Silent tries</dt><dd data-testid="pt-silent">{silentTries}</dd>
      </dl>
      {readout ? (
        <section className="flex flex-col gap-2 rounded-lg border border-hairline bg-info-soft p-4">
          <p data-testid="pt-turns">Question turns: {readout.turns}</p>
          <p data-testid="pt-rate-none">None rate: {pct(readout.rates.none)} (limit {pct(GATE_THRESHOLDS.none)})</p>
          <p data-testid="pt-rate-almost">Almost rate: {pct(readout.rates.almost)} (limit {pct(GATE_THRESHOLDS.almost)})</p>
          <p data-testid="pt-rate-silent">Silent tries per turn: {readout.rates.silentPerTurn.toFixed(2)} (limit {GATE_THRESHOLDS.silentPerTurn})</p>
          <p data-testid="pt-verdict" className="font-semibold">
            {readout.breaches.length === 0 ? 'No automatic threshold breached on this device.' : `Breached: ${readout.breaches.join(', ')}.`}
          </p>
        </section>
      ) : (
        <p data-testid="pt-empty">No question turns played on this device yet.</p>
      )}
      <p className="text-label text-ink-muted">
        Not measured here: whether the child finished without adult help, and whether the 12-year-old found it babyish — ask them and note it in verification-log.md.
      </p>
    </main>
  );
}
