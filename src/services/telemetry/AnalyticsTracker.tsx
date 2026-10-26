/**
 * The app-wide half of product analytics (the per-feature half is the track()
 * calls at each screen). Renders nothing.
 *
 * - AnalyticsTracker (inside AuthProvider + the router, above the auth gate):
 *   app_opened once per local day, web vitals, a manual $pageview per route
 *   (autocapture is off), the is_guest / route super-properties, and identity —
 *   identify(Supabase user id) on sign-in / sign-up so the guest history merges,
 *   reset() on sign-out. Never an email, username or name.
 * - AnalyticsPersonSync (inside AppProvider): the person properties, which need
 *   app state (aim, learner track) as well as auth.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { getActiveGoal, getCoachProfile } from '../coach/coachProfileService';
import { track } from './telemetryService';
import { captureAnalyticsPageview, registerAnalyticsContext, setAnalyticsPersonProperties } from './posthogClient';
import { claimDailyOpen, claimPersonPropsChange } from './analyticsState';
import { syncAnalyticsIdentity } from './analyticsIdentity';
import { normaliseRoute } from './analyticsRoute';
import { startWebVitals } from './webVitals';

export function AnalyticsTracker() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const initialLoadRef = useRef(true);
  const lastPageviewRef = useRef<string | null>(null);
  const openedRef = useRef(false);

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
    registerAnalyticsContext({ route });
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
    startWebVitals();
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

export function AnalyticsPersonSync() {
  const { user, ageBand, consentStatus } = useAuth();
  const { state } = useApp();
  const { pathname } = useLocation();

  // Re-read on every route change: onboarding writes the goal and exam date to
  // the coach profile (outside AppContext) and then navigates. Each $set is a
  // billed event, so it is sent only when the properties actually changed
  // (remembered across page loads, per user).
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
      };
      const key = JSON.stringify([user?.id ?? null, props]);
      if (!claimPersonPropsChange(key)) return;
      setAnalyticsPersonProperties(props, user?.created_at ? { signup_date: user.created_at.slice(0, 10) } : undefined);
    }, PERSON_SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [user, ageBand, consentStatus, state.aim, state.learnerTrack, pathname]);

  return null;
}
