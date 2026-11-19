// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { STORAGE_KEYS, setStorageScope, scopedKey } from '../../persistence/storage';
import { makeReport, makeView } from '../../../domain/coachLosses/__tests__/fixtures';
import { readExamLossRecord, recordExamLosses, refineExamLosses } from '../examLossStore';
import { gatherCoachInput } from '../coachBriefInput';
import type { StoredSession } from '../../analytics/analyticsService';

const sessionsMock = vi.hoisted(() => ({ list: [] as StoredSession[] }));
const apiMock = vi.hoisted(() => ({ poll: vi.fn(), feedback: vi.fn() }));
vi.mock('../../analytics/analyticsService', async (orig) => ({
  ...(await orig<typeof import('../../analytics/analyticsService')>()),
  getSessionHistory: () => sessionsMock.list,
}));
vi.mock('../../exam/scoringApiClient', () => ({
  pollScoreStatus: apiMock.poll,
  fetchStoredExamFeedback: apiMock.feedback,
}));

import { ensureExamLossRecord, resetExamLossBackfillForTests } from '../examLossBackfill';

const NOW = Date.now();
const examSession = (over: Partial<StoredSession> = {}): StoredSession => ({
  id: 'app-1', date: new Date(NOW - 2 * 86_400_000).toISOString(), mode: 'exam', topicKey: null, questionText: '', transcript: '', wordCount: 200,
  score: 6, durationSec: 600, practiceOnly: false, scoringSessionId: 'sess-1',
  examMarks: { rolePlay: 4, rolePlayMax: 10, communication: 10, qualityOfLanguage: 9, total: 23 }, ...over,
});

beforeEach(() => {
  localStorage.clear();
  setStorageScope('user-1');
  sessionsMock.list = [];
  apiMock.poll.mockReset();
  apiMock.feedback.mockReset();
  resetExamLossBackfillForTests();
});

describe('examLossStore', () => {
  it('keeps reason codes under the account-scoped key, and no learner text', () => {
    recordExamLosses(makeView({ rolePlay: [{ mark: 1, said: 'SECRET-ANSWER-TEXT' }], qualityOfLanguage: 9, qolErrors: 3 }));
    const raw = localStorage.getItem(scopedKey(STORAGE_KEYS.coachExamLosses)) ?? '';
    expect(raw).toContain('sess-1');
    expect(raw).not.toContain('SECRET');
    expect(readExamLossRecord('sess-1')?.hasReport).toBe(false);
  });

  it('the report refines an existing record but never starts one', () => {
    refineExamLosses(makeView({ rolePlay: [{ mark: 1 }] }), makeReport({ rpErrors: ['rp1'] }));
    expect(readExamLossRecord('sess-1')).toBeNull();
    recordExamLosses(makeView({ rolePlay: [{ mark: 1 }] }));
    expect(readExamLossRecord('sess-1')?.reasons[0].code).toBe('rp_below_full');
    refineExamLosses(makeView({ rolePlay: [{ mark: 1 }] }), makeReport({ rpErrors: ['rp1'] }));
    expect(readExamLossRecord('sess-1')).toMatchObject({ hasReport: true });
    expect(readExamLossRecord('sess-1')?.reasons[0].code).toBe('rp_errors_impede');
  });

  it('feeds the coach only for the newest counted attempt', () => {
    sessionsMock.list = [examSession()];
    recordExamLosses(makeView({ rolePlay: [{ mark: 0, said: '' }] }));
    expect(gatherCoachInput({ learnAnswersLeft: 3, now: NOW }).examLosses?.attemptId).toBe('app-1');
    sessionsMock.list = [examSession({ id: 'app-2', scoringSessionId: 'sess-2' }), examSession()];
    expect(gatherCoachInput({ learnAnswersLeft: 3, now: NOW }).examLosses).toBeNull();
  });

  it('is removed with the account', () => {
    const src = readFileSync(resolve(__dirname, '../../account/accountService.ts'), 'utf8');
    expect(src).toContain('storageRemove(STORAGE_KEYS.coachExamLosses)');
  });
});

describe('ensureExamLossRecord (backfill)', () => {
  it('re-reads the persisted marking for a counted attempt the device has no reasons for', async () => {
    sessionsMock.list = [examSession()];
    apiMock.poll.mockResolvedValue({ status: 'done', envelope: makeView({ rolePlay: [{ mark: 1 }], communication: 8 }) });
    apiMock.feedback.mockResolvedValue(makeReport({ rpErrors: ['rp1'] }));
    expect(await ensureExamLossRecord(NOW)).toBe(true);
    expect(apiMock.poll).toHaveBeenCalledWith('sess-1');
    expect(readExamLossRecord('sess-1')).toMatchObject({ hasReport: true });
    // a second look this page load does nothing
    expect(await ensureExamLossRecord(NOW)).toBe(false);
  });

  it('works without a stored report (envelope only)', async () => {
    sessionsMock.list = [examSession()];
    apiMock.poll.mockResolvedValue({ status: 'done', envelope: makeView({ communication: 8 }) });
    apiMock.feedback.mockResolvedValue(null);
    expect(await ensureExamLossRecord(NOW)).toBe(true);
    expect(readExamLossRecord('sess-1')).toMatchObject({ hasReport: false });
  });

  it('leaves non-counted attempts, signed-out reads and still-scoring attempts alone, without throwing', async () => {
    sessionsMock.list = [examSession({ practiceOnly: true })];
    expect(await ensureExamLossRecord(NOW)).toBe(false);
    expect(apiMock.poll).not.toHaveBeenCalled();

    sessionsMock.list = [examSession()];
    apiMock.feedback.mockResolvedValue(null);
    apiMock.poll.mockResolvedValue({ status: 'in_progress' });
    expect(await ensureExamLossRecord(NOW)).toBe(false);

    resetExamLossBackfillForTests();
    apiMock.poll.mockRejectedValue(new Error('401'));
    expect(await ensureExamLossRecord(NOW)).toBe(false);
    expect(readExamLossRecord('sess-1')).toBeNull();
  });

  it('never calls the generating endpoint', () => {
    const src = readFileSync(resolve(__dirname, '../examLossBackfill.ts'), 'utf8');
    expect(src).not.toContain('requestExamFeedback');
    expect(src).not.toContain('submitForScoring');
  });
});
