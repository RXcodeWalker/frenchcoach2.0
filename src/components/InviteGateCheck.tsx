import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: ReactNode;
}

/**
 * Phase 3 (invite-gated soft launch). Mirrors AgeBandCheck's gate pattern
 * (redirect to a one-time step, checked on every render) but for
 * invite_status, and runs outermost — ahead of AgeBandCheck — so an
 * un-invited user never reaches the age-band step or anything else.
 *
 * This screen is UX only. Real enforcement is server-side, inside
 * consume_ai_quota (§1c) — a user who bypasses this gate entirely still
 * gets denied the moment they call any AI route.
 *
 * Guests (no Supabase user) are exempt — there's no profiles row and
 * nothing to gate; anonymous/local-only use isn't part of the invite
 * mechanism. inviteStatus === 'unknown' also passes through: that's "still
 * loading" or "guest/offline", never treated as "must complete the step".
 * Pre-existing accounts are grandfathered to 'redeemed' by the migration,
 * so this only ever redirects a genuinely new, un-invited signup.
 */
export function InviteGateCheck({ children }: Props) {
  const { user, inviteStatus, loading } = useAuth();
  const location = useLocation();

  if (loading) return <>{children}</>;
  if (!user) return <>{children}</>; // guest — no profiles row, nothing to gate
  if (inviteStatus === 'unknown') return <>{children}</>; // still loading the profiles row

  if (inviteStatus === 'unredeemed' && location.pathname !== '/invite-code') {
    return <Navigate to="/invite-code" replace />;
  }

  return <>{children}</>;
}
