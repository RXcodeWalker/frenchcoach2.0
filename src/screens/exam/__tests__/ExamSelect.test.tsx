// @vitest-environment jsdom
/**
 * 0520 conduct plan, Batch 1 repro (exam-conduct §4): in Exam Sim the topics
 * and the role-play card must not reach the candidate before preparation
 * starts. The fix (D4: no set picking in Exam Sim) lands in Batch 3; until then
 * `it.fails` pins today's behaviour — flip it to `it` when Batch 3 lands.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { OFFLINE_FIXTURES } from '../../../data/exam/bank/fixtures';

vi.mock('../../../data/exam/bank/loader', () => ({
  // Never resolves: the screen stays on the bundled offline sets.
  listPublishedQuestionSetsWithRetry: () => new Promise(() => {}),
  getOfflineAuthoredSets: () => Object.values(OFFLINE_FIXTURES),
}));

import { ExamSelect } from '../ExamSelect';

afterEach(() => cleanup());

describe('ExamSelect — Exam Sim hides topics and the role-play card (fixed in Batch 3)', () => {
  it.fails('Exam Sim (the default mode) shows no topic area, sub-topic or role-play title', () => {
    const { container } = render(<ExamSelect onSelect={vi.fn()} onAutoFallback={vi.fn()} />);
    const text = container.textContent ?? '';
    const set = OFFLINE_FIXTURES['original-practice-001'];
    expect(text).not.toContain(set.content.rolePlay.title);
    expect(text).not.toContain(set.content.topic1.subTopic);
    expect(text).not.toContain(set.content.topic2.subTopic);
    expect(text).not.toMatch(/Everyday Activities|Personal & Social Life|World Around Us|World of Work|International World/);
  });
});
