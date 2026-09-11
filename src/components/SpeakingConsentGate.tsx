import type { ReactNode } from 'react';
import { Mic } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

  return (
    <div className="rounded-xl surface p-6 flex flex-col items-center text-center gap-2">
      <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center mb-1">
        <Mic size={20} className="text-violet-400/60" />
      </div>
      <p className="text-sm font-bold text-white">Waiting for your parent/guardian's OK</p>
      <p className="text-xs text-ink-subtle max-w-xs">
        Speaking practice turns on as soon as they confirm by email. You can still browse
        everything else in the meantime.
      </p>
    </div>
  );
}
