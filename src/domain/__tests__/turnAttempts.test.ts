import { describe, it, expect } from 'vitest';
import { TurnAttemptTracker } from '../turnAttempts';

describe('TurnAttemptTracker', () => {
  it('1. normal path: begin -> resolve -> lock orchestrates exactly once', () => {
    const t = new TurnAttemptTracker<string, string>();
    const seq = t.begin(1, 'hello', 'q1', false);
    const afterResolve = t.resolve(1, seq, 'lang-a');
    expect(afterResolve).toBeNull(); // not locked yet
    const afterLock = t.lock(1);
    expect(afterLock).not.toBeNull();
    expect(afterLock?.orchestrated).toBe(true);
    expect(afterLock?.language).toBe('lang-a');
  });

  it('2. redo before feedback: stale seq1 resolve is discarded, seq2 orchestrates', () => {
    const t = new TurnAttemptTracker<string, string>();
    const seq1 = t.begin(1, 'first', 'q1', false);
    const seq2 = t.begin(1, 'second', 'q1', true);
    expect(t.resolve(1, seq1, 'lang-1')).toBeNull();
    expect(t.resolve(1, seq2, 'lang-2')).toBeNull(); // not locked yet
    const locked = t.lock(1);
    expect(locked?.orchestrated).toBe(true);
    expect(locked?.language).toBe('lang-2');
    expect(locked?.transcript).toBe('second');
  });

  it('3. redo after feedback resolves but before lock: only seq2 orchestrates', () => {
    const t = new TurnAttemptTracker<string, string>();
    const seq1 = t.begin(1, 'first', 'q1', false);
    expect(t.resolve(1, seq1, 'lang-1')).toBeNull(); // resolved, not locked -> no orchestration
    const seq2 = t.begin(1, 'second', 'q1', true);
    expect(t.resolve(1, seq2, 'lang-2')).toBeNull();
    const locked = t.lock(1);
    expect(locked?.orchestrated).toBe(true);
    expect(locked?.language).toBe('lang-2');
  });

  it('4. old feedback resolves after redo and after lock: stale discarded, seq2 orchestrates', () => {
    const t = new TurnAttemptTracker<string, string>();
    const seq1 = t.begin(1, 'first', 'q1', false);
    const seq2 = t.begin(1, 'second', 'q1', true);
    expect(t.lock(1)).toBeNull(); // locked, still pending -> no orchestration
    expect(t.resolve(1, seq1, 'lang-1')).toBeNull(); // stale
    const resolved = t.resolve(1, seq2, 'lang-2');
    expect(resolved?.orchestrated).toBe(true);
    expect(resolved?.language).toBe('lang-2');
  });

  it('5. lock-in while feedback pending: lock defers, resolve fires it', () => {
    const t = new TurnAttemptTracker<string, string>();
    const seq = t.begin(1, 'hello', 'q1', false);
    expect(t.lock(1)).toBeNull(); // not resolved yet
    const resolved = t.resolve(1, seq, 'lang-a');
    expect(resolved?.orchestrated).toBe(true);
  });

  it('6. session end with feedback pending uses the same lock() path', () => {
    const t = new TurnAttemptTracker<string, string>();
    const seq = t.begin(1, 'hello', 'q1', false);
    expect(t.lock(1)).toBeNull();
    const resolved = t.resolve(1, seq, 'lang-a');
    expect(resolved?.orchestrated).toBe(true);
  });

  it('7. exactly-once under both call orders: double lock is a no-op', () => {
    const t = new TurnAttemptTracker<string, string>();
    const seq = t.begin(1, 'hello', 'q1', false);
    t.resolve(1, seq, 'lang-a');
    const first = t.lock(1);
    const second = t.lock(1);
    expect(first?.orchestrated).toBe(true);
    expect(second).toBeNull();
  });

  it('8. redo cap: canRedo true after 0 and 1 redo, false after 2', () => {
    const t = new TurnAttemptTracker<string, string>();
    t.begin(1, 'a', 'q1', false);
    expect(t.canRedo(1)).toBe(true);
    t.begin(1, 'b', 'q1', true);
    expect(t.canRedo(1)).toBe(true);
    t.begin(1, 'c', 'q1', true);
    expect(t.canRedo(1)).toBe(false);
  });

  it('9. two turn keys pending concurrently resolve/lock independently', () => {
    const t = new TurnAttemptTracker<string, string>();
    const seq5 = t.begin(5, 'five', 'q5', false);
    const seq6 = t.begin(6, 'six', 'q6', false);

    const lock6 = t.lock(6);
    expect(lock6).toBeNull();
    const resolve6 = t.resolve(6, seq6, 'lang-6');
    expect(resolve6?.orchestrated).toBe(true);
    expect(resolve6?.transcript).toBe('six');

    expect(t.get(5)?.orchestrated).toBe(false);
    const resolve5 = t.resolve(5, seq5, 'lang-5');
    expect(resolve5).toBeNull(); // not locked yet
    const lock5 = t.lock(5);
    expect(lock5?.orchestrated).toBe(true);
    expect(lock5?.transcript).toBe('five');
  });

  it('10. unscored/offline terminal result orchestrates same as a scored one', () => {
    const t = new TurnAttemptTracker<string, { kind: string }>();
    const seq = t.begin(1, 'hello', 'q1', false);
    t.lock(1);
    const resolved = t.resolve(1, seq, { kind: 'unscored' });
    expect(resolved?.orchestrated).toBe(true);
    expect(resolved?.language).toEqual({ kind: 'unscored' });
  });
});
