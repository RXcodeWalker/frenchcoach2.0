import { useState } from 'react';
import { Gem } from 'lucide-react';
import { CountUp } from '../motion/CountUp';

interface GemBalanceProps {
  balance: number;
}

/**
 * The learner's gem balance (Shop plan §7). A change counts up or down from
 * the old figure with the `fill` motion (Design System v2) — restraint reads as
 * expensive (§12.3). Gems are a reward currency, so the figure takes the
 * reward role colour.
 */
export function GemBalance({ balance }: GemBalanceProps) {
  // Remember where the count started so a re-render mid-count doesn't restart it from the end.
  const [run, setRun] = useState({ from: balance, to: balance });
  if (run.to !== balance) setRun({ from: run.to, to: balance });

  return (
    <div>
      <p className="text-eyebrow uppercase text-ink-subtle">Gem balance</p>
      <p className="mt-1 flex items-center gap-2 font-numeral text-num-l text-reward-text">
        <Gem size={24} strokeWidth={1.75} aria-hidden="true" />
        <span aria-hidden="true">
          <CountUp value={run.to} from={run.from} delay={0} grouped data-testid="shop-balance" />
        </span>
        <span className="sr-only">{balance.toLocaleString('en-GB')} gems</span>
      </p>
    </div>
  );
}
