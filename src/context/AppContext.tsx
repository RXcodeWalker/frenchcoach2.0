import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { UserProfile, Achievement, Session, XPAnimation, GemAnimation, SkillProfile } from '../types';
import { ACHIEVEMENTS } from '../data/gameData';
import { getStats, recordSession as persistSession } from '../services/analytics/analyticsService';
import { getProgressionState, awardXP, checkAchievements, awardGemsForXP } from '../services/progression/progressionService';
import { getSkillProfile, runAfterSession } from '../services/coaching/diagnosticEngine';

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
}

type Action =
  | { type: 'ADD_XP'; amount: number; x?: number; y?: number }
  | { type: 'ADD_GEMS'; amount: number; x?: number; y?: number }
  | { type: 'DISMISS_XP_MODAL' }
  | { type: 'DISMISS_CELEBRATIONS' }
  | { type: 'ADD_SESSION'; session: Session }
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
  | { type: 'MARK_DRILL_MASTERED'; drillId: string };

function buildInitialState(): AppState {
  const analytics = getStats();
  const progression = getProgressionState();
  const skillProfile = getSkillProfile();
  const unlockedIds = new Set(progression.achievements);

  const savedMastered = localStorage.getItem('frenchCoach_masteredDrills');
  const masteredDrills = savedMastered ? JSON.parse(savedMastered) : [];

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

  const savedDark = localStorage.getItem('frenchCoach_darkMode');
  const darkMode = savedDark === null ? true : savedDark === 'true';

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
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'MARK_DRILL_MASTERED': {
      if (state.masteredDrills.includes(action.drillId)) return state;
      const next = [...state.masteredDrills, action.drillId];
      localStorage.setItem('frenchCoach_masteredDrills', JSON.stringify(next));
      return { ...state, masteredDrills: next };
    }
    case 'ADD_XP': {
      const { totalXP, totalGems, activeBoosters } = awardGemsForXP(action.amount);
      const { level } = getProgressionState();
      const animId = Date.now().toString();
      const gemAmount = Math.floor(action.amount / 10);

      const newLevelReached = (level.name !== state.profile.current_level) ? level.name : state.newLevelReached;

      const newGemAnimations = gemAmount > 0 
        ? [...state.gemAnimations, { id: 'g' + animId, amount: gemAmount, x: (action.x ?? 50) + 5, y: action.y ?? 50 }]
        : state.gemAnimations;

      return {
        ...state,
        profile: { ...state.profile, total_xp: totalXP, gems: totalGems, activeBoosters, current_level: level.name as UserProfile['current_level'] },
        xpAnimations: [...state.xpAnimations, { id: animId, amount: action.amount, x: action.x ?? 50, y: action.y ?? 50 }],
        gemAnimations: newGemAnimations,
        showXPModal: true,
        lastXPGained: action.amount,
        lastGemsGained: gemAmount,
        newLevelReached,
      };
    }
    case 'DISMISS_XP_MODAL':
      return { ...state, showXPModal: false };
    case 'DISMISS_CELEBRATIONS':
      return { ...state, lastUnlockedAchievement: null, newLevelReached: null };
    case 'ADD_SESSION': {
      const newProfile = {
        ...state.profile,
        sessions_count: state.profile.sessions_count + 1,
        total_words_spoken: state.profile.total_words_spoken + action.session.wordCount,
        last_session_date: new Date().toISOString().split('T')[0],
      };

      persistSession(action.session);
      const xpResult = awardXP(action.session.score, state.profile.streak_days);
      const { level: newLevel } = getProgressionState();
      const newlyUnlockedIds = checkAchievements({
        score: action.session.score,
        mode: action.session.mode,
        totalSessions: newProfile.sessions_count,
        topicsUsed: action.session.topicKey ? [action.session.topicKey] : undefined,
      });

      const newlyUnlockedAchievements = state.achievements.filter(a => newlyUnlockedIds.includes(a.id) && !a.unlocked);

      const newAchievements = newlyUnlockedIds.length
        ? state.achievements.map(a => newlyUnlockedIds.includes(a.id) ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() } : a)
        : state.achievements;

      if (action.session.feedback) {
        runAfterSession(action.session.feedback);
      }

      const animId = Date.now().toString();
      const newGemAnimations = xpResult.gemsGain > 0
        ? [...state.gemAnimations, { id: 'g' + animId, amount: xpResult.gemsGain, x: 55, y: 50 }]
        : state.gemAnimations;

      return {
        ...state,
        profile: { ...newProfile, total_xp: xpResult.totalXP, gems: xpResult.totalGems, activeBoosters: xpResult.activeBoosters, current_level: newLevel.name as UserProfile['current_level'] },
        recentSessions: [action.session, ...state.recentSessions].slice(0, 20),
        achievements: newAchievements,
        gemAnimations: newGemAnimations,
        lastGemsGained: xpResult.gemsGain,
        focusedSkillId: null,
        lastUnlockedAchievement: newlyUnlockedAchievements[0] || null,
        newLevelReached: (newLevel.name !== state.profile.current_level) ? newLevel.name : null,
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
      localStorage.setItem('frenchCoach_darkMode', String(next));
      return { ...state, darkMode: next };
    }
    case 'UPDATE_SKILL_PROFILE':
      return { ...state, skillProfile: action.skillProfile };
    case 'SET_FOCUSED_SKILL':
      return { ...state, focusedSkillId: action.skillId };
    default:
      return state;
  }
}

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);

  // Sync state when localStorage changes in other tabs or through direct service calls
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'frenchCoach_progression' || e.key === 'frenchCoach_v2') {
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
