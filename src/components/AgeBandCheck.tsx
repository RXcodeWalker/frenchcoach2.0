import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: ReactNode;
}

/**
 * Phase 1.6 Part C. Mirrors OnboardingCheck's gate pattern (redirect to a
 * one-time step, checked on every render) but for age_band rather than the
 * coach-profile wizard, and runs ahead of it (see App.tsx: AgeBandCheck
 * wraps OnboardingCheck) — the plan treats the age-band/consent line as a
 * legal gate, not a product-onboarding step, so it should not be possible
 * to reach onboarding (or anything else) around it.
 *
 * Guests (no Supabase user, no profiles row) are exempt — age_band only
 * applies to a real account, per the plan ("no age *block*" and guardian
 * consent is specifically about data processed against an account).
 * consentStatus === 'unknown' also passes through: that's "still loading"
 * or "guest/offline", never treated as "must complete the step".
 */
export function AgeBandCheck({ children }: Props) {
  const { user, ageBand, consentStatus, loading } = useAuth();
  const location = useLocation();

  if (loading) return <>{children}</>;
  if (!user) return <>{children}</>; // guest — no profiles row, nothing to gate
  if (consentStatus === 'unknown') return <>{children}</>; // still loading the profiles row

  if (ageBand === null && location.pathname !== '/age-band') {
    return <Navigate to="/age-band" replace />;
  }

  return <>{children}</>;
}
