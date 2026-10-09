// @vitest-environment jsdom
// ── AppContext reducer — pure unit tests ────────────────────────────────────
// reducer is a pure function of (state, action); no storage/React needed.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reducer } from '../AppContext';
import { setStorageScope, getStorageScope } from '../../services/persistence/storage';
import type { NotebookEntry } from '../../domain/learn/notebook/notebook';
import type { UserProfile } from '../../types/index';

function baseProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'u1',
    username: 'test',
    total_xp: 0,
    gems: 0,
    current_level: 'Beginner',
    streak_days: 0,
    longest_streak: 0,
    last_session_date: null,
    sessions_count: 0,
    total_words_spoken: 0,
    inventory: {},
    activeBoosters: [],
    equipped: { avatar: null, frame: null, nameplate: null },
    ...overrides,
  };
}

// Minimal state fixture — only the fields ADD_XP's reducer branch reads/writes matter here.
function baseState(overrides: { profile?: Partial<UserProfile> } = {}) {
  return {
    profile: baseProfile(overrides.profile),
    achievements: [],
    recentSessions: [],
    xpAnimations: [],
    gemAnimations: [],
    showXPModal: false,
    lastXPGained: 0,
    lastGemsGained: 0,
    soundEnabled: true,
    darkMode: false,
    skillProfile: {} as never,
    focusedSkillId: null,
    masteredDrills: [],
    firstsSeen: [],
    notebook: [] as NotebookEntry[],
    lastUnlockedAchievement: null,
    newLevelReached: null,
    activeSession: null,
    topicMastery: {},
    justMasteredTopic: null,
    preferredEngine: 'groq' as never,
    selectedDifficulty: 'A2' as never,
    aim: 'balanced' as never,
    dailyGoal: 3,
  };
}

describe('ADD_XP reducer — level-down does not trigger a celebration (reliability plan §2.6)', () => {
  it('sets newLevelReached when XP crosses a level boundary upward', () => {
    const state = baseState({ profile: { total_xp: 400, current_level: 'Beginner' } });
    const next = reducer(state, {
      type: 'ADD_XP',
      amount: 200,
      totalXP: 600, // crosses the 500 Intermediate threshold
      totalGems: 0,
      gemGain: 0,
      activeBoosters: [],
    });
    expect(next.newLevelReached).toBe('Intermediate');
  });

  it('does NOT set newLevelReached when a negative XP delta drops the level name (DailyNewsFlash reveal-penalty case)', () => {
    const state = baseState({ profile: { total_xp: 600, current_level: 'Intermediate' } });
    const next = reducer(state, {
      type: 'ADD_XP',
      amount: -200,
      totalXP: 400, // drops back below the 500 Intermediate threshold
      totalGems: 0,
      gemGain: 0,
      activeBoosters: [],
    });
    expect(next.newLevelReached).toBeNull();
    expect(next.profile.current_level).toBe('Beginner');
  });

  it('leaves an existing pending newLevelReached untouched when this XP change causes no further level change', () => {
    const state = { ...baseState({ profile: { total_xp: 500, current_level: 'Intermediate' } }), newLevelReached: 'Intermediate' };
    const next = reducer(state, {
      type: 'ADD_XP',
      amount: 10,
      totalXP: 510,
      totalGems: 0,
      gemGain: 0,
      activeBoosters: [],
    });
    expect(next.newLevelReached).toBe('Intermediate');
  });
});

describe('MARK_FIRSTS_SEEN reducer (Learn feedback Batch 6c)', () => {
  it('adds only the ids not already seen, and persists them', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const next = reducer({ ...baseState(), firstsSeen: ['past'] }, { type: 'MARK_FIRSTS_SEEN', ids: ['past', 'future'] });
    expect(next.firstsSeen).toEqual(['past', 'future']);
    expect(setItem.mock.calls.some(([key]) => String(key).includes('frenchCoach_firstsSeen'))).toBe(true);
    setItem.mockRestore();
  });

  it('is a no-op (same state, no write) when everything was already said', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const state = { ...baseState(), firstsSeen: ['past'] };
    expect(reducer(state, { type: 'MARK_FIRSTS_SEEN', ids: ['past'] })).toBe(state);
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });
});

describe('SAVE_NOTEBOOK_ENTRY reducer (Learn feedback Batch 6d)', () => {
  const draft = {
    questionId: 'q1',
    question: 'Que fais-tu le week-end ?',
    topicKey: 'hobbies',
    subTopic: 'weekends',
    answer: 'Je suis allé au cinéma.',
    phrases: ['je suis allé'],
  };
  let priorScope: string | null;

  beforeEach(() => {
    priorScope = getStorageScope();
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    if (priorScope) setStorageScope(priorScope);
  });

  it('saves for a signed-in account and persists under the account-scoped key', () => {
    setStorageScope('user-1');
    const next = reducer(baseState(), { type: 'SAVE_NOTEBOOK_ENTRY', draft, now: '2026-10-09T10:00:00Z' });
    expect(next.notebook).toHaveLength(1);
    expect(next.notebook[0]).toMatchObject({ questionId: 'q1', answer: 'Je suis allé au cinéma.', savedAt: '2026-10-09T10:00:00Z', history: [] });
    expect(JSON.parse(localStorage.getItem('frenchCoach_notebook::user-1') ?? 'null')).toHaveLength(1);
    expect(localStorage.getItem('frenchCoach_notebook')).toBeNull();
  });

  it('replaces the same question and keeps the old answer as history', () => {
    setStorageScope('user-1');
    const a = reducer(baseState(), { type: 'SAVE_NOTEBOOK_ENTRY', draft, now: '1' });
    const b = reducer(a, { type: 'SAVE_NOTEBOOK_ENTRY', draft: { ...draft, answer: 'Le samedi, je vais au cinéma.', phrases: [] }, now: '2' });
    expect(b.notebook).toHaveLength(1);
    expect(b.notebook[0].answer).toBe('Le samedi, je vais au cinéma.');
    expect(b.notebook[0].history.map((h) => h.answer)).toEqual(['Je suis allé au cinéma.']);
  });

  it('saving the same answer again is a no-op (same state, no write)', () => {
    setStorageScope('user-1');
    const a = reducer(baseState(), { type: 'SAVE_NOTEBOOK_ENTRY', draft, now: '1' });
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    expect(reducer(a, { type: 'SAVE_NOTEBOOK_ENTRY', draft, now: '2' })).toBe(a);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('a guest cannot save: no state change and nothing written under any key', () => {
    setStorageScope('guest');
    const state = baseState();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    expect(reducer(state, { type: 'SAVE_NOTEBOOK_ENTRY', draft, now: '1' })).toBe(state);
    expect(setItem).not.toHaveBeenCalled();
    expect(Object.keys(localStorage).filter((k) => k.includes('notebook'))).toEqual([]);
  });

  it('SET_NOTEBOOK mirrors another tab without writing, and is ignored for a guest', () => {
    setStorageScope('user-1');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const entries = reducer(baseState(), { type: 'SAVE_NOTEBOOK_ENTRY', draft, now: '1' }).notebook;
    setItem.mockClear();
    expect(reducer(baseState(), { type: 'SET_NOTEBOOK', entries }).notebook).toBe(entries);
    expect(setItem).not.toHaveBeenCalled();
    setStorageScope('guest');
    const state = baseState();
    expect(reducer(state, { type: 'SET_NOTEBOOK', entries })).toBe(state);
  });
});
