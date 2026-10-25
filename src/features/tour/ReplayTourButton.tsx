import { Compass, ChevronRight } from 'lucide-react';
import { requestTourReplay } from './tourState';

/**
 * Profile's "Replay tour" row. Styled like the rows around it in Profile's
 * Preferences card; TourHost (MainLayout) picks the request up and opens the
 * tour on top of the current page.
 */
export function ReplayTourButton() {
  return (
    <button
      type="button"
      onClick={requestTourReplay}
      className="w-full flex items-center gap-3 p-2.5 min-h-[44px] rounded-lg hover:bg-white/[0.02] transition-colors text-left
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      <Compass size={14} className="text-ink-subtle" aria-hidden="true" />
      <div className="flex-1">
        <p className="text-[10px] font-semibold text-white">Replay tour</p>
        <p className="text-[9px] text-ink-subtle">A quick look at where everything is</p>
      </div>
      <ChevronRight size={12} className="text-ink-subtle" aria-hidden="true" />
    </button>
  );
}
