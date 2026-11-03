// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const history = vi.hoisted(() => ({ sessions: [] as { mode: string }[] }));
vi.mock('../../../services/analytics/analyticsService', () => ({ getSessionHistory: () => history.sessions }));

import { hasSeenExamGuide, markExamGuideSeen, shouldOpenGuideBeforeSim } from '../guideSeen';

beforeEach(() => {
  localStorage.clear();
  history.sessions = [];
});

describe('exam guide auto-open', () => {
  it('opens before a first Exam Sim', () => {
    expect(hasSeenExamGuide()).toBe(false);
    expect(shouldOpenGuideBeforeSim()).toBe(true);
  });

  it('never again once the guide has been opened', () => {
    markExamGuideSeen();
    expect(hasSeenExamGuide()).toBe(true);
    expect(shouldOpenGuideBeforeSim()).toBe(false);
  });

  it('not for a learner who has already done an exam', () => {
    history.sessions = [{ mode: 'learn' }, { mode: 'exam' }];
    expect(shouldOpenGuideBeforeSim()).toBe(false);
  });

  it('other practice alone does not count as having done an exam', () => {
    history.sessions = [{ mode: 'learn' }, { mode: 'story' }];
    expect(shouldOpenGuideBeforeSim()).toBe(true);
  });
});
