import { Mic } from 'lucide-react';

/**
 * The "waiting for your parent/guardian" message, in one place: rendered by
 * SpeakingConsentGate in place of a record control, and by the audio screens
 * that have no client gate (Accent Analyzer, Shadowing, Say-It-Again) or that
 * receive the backend's own 403 consent_required (backend lib/consent.py).
 */
export function GuardianConsentNotice() {
  return (
    <div className="rounded-xl surface p-6 flex flex-col items-center text-center gap-2" data-testid="guardian-consent-notice">
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
