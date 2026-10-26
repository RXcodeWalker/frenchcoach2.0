import { ChevronRight, Map } from 'lucide-react';
import { SettingRow } from '../../components/ui/SettingToggle';
import { requestTourReplay } from './tourState';

/**
 * Profile's "Replay tour" row (a settings row in the Preferences group).
 * TourHost (MainLayout) picks the request up and opens the tour on top of the
 * current page.
 */
export function ReplayTourButton({ divided = false }: { divided?: boolean }) {
  return (
    <SettingRow
      icon={<Map size={16} />}
      label="Replay the app tour"
      description="A quick look at where everything is"
      onClick={requestTourReplay}
      divided={divided}
      trailing={<ChevronRight size={16} className="text-ink-subtle" aria-hidden="true" />}
    />
  );
}
