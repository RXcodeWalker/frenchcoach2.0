/**
 * Keeps Sentry's scope describing the learner who is on the page, so every
 * error, trace, replay, log and metric can be filtered by who it happened to
 * and where — "all failures for under-13 accounts on the Junior track", "every
 * slow request on /exam". Renders nothing; mounted beside AnalyticsPersonSync.
 *
 * The user's id and email are set where the identity changes (AppContext).
 * This adds the tags (searchable segments) and one `learner` context (the
 * numbers: level, streak, sessions, XP) plus the on/off state of every feature
 * flag, so "which flags were live when this broke" is on the event.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { FEATURE_FLAGS, resolveFeatureStatus, type FeatureFlagKey } from '../../config/featureFlags';
import { getActiveGoal, getCoachProfile } from '../coach/coachProfileService';
import { normaliseRoute } from './analyticsRoute';

/** Auth and app state settle over a few renders; set the scope once they have. */
const SYNC_DEBOUNCE_MS = 1000;

function syncFlags(): void {
  const flags = Sentry.getClient()?.getIntegrationByName<Sentry.FeatureFlagsIntegration>('FeatureFlags');
  const context: Record<string, string> = {};
  for (const key of Object.keys(FEATURE_FLAGS) as FeatureFlagKey[]) {
    const status = resolveFeatureStatus(key);
    context[key] = status;
    flags?.addFeatureFlag(key, status === 'live');
  }
  Sentry.setContext('feature_flags', context);
}

export function SentryScopeSync() {
  const { user, ageBand, consentStatus, isAdmin } = useAuth();
  const { state } = useApp();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!Sentry.isInitialized()) return;
    Sentry.setTag('route', normaliseRoute(pathname));
  }, [pathname]);

  useEffect(() => {
    if (!Sentry.isInitialized()) return;
    const timer = setTimeout(() => {
      const goal = getActiveGoal(getCoachProfile());
      Sentry.setTags({
        is_guest: String(user === null),
        is_admin: String(isAdmin),
        age_band: ageBand ?? 'unknown',
        consent_status: consentStatus ?? 'unknown',
        learner_track: state.learnerTrack,
        aim_level: String(state.aim),
        goal_type: goal?.type ?? 'none',
        daily_goal: String(state.dailyGoal),
        marking_level: String(state.markingLevel),
        theme: state.darkMode ? 'dark' : 'light',
        sound: state.soundEnabled ? 'on' : 'off',
      });
      Sentry.setContext('learner', {
        level: state.profile.current_level,
        streak_days: state.profile.streak_days,
        longest_streak: state.profile.longest_streak,
        sessions: state.profile.sessions_count,
        total_xp: state.profile.total_xp,
        words_spoken: state.profile.total_words_spoken,
        achievements_unlocked: state.achievements.filter((a) => a.unlocked).length,
        signed_up_at: user?.created_at ?? null,
        last_session_date: state.profile.last_session_date,
      });
      syncFlags();
    }, SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [
    user,
    isAdmin,
    ageBand,
    consentStatus,
    state.learnerTrack,
    state.aim,
    state.dailyGoal,
    state.markingLevel,
    state.darkMode,
    state.soundEnabled,
    state.profile.current_level,
    state.profile.streak_days,
    state.profile.sessions_count,
    state.profile.total_xp,
    state.profile.longest_streak,
    state.profile.total_words_spoken,
    state.profile.last_session_date,
    state.achievements,
  ]);

  return null;
}
