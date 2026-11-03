import { describe, expect, it } from 'vitest';
import { FEATURES } from '../features';

describe('Explore offline marking (offline support)', () => {
  const byId = new Map(FEATURES.map((f) => [f.id, f]));

  it('the typed word games run offline (the offline banner promises it)', () => {
    for (const id of ['sentence_rebuild', 'rapid_fire', 'word_drop', 'emoji_master', 'boss_battle', 'survival']) {
      expect(byId.get(id)?.needsConnection, id).toBeUndefined();
    }
  });

  it('live speech recognition, AI and server-backed modes are marked as needing a connection', () => {
    for (const id of ['speaking', 'speed', 'scenario_arch', 'daily_news', 'accent', 'friends', 'rankings', 'xp_shop', 'mystery_box']) {
      expect(byId.get(id)?.needsConnection, id).toBe(true);
    }
  });
});
