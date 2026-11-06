import { describe, expect, it } from 'vitest';
import { ACHIEVEMENT_DEFINITIONS } from '../../../data/achievements';
import { ACHIEVEMENT_GROUPS, achievementTiles, groupAchievementTiles, type AchievementCounts } from '../achievementDisplay';
import type { Achievement } from '../../../types';

const COUNTS: AchievementCounts = {
  sessions: 4, streak: 2, xp: 300, topicsPractised: 2, rolePlaysPractised: 0, bestScore: null,
  examsCompleted: 0, countedExams: 0, daysPractised: 3, longestAnswerWords: 20,
};

const achievements = (unlocked: string[]): Achievement[] =>
  ACHIEVEMENT_DEFINITIONS.map(d => ({ ...d, unlocked: unlocked.includes(d.id) }));
const hiddenIds = new Set(ACHIEVEMENT_DEFINITIONS.filter(d => d.hidden || d.retired).map(d => d.id));

describe('groupAchievementTiles', () => {
  it('every achievement has a group', () => {
    const known = new Set(ACHIEVEMENT_GROUPS.map(g => g.category));
    for (const d of ACHIEVEMENT_DEFINITIONS) expect(known.has(d.category), d.id).toBe(true);
  });

  it('groups in the fixed order, losing no tile and keeping unlocked-first order', () => {
    const tiles = achievementTiles(achievements(['premier_pas', 'triple_jour']), hiddenIds, COUNTS);
    const groups = groupAchievementTiles(tiles);
    expect(groups.map(g => g.category)).toEqual(['start', 'habit', 'speaking', 'growth', 'exam', 'explore']);
    expect(groups.flatMap(g => g.tiles)).toHaveLength(tiles.length);
    const habit = groups.find(g => g.category === 'habit')!;
    expect(habit.tiles[0].achievement.id).toBe('triple_jour');
    expect(habit.unlocked).toBe(1);
  });

  it('keeps hidden and retired badges out until earned, then shows them in their group', () => {
    const locked = groupAchievementTiles(achievementTiles(achievements([]), hiddenIds, COUNTS));
    const ids = locked.flatMap(g => g.tiles.map(t => t.achievement.id));
    expect(ids).not.toContain('perfectionniste');
    expect(ids).not.toContain('cinq_sessions');

    const earned = groupAchievementTiles(achievementTiles(achievements(['perfectionniste', 'cinq_sessions']), hiddenIds, COUNTS));
    expect(earned.find(g => g.category === 'speaking')!.tiles.map(t => t.achievement.id)).toContain('perfectionniste');
    expect(earned.find(g => g.category === 'habit')!.tiles.map(t => t.achievement.id)).toContain('cinq_sessions');
  });

  it('leaves out a group with nothing to show', () => {
    const only = achievementTiles(achievements([]), hiddenIds, COUNTS).filter(t => t.achievement.category === 'exam');
    expect(groupAchievementTiles(only).map(g => g.category)).toEqual(['exam']);
  });
});
