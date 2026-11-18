import { describe, expect, it } from 'vitest';
import { EMPTY_TRACK_RECORD, IMPROVED_BY, STALLS_BEFORE_SWITCH, moveTrackRecord } from '../trackRecord';
import type { CoachOutcomeEntry, CoachOutcomeLog, FollowState, MoveTarget, OutcomeBaseline, OutcomeState } from '../outcomeLog';
import type { CoachMoveKind } from '../types';

const day = (n: number) => new Date(Date.parse('2026-11-01T10:00:00Z') + n * 86_400_000).toISOString();

const RP: MoveTarget = { type: 'exam_area', area: 'rolePlay' };

function entry(
  n: number,
  kind: CoachMoveKind,
  target: MoveTarget,
  baseline: OutcomeBaseline,
  value: number | null,
  opts: { follow?: FollowState['status']; delta?: number | null; outcome?: OutcomeState } = {},
): CoachOutcomeEntry {
  const base = baseline.type === 'exam_area' ? baseline.mark : baseline.value;
  const delta = opts.delta !== undefined ? opts.delta : value === null || base === null ? null : value - base;
  const follow: FollowState = (opts.follow ?? 'followed') === 'followed'
    ? { status: 'followed', at: day(n), sessionId: `s${n}` }
    : { status: opts.follow as 'not_followed' | 'pending' } as FollowState;
  return {
    id: `e${n}`, kind, target, activity: { type: 'role_play' }, evidence: {}, baseline,
    shownAt: day(n), lastShownAt: day(n), shows: 1, follow,
    outcome: opts.outcome ?? { status: 'measured', measuredAt: day(n + 3), value, delta, answersSince: 1 },
  };
}

const rp = (n: number, from: number, to: number | null, opts: Parameters<typeof entry>[5] = {}, max = 10) =>
  entry(n, 'role_play', RP, { type: 'exam_area', area: 'rolePlay', mark: from, max }, to, opts);

const log = (...entries: CoachOutcomeEntry[]): CoachOutcomeLog => ({ v: 1, entries });

describe('moveTrackRecord', () => {
  it('thresholds are the documented UNVALIDATED starting values', () => {
    expect(STALLS_BEFORE_SWITCH).toBe(2);
    expect(IMPROVED_BY).toEqual({ skill_mastery: 0.05, exam_area: 1, exam_total: 2, topic_average: 0.5 });
  });

  it('no log, no episodes, or a target-less move: an empty record', () => {
    expect(moveTrackRecord(undefined, 'role_play', RP)).toEqual(EMPTY_TRACK_RECORD);
    expect(moveTrackRecord(log(), 'role_play', RP)).toEqual(EMPTY_TRACK_RECORD);
    expect(moveTrackRecord(log(rp(0, 4, 4)), 'first_steps', { type: 'none' })).toEqual(EMPTY_TRACK_RECORD);
  });

  it('counts followed episodes whose mark did not rise as stalls', () => {
    const r = moveTrackRecord(log(rp(0, 4, 4), rp(8, 4, 3)), 'role_play', RP);
    expect(r).toEqual({ stalls: 2, followedMeasured: 2, improvement: null });
  });

  it('a rise smaller than IMPROVED_BY is still a stall', () => {
    const r = moveTrackRecord(log(rp(0, 4, 4, { delta: 0.5 })), 'role_play', RP);
    expect(r.stalls).toBe(1);
  });

  it('ignores episodes the learner did not follow, and outcomes not yet measured', () => {
    const r = moveTrackRecord(log(
      rp(0, 4, 4, { follow: 'not_followed' }),
      rp(2, 4, 4, { follow: 'pending' }),
      rp(4, 4, null, { outcome: { status: 'pending' } }),
      rp(6, 4, null, { outcome: { status: 'unmeasured' } }),
      rp(8, 4, 4),
    ), 'role_play', RP);
    expect(r).toEqual({ stalls: 1, followedMeasured: 1, improvement: null });
  });

  it('ignores a measured outcome with no delta (different scale)', () => {
    expect(moveTrackRecord(log(rp(0, 4, 7, { delta: null })), 'role_play', RP)).toEqual(EMPTY_TRACK_RECORD);
  });

  it('does not mix kinds or targets', () => {
    const other = entry(0, 'role_play', { type: 'exam_area', area: 'communication' }, { type: 'exam_area', area: 'communication', mark: 6, max: 15 }, 6);
    const drill = entry(1, 'develop_answers', RP, { type: 'exam_area', area: 'rolePlay', mark: 4, max: 10 }, 4);
    expect(moveTrackRecord(log(other, drill), 'role_play', RP)).toEqual(EMPTY_TRACK_RECORD);
  });

  it('an improvement resets the stall count, and reports first baseline → latest value', () => {
    const r = moveTrackRecord(log(rp(0, 4, 4), rp(8, 4, 5), rp(16, 5, 7)), 'role_play', RP);
    expect(r).toEqual({ stalls: 0, followedMeasured: 3, improvement: { metric: 'exam_area', from: 4, to: 7, max: 10 } });
  });

  it('a stall after an improvement: one stall, no improvement to state', () => {
    const r = moveTrackRecord(log(rp(0, 4, 7), rp(8, 7, 7)), 'role_play', RP);
    expect(r).toEqual({ stalls: 1, followedMeasured: 2, improvement: null });
  });

  it('never claims an overall rise the log does not show', () => {
    // Last round rose 3 → 5, but the first baseline was 6: overall it fell.
    const r = moveTrackRecord(log(rp(0, 6, 3), rp(8, 3, 5)), 'role_play', RP);
    expect(r.stalls).toBe(0);
    expect(r.improvement).toBeNull();
  });

  it('never quotes "from → to" across different maxima', () => {
    const r = moveTrackRecord(log(rp(0, 4, 6, {}, 10), rp(8, 6, 9, {}, 15)), 'role_play', RP);
    expect(r.improvement).toBeNull();
  });

  it('skill and topic metrics use their own thresholds', () => {
    const skill: MoveTarget = { type: 'skill', skillId: 'tense_past' };
    const s = (n: number, from: number, to: number) =>
      entry(n, 'weak_skill', skill, { type: 'skill_mastery', skillId: 'tense_past', value: from, evidenceCount: 6 }, to);
    expect(moveTrackRecord(log(s(0, 0.35, 0.38)), 'weak_skill', skill).stalls).toBe(1);
    expect(moveTrackRecord(log(s(0, 0.35, 0.5)), 'weak_skill', skill).improvement).toEqual({ metric: 'skill_mastery', from: 0.35, to: 0.5 });

    const topic: MoveTarget = { type: 'topic', topicKey: 'school' };
    const t = (n: number, from: number | null, to: number) =>
      entry(n, 'review', topic, { type: 'topic_average', topicKey: 'school', value: from, sessions: 2 }, to);
    expect(moveTrackRecord(log(t(0, 5, 5.3)), 'review', topic).stalls).toBe(1);
    expect(moveTrackRecord(log(t(0, 5, 6.2)), 'review', topic).improvement).toEqual({ metric: 'topic_average', from: 5, to: 6.2 });
    // No average at the show: nothing to compare.
    expect(moveTrackRecord(log(t(0, null, 6.2)), 'review', topic)).toEqual(EMPTY_TRACK_RECORD);
  });
});
