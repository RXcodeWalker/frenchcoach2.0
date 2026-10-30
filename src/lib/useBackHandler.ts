import { useEffect, useRef } from 'react';
import { registerBackHandler } from './keyboardShortcuts';

/**
 * Lets a screen answer the Escape key itself (see `registerBackHandler`). The latest
 * `handler` is always the one called, so it can close over fresh state. Return true
 * when the key was handled — or must not navigate away (e.g. mid-session).
 */
export function useBackHandler(handler: () => boolean): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => registerBackHandler(() => ref.current()), []);
}
