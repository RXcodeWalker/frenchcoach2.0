// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  STORAGE_KEYS,
  storageGet,
  storageSet,
  setStorageScope,
  prepareStorageScope,
  hasNoScopedDataYet,
  copyGuestScopeToIdentity,
} from '../storage';
import type * as StorageModule from '../storage';

describe('scopedKey (via storageGet/storageSet)', () => {
  beforeEach(() => localStorage.clear());

  it('device-scoped keys are never namespaced by identity', () => {
    setStorageScope('accountA');
    storageSet(STORAGE_KEYS.darkMode, true);
    expect(localStorage.getItem(STORAGE_KEYS.darkMode)).toBe('true');
    expect(localStorage.getItem(`${STORAGE_KEYS.darkMode}::accountA`)).toBeNull();
  });

  it('identity-scoped keys are namespaced as base::scope', () => {
    setStorageScope('accountA');
    storageSet(STORAGE_KEYS.progression, { totalXP: 42 });
    expect(localStorage.getItem(STORAGE_KEYS.progression)).toBeNull();
    expect(JSON.parse(localStorage.getItem(`${STORAGE_KEYS.progression}::accountA`)!)).toEqual({ totalXP: 42 });
  });
});

describe('scopedKey: behavior before any scope has ever been set (activeScope === null)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads/writes go to the unscoped key until setStorageScope is called', async () => {
    // activeScope is module-private with no reset export (correctly — nothing
    // in the app design needs one). vi.resetModules() + a fresh dynamic
    // import gives a fresh module instance to observe its true initial state,
    // instead of relying on it() ordering within this file.
    vi.resetModules();
    const fresh: typeof StorageModule = await import('../storage');
    fresh.storageSet(STORAGE_KEYS.progression, { totalXP: 7 });
    expect(localStorage.getItem(STORAGE_KEYS.progression)).not.toBeNull();
    expect(localStorage.getItem(`${STORAGE_KEYS.progression}::guest`)).toBeNull();
  });
});

describe('prepareStorageScope: rule 1 — legacy → guest when no owner recorded', () => {
  beforeEach(() => localStorage.clear());

  it('copies legacy identity-scoped data into ::guest when migrationV1 is absent', () => {
    localStorage.setItem(STORAGE_KEYS.progression, JSON.stringify({ totalXP: 100 }));
    prepareStorageScope('guest');
    expect(JSON.parse(localStorage.getItem(`${STORAGE_KEYS.progression}::guest`)!)).toEqual({ totalXP: 100 });
  });

  it('copies legacy data into ::guest when migrationV1.userId is missing/null', () => {
    localStorage.setItem(STORAGE_KEYS.progression, JSON.stringify({ totalXP: 55 }));
    localStorage.setItem(STORAGE_KEYS.migrationV1, JSON.stringify({ userId: null }));
    prepareStorageScope('guest');
    expect(JSON.parse(localStorage.getItem(`${STORAGE_KEYS.progression}::guest`)!)).toEqual({ totalXP: 55 });
  });

  it('does not copy legacy data into a real account when no owner is recorded', () => {
    localStorage.setItem(STORAGE_KEYS.progression, JSON.stringify({ totalXP: 100 }));
    prepareStorageScope('accountB');
    expect(localStorage.getItem(`${STORAGE_KEYS.progression}::accountB`)).toBeNull();
  });

  it('never deletes the legacy source key', () => {
    localStorage.setItem(STORAGE_KEYS.progression, JSON.stringify({ totalXP: 100 }));
    prepareStorageScope('guest');
    expect(localStorage.getItem(STORAGE_KEYS.progression)).not.toBeNull();
  });
});

describe('prepareStorageScope: rule 2 — legacy → the specific recorded owner', () => {
  beforeEach(() => localStorage.clear());

  it('copies legacy data only into the account recorded in migrationV1.userId', () => {
    localStorage.setItem(STORAGE_KEYS.progression, JSON.stringify({ totalXP: 200 }));
    localStorage.setItem(STORAGE_KEYS.migrationV1, JSON.stringify({ userId: 'accountX' }));
    prepareStorageScope('accountX');
    expect(JSON.parse(localStorage.getItem(`${STORAGE_KEYS.progression}::accountX`)!)).toEqual({ totalXP: 200 });
  });

  it('does not copy legacy data into ::guest when a specific owner is recorded', () => {
    localStorage.setItem(STORAGE_KEYS.progression, JSON.stringify({ totalXP: 200 }));
    localStorage.setItem(STORAGE_KEYS.migrationV1, JSON.stringify({ userId: 'accountX' }));
    prepareStorageScope('guest');
    expect(localStorage.getItem(`${STORAGE_KEYS.progression}::guest`)).toBeNull();
  });

  it('does not copy legacy data into a different, non-owning account', () => {
    localStorage.setItem(STORAGE_KEYS.progression, JSON.stringify({ totalXP: 200 }));
    localStorage.setItem(STORAGE_KEYS.migrationV1, JSON.stringify({ userId: 'accountX' }));
    prepareStorageScope('accountY');
    expect(localStorage.getItem(`${STORAGE_KEYS.progression}::accountY`)).toBeNull();
  });
});

describe('prepareStorageScope: idempotency and retry safety', () => {
  beforeEach(() => localStorage.clear());

  it('does not duplicate or overwrite an already-copied key on retry', () => {
    localStorage.setItem(STORAGE_KEYS.progression, JSON.stringify({ totalXP: 100 }));
    prepareStorageScope('guest');
    // Simulate the destination having since diverged (e.g. user earned more XP)
    localStorage.setItem(`${STORAGE_KEYS.progression}::guest`, JSON.stringify({ totalXP: 150 }));
    // A second resolution of the same identity must not re-run the copy loop
    // at all (claim marker gates it) — destination stays untouched.
    prepareStorageScope('guest');
    expect(JSON.parse(localStorage.getItem(`${STORAGE_KEYS.progression}::guest`)!)).toEqual({ totalXP: 150 });
  });

  it('a partially-completed copy (simulated crash) safely fills only the gaps on retry', () => {
    localStorage.setItem(STORAGE_KEYS.progression, JSON.stringify({ totalXP: 100 }));
    localStorage.setItem(STORAGE_KEYS.masteredDrills, JSON.stringify(['drill1']));
    // Simulate a crash mid-loop: one key already copied, claim marker never written.
    localStorage.setItem(`${STORAGE_KEYS.progression}::guest`, JSON.stringify({ totalXP: 100 }));
    prepareStorageScope('guest');
    expect(JSON.parse(localStorage.getItem(`${STORAGE_KEYS.masteredDrills}::guest`)!)).toEqual(['drill1']);
    // Untouched — not clobbered by the retry.
    expect(JSON.parse(localStorage.getItem(`${STORAGE_KEYS.progression}::guest`)!)).toEqual({ totalXP: 100 });
  });
});

describe('the core acceptance criterion: account A data must never become visible to account B', () => {
  beforeEach(() => localStorage.clear());

  it('B never sees A\'s data; A\'s data survives re-resolution', () => {
    setStorageScope('accountA');
    storageSet(STORAGE_KEYS.progression, { totalXP: 999 });

    // Resolve a different, never-before-seen account with no legacy owner match.
    prepareStorageScope('accountB');
    setStorageScope('accountB');
    expect(storageGet(STORAGE_KEYS.progression, { totalXP: 0 })).toEqual({ totalXP: 0 });

    // Re-resolving A must still see A's own data, untouched.
    setStorageScope('accountA');
    expect(storageGet(STORAGE_KEYS.progression, { totalXP: 0 })).toEqual({ totalXP: 999 });
  });

  it('prepareStorageScope alone never copies ::guest data into a real account (that is rule 3, owned by hydrateFromCloud, not this function)', () => {
    setStorageScope('guest');
    storageSet(STORAGE_KEYS.progression, { totalXP: 10 });

    // No legacy migrationV1 record and no legacy unscoped key exists here —
    // rules 1/2 have nothing to copy. Confirms prepareStorageScope does not
    // itself reach into ::guest, since that would violate §6 rule 4 (no
    // cross-scope read except legacy-pool → guest/owner).
    prepareStorageScope('accountB');
    setStorageScope('accountB');
    expect(storageGet(STORAGE_KEYS.progression, { totalXP: 0 })).toEqual({ totalXP: 0 });
  });
});

describe('hasNoScopedDataYet', () => {
  beforeEach(() => localStorage.clear());

  it('is true for an identity that has never had any scoped key written', () => {
    expect(hasNoScopedDataYet('accountB')).toBe(true);
  });

  it('is false once any identity-scoped key exists for that identity', () => {
    setStorageScope('accountB');
    storageSet(STORAGE_KEYS.progression, { totalXP: 1 });
    expect(hasNoScopedDataYet('accountB')).toBe(false);
  });

  it('ignores device-scoped keys entirely', () => {
    setStorageScope('accountB');
    storageSet(STORAGE_KEYS.darkMode, true); // device-scoped — never namespaced
    expect(hasNoScopedDataYet('accountB')).toBe(true);
  });

  it('is scoped per-identity — data under a different identity does not count', () => {
    setStorageScope('accountA');
    storageSet(STORAGE_KEYS.progression, { totalXP: 1 });
    expect(hasNoScopedDataYet('accountB')).toBe(true);
  });
});

describe('copyGuestScopeToIdentity (plan §6 rule 3)', () => {
  beforeEach(() => localStorage.clear());

  it('copies every identity-scoped key from ::guest into ::identity', () => {
    setStorageScope('guest');
    storageSet(STORAGE_KEYS.progression, { totalXP: 42 });
    storageSet(STORAGE_KEYS.masteredDrills, ['drill1']);

    copyGuestScopeToIdentity('accountB');

    expect(JSON.parse(localStorage.getItem(`${STORAGE_KEYS.progression}::accountB`)!)).toEqual({ totalXP: 42 });
    expect(JSON.parse(localStorage.getItem(`${STORAGE_KEYS.masteredDrills}::accountB`)!)).toEqual(['drill1']);
  });

  it('never copies device-scoped keys', () => {
    setStorageScope('guest');
    storageSet(STORAGE_KEYS.darkMode, true);
    copyGuestScopeToIdentity('accountB');
    expect(localStorage.getItem(`${STORAGE_KEYS.darkMode}::accountB`)).toBeNull();
  });

  it('never deletes the ::guest source', () => {
    setStorageScope('guest');
    storageSet(STORAGE_KEYS.progression, { totalXP: 42 });
    copyGuestScopeToIdentity('accountB');
    expect(localStorage.getItem(`${STORAGE_KEYS.progression}::guest`)).not.toBeNull();
  });

  it('is idempotent — does not overwrite data already present at the destination', () => {
    setStorageScope('guest');
    storageSet(STORAGE_KEYS.progression, { totalXP: 42 });
    setStorageScope('accountB');
    storageSet(STORAGE_KEYS.progression, { totalXP: 999 }); // accountB already has its own value
    copyGuestScopeToIdentity('accountB');
    expect(storageGet(STORAGE_KEYS.progression, { totalXP: 0 })).toEqual({ totalXP: 999 });
  });

  it('does nothing when ::guest has no data for a given key', () => {
    copyGuestScopeToIdentity('accountB');
    expect(localStorage.getItem(`${STORAGE_KEYS.progression}::accountB`)).toBeNull();
  });
});

describe('rule 3 end-to-end: a fresh real account inherits ::guest on first resolution; a later account does not', () => {
  beforeEach(() => localStorage.clear());

  it('B inherits guest data on first resolution, keeps it independent of guest afterward', () => {
    setStorageScope('guest');
    storageSet(STORAGE_KEYS.progression, { totalXP: 10 });

    // Simulates AppContext's hydrateFromCloud integration point: check
    // hasNoScopedDataYet before copying, exactly as wired in AppContext.tsx.
    if (hasNoScopedDataYet('accountB')) copyGuestScopeToIdentity('accountB');
    setStorageScope('accountB');
    expect(storageGet(STORAGE_KEYS.progression, { totalXP: 0 })).toEqual({ totalXP: 10 });

    // accountB now has its own scoped data going forward, independent of guest.
    storageSet(STORAGE_KEYS.progression, { totalXP: 20 });
    setStorageScope('guest');
    expect(storageGet(STORAGE_KEYS.progression, { totalXP: 0 })).toEqual({ totalXP: 10 }); // untouched
  });

  it('does not re-copy into an account that already has its own scoped data', () => {
    setStorageScope('guest');
    storageSet(STORAGE_KEYS.progression, { totalXP: 10 });

    setStorageScope('accountB');
    storageSet(STORAGE_KEYS.progression, { totalXP: 500 }); // accountB already scoped once

    if (hasNoScopedDataYet('accountB')) copyGuestScopeToIdentity('accountB');
    expect(storageGet(STORAGE_KEYS.progression, { totalXP: 0 })).toEqual({ totalXP: 500 });
  });
});
