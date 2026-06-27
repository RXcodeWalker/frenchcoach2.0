import { createContext, useContext, useReducer, useEffect, useRef, type Dispatch, type ReactNode } from 'react';
import type { UserProfile, Achievement, Session, XPAnimation, GemAnimation, SkillProfile, ActiveSession, TopicMasteryEntry, AIEngine, DifficultyTier } from '../types';
import { DEFAULT_DIFFICULTY } from '../utils/difficultyConfig';
import { ACHIEVEMENTS } from '../data/gameData';
import { getStats } from '../services/analytics/analyticsService';
import { getProgressionState, awardGemsForXP, levelFor } from '../services/progression/progressionService';
import { getSkillProfile } from '../services/coaching/diagnosticEngine';
import { STORAGE_KEYS, storageGet, storageSet, storageSetRaw } from '../services/persistence/storage';

interface AppState {
  profile: UserProfile;
  achievements: Achievement[];
  recentSessions: Session[];
  xpAnimations: XPAnimation[];
  gemAnimations: GemAnimation[];
  showXPModal: boolean;
  lastXPGained: number;
  lastGemsGained: number;
  soundEnabled: boolean;
  darkMode: boolean;
  skillProfile: SkillProfile;
  focusedSkillId: string | null;
  masteredDrills: string[];
  lastUnlockedAchievement: Achievement | null;
  newLevelReached: string | null;
  activeSession: ActiveSession | null;
  topicMastery: Record<string, TopicMasteryEntry>;
  justMasteredTopic: string | null;
  preferredEngine: AIEngine;
  selectedDifficulty: DifficultyTier;
}

type Action =
  | { type: 'ADD_XP'; amount: number; totalXP: number; totalGems: number; gemGain: number; activeBoosters: { id: string; expiresAt: string; multiplier: number }[]; x?: number; y?: number }
  | { type: 'ADD_GEMS'; amount: number; x?: number; y?: number }
  | { type: 'DISMISS_XP_MODAL' }
  | { type: 'DISMISS_CELEBRATIONS' }
  | { type: 'ADD_SESSION'; session: Session; xpResult: { gain: number; totalXP: number; gemsGain: number; totalGems: number; activeBoosters: { id: string; expiresAt: string; multiplier: number }[] }; newUnlockedAchievementIds: string[]; newLevelName: string; xpAnimX?: number; xpAnimY?: number }
  | { type: 'UNLOCK_ACHIEVEMENT'; achievementId: string }
  | { type: 'PURCHASE_ITEM'; cost: number; itemId: string }
  | { type: 'USE_ITEM'; itemId: string }
  | { type: 'ACTIVATE_BOOSTER'; itemId: string; durationMinutes: number; multiplier: number }
  | { type: 'SET_PROFILE'; profile: UserProfile }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'REMOVE_XP_ANIMATION'; id: string }
  | { type: 'REMOVE_GEM_ANIMATION'; id: string }
  | { type: 'UPDATE_SKILL_PROFILE'; skillProfile: SkillProfile }
  | { type: 'SET_FOCUSED_SKILL'; skillId: string | null }
  | { type: 'MARK_DRILL_MASTERED'; drillId: string }
  | { type: 'START_SESSION'; session: ActiveSession }
  | { type: 'UPDATE_ACTIVE_SESSION'; session: ActiveSession }
  | { type: 'END_SESSION' }
  | { type: 'UPDATE_TOPIC_MASTERY'; entry: TopicMasteryEntry; justMastered: boolean }
  | { type: 'CLEAR_JUST_MASTERED' }
  | { type: 'SET_AI_ENGINE'; engine: AIEngine }
  | { type: 'SET_DIFFICULTY'; tier: DifficultyTier };

function buildInitialState(): AppState {
  const analytics = getStats();
  const progression = getProgressionState();
  const skillProfile = getSkillProfile();
  const unlockedIds = new Set(progression.achievements);

  const masteredDrills = storageGet<string[]>(STORAGE_KEYS.masteredDrills, []);

  const profile: UserProfile = {
    id: 'local-user',
    username: null,
    total_xp: progression.xp,
    gems: progression.gems,
    current_level: progression.level.name as UserProfile['current_level'],
    streak_days: analytics.streak,
    longest_streak: analytics.streak,
    last_session_date: analytics.recentSessions[0]?.date ?? null,
    sessions_count: analytics.totalSessions,
    total_words_spoken: analytics.totalWords,
    inventory: progression.inventory || {},
    activeBoosters: progression.activeBoosters || [],
  };

  const recentSessions: Session[] = (analytics.recentSessions ?? []).map(s => ({
    id: s.id,
    mode: s.mode as Session['mode'],
    topicKey: s.topicKey ?? undefined,
    questionText: s.questionText,
    transcript: s.transcript,
    wordCount: s.wordCount,
    score: s.score,
    xpEarned: 0,
    durationSec: s.durationSec,
    createdAt: s.date,
  }));

  const achievements = ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: unlockedIds.has(a.id),
  }));

  const savedDark = localStorage.getItem(STORAGE_KEYS.darkMode);
  const darkMode = savedDark === null ? true : savedDark === 'true';

  const preferredEngine: AIEngine = (localStorage.getItem(STORAGE_KEYS.aiEngine) as AIEngine | null) ?? 'groq';
  const selectedDifficulty: DifficultyTier = (localStorage.getItem(STORAGE_KEYS.difficulty) as DifficultyTier | null) ?? DEFAULT_DIFFICULTY;

  const topicMastery = storageGet<Record<string, TopicMasteryEntry>>(STORAGE_KEYS.topicMastery, {});

  return {
    profile,
    achievements,
    recentSessions: recentSessions.slice(0, 20),
    xpAnimations: [],
    gemAnimations: [],
    showXPModal: false,
    lastXPGained: 0,
    lastGemsGained: 0,
    soundEnabled: true,
    darkMode,
    skillProfile,
    focusedSkillId: null,
    masteredDrills,
    lastUnlockedAchievement: null,
    newLevelReached: null,
    activeSession: null,
    topicMastery,
    justMasteredTopic: null,
    preferredEngine,
    selectedDifficulty,
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'MARK_DRILL_MASTERED': {
      if (state.masteredDrills.includes(action.drillId)) return state;
      const next = [...state.masteredDrills, action.drillId];
      storageSet(STORAGE_KEYS.masteredDrills, next);
      return { ...state, masteredDrills: next };
    }
    case 'ADD_XP': {
      const { totalXP, totalGems, gemGain, activeBoosters } = action;
      const animId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const newLevel = levelFor(totalXP);
      const newLevelReached = newLevel.name !== state.profile.current_level ? newLevel.name : state.newLevelReached;
      const newGemAnimations = gemGain > 0
        ? [...state.gemAnimations, { id: 'g' + animId, amount: gemGain, x: (action.x ?? 50) + 5, y: action.y ?? 50 }]
        : state.gemAnimations;
      return {
        ...state,
        profile: { ...state.profile, total_xp: totalXP, gems: totalGems, activeBoosters, current_level: newLevel.name as UserProfile['current_level'] },
        xpAnimations: [...state.xpAnimations, { id: animId, amount: action.amount, x: action.x ?? 50, y: action.y ?? 50 }],
        gemAnimations: newGemAnimations,
        showXPModal: true,
        lastXPGained: action.amount,
        lastGemsGained: gemGain,
        newLevelReached,
      };
    }
    case 'DISMISS_XP_MODAL':
      return { ...state, showXPModal: false };
    case 'DISMISS_CELEBRATIONS':
      return { ...state, lastUnlockedAchievement: null, newLevelReached: null };
    case 'ADD_SESSION': {
      const { session, xpResult, newUnlockedAchievementIds, newLevelName, xpAnimX = 60, xpAnimY = 30 } = action;
      const animId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

      const newProfile = {
        ...state.profile,
        sessions_count: state.profile.sessions_count + 1,
        total_words_spoken: state.profile.total_words_spoken + session.wordCount,
        last_session_date: new Date().toISOString().split('T')[0],
        total_xp: xpResult.totalXP,
        gems: xpResult.totalGems,
        activeBoosters: xpResult.activeBoosters,
        current_level: newLevelName as UserProfile['current_level'],
      };

      const newlyUnlockedAchievements = state.achievements.filter(a => newUnlockedAchievementIds.includes(a.id) && !a.unlocked);
      const newAchievements = newUnlockedAchievementIds.length
        ? state.achievements.map(a => newUnlockedAchievementIds.includes(a.id) ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() } : a)
        : state.achievements;

      const newGemAnimations = xpResult.gemsGain > 0
        ? [...state.gemAnimations, { id: 'g' + animId, amount: xpResult.gemsGain, x: 55, y: 50 }]
        : state.gemAnimations;

      return {
        ...state,
        profile: newProfile,
        recentSessions: state.recentSessions.some(s => s.id === session.id)
          ? state.recentSessions
          : [session, ...state.recentSessions].slice(0, 20),
        achievements: newAchievements,
        xpAnimations: [...state.xpAnimations, { id: animId, amount: xpResult.gain, x: xpAnimX, y: xpAnimY }],
        gemAnimations: newGemAnimations,
        showXPModal: true,
        lastXPGained: xpResult.gain,
        lastGemsGained: xpResult.gemsGain,
        focusedSkillId: null,
        lastUnlockedAchievement: newlyUnlockedAchievements[0] || null,
        newLevelReached: (newLevelName !== state.profile.current_level) ? newLevelName : null,
      };
    }

    case 'PURCHASE_ITEM': {
      const newGems = state.profile.gems - action.cost;
      const newInventory = { ...state.profile.inventory };
      newInventory[action.itemId] = (newInventory[action.itemId] || 0) + 1;
      return {
        ...state,
        profile: { ...state.profile, gems: newGems, inventory: newInventory },
      };
    }
    case 'USE_ITEM': {
      const newInventory = { ...state.profile.inventory };
      if (newInventory[action.itemId] > 0) {
        newInventory[action.itemId]--;
      }
      return {
        ...state,
        profile: { ...state.profile, inventory: newInventory },
      };
    }
    case 'ACTIVATE_BOOSTER': {
      const newInventory = { ...state.profile.inventory };
      if (newInventory[action.itemId] > 0) {
        newInventory[action.itemId]--;
      }
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + action.durationMinutes);
      const newBoosters = [...state.profile.activeBoosters, { id: action.itemId, expiresAt: expiresAt.toISOString(), multiplier: action.multiplier }];
      return {
        ...state,
        profile: { ...state.profile, inventory: newInventory, activeBoosters: newBoosters },
      };
    }
    case 'UNLOCK_ACHIEVEMENT':
      return {
        ...state,
        achievements: state.achievements.map(a =>
          a.id === action.achievementId ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() } : a
        ),
      };
    case 'SET_PROFILE':
      return { ...state, profile: action.profile };
    case 'TOGGLE_SOUND':
      return { ...state, soundEnabled: !state.soundEnabled };
    case 'TOGGLE_DARK_MODE': {
      const next = !state.darkMode;
      storageSetRaw(STORAGE_KEYS.darkMode, String(next));
      return { ...state, darkMode: next };
    }
    case 'UPDATE_SKILL_PROFILE':
      return { ...state, skillProfile: action.skillProfile };
    case 'SET_FOCUSED_SKILL':
      return { ...state, focusedSkillId: action.skillId };

    case 'START_SESSION':
      return { ...state, activeSession: action.session };

    case 'UPDATE_ACTIVE_SESSION':
      return { ...state, activeSession: action.session };

    case 'END_SESSION':
      return { ...state, activeSession: null };

    case 'UPDATE_TOPIC_MASTERY': {
      const updated = { ...state.topicMastery, [action.entry.topicKey]: action.entry };
      return {
        ...state,
        topicMastery: updated,
        justMasteredTopic: action.justMastered ? action.entry.topicKey : state.justMasteredTopic,
      };
    }

    case 'CLEAR_JUST_MASTERED':
      return { ...state, justMasteredTopic: null };

    case 'SET_AI_ENGINE': {
      storageSetRaw(STORAGE_KEYS.aiEngine, action.engine);
      return { ...state, preferredEngine: action.engine };
    }

    case 'SET_DIFFICULTY': {
      storageSetRaw(STORAGE_KEYS.difficulty, action.tier);
      return { ...state, selectedDifficulty: action.tier };
    }

    default:
      return state;
  }
}

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);
  const xpDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss XP modal after 3 seconds (fix for known never-dismissing bug)
  useEffect(() => {
    if (state.showXPModal) {
      if (xpDismissTimer.current) clearTimeout(xpDismissTimer.current);
      xpDismissTimer.current = setTimeout(() => {
        dispatch({ type: 'DISMISS_XP_MODAL' });
      }, 3000);
    }
    return () => {
      if (xpDismissTimer.current) clearTimeout(xpDismissTimer.current);
    };
  }, [state.showXPModal]);

  // Sync state when localStorage changes in other tabs or through direct service calls
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.aiEngine && e.newValue) {
        dispatch({ type: 'SET_AI_ENGINE', engine: e.newValue as AIEngine });
        return;
      }
      if (e.key === STORAGE_KEYS.difficulty && e.newValue) {
        dispatch({ type: 'SET_DIFFICULTY', tier: e.newValue as DifficultyTier });
        return;
      }
      if (e.key === STORAGE_KEYS.progression || e.key === STORAGE_KEYS.analytics) {
        const progression = getProgressionState();
        const analytics = getStats();
        const updatedProfile = {
          ...state.profile,
          total_xp: progression.xp,
          gems: progression.gems,
          current_level: progression.level.name as UserProfile['current_level'],
          streak_days: analytics.streak,
          inventory: progression.inventory || {},
          activeBoosters: progression.activeBoosters || [],
        };
        dispatch({ type: 'SET_PROFILE', profile: updatedProfile });
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [state.profile]);

  // Sync streak_days from analytics on mount (analytics has the authoritative date math)
  useEffect(() => {
    const stats = getStats();
    if (stats.streak !== state.profile.streak_days) {
      dispatch({ type: 'SET_PROFILE', profile: { ...state.profile, streak_days: stats.streak } });
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.darkMode);
  }, [state.darkMode]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function dispatchAddXP(
  dispatch: Dispatch<Action>,
  amount: number,
  coords?: { x: number; y: number }
) {
  const prev = getProgressionState();
  const { totalXP, totalGems, activeBoosters } = awardGemsForXP(amount);
  const gemGain = totalGems - prev.gems;
  dispatch({ type: 'ADD_XP', amount, totalXP, totalGems, gemGain, activeBoosters, ...coords });
}
