import { describe, expect, it } from 'vitest';
import { ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_RULES, evaluateAchievements, type AchievementContext } from '../achievements';

const ctx = (over: Partial<AchievementContext> = {}): AchievementContext => ({
  score: null,
  streak: 0,
  totalSessions: 0,
  topicsUsed: [],
  beliefSnapshot: null,
  problems: [],
  interventions: [],
  xp: 0,
  grammarCoachUses: 0,
  roleplayCount: 0,
  examCompleted: false,
  examType: null,
  ...over,
});

describe('evaluateAchievements', () => {
  it('a first counted Exam Sim unlocks both Examinateur and Grand Oral', () => {
    expect(evaluateAchievements(ctx({ examCompleted: true, examType: 'igcse', totalSessions: 1 }), new Set()))
      .toEqual(expect.arrayContaining(['examinateur', 'grand_oral']));
  });

  it('a practice-only exam unlocks Examinateur but not Grand Oral', () => {
    const ids = evaluateAchievements(ctx({ examCompleted: true, examType: 'practice' }), new Set());
    expect(ids).toContain('examinateur');
    expect(ids).not.toContain('grand_oral');
  });

  it('unlocks a whole session-count chain in one pass', () => {
    expect(evaluateAchievements(ctx({ totalSessions: 12 }), new Set()))
      .toEqual(expect.arrayContaining(['premier_pas', 'cinq_sessions', 'dix_sessions']));
  });

  it('never returns an achievement that is already unlocked', () => {
    expect(evaluateAchievements(ctx({ totalSessions: 5 }), new Set(['premier_pas']))).toEqual(['cinq_sessions']);
  });

  it('Polyglotte needs 8 distinct topics', () => {
    const topics = ['school', 'hobbies', 'family', 'holidays', 'home', 'future', 'food'];
    expect(evaluateAchievements(ctx({ topicsUsed: topics }), new Set())).not.toContain('polyglotte');
    expect(evaluateAchievements(ctx({ topicsUsed: [...topics, 'environment'] }), new Set())).toContain('polyglotte');
  });

  it('every prerequisite comes earlier in the rule list (one pass is enough)', () => {
    const order = ACHIEVEMENT_RULES.map(r => r.id);
    for (const r of ACHIEVEMENT_RULES) {
      for (const req of r.requires ?? []) expect(order.indexOf(req)).toBeLessThan(order.indexOf(r.id));
    }
  });

  it('Curieux stays hidden while nothing in the app counts Grammar Coach uses', () => {
    expect(ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'curieux')?.hidden).toBe(true);
  });
});
