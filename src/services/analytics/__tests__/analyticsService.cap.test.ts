// @vitest-environment jsdom
// ── Phase 1.5 ──────────────────────────────────────────────────────────────
// analyticsService.recordSession had no cap on data.sessions; every sibling
// store has one. At a few thousand sessions the blob crosses the 5MB quota,
// save() swallows QuotaExceededError, and sessions/streak/XP silently stop
// persisting. recordSession now slices to MAX_STORED_SESSIONS (newest kept).

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { recordSession, getSessionHistory, MAX_STORED_SESSIONS } from '../analyticsService';
import * as telemetry from '../../telemetry/telemetryService';
import { setStorageErrorReporter } from '../../persistence/storage';
import type { Session } from '../../../types';

function makeSession(i: number): Session {
  return {
    id: `sess-${String(i).padStart(5, '0')}`,
    mode: 'practice',
    topicKey: 'school',
    wordCount: 10,
    score: 6,
    xpEarned: 10,
    durationSec: 20,
    createdAt: new Date(2026, 0, 1, 0, 0, i).toISOString(),
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('recordSession caps stored sessions at MAX_STORED_SESSIONS', () => {
  it('keeps exactly MAX_STORED_SESSIONS after recording more', () => {
    for (let i = 0; i < MAX_STORED_SESSIONS + 100; i++) {
      recordSession(makeSession(i));
    }
    const history = getSessionHistory();
    expect(history).toHaveLength(MAX_STORED_SESSIONS);
  });

  it('keeps the NEWEST MAX_STORED_SESSIONS, dropping the oldest', () => {
    const total = MAX_STORED_SESSIONS + 100;
    for (let i = 0; i < total; i++) {
      recordSession(makeSession(i));
    }
    // getSessionHistory reverses storage order — newest first.
    const history = getSessionHistory();
    expect(history[0].id).toBe(`sess-${String(total - 1).padStart(5, '0')}`);
    const oldestKept = history[history.length - 1].id;
    expect(oldestKept).toBe(`sess-${String(total - MAX_STORED_SESSIONS).padStart(5, '0')}`);
    // The very first sessions are gone.
    expect(history.some((s) => s.id === 'sess-00000')).toBe(false);
  });
});

describe('storage-write failures are reported, not swallowed', () => {
  it('captureError fires when localStorage.setItem throws QuotaExceededError', () => {
    const captureSpy = vi.spyOn(telemetry, 'captureError').mockImplementation(() => {});
    // Re-register the reporter to point at the spied module function.
    setStorageErrorReporter((err, ctx) => telemetry.captureError(err, ctx));

    const quotaErr = new DOMException('quota', 'QuotaExceededError');
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw quotaErr;
    });

    try {
      recordSession(makeSession(1));
      expect(captureSpy).toHaveBeenCalledWith(quotaErr, expect.objectContaining({ op: 'set' }));
    } finally {
      setItemSpy.mockRestore();
      captureSpy.mockRestore();
      setStorageErrorReporter(() => {});
    }
  });
});
