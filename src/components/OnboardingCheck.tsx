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
 */
export function OnboardingCheck({ children }: Props) {
  const location = useLocation();
  const coachProfile = getCoachProfile();

  if (!coachProfile.onboardingComplete && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
