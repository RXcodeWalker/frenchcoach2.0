import { describe, expect, it } from 'vitest';
import { FEATURES } from '../features';
import { FEATURE_FLAGS } from '../../config/featureFlags';

describe('Explore offline marking (offline support)', () => {
  const byId = new Map(FEATURES.map((f) => [f.id, f]));

  it('the typed word games run offline (the offline banner promises it)', () => {
    for (const id of ['sentence_rebuild', 'rapid_fire', 'word_drop', 'emoji_master', 'boss_battle', 'survival']) {
      expect(byId.get(id)?.needsConnection, id).toBeUndefined();
    }
  });

  it('live speech recognition, AI, server-backed modes and the recorded-voice listening game are marked as needing a connection', () => {
    for (const id of ['speaking', 'speed', 'scenario_arch', 'daily_news', 'accent', 'dictee', 'rankings', 'daily_challenge', 'league', 'xp_shop', 'mystery_box']) {
      expect(byId.get(id)?.needsConnection, id).toBe(true);
    }
  });
});

describe('Explore tiles match their feature flags', () => {
  // A tile whose screen is behind a 'coming-soon' flag must be locked, or it opens a "Coming soon" page.
  const TILE_FLAG = {
    speaking: 'speakingArena',
    speed: 'speedSpeaking',
    listening: 'listeningMode',
    survival: 'survivalMode',
    challenges: 'challenges',
    my_plan: 'myPlan',
    fluency_trainer: 'fluencyTrainer',
    daily_challenge: 'dailyChallenge',
    league: 'league',
  } as const;

  it('locks every tile whose flag is coming-soon', () => {
    for (const [id, flag] of Object.entries(TILE_FLAG)) {
      const tile = FEATURES.find((f) => f.id === id);
      expect(tile?.locked, `${id} vs ${flag}`).toBe(FEATURE_FLAGS[flag] === 'coming-soon');
    }
  });
});
