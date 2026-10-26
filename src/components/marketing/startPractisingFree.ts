import { enterGuestMode } from '../../hooks/useGuestMode';
import { track, type LandingCta } from '../../services/telemetry/telemetryService';

/**
 * The marketing pages' "Start practising free": into the app as a guest. A
 * plain function, not a hook — safe from an onClick, never runs during render.
 * The click is sent by beacon because the page is about to reload.
 */
export function startPractisingFree(cta: LandingCta): void {
  track({ name: 'landing_cta_clicked', props: { cta } }, { beacon: true });
  enterGuestMode();
  window.location.assign('/');
}

/** A marketing "Sign in" link's click (the link itself navigates). */
export function trackSignInLink(cta: LandingCta): void {
  track({ name: 'landing_cta_clicked', props: { cta } }, { beacon: true });
}
