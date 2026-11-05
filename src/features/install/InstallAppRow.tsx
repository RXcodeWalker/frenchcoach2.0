import { Download, Smartphone } from 'lucide-react';
import { SettingRow } from '../../components/ui/SettingToggle';
import { promptInstall, useInstallState } from '../../pwa/installPrompt';

/**
 * Profile → Preferences: install French Coach as an app (home screen, full
 * screen, opens offline). Hidden where the browser can't install it.
 */
export function InstallAppRow({ divided = false }: { divided?: boolean }) {
  const state = useInstallState();
  if (state === 'unavailable') return null;
  if (state === 'installed') {
    return (
      <SettingRow divided={divided} icon={<Smartphone size={16} />} label="Installed on this device" description="Games and saved answers work offline" />
    );
  }
  if (state === 'ios') {
    return (
      <SettingRow
        divided={divided}
        icon={<Download size={16} />}
        label="Add to your Home Screen"
        description="In Safari, tap Share, then “Add to Home Screen”. It opens full screen and works offline"
      />
    );
  }
  return (
    <SettingRow
      divided={divided}
      icon={<Download size={16} />}
      label="Install the app"
      description="Opens full screen from your home screen, and works offline"
      onClick={() => void promptInstall()}
      testId="install-app"
    />
  );
}
