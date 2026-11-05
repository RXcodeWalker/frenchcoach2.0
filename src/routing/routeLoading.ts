/**
 * Which screens a render is waiting on (code splitting). `lazyScreen` marks a
 * screen while its code downloads during a render; `RouteLoadingBar` shows a
 * bar while the set is non-empty. Notifications are deferred to a microtask
 * because the marks happen during render.
 */
import { useSyncExternalStore } from 'react';

const waiting = new Set<string>();
const listeners = new Set<() => void>();
let snapshot = false;
let scheduled = false;

function notify(): void {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    const next = waiting.size > 0;
    if (next === snapshot) return;
    snapshot = next;
    for (const fn of listeners) fn();
  });
}

export function markScreenWaiting(name: string): void {
  if (waiting.has(name)) return;
  waiting.add(name);
  notify();
}

export function markScreenSettled(name: string): void {
  if (!waiting.delete(name)) return;
  notify();
}

export function isWaitingForScreen(): boolean {
  return snapshot;
}

export function subscribeScreenLoading(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useWaitingForScreen(): boolean {
  return useSyncExternalStore(subscribeScreenLoading, isWaitingForScreen, () => false);
}
