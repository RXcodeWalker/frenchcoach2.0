import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { installSfxUnlock, setSfxEnabled } from '../services/sound/sfx';

/**
 * Mounted once, near the app root. Pushes Profile → Sound effects into the sound
 * service (which deliberately knows nothing about app state) and unlocks audio on
 * the first tap or key press.
 */
export function SfxBridge() {
  const { state } = useApp();
  useEffect(() => {
    setSfxEnabled(state.soundEnabled);
  }, [state.soundEnabled]);
  useEffect(() => installSfxUnlock(), []);
  return null;
}
