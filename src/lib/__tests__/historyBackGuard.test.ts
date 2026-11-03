import { describe, expect, it, vi } from 'vitest';
import { createBackGuard, GUARD_KEY } from '../historyBackGuard';

/**
 * A small model of the browser's session history with the router's `{ idx }` state.
 * `back()`/`forward()` are asynchronous in browsers, so they are queued and delivered
 * as popstate by `flush()`.
 */
class FakeHistory {
  entries: { url: string; state: Record<string, unknown> | null }[];
  index = 0;
  private queue: number[] = [];
  onPop: () => void = () => undefined;

  constructor(url: string) {
    this.entries = [{ url, state: { idx: 0 } }];
  }
  get state() {
    return this.entries[this.index].state;
  }
  get url() {
    return this.entries[this.index].url;
  }
  pushState(state: Record<string, unknown>, _title: string, url?: string) {
    this.entries = this.entries.slice(0, this.index + 1);
    this.entries.push({ url: url ?? this.url, state });
    this.index++;
  }
  /** What the router does on navigate(): push with the next idx. */
  routerPush(url: string) {
    const idx = ((this.state?.idx as number | undefined) ?? 0) + 1;
    this.pushState({ idx }, '', url);
  }
  routerReplace(url: string) {
    this.entries[this.index] = { url, state: { idx: this.state?.idx ?? 0 } };
  }
  back() {
    this.queue.push(-1);
  }
  forward() {
    this.queue.push(1);
  }
  /** Delivers queued traversals (and the ones they cause) as popstate events. */
  flush() {
    let guard = 0;
    while (this.queue.length > 0 && guard++ < 50) {
      const delta = this.queue.shift()!;
      const next = this.index + delta;
      if (next < 0 || next >= this.entries.length) continue;
      this.index = next;
      this.onPop();
    }
  }
  /** The user pressing Back / Forward. */
  userBack() {
    this.back();
    this.flush();
  }
  userForward() {
    this.forward();
    this.flush();
  }
}

function setup(opts: { claims?: () => boolean; dialog?: () => boolean } = {}) {
  const history = new FakeHistory('/home');
  history.routerPush('/learn');
  const deferred: (() => void)[] = [];
  const runHandlers = vi.fn(opts.claims ?? (() => true));
  const closeDialog = vi.fn();
  const guard = createBackGuard({
    history: history as unknown as History,
    runHandlers,
    dialogOpen: opts.dialog ?? (() => false),
    closeDialog,
    defer: (fn) => deferred.push(fn),
  });
  history.onPop = () => guard.onPopState();
  const runDeferred = () => {
    while (deferred.length) deferred.shift()!();
    history.flush();
  };
  return { history, guard, runHandlers, closeDialog, runDeferred };
}

const isSentinel = (h: FakeHistory) => typeof h.state?.[GUARD_KEY] === 'string';

describe('historyBackGuard', () => {
  it('pushes one sentinel copying the router state when a screen guards Back', () => {
    const { history, guard } = setup();
    guard.acquire();
    expect(history.entries).toHaveLength(3);
    expect(isSentinel(history)).toBe(true);
    expect(history.url).toBe('/learn');
    expect(history.state?.idx).toBe(1); // same router index as the entry below
  });

  it('Back on a guarded screen asks the handlers and stays put when one claims it', () => {
    const { history, guard, runHandlers } = setup();
    guard.acquire();
    history.userBack();
    expect(runHandlers).toHaveBeenCalledTimes(1);
    expect(history.url).toBe('/learn');
    expect(isSentinel(history)).toBe(true); // re-armed for the next Back
    history.userBack();
    expect(runHandlers).toHaveBeenCalledTimes(2);
    expect(history.url).toBe('/learn');
  });

  it('continues the Back when no handler claims it', () => {
    const { history, guard } = setup({ claims: () => false });
    guard.acquire();
    history.userBack();
    expect(history.url).toBe('/home');
  });

  it('closes an open dialog instead of running the handlers', () => {
    const { history, guard, runHandlers, closeDialog } = setup({ dialog: () => true });
    guard.acquire();
    history.userBack();
    expect(closeDialog).toHaveBeenCalledTimes(1);
    expect(runHandlers).not.toHaveBeenCalled();
    expect(history.url).toBe('/learn');
    expect(isSentinel(history)).toBe(true);
  });

  it('removes its sentinel when the guard is released on the same page', () => {
    const { history, guard, runHandlers, runDeferred } = setup();
    const release = guard.acquire();
    release();
    runDeferred();
    expect(history.index).toBe(1);
    expect(isSentinel(history)).toBe(false);
    expect(runHandlers).not.toHaveBeenCalled();
    // A plain Back afterwards is an ordinary Back.
    history.userBack();
    expect(history.url).toBe('/home');
  });

  it('a StrictMode release → acquire keeps exactly one sentinel', () => {
    const { history, guard, runDeferred } = setup();
    const r1 = guard.acquire();
    r1();
    guard.acquire();
    runDeferred();
    expect(history.entries).toHaveLength(3);
    expect(isSentinel(history)).toBe(true);
  });

  it('two guarded screens share one sentinel', () => {
    const { history, guard, runDeferred } = setup();
    const a = guard.acquire();
    guard.acquire();
    expect(history.entries).toHaveLength(3);
    a();
    runDeferred();
    expect(isSentinel(history)).toBe(true);
  });

  it('re-arms on top after a router push or replace while guarded', () => {
    const { history, guard, runHandlers } = setup();
    guard.acquire();
    history.routerReplace('/learn?q=2');
    guard.onLocationChange();
    expect(isSentinel(history)).toBe(true);
    expect(history.url).toBe('/learn?q=2');
    history.userBack();
    expect(runHandlers).toHaveBeenCalledTimes(1);
    expect(history.url).toBe('/learn?q=2');
  });

  it('skips a stale sentinel left by an in-app link, going back and going forward', () => {
    const { history, guard, runDeferred } = setup();
    const release = guard.acquire();
    history.routerPush('/progress'); // e.g. the dock, mid-session
    guard.onLocationChange();
    release(); // Learn unmounts
    runDeferred();
    expect(history.url).toBe('/progress');

    history.userBack(); // lands on the stale sentinel, then skips it
    expect(history.url).toBe('/learn');
    expect(isSentinel(history)).toBe(false);
    expect(history.index).toBe(1);

    history.userForward(); // lands on the stale sentinel, then skips forward
    expect(history.url).toBe('/progress');
  });

  it('never intercepts Forward', () => {
    const { history, guard, runHandlers } = setup({ claims: () => false });
    const release = guard.acquire();
    history.userBack(); // not claimed → goes to /home
    expect(history.url).toBe('/home');
    release();
    history.userForward();
    expect(runHandlers).toHaveBeenCalledTimes(1);
  });

  it('adopts a sentinel the page reloaded onto instead of stacking another', () => {
    const { history, guard } = setup();
    history.pushState({ idx: 1, [GUARD_KEY]: 'from-before-reload' }, '');
    const length = history.entries.length;
    guard.acquire();
    expect(history.entries).toHaveLength(length);
  });
});
