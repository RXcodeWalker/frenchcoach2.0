import { describe, it, expect } from 'vitest';
import { SETUP_LENGTHS, clampLength, isLengthAvailable, isTopicVisible, summarisePreview, previewText } from '../sessionSetup';
import { TOPICS } from '../../../data/questions';
import type { BuiltSessionQuestionSlot } from '../../../utils/sessionBuilder';
import { computeSessionTarget } from '../../../domain/learn/selection/sessionTarget';

describe('session length vs. matching questions', () => {
  it('offers exactly 1 / 5 / 10 / 20', () => {
    expect(SETUP_LENGTHS.map((l) => l.count)).toEqual([1, 5, 10, 20]);
  });

  it('a length above the match count is unavailable', () => {
    expect(isLengthAvailable('deep_dive', 19)).toBe(false);
    expect(isLengthAvailable('deep_dive', 20)).toBe(true);
    expect(isLengthAvailable('single', 1)).toBe(true);
    expect(isLengthAvailable('single', 0)).toBe(false);
  });

  it('keeps a length that fits', () => {
    expect(clampLength('standard', 40)).toEqual({ mode: 'standard', clamped: false });
  });

  it('clamps down to the largest length that fits, and says so', () => {
    expect(clampLength('deep_dive', 7)).toEqual({ mode: 'quick', clamped: true });
    expect(clampLength('standard', 5)).toEqual({ mode: 'quick', clamped: true });
    expect(clampLength('quick', 3)).toEqual({ mode: 'single', clamped: true });
  });

  it('has no length at all when nothing matches', () => {
    expect(clampLength('standard', 0)).toEqual({ mode: null, clamped: true });
  });
});

function slot(slotType: BuiltSessionQuestionSlot['slotType']): BuiltSessionQuestionSlot {
  return { questionId: slotType + Math.random(), slotType, slotBand: null };
}

describe('session preview', () => {
  it('counts the stretch slots actually selected (a downgraded stretch is already a target)', () => {
    const preview = summarisePreview([slot('warmup'), slot('target'), slot('target'), slot('stretch'), slot('choice')], 4.5);
    expect(preview).toEqual({ total: 5, stretch: 1, targetLabel: 'Exam level (A2)' });
  });

  it('is null for an empty session', () => {
    expect(summarisePreview([], 4.5)).toBeNull();
    expect(summarisePreview(undefined, 4.5)).toBeNull();
  });

  it('names the level the target sits at, so Easier / Harder read differently', () => {
    const slots = [slot('target'), slot('target')];
    // Cold-start ability 4.5 (docs §6.4): Easier −1 → A2, Right for me → A2, Harder +1 → B1.
    expect(summarisePreview(slots, computeSessionTarget(4.5, 'comfortable'))?.targetLabel).toBe('Exam level (A2)');
    expect(summarisePreview(slots, computeSessionTarget(4.5, 'push'))?.targetLabel).toBe('Stretch (B1)');
  });

  it('never shows B2 or C1, even for a very high target', () => {
    expect(summarisePreview([slot('target')], 9.5)?.targetLabel).toBe('Stretch (B1+)');
  });

  it('words the line with and without a stretch share', () => {
    expect(previewText({ total: 5, stretch: 0, targetLabel: 'Exam level (A2)' })).toBe('Pitched at Exam level (A2).');
    expect(previewText({ total: 5, stretch: 2, targetLabel: 'Stretch (B1)' })).toBe(
      'Pitched at Stretch (B1), with 2 of 5 a step above.',
    );
  });

  it('never prints a raw demand id, score or a bare CEFR band above B1', () => {
    const text = previewText({ total: 10, stretch: 3, targetLabel: 'Stretch (B1+)' });
    expect(text).not.toMatch(/hypothesize|compare|justify|\bB2\b|\bC1\b/);
  });
});

describe('topic visibility (docs §13.4) against the real bank', () => {
  it('hides exactly the topics that hold a single question, and shows the 16 core topics', () => {
    const hidden = TOPICS.filter((t) => !isTopicVisible(t));
    expect(hidden).toHaveLength(8);
    for (const t of hidden) expect(t.questionsCount).toBeLessThanOrEqual(1);
    const visible = TOPICS.filter(isTopicVisible);
    expect(visible).toHaveLength(16);
    expect(visible.every((t) => !t.isAdvanced)).toBe(true);
  });
});
