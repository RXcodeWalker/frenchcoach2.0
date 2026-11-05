import { useCallback, useEffect } from 'react';
import { listSavedAnswers } from '../../../services/offline/savedAnswers';
import { useSavedAnswerScope } from './useSavedAnswers';

// Its own module: it holds the app's only lazy import outside routing/screens.ts,
// so nothing a screen imports changes name when the uploader's chunk does
// (vite.config.ts's app-core chunk).
/**
 * Mounted once in the app shell: uploads waiting answers on open, when the
 * connection comes back and when the tab is shown again.
 */
export function useSavedAnswerUploader(): void {
  const scope = useSavedAnswerScope();
  const kick = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    // The uploader (and the Learn transcription code behind it) is downloaded only
    // when something is waiting — it is not part of the app's startup code.
    void listSavedAnswers(scope)
      .then((items) => {
        if (!items.some((a) => a.status === 'waiting')) return;
        return import('./processSavedAnswers').then((m) => m.processSavedAnswers(scope));
      })
      .catch(() => undefined);
  }, [scope]);
  useEffect(() => {
    kick();
    const onVisible = () => {
      if (document.visibilityState === 'visible') kick();
    };
    window.addEventListener('online', kick);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', kick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [kick]);
}
