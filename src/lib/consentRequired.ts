/**
 * The backend's server-side speaking-consent gate (backend lib/consent.py,
 * exam-pronunciation plan §5) answers an audio route with
 * 403 {"detail": {"error": "consent_required"}} when the signed-in account is
 * `pending` (under-13, no guardian confirmation yet).
 *
 * A call site that receives audio raises ConsentRequiredError instead of
 * treating that 403 as "session expired" (AuthRequiredError): the learner is
 * signed in and must not be sent to sign in again. Screens map it to the
 * same "waiting for your parent/guardian" copy as SpeakingConsentGate.
 */
export class ConsentRequiredError extends Error {
  constructor(message = 'A parent or guardian needs to confirm before speaking practice.') {
    super(message);
    this.name = 'ConsentRequiredError';
  }
}

export function isConsentRequiredError(err: unknown): err is ConsentRequiredError {
  return err instanceof ConsentRequiredError;
}

/** True when a 403 body is the consent gate's (FastAPI wraps it in `detail`). */
export function isConsentRequiredBody(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const detail = (body as { detail?: unknown }).detail;
  return !!detail && typeof detail === 'object' && (detail as { error?: unknown }).error === 'consent_required';
}
