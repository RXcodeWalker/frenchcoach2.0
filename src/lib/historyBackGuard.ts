/**
 * Hardware / browser Back → the same back-handler stack Escape uses.
 *
 * On Android (the Play Store app is a Trusted Web Activity, i.e. this site in Chrome) the
 * system Back gesture is `history.back()`. Without this module, Back mid-Learn-session or
 * mid-exam leaves the screen without the "Leave this session?" question that Escape asks.
 *
 * How: while at least one screen holds a guard (`useBackHandler(handler, true)`), one extra
 * history entry — the *sentinel*, a copy of the current entry marked with `GUARD_KEY` — sits
 * on top. Back pops it; we then ask the registered back handlers (newest first), exactly as
 * Escape does:
 *   - an open `[aria-modal]` dialog is closed first (we send it an Escape keydown);
 *   - a handler that claims Back (returns true) keeps the learner where they are, and the
 *     sentinel is pushed again so the next Back is caught too;
 *   - nobody claims it → we continue the navigation with one more `history.back()`.
 *
 * A sentinel left behind when a guarded screen is left by an in-app link ("stale") is
 * skipped in the direction of travel, so Back and Forward never seem to do nothing.
 * Only `BrowserRouter` is in use (no data router → no `useBlocker`), which is why this
 * works on raw history entries; the router's own `{ usr, key, idx }` state is copied into
 * the sentinel, so the router sees the same location on both entries.
 */
import { runBackHandlers } from './keyboardShortcuts';

export const GUARD_KEY = '__fcBackGuard';

type HistoryLike = Pick<History, 'pushState' | 'back' | 'forward' | 'state'>;

interface GuardEnv {
  history: HistoryLike;
  /** Runs the back handlers newest first; true when one claimed Back. */
  runHandlers: () => boolean;
  /** True when an `[aria-modal]` dialog is open (it is closed instead of handling Back). */
  dialogOpen: () => boolean;
  /** Asks the open dialog to close (an Escape keydown, which `ui/Modal` listens for). */
  closeDialog: () => void;
  /** Defers sentinel removal, so a StrictMode remount (release → acquire) is a no-op. */
  defer: (fn: () => void) => void;
}

type GuardState = Record<string, unknown> | null;

function stateOf(h: HistoryLike): GuardState {
  const s = h.state as unknown;
  return s && typeof s === 'object' ? (s as Record<string, unknown>) : null;
}

function tokenOf(h: HistoryLike): string | null {
  const t = stateOf(h)?.[GUARD_KEY];
  return typeof t === 'string' ? t : null;
}

function idxOf(h: HistoryLike): number | null {
  const i = stateOf(h)?.idx;
  return typeof i === 'number' ? i : null;
}

/** The guard's rules, with history and the handler stack injected (tested directly). */
export function createBackGuard(env: GuardEnv) {
  let holders = 0;
  /** The token of the sentinel this module believes is the top entry, or null. */
  let liveToken: string | null = null;
  /** Pops this module causes itself (removing a sentinel, skipping a stale one). */
  let selfPops = 0;
  /** The router index of the entry we were last on — tells Back from Forward. */
  let lastIdx: number | null = idxOf(env.history);
  let seq = 0;

  function pushSentinel() {
    const token = `g${Date.now().toString(36)}${(seq++).toString(36)}`;
    env.history.pushState({ ...(stateOf(env.history) ?? {}), [GUARD_KEY]: token }, '');
    liveToken = token;
    lastIdx = idxOf(env.history);
  }

  function arm() {
    if (holders === 0) return;
    const current = tokenOf(env.history);
    if (current !== null && current === liveToken) return; // already on top
    if (current !== null) {
      // A reload (or a remount) left us standing on a sentinel: adopt it, don't stack another.
      liveToken = current;
      return;
    }
    pushSentinel();
  }

  function disarmLater() {
    env.defer(() => {
      if (holders > 0) return;
      const onTop = liveToken !== null && tokenOf(env.history) === liveToken;
      liveToken = null;
      if (onTop) {
        selfPops++;
        env.history.back();
      }
    });
  }

  return {
    /** A screen wants Back routed through the handlers. Returns its release function. */
    acquire(): () => void {
      holders++;
      arm();
      let released = false;
      return () => {
        if (released) return;
        released = true;
        holders = Math.max(0, holders - 1);
        if (holders === 0) disarmLater();
      };
    },

    /** Call on every `popstate`. */
    onPopState() {
      const prevIdx = lastIdx;
      const landedIdx = idxOf(env.history);
      lastIdx = landedIdx;
      const landedToken = tokenOf(env.history);

      if (selfPops > 0) {
        selfPops--;
        return;
      }

      // Left the live sentinel: that was a Back press on a guarded screen. (The sentinel
      // shares its router index with the entry below it, so Back lands on the same index;
      // a higher index means Forward, which is never intercepted.)
      if (liveToken !== null && landedToken !== liveToken) {
        liveToken = null;
        if (prevIdx !== null && landedIdx !== null && landedIdx > prevIdx) return;
        if (env.dialogOpen()) {
          env.closeDialog();
          arm();
          return;
        }
        if (env.runHandlers()) {
          arm();
          return;
        }
        // Nobody claimed it: finish the Back the learner asked for.
        selfPops++;
        env.history.back();
        return;
      }

      // Landed on a sentinel that is no longer live: skip it in the direction of travel.
      if (landedToken !== null && landedToken !== liveToken) {
        if (holders > 0) {
          liveToken = landedToken; // a guarded screen is showing — this entry protects it
          return;
        }
        selfPops++;
        const cameBack = prevIdx !== null && landedIdx !== null && prevIdx > landedIdx;
        if (cameBack) env.history.back();
        else env.history.forward();
      }
    },

    /**
     * Call after every router location change (push/replace). A push over the sentinel
     * leaves it stale underneath, and a replace overwrites it, so a guarded screen
     * re-arms with a fresh one on top.
     */
    onLocationChange() {
      lastIdx = idxOf(env.history);
      if (holders > 0 && tokenOf(env.history) !== liveToken) {
        liveToken = null;
        arm();
      }
    },

    /** Test helper. */
    get holders() {
      return holders;
    },
  };
}

type BackGuard = ReturnType<typeof createBackGuard>;

let browserGuard: BackGuard | null = null;

/** The app-wide guard on `window.history`; null outside a browser. */
export function getBrowserBackGuard(): BackGuard | null {
  if (typeof window === 'undefined') return null;
  if (!browserGuard) {
    browserGuard = createBackGuard({
      history: window.history,
      runHandlers: runBackHandlers,
      dialogOpen: () => document.querySelector('[aria-modal="true"]') !== null,
      closeDialog: () => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      },
      defer: (fn) => window.setTimeout(fn, 0),
    });
  }
  return browserGuard;
}
