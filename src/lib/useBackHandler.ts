import { useEffect, useRef } from 'react';
import { registerBackHandler } from './keyboardShortcuts';
import { getBrowserBackGuard } from './historyBackGuard';

/**
 * Lets a screen answer the Escape key itself (see `registerBackHandler`). The latest
 * `handler` is always the one called, so it can close over fresh state. Return true
 * when the key was handled — or must not navigate away (e.g. mid-session).
 *
 * `guardHistory`: while true, the browser's / Android's Back button is routed through the
 * same handler too (`historyBackGuard.ts`), so Back mid-session asks before leaving
 * instead of navigating away. Pass it only while `handler` would return true — e.g.
 * Learn's `learnState !== 'topics'` — so a plain page keeps a plain Back.
 */
export function useBackHandler(handler: () => boolean, guardHistory = false): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => registerBackHandler(() => ref.current()), []);
  useEffect(() => {
    if (!guardHistory) return;
    return getBrowserBackGuard()?.acquire();
  }, [guardHistory]);
}
