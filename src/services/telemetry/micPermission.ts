import { track } from './telemetryService';
import { claimOncePerPage } from './analyticsState';

export type MicPermissionResult = 'granted' | 'denied' | 'unsupported' | 'error';

/** The getUserMedia error names that mean "the learner or the browser said no". */
const DENIED_NAMES = new Set(['NotAllowedError', 'PermissionDeniedError', 'SecurityError']);

export function micPermissionResult(err: unknown): MicPermissionResult {
  const name = err instanceof Error ? err.name : '';
  return DENIED_NAMES.has(name) ? 'denied' : 'error';
}

/** mic_permission, at most once per result per page load (every recording asks again). */
export function trackMicPermission(result: MicPermissionResult): void {
  if (claimOncePerPage(`mic_permission:${result}`)) track({ name: 'mic_permission', props: { result } });
}
