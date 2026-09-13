import { describe, expect, it, vi, afterEach } from 'vitest';
import { isTopicMastered, isLearnTopicUnlocked } from '../topicProgress';

const getStatsMock = vi.fn();
vi.mock('../../../services/analytics/analyticsService', () => ({
  getStats: () => getStatsMock(),
}));

afterEach(() => {
  getStatsMock.mockReset();
});

describe('isTopicMastered', () => {
  it('is false with no stats for the topic', () => {
    getStatsMock.mockReturnValue({ byTopic: {} });
    expect(isTopicMastered('jobs')).toBe(false);
  });

  it('is false below the session-count threshold even with a high average', () => {
    getStatsMock.mockReturnValue({ byTopic: { jobs: { count: 4, avg: 9 } } });
    expect(isTopicMastered('jobs')).toBe(false);
  });

  it('is false below the score threshold even with enough sessions', () => {
    getStatsMock.mockReturnValue({ byTopic: { jobs: { count: 10, avg: 6.9 } } });
    expect(isTopicMastered('jobs')).toBe(false);
  });

  it('is true at/above both thresholds', () => {
    getStatsMock.mockReturnValue({ byTopic: { jobs: { count: 5, avg: 7 } } });
    expect(isTopicMastered('jobs')).toBe(true);
  });
});

describe('isLearnTopicUnlocked', () => {
  it('is always true for an empty dependency list (vacuous case)', () => {
    getStatsMock.mockReturnValue({ byTopic: {} });
    expect(isLearnTopicUnlocked([])).toBe(true);
  });

  it('is false when any dependency is not mastered', () => {
    getStatsMock.mockReturnValue({ byTopic: { jobs: { count: 5, avg: 7 } } });
    expect(isLearnTopicUnlocked(['jobs', 'holidays'])).toBe(false);
  });

  it('is true when every dependency is mastered', () => {
    getStatsMock.mockReturnValue({ byTopic: { jobs: { count: 5, avg: 7 } } });
    expect(isLearnTopicUnlocked(['jobs'])).toBe(true);
  });
});
