import { createContext, useContext, useReducer, useEffect, useRef, useState, useCallback, type Dispatch, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import type { UserProfile, Achievement, Session, XPAnimation, GemAnimation, SkillProfile, ActiveSession, TopicMasteryEntry, AIEngine, DifficultyTier } from '../types';
import type { XpSource } from '../types/social';
import { DEFAULT_DIFFICULTY } from '../utils/difficultyConfig';
import { ACHIEVEMENTS } from '../data/gameData';
import { validateAchievementRegistry } from '../data/achievements';
import { getStats } from '../services/analytics/analyticsService';
import { getProgressionState, awardGemsForXP, levelFor, setProgressionData } from '../services/progression/progressionService';
import { getSkillProfile } from '../services/coaching/diagnosticEngine';
import { STORAGE_KEYS, storageGet, storageSet, storageSetRaw } from '../services/persistence/storage';
import { supabase } from '../lib/supabase';
import { pushProgressionToCloud, pullProgressionFromCloud, mergeProgressionData, cloudDiffersFromMerged, markNeedsSync } from '../services/sync/progressionSync';
import { hydrateSessionsFromCloud, pushSessionToCloud, backfillSessionsToCloud, flushPendingQueue } from '../services/sync/sessionSync';
import { hydrateCoachFromCloud, backfillEvidenceToCloud, pushPendingEvidence } from '../services/sync/coachSync';
import { hydratePronunciationFromCloud, backfillPronunciationToCloud, flushPendingPronunciationQueue } from '../services/sync/pronunciationSync';
import { hydrateXpEventsFromCloud, backfillXpEventsToCloud, flushPendingXpEventQueue } from '../services/social/xpLedger';
import { getXpEventLog } from '../services/social/xpLedgerStorage';
import { getEconomySnapshot } from '../services/shop/shopService';
import { flushMintQueue } from '../services/shop/mintQueue';
import { getEvidenceEvents } from '../services/coach/coachStorage';
import { isMigrationNeeded, markMigrationComplete, runMigration, type MigrationPhase, type MigrationRecord } from '../services/sync/migrationService';
import * as Sentry from '@sentry/react';

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
  | { type: 'DISMISS_XP_MODAL' }
  | { type: 'DISMISS_CELEBRATIONS' }
  | { type: 'ADD_SESSION'; session: Session; xpResult: { gain: number; totalXP: number; gemsGain: number; totalGems: number; activeBoosters: { id: string; expiresAt: string; multiplier: number }[] }; newUnlockedAchievementIds: string[]; newLevelName: string; xpAnimX?: number; xpAnimY?: number }
  | { type: 'UNLOCK_ACHIEVEMENT'; achievementId: string }
  | { type: 'SET_ECONOMY'; balance: number; inventory: Record<string, number> }
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
    equipped: { avatar: null, frame: null, nameplate: null },
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

    case 'SET_ECONOMY': {
      // Applies the server RPC's returned balance/inventory directly — never
      // computed locally (Shop plan §14.6: this is what kills the
      // purchase-refund double-write at the root, replacing PURCHASE_ITEM).
      return {
        ...state,
        profile: { ...state.profile, gems: action.balance, inventory: action.inventory },
      };
    }
    case 'UNLOCK_ACHIEVEMENT':
      return {
        ...state,
        achievements: state.achievements.map(a =>
          a.id === action.achievementId ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() } : a
        ),
      };
    case 'REMOVE_XP_ANIMATION':
      return { ...state, xpAnimations: state.xpAnimations.filter(a => a.id !== action.id) };
    case 'REMOVE_GEM_ANIMATION':
      return { ...state, gemAnimations: state.gemAnimations.filter(a => a.id !== action.id) };
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

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action>; authUser: User | null; migrationPhase: MigrationPhase | null; dismissMigration: () => void } | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [migrationPhase, setMigrationPhase] = useState<MigrationPhase | null>(null);
  const hydrationComplete = useRef(false);
  const sessionHydrationInProgress = useRef(false);
  const xpDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissMigration = useCallback(() => setMigrationPhase(null), []);

  // Dev-time sanity check: warn if achievement definitions and rules are out of sync.
  useEffect(() => { validateAchievementRegistry(); }, []);

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

  // Balance/inventory refetch — server (gem_events/user_inventory) is the sole
  // authority (Shop plan §14.1); this dispatches SET_ECONOMY with the live
  // snapshot, never a locally-computed value.
  const refetchEconomy = useCallback(async (userId: string) => {
    const snapshot = await getEconomySnapshot(userId);
    dispatch({ type: 'SET_ECONOMY', balance: snapshot.balance, inventory: snapshot.inventory });
    // Server-reconciled inventory cache, read synchronously by
    // progressionService.hasStreakFreeze/consumeStreakFreeze (Shop plan §14.4
    // A9 fix) — analyticsService.updateStreak runs synchronously and cannot
    // await a network round-trip, so it reads this cache instead.
    storageSet(STORAGE_KEYS.shopInventoryCache, snapshot.inventory);
  }, []);

  // Auth state subscription + cloud hydration
  useEffect(() => {
    async function hydrateFromCloud(userId: string) {
      // Step 0: suppress incremental session pushes during hydration
      sessionHydrationInProgress.current = true;

      // Step 0.5: first-login migration gate
      // pullProgressionFromCloud is called once and shared with Step 1 below.
      const cloudRow = await pullProgressionFromCloud(userId);

      if (cloudRow !== null) {
        const localRecord = storageGet<MigrationRecord | null>(STORAGE_KEYS.migrationV1, null);
        const cloudVersion = cloudRow.migration_version ?? 0;

        if (cloudVersion >= 1 && localRecord?.userId !== userId) {
          // Cloud already migrated but local flag is absent (new device) — sync flag locally
          await markMigrationComplete(userId);
        } else if (isMigrationNeeded(userId, localRecord, cloudVersion)) {
          // Sessions + evidence needed for migration phases; pull them first
          const { mergedSessions, cloudIds } = await hydrateSessionsFromCloud(userId);
          const { cloudIds: cloudEvidenceIds } = await hydrateCoachFromCloud(userId);

          await runMigration(userId, mergedSessions, cloudIds, cloudEvidenceIds, setMigrationPhase);

          // Merge progression after migration (cloudRow is non-null here)
          const localRaw = getProgressionState();
          const localData = {
            xp: localRaw.xp,
            totalXP: localRaw.totalXP,
            gems: localRaw.gems,
            achievements: localRaw.achievements,
            inventory: localRaw.inventory,
            activeBoosters: localRaw.activeBoosters,
            grammarCoachUses: 0,
            roleplayCount: 0,
          };
          const merged = mergeProgressionData(localData, cloudRow);
          setProgressionData(merged);
          const mergedLevel = levelFor(merged.totalXP);
          const progressionProfile: UserProfile = {
            id: userId,
            username: cloudRow.username,
            total_xp: merged.totalXP,
            gems: merged.gems,
            current_level: mergedLevel.name as UserProfile['current_level'],
            streak_days: 0,
            longest_streak: 0,
            last_session_date: null,
            sessions_count: 0,
            total_words_spoken: 0,
            inventory: merged.inventory,
            activeBoosters: merged.activeBoosters,
            equipped: { avatar: cloudRow.avatar_emoji, frame: cloudRow.equipped_frame, nameplate: cloudRow.equipped_nameplate },
          };
          dispatch({ type: 'SET_PROFILE', profile: progressionProfile });
          merged.achievements.forEach(id => dispatch({ type: 'UNLOCK_ACHIEVEMENT', achievementId: id }));
          if (cloudDiffersFromMerged(merged, cloudRow)) {
            pushProgressionToCloud(userId, merged);
          }

          const analytics = getStats();
          const progression = getProgressionState();
          const finalLevel = levelFor(progression.totalXP);
          const newProfile: UserProfile = {
            id: userId,
            username: cloudRow.username,
            total_xp: progression.totalXP,
            gems: progression.gems,
            current_level: finalLevel.name as UserProfile['current_level'],
            streak_days: analytics.streak,
            longest_streak: analytics.streak,
            last_session_date: analytics.recentSessions[0]?.date ?? null,
            sessions_count: analytics.totalSessions,
            total_words_spoken: analytics.totalWords,
            inventory: progression.inventory,
            activeBoosters: progression.activeBoosters,
            equipped: { avatar: cloudRow.avatar_emoji, frame: cloudRow.equipped_frame, nameplate: cloudRow.equipped_nameplate },
          };
          dispatch({ type: 'SET_PROFILE', profile: newProfile });

          sessionHydrationInProgress.current = false;
          void flushPendingQueue(userId);
          void hydratePronunciationFromCloud(userId);
          void hydrateXpEventsFromCloud(userId).then(({ mergedEvents, cloudIds }) => {
            void backfillXpEventsToCloud(userId, mergedEvents, cloudIds);
          });
          void flushMintQueue().then(() => refetchEconomy(userId));
          hydrationComplete.current = true;
          return;
        }
      }

      // Normal hydration path (no migration needed)
      if (cloudRow) {
        const localRaw = getProgressionState();
        const localData = {
          xp: localRaw.xp,
          totalXP: localRaw.totalXP,
          gems: localRaw.gems,
          achievements: localRaw.achievements,
          inventory: localRaw.inventory,
          activeBoosters: localRaw.activeBoosters,
          grammarCoachUses: 0,
          roleplayCount: 0,
        };
        const merged = mergeProgressionData(localData, cloudRow);
        setProgressionData(merged);

        const mergedLevel = levelFor(merged.totalXP);
        const progressionProfile: UserProfile = {
          id: userId,
          username: cloudRow.username,
          total_xp: merged.totalXP,
          gems: merged.gems,
          current_level: mergedLevel.name as UserProfile['current_level'],
          streak_days: 0,
          longest_streak: 0,
          last_session_date: null,
          sessions_count: 0,
          total_words_spoken: 0,
          inventory: merged.inventory,
          activeBoosters: merged.activeBoosters,
          equipped: { avatar: cloudRow.avatar_emoji, frame: cloudRow.equipped_frame, nameplate: cloudRow.equipped_nameplate },
        };
        dispatch({ type: 'SET_PROFILE', profile: progressionProfile });
        merged.achievements.forEach(id => dispatch({ type: 'UNLOCK_ACHIEVEMENT', achievementId: id }));

        if (cloudDiffersFromMerged(merged, cloudRow)) {
          pushProgressionToCloud(userId, merged);
        }
      }

      // Step 2: sessions — pull, merge, write localStorage
      const { mergedSessions, cloudIds } = await hydrateSessionsFromCloud(userId);

      // Step 2.5: coach evidence — pull, merge, rebuild beliefs + problems
      // Runs after sessions so sourceSessionId references are already present
      const { cloudIds: cloudEvidenceIds } = await hydrateCoachFromCloud(userId);

      // Step 2.6: pronunciation history — pull, merge, write localStorage
      const { mergedAttempts, cloudIds: cloudPronunciationIds } = await hydratePronunciationFromCloud(userId);

      // Step 2.7: XP ledger — pull, merge, write localStorage
      const { mergedEvents, cloudIds: cloudXpEventIds } = await hydrateXpEventsFromCloud(userId);

      // Step 3: re-read analytics (now includes merged sessions) and emit final profile
      const analytics = getStats();
      const progression = getProgressionState();
      const mergedLevel = levelFor(progression.totalXP);
      const newProfile: UserProfile = {
        id: userId,
        username: cloudRow?.username ?? null,
        total_xp: progression.totalXP,
        gems: progression.gems,
        current_level: mergedLevel.name as UserProfile['current_level'],
        streak_days: analytics.streak,
        longest_streak: analytics.streak,
        last_session_date: analytics.recentSessions[0]?.date ?? null,
        sessions_count: analytics.totalSessions,
        total_words_spoken: analytics.totalWords,
        inventory: progression.inventory,
        activeBoosters: progression.activeBoosters,
        equipped: { avatar: cloudRow?.avatar_emoji ?? null, frame: cloudRow?.equipped_frame ?? null, nameplate: cloudRow?.equipped_nameplate ?? null },
      };
      dispatch({ type: 'SET_PROFILE', profile: newProfile });

      // Step 4: backfill + flush (fire-and-forget, run concurrently)
      sessionHydrationInProgress.current = false;
      void backfillSessionsToCloud(userId, mergedSessions, cloudIds);
      void backfillEvidenceToCloud(userId, getEvidenceEvents(), cloudEvidenceIds);
      void backfillPronunciationToCloud(userId, mergedAttempts, cloudPronunciationIds);
      void backfillXpEventsToCloud(userId, mergedEvents, cloudXpEventIds);
      void flushPendingQueue(userId);
      void flushPendingPronunciationQueue(userId);
      void flushPendingXpEventQueue();
      void flushMintQueue().then(() => refetchEconomy(userId));

      // Step 5: open the gate for incremental pushes
      hydrationComplete.current = true;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      setAuthUser(user);
      if (user) {
        Sentry.setUser({ id: user.id, email: user.email ?? undefined });
        hydrationComplete.current = false;
        await hydrateFromCloud(user.id);
      } else {
        Sentry.setUser(null);
        hydrationComplete.current = true;
      }
    });

    // Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setAuthUser(user);
      if (user) {
        hydrationComplete.current = false;
        hydrateFromCloud(user.id);
      } else {
        hydrationComplete.current = true;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Debounced cloud save — fires 2s after XP/gems/achievements change, gated on hydration
  useEffect(() => {
    if (!authUser || !hydrationComplete.current) return;
    markNeedsSync();
    const timer = setTimeout(() => {
      pushProgressionToCloud(authUser.id);
      // Push any XP ledger events appended locally since the last push (each
      // earning call appends synchronously — see progressionService.ts).
      // backfillXpEventsToCloud filters to already-unsynced rows internally,
      // so passing the full local log here is a cheap no-op for old events.
      void backfillXpEventsToCloud(authUser.id, getXpEventLog(), new Set());
    }, 2000);
    return () => clearTimeout(timer);
  }, [state.profile.total_xp, state.profile.gems, state.achievements, authUser?.id]);

  // Incremental session push — fires after each new session, gated on auth + hydration
  const newestSessionId = state.recentSessions[0]?.id;
  useEffect(() => {
    const newest = state.recentSessions[0];
    if (!newest || !authUser || !hydrationComplete.current || sessionHydrationInProgress.current) return;
    void pushSessionToCloud(authUser.id, newest);
    void pushPendingEvidence(authUser.id);
  }, [newestSessionId, authUser?.id]);

  // Flush pending session queue when network comes back online
  useEffect(() => {
    if (!authUser) return;
    const userId = authUser.id;
    const handler = () => {
      void flushPendingQueue(userId);
      void pushPendingEvidence(userId);
      void flushPendingPronunciationQueue(userId);
      void flushPendingXpEventQueue();
    };
    window.addEventListener('online', handler);
    return () => window.removeEventListener('online', handler);
  }, [authUser?.id]);

  // Refetch balance/inventory when the tab regains focus (Shop plan §14.7,
  // "two tabs" concurrency case) — a purchase in another tab must reconcile
  // here without waiting for a full re-hydration.
  useEffect(() => {
    if (!authUser) return;
    const userId = authUser.id;
    const handler = () => {
      if (document.visibilityState === 'visible' && hydrationComplete.current) {
        void refetchEconomy(userId);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [authUser?.id, refetchEconomy]);

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

  return <AppContext.Provider value={{ state, dispatch, authUser, migrationPhase, dismissMigration }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function dispatchAddXP(
  dispatch: Dispatch<Action>,
  amount: number,
  source: XpSource,
  coords?: { x: number; y: number }
) {
  const prev = getProgressionState();
  const { totalXP, totalGems, activeBoosters } = awardGemsForXP(amount, source);
  const gemGain = totalGems - prev.gems;
  dispatch({ type: 'ADD_XP', amount, totalXP, totalGems, gemGain, activeBoosters, ...coords });
}
