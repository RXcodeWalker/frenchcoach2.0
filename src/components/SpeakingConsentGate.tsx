import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { GuardianConsentNotice } from './GuardianConsentNotice';

interface Props {
  children: ReactNode;
}

/**
 * Phase 1.6 Part C. Wraps a record control everywhere it appears (Learn,
 * ExamMode, RoleplaySession, StoryMode, ScenarioArchitectSession,
 * DailyNewsFlash). When the signed-in user's consentStatus is 'pending'
 * (under-13, guardian hasn't confirmed yet), renders a "waiting for your
 * parent/guardian" message instead of the record control — no mic is armed,
 * nothing is captured. useRecording's own `blocked` param is the
 * defence-in-depth backstop behind this UI gate, not a substitute for it.
 *
 * consentStatus === 'unknown' (still loading, or guest/offline) renders
 * children as-is — this gate only ever blocks a *confirmed* pending state,
 * never guesses one from an absent profile.
 */
export function SpeakingConsentGate({ children }: Props) {
  const { consentStatus } = useAuth();

  if (consentStatus !== 'pending') return <>{children}</>;

  return <GuardianConsentNotice />;
}
