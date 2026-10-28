// @vitest-environment jsdom
// ── Today's aim is a promise about difficulty — docs §8.1/§8.3 ceiling. ─────────
// Regression (owner report, 2026-10-28): a beginner picked "Easier" (pitched at
// A1) and the session went easy → harder. bandFit was only a soft score term,
// so a slot could take any question in the topic: an "Easier" session got a B2
// stretch and a B1 "warm-up", and the 3-answer daily trim kept the fill order
// (review, stretch first) instead of the session's real plan. These run the real
// question bank through the real builder.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildSessionQuestions } from '../sessionBuilder';
import { deriveDemandScore, demandScoreToLevel } from '../../domain/learn/demand/deriveDemandLevel';
import { computeSessionTarget, type Aim } from '../../domain/learn/selection/sessionTarget';
import { COLD_START_SEED } from '../../domain/learn/ability/thresholds';
import { TOPICS, getTopicQuestions } from '../../data/questions';
import { STORAGE_KEYS, storageSet } from '../../services/persistence/storage';
import type { DifficultyTier, SessionMode, SkillProfile } from '../../types';

const LEVEL_RANK = { A1: 0, A2: 1, B1: 2, B2: 3 } as const;
const TIERS: DifficultyTier[] = ['beginner', 'intermediate', 'advanced'];
const MODES: { mode: SessionMode; count: number }[] = [
  { mode: 'quick', count: 3 }, // today's daily allowance
  { mode: 'quick', count: 5 },
  { mode: 'standard', count: 10 },
];
const PRESENTATION_RANK = { warmup: 0, review: 1, target: 2, choice: 3, stretch: 4 } as const;

const topics = TOPICS.filter((t) => t.questionsCount >= 5).map((t) => t.key);

function build(topic: string, tier: DifficultyTier, aim: Aim, mode: SessionMode, count: number) {
  return buildSessionQuestions(topic, mode, {} as SkillProfile, null, tier, null, null, { aim, migratedTier: tier, count });
}

beforeEach(() => {
  localStorage.clear();
  storageSet(STORAGE_KEYS.featureFlagOverrides, { learnAdaptiveDifficulty: 'live' });
});
afterEach(() => localStorage.clear());

describe('Today\'s aim holds across the real question bank', () => {
  it('"Easier": no question above today\'s level and no stretch — every topic, tier and length', () => {
    for (const topic of topics) for (const tier of TIERS) for (const { mode, count } of MODES) {
      const target = computeSessionTarget(COLD_START_SEED[tier], 'comfortable');
      const built = build(topic, tier, 'comfortable', mode, count);
      for (const [i, q] of built.questions.entries()) {
        const slot = built.slots![i];
        expect(slot.slotType, `${topic}/${tier}/${count}`).not.toBe('stretch');
        if (!q.demands) continue;
        const score = deriveDemandScore(q.demands);
        // Only when the topic has nothing easier left may a pick be above (rung 5, the easiest left).
        if (slot.rung === 5) continue;
        expect(score, `${topic}/${tier}/${count}: ${q.id}`).toBeLessThanOrEqual(target + 0.5);
        expect(LEVEL_RANK[demandScoreToLevel(score)], `${topic}/${tier}/${count}: ${q.id}`).toBeLessThanOrEqual(LEVEL_RANK[demandScoreToLevel(target)]);
      }
    }
  });

  it('"Right for me" / "Harder": only a stretch is above today\'s level, and at most one level up', () => {
    for (const aim of ['balanced', 'push'] as Aim[]) for (const topic of topics) for (const tier of TIERS) for (const { mode, count } of MODES) {
      const target = computeSessionTarget(COLD_START_SEED[tier], aim);
      const built = build(topic, tier, aim, mode, count);
      for (const [i, q] of built.questions.entries()) {
        const slot = built.slots![i];
        if (!q.demands || slot.rung === 5) continue;
        const level = LEVEL_RANK[demandScoreToLevel(deriveDemandScore(q.demands))];
        const todays = LEVEL_RANK[demandScoreToLevel(target)];
        if (slot.slotType === 'stretch') expect(level, `${aim}/${topic}/${tier}: ${q.id}`).toBeLessThanOrEqual(todays + 1);
        else if (slot.slotType !== 'choice' && slot.slotType !== 'review') expect(level, `${aim}/${topic}/${tier}: ${q.id}`).toBeLessThanOrEqual(todays);
      }
    }
  });

  it('a session is planned for its real length and asked easiest first (warm-up → … → stretch)', () => {
    for (const aim of ['comfortable', 'balanced', 'push'] as Aim[]) for (const topic of topics) {
      const built = build(topic, 'beginner', aim, 'quick', 3);
      expect(built.questions.length).toBeLessThanOrEqual(3);
      const ranks = built.slots!.map((s) => PRESENTATION_RANK[s.slotType]);
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    }
  });

  it('the owner\'s case: a beginner on "Easier" gets only A1 questions in a 3-answer session', () => {
    for (const topic of topics) {
      const built = build(topic, 'beginner', 'comfortable', 'quick', 3);
      for (const [i, q] of built.questions.entries()) {
        if (!q.demands || built.slots![i].rung === 5) continue;
        expect(demandScoreToLevel(deriveDemandScore(q.demands)), `${topic}: ${q.id}`).toBe('A1');
      }
    }
  });

  it('rung 5 is used only when the topic has nothing at or below today\'s level left, and picks the easiest', () => {
    for (const topic of topics) for (const { mode, count } of MODES) {
      const built = build(topic, 'beginner', 'comfortable', mode, count);
      const target = computeSessionTarget(COLD_START_SEED.beginner, 'comfortable');
      const used = new Set(built.questions.map((q) => q.id));
      const fitsToday = (score: number) =>
        score <= target + 0.5 && LEVEL_RANK[demandScoreToLevel(score)] <= LEVEL_RANK[demandScoreToLevel(target)];
      const unusedUnderCeiling = getTopicQuestions(topic).filter((q) => q.demands && !used.has(q.id) && fitsToday(deriveDemandScore(q.demands)));
      if (built.slots!.some((s) => s.rung === 5)) expect(unusedUnderCeiling, `${topic}/${count}`).toEqual([]);
      for (const slot of built.slots!) {
        if (slot.rung === 5) expect(slot.selectionReason?.explanation).toBe('The easiest question left in this topic.');
      }
    }
  });
});
