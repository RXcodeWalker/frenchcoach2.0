import { describe, expect, it } from 'vitest';
import { achievementHistoryCounts } from '../achievementContextBuilder';

const s = (id: string, mode: string, topicKey: string | null = null) => ({ id, mode, topicKey });

describe('achievementHistoryCounts', () => {
  it('counts distinct Learn topics only', () => {
    const c = achievementHistoryCounts([
      s('1', 'practice', 'school'),
      s('2', 'practice', 'school'),
      s('3', 'practice', 'food'),
      s('4', 'daily_news', 'news'),
      s('5', 'exam'),
    ]);
    expect(c.topicKeys.sort()).toEqual(['food', 'school']);
  });

  it('counts distinct role plays across drill cards and scenarios, not answers', () => {
    const c = achievementHistoryCounts([
      s('story-card_a-1700000000000-0', 'story'),
      s('story-card_a-1700000000500-1', 'story'),
      s('story-card_b-1700000001000-0', 'story'),
      s('roleplay-job_interview-2-1700000002000', 'roleplay'),
      s('roleplay-job_interview-3-1700000003000', 'roleplay'),
      s('roleplay-bakery-0-1700000004000', 'roleplay'),
    ]);
    expect(c.rolePlayKeys).toHaveLength(4);
  });
});
