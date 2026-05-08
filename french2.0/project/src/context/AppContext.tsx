import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { Screen, UserProfile, Achievement, Session, XPAnimation } from '../types';
import { ACHIEVEMENTS } from '../data/gameData';

interface AppState {
  screen: Screen;
  profile: UserProfile;
  achievements: Achievement[];
  recentSessions: Session[];
  xpAnimations: XPAnimation[];
  showXPModal: boolean;
  lastXPGained: number;
  soundEnabled: boolean;
  isAuthenticated: boolean;
}

type Action =
  | { type: 'SET_SCREEN'; screen: Screen }
  | { type: 'ADD_XP'; amount: number; x?: number; y?: number }
  | { type: 'DISMISS_XP_MODAL' }
  | { type: 'ADD_SESSION'; session: Session }
  | { type: 'UNLOCK_ACHIEVEMENT'; achievementId: string }
  | { type: 'SET_PROFILE'; profile: UserProfile }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'REMOVE_XP_ANIMATION'; id: string };

const initialProfile: UserProfile = {
  id: 'demo-user',
  username: 'French Learner',
  total_xp: 1250,
  current_level: 'Intermediate',
  streak_days: 7,
  longest_streak: 12,
  last_session_date: new Date().toISOString().split('T')[0],
  sessions_count: 23,
  total_words_spoken: 4821,
};

const mockSessions: Session[] = [
  { id: '1', mode: 'practice', topicKey: 'school', questionText: "Parle-moi de ton école.", wordCount: 87, score: 7.8, xpEarned: 25, durationSec: 145, createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  { id: '2', mode: 'exam', wordCount: 312, score: 8.2, xpEarned: 40, durationSec: 620, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { id: '3', mode: 'practice', topicKey: 'hobbies', questionText: "Quels sont tes passe-temps ?", wordCount: 64, score: 6.5, xpEarned: 18, durationSec: 98, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
  { id: '4', mode: 'roleplay', wordCount: 145, score: 7.1, xpEarned: 30, durationSec: 340, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
  { id: '5', mode: 'practice', topicKey: 'environment', questionText: "Parle des problèmes environnementaux.", wordCount: 103, score: 8.9, xpEarned: 35, durationSec: 187, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString() },
];

const initialState: AppState = {
  screen: 'dashboard',
  profile: initialProfile,
  achievements: ACHIEVEMENTS.map((a, i) => ({ ...a, unlocked: i < 5 })),
  recentSessions: mockSessions,
  xpAnimations: [],
  showXPModal: false,
  lastXPGained: 0,
  soundEnabled: true,
  isAuthenticated: false,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: action.screen };

    case 'ADD_XP': {
      const newTotalXP = state.profile.total_xp + action.amount;
      const animId = Date.now().toString();
      return {
        ...state,
        profile: { ...state.profile, total_xp: newTotalXP },
        xpAnimations: [
          ...state.xpAnimations,
          { id: animId, amount: action.amount, x: action.x ?? 50, y: action.y ?? 50 },
        ],
        showXPModal: true,
        lastXPGained: action.amount,
      };
    }

    case 'DISMISS_XP_MODAL':
      return { ...state, showXPModal: false };

    case 'REMOVE_XP_ANIMATION':
      return { ...state, xpAnimations: state.xpAnimations.filter(a => a.id !== action.id) };

    case 'ADD_SESSION': {
      const newProfile = {
        ...state.profile,
        sessions_count: state.profile.sessions_count + 1,
        total_words_spoken: state.profile.total_words_spoken + action.session.wordCount,
        streak_days: state.profile.streak_days + (action.session.mode === 'practice' ? 0 : 0),
      };
      return {
        ...state,
        profile: newProfile,
        recentSessions: [action.session, ...state.recentSessions].slice(0, 20),
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

    default:
      return state;
  }
}

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const saved = localStorage.getItem('fc_profile');
    if (saved) {
      try {
        dispatch({ type: 'SET_PROFILE', profile: JSON.parse(saved) });
      } catch {}
    }
  }, []);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
