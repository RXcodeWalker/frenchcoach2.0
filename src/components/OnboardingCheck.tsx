import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCoachProfile } from '../services/coach/coachProfileService';

interface Props {
  children: ReactNode;
}

/**
 * Reads coachProfile (identity-scoped) to gate onboarding — must render
 * inside IdentityScopeGate so storage scope is already established by the
 * time this read happens (auth overhaul plan §5).
 *
 * '/age-band' is also exempted (Phase 1.6 Part C): AgeBandCheck wraps this
 * component and redirects there first when age_band is unset, so this
 * check must let that route through rather than immediately redirecting it
 * on to /onboarding — otherwise the two gates loop against each other.
 */
export function OnboardingCheck({ children }: Props) {
  const location = useLocation();
  const coachProfile = getCoachProfile();

  if (
    !coachProfile.onboardingComplete &&
    location.pathname !== '/onboarding' &&
    location.pathname !== '/age-band'
  ) {
    const returnTo = encodeURIComponent(location.pathname + location.search + location.hash);
    return <Navigate to={`/onboarding?returnTo=${returnTo}`} replace />;
  }

  return <>{children}</>;
}
