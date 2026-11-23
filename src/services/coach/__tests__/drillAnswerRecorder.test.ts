// @vitest-environment jsdom
// The Role-play drill's recorder: XP follows "every part covered", the Session
// carries no score, and no evidence is written (nothing read the learner's
// French the way a marked Learn answer does).
import { beforeEach, describe, expect, it } from 'vitest';
import { drillXpGain, recordDrillAnswer, DRILL_FULL_CREDIT_SCORE } from '../drillAnswerRecorder';
import { computeXPGain, computeParticipationXPGain } from '../../../domain/xp';
import { getSessionHistory } from '../../analytics/analyticsService';
import { getRecentEvidence } from '../coachStorage';
import { parseDrillSessionId } from '../../../features/rolePlayDrill/drillProgress';

const base = {
  cardId: 'rpc_24_01',
  step: 2,
  questionText: "Qu'est-ce que vous aimez faire en vacances ? Pourquoi ?",
  transcript: "Aller à la plage, parce que c'est reposant.",
  durationSec: 6,
  streakDays: 3,
  totalSessionsBefore: 0,
};

beforeEach(() => localStorage.clear());

describe('drillXpGain', () => {
  it('is computeXPGain at full credit when every part is covered', () => {
    expect(drillXpGain(true, 3)).toEqual(computeXPGain(DRILL_FULL_CREDIT_SCORE, 3));
  });
  it('is participation XP otherwise', () => {
    expect(drillXpGain(false, 3)).toEqual(computeParticipationXPGain(3));
  });
  it('full credit is worth more than participation', () => {
    expect(drillXpGain(true, 0).gain).toBeGreaterThan(drillXpGain(false, 0).gain);
  });
});

describe('recordDrillAnswer', () => {
  it('stores a story Session with the drill id format, no score and the full-credit XP', () => {
    const { session, xpResult } = recordDrillAnswer({ ...base, complete: true, now: 1_700_000_000_000 });
    expect(session.mode).toBe('story');
    expect(session.score).toBeNull();
    expect(session.feedback).toBeUndefined();
    expect(session.id).toBe('story-rpc_24_01-1700000000000-2');
    expect(parseDrillSessionId(session.id)).toEqual({ cardId: 'rpc_24_01', step: 2 });
    expect(session.xpEarned).toBe(computeXPGain(10, 3).gain);
    expect(xpResult.gain).toBe(computeXPGain(10, 3).gain);
    expect(getSessionHistory().map((s) => s.id)).toEqual([session.id]);
  });

  it('awards participation XP when a part is missing', () => {
    const { session, xpResult } = recordDrillAnswer({ ...base, complete: false });
    expect(session.xpEarned).toBe(computeParticipationXPGain(3).gain);
    expect(xpResult.gain).toBe(computeParticipationXPGain(3).gain);
  });

  it('writes no evidence event and fires no score achievement', () => {
    const { newUnlockedAchievementIds } = recordDrillAnswer({ ...base, complete: true });
    expect(getRecentEvidence(20)).toEqual([]);
    expect(newUnlockedAchievementIds.filter((id) => /score|marks?/i.test(id))).toEqual([]);
  });

  it('awards no gems', () => {
    expect(recordDrillAnswer({ ...base, complete: true }).xpResult.gemsGain).toBe(0);
    expect(recordDrillAnswer({ ...base, step: 4, complete: false }).xpResult.gemsGain).toBe(0);
  });

  it('carries homework through to the Session', () => {
    expect(recordDrillAnswer({ ...base, complete: true, assignmentId: 'hw-1' }).session.assignmentId).toBe('hw-1');
    expect(recordDrillAnswer({ ...base, step: 3, complete: true }).session.assignmentId).toBeUndefined();
  });
});
