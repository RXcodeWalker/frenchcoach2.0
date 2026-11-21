// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { FRESH_SIGN_IN_TTL_MS, clearFreshSignIn, hasFreshSignIn, markFreshSignIn } from '../freshSignIn';

afterEach(() => {
  sessionStorage.clear();
});

describe('freshSignIn marker', () => {
  it('is absent until a sign-in marks it', () => {
    expect(hasFreshSignIn()).toBe(false);
    markFreshSignIn(1_000);
    expect(hasFreshSignIn(1_000)).toBe(true);
  });

  it('reading never consumes it (safe during render); clearing does', () => {
    markFreshSignIn(1_000);
    expect(hasFreshSignIn(1_001)).toBe(true);
    expect(hasFreshSignIn(1_002)).toBe(true);
    clearFreshSignIn();
    expect(hasFreshSignIn(1_003)).toBe(false);
  });

  it('expires, so a sign-in nobody welcomed does not greet them hours later', () => {
    markFreshSignIn(1_000);
    expect(hasFreshSignIn(1_000 + FRESH_SIGN_IN_TTL_MS - 1)).toBe(true);
    expect(hasFreshSignIn(1_000 + FRESH_SIGN_IN_TTL_MS)).toBe(false);
  });

  it('ignores a corrupt or future value', () => {
    sessionStorage.setItem('fc_freshSignIn', 'nope');
    expect(hasFreshSignIn()).toBe(false);
    sessionStorage.setItem('fc_freshSignIn', String(Date.now() + 60_000));
    expect(hasFreshSignIn()).toBe(false);
  });

  it('is only per tab: it lives in sessionStorage, never localStorage', () => {
    markFreshSignIn();
    expect(localStorage.length).toBe(0);
  });
});
