/**
 * The app-wide half of product analytics (the per-feature half is the track()
 * calls at each screen). Renders nothing.
 *
 * - AnalyticsTracker (inside AuthProvider + the router, above the auth gate):
 *   app_opened once per local day, notification_opened when the page was
 *   opened from a nudge/weekly-email link, web vitals, a manual $pageview per route
 *   (autocapture is off), the is_guest / route super-properties, and identity —
 *   identify(Supabase user id) on sign-in / sign-up so the guest history merges,
 *   reset() on sign-out. Never an email, username or name.
 * - AnalyticsPersonSync (inside AppProvider): the person properties, which need
 *   app state (aim, learner track) as well as auth; the account's behaviour
 *   capture level (replay / autocapture, analyticsPolicy.ts); and the class group.
 */
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { getActiveGoal, getCoachProfile } from '../coach/coachProfileService';
import { track } from './telemetryService';
import { isAdminUser } from '../../lib/adminAccess';
import { analyticsEnabled, applyCaptureLevel, captureAnalyticsPageview, noteAnalyticsRoute, registerAnalyticsContext, setAnalyticsPersonProperties } from './posthogClient';
import { captureLevelFor, featureOf } from './analyticsPolicy';
import type { EngagementHandle } from './engagementMeter';
import type { ClassFacts } from './classGroups';
import { claimDailyOpen, claimPersonPropsChange } from './analyticsState';
import { syncAnalyticsIdentity } from './analyticsIdentity';
import { normaliseRoute } from './analyticsRoute';
import { startWebVitals } from './webVitals';
import { notificationOpenFromSearch } from './notificationOpen';

export function AnalyticsTracker() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const initialLoadRef = useRef(true);
  const lastPageviewRef = useRef<string | null>(null);
  const openedRef = useRef(false);
  const engagementRef = useRef<EngagementHandle | null>(null);

  // Identity first, so the page view below already carries is_guest.
  useEffect(() => {
    if (loading) return;
    registerAnalyticsContext({ is_guest: user === null });
    syncAnalyticsIdentity(user, initialLoadRef.current);
    initialLoadRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loading]);

  useEffect(() => {
    if (loading) return;
    const route = normaliseRoute(pathname);
    if (lastPageviewRef.current === pathname) return;
    lastPageviewRef.current = pathname;
    registerAnalyticsContext({ route, feature: featureOf(pathname) });
    noteAnalyticsRoute();
    engagementRef.current?.noteScreen();
    captureAnalyticsPageview();
  }, [pathname, loading]);

  // app_opened (once per local day, re-checked when a tab left open comes back
  // the next day) + web vitals. After auth resolves, so it carries is_guest and route.
  useEffect(() => {
    if (loading || openedRef.current) return;
    openedRef.current = true;
    const open = () => {
      const props = claimDailyOpen();
      if (props) track({ name: 'app_opened', props });
    };
    open();
    const nudge = notificationOpenFromSearch(window.location.search);
    if (nudge) track({ name: 'notification_opened', props: nudge });
    startWebVitals();
    // Loaded on demand (and only when analytics is on): it is not needed to show the first screen.
    if (analyticsEnabled()) {
      void import('./engagementMeter').then((m) => {
        engagementRef.current = m.startEngagementTracking();
      });
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') open();
    };
    document.addEventListener('visibilitychange', onVisible);
    // Lives for the page: AnalyticsTracker never unmounts.
  }, [loading]);

  return null;
}

function examDateBucket(examDate: string | undefined, now: number): 'none' | '<30' | '30-90' | '>90' {
  const t = examDate ? Date.parse(examDate) : NaN;
  if (!Number.isFinite(t) || t < now) return 'none';
  const days = (t - now) / 86_400_000;
  return days < 30 ? '<30' : days <= 90 ? '30-90' : '>90';
}

/** Auth and app state settle over a few renders after a load or sign-in; send the person once they have. */
const PERSON_SYNC_DEBOUNCE_MS = 2000;

/** Installed app (PWA / Android TWA) or a browser tab — separates "uses it on their phone's home screen" from "opens it in Chrome". */
function displayMode(): 'standalone' | 'browser' {
  try {
    if (document.referrer.startsWith('android-app://')) return 'standalone';
    return window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser';
  } catch {
    return 'browser';
  }
}

export function AnalyticsPersonSync() {
  const { user, loading, ageBand, consentStatus } = useAuth();
  const { state } = useApp();
  const { pathname } = useLocation();
  const [classFacts, setClassFacts] = useState<ClassFacts | null>(null);
  const userId = user?.id ?? null;
  const admin = isAdminUser(user);

  // What PostHog may watch (replay, clicks, heatmaps) follows the account: decided only once
  // auth has resolved — a signed-in child must never be recorded for the moment the page
  // still thinks they are a guest — and re-decided when age band, consent or track change.
  useEffect(() => {
    if (loading) return;
    applyCaptureLevel(captureLevelFor({ signedIn: userId !== null, ageBand, consentStatus, learnerTrack: state.learnerTrack }));
  }, [loading, userId, ageBand, consentStatus, state.learnerTrack]);

  // The learner's class becomes a PostHog group (at most one lookup a day per account).
  useEffect(() => {
    if (!userId) {
      setClassFacts(null);
      return;
    }
    let cancelled = false;
    // On demand: the class lookup (and the teacher API behind it) is not part of the startup download.
    void import('./classGroups')
      .then((m) => m.syncClassGroup(userId))
      .then((facts) => {
        if (!cancelled) setClassFacts(facts);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Re-read on every route change: onboarding writes the goal and exam date to
  // the coach profile (outside AppContext) and then navigates. Each $set is a
  // billed event, so it is sent only when the properties actually changed
  // (remembered across page loads, per user) — which is why the fast-moving
  // numbers are the streak and an XP bucket, never raw XP.
  useEffect(() => {
    const timer = setTimeout(() => {
      const profile = getCoachProfile();
      const bucket = examDateBucket(profile.examDate, Date.now());
      const props = {
        is_guest: user === null,
        age_band: ageBand ?? 'unknown',
        goal_type: getActiveGoal(profile)?.type ?? 'none',
        has_exam_date: bucket !== 'none',
        days_until_exam_bucket: bucket,
        aim_level: state.aim,
        learner_track: state.learnerTrack,
        consent_status: consentStatus,
        streak_days: state.profile.streak_days,
        xp_bucket: Math.floor(state.profile.total_xp / 500) * 500,
        level: state.profile.current_level,
        sessions_total: state.profile.sessions_count,
        daily_goal: state.dailyGoal,
        display_mode: displayMode(),
        // PostHog's own marker: the project's "filter out internal and test users" cohort reads it.
        ...(admin ? { $internal_or_test_user: true } : {}),
        ...(classFacts ? { is_teacher: classFacts.isTeacher, class_count: classFacts.classCount, is_class_member: classFacts.classCount > 0 } : {}),
      };
      const key = JSON.stringify([user?.id ?? null, props]);
      if (!claimPersonPropsChange(key)) return;
      setAnalyticsPersonProperties(props, user?.created_at ? { signup_date: user.created_at.slice(0, 10) } : undefined);
    }, PERSON_SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [user, admin, classFacts, ageBand, consentStatus, state.aim, state.learnerTrack, state.profile.streak_days, state.profile.total_xp, state.profile.current_level, state.profile.sessions_count, state.dailyGoal, pathname]);

  return null;
}
