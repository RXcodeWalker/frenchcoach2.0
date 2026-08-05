// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FEATURE_FLAGS, resolveFeatureStatus } from '../featureFlags';
import { STORAGE_KEYS } from '../../services/persistence/storage';

describe('resolveFeatureStatus', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns the compile-time default when there is no override', () => {
    expect(resolveFeatureStatus('shop')).toBe(FEATURE_FLAGS.shop);
    expect(resolveFeatureStatus('speakingArena')).toBe('coming-soon');
  });

  it('returns a localStorage override when present', () => {
    localStorage.setItem(
      STORAGE_KEYS.featureFlagOverrides,
      JSON.stringify({ speakingArena: 'live' }),
    );
    expect(resolveFeatureStatus('speakingArena')).toBe('live');
    expect(resolveFeatureStatus('shop')).toBe('coming-soon');
  });

  it('does not throw and falls back to default on corrupt localStorage JSON', () => {
    localStorage.setItem(STORAGE_KEYS.featureFlagOverrides, '{{{not json');
    expect(() => resolveFeatureStatus('shop')).not.toThrow();
    expect(resolveFeatureStatus('shop')).toBe('coming-soon');
  });

  it('ignores a garbage override value stored under a valid key', () => {
    localStorage.setItem(
      STORAGE_KEYS.featureFlagOverrides,
      JSON.stringify({ shop: 'banana' }),
    );
    expect(resolveFeatureStatus('shop')).toBe('coming-soon');
  });

  describe('query param', () => {
    const originalSearch = window.location.search;

    afterEach(() => {
      window.history.replaceState(null, '', `${window.location.pathname}${originalSearch}`);
    });

    it('wins over localStorage and persists itself', () => {
      localStorage.setItem(
        STORAGE_KEYS.featureFlagOverrides,
        JSON.stringify({ speakingArena: 'coming-soon' }),
      );
      window.history.replaceState(null, '', '?ff_speakingArena=live');

      expect(resolveFeatureStatus('speakingArena')).toBe('live');

      const persisted = JSON.parse(localStorage.getItem(STORAGE_KEYS.featureFlagOverrides) ?? '{}');
      expect(persisted.speakingArena).toBe('live');
    });

    it('ignores an unrecognized query value without throwing or persisting', () => {
      window.history.replaceState(null, '', '?ff_shop=banana');

      expect(() => resolveFeatureStatus('shop')).not.toThrow();
      expect(resolveFeatureStatus('shop')).toBe('coming-soon');
      expect(localStorage.getItem(STORAGE_KEYS.featureFlagOverrides)).toBeNull();
    });
  });
});
