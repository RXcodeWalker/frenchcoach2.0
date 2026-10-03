/**
 * Phase 3 Batch F — the client names a tier and nothing else; the backend owns
 * the CEFR/tone/rubric text. While the adaptive Aim picker is live no tier is
 * sent at all (the learner can't see or change the persisted one).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DIFFICULTY_CONFIG } from '../../../utils/difficultyConfig';

const flag = vi.hoisted(() => ({ status: 'live' as 'live' | 'coming-soon' }));
vi.mock('../../../config/featureFlags', async (orig) => ({
  ...(await orig<typeof import('../../../config/featureFlags')>()),
  resolveFeatureStatus: () => flag.status,
}));

import { buildDifficultyContext } from '../apiClient';

describe('buildDifficultyContext', () => {
  beforeEach(() => {
    flag.status = 'live';
  });

  it('sends no tier while the adaptive Aim picker is live', () => {
    for (const tier of Object.keys(DIFFICULTY_CONFIG) as (keyof typeof DIFFICULTY_CONFIG)[]) {
      expect(buildDifficultyContext(tier)).toBeUndefined();
    }
  });

  it('sends only { tier } on the legacy-grid path', () => {
    flag.status = 'coming-soon';
    expect(buildDifficultyContext('expert')).toEqual({ tier: 'expert' });
    expect(Object.keys(buildDifficultyContext('beginner')!)).toEqual(['tier']);
  });

  it('keeps expert as a legacy-grid tier', () => {
    expect(DIFFICULTY_CONFIG.expert.label).toBe('Expert');
  });

  it('the display config carries no prompt text', () => {
    for (const cfg of Object.values(DIFFICULTY_CONFIG)) {
      expect(cfg).not.toHaveProperty('cefrTarget');
      expect(cfg).not.toHaveProperty('coachingTone');
      expect(cfg).not.toHaveProperty('coachingRubric');
    }
  });
});
