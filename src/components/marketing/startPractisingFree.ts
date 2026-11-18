import { enterGuestMode } from '../../hooks/useGuestMode';
import { track, type LandingCta } from '../../services/telemetry/telemetryService';

/**
 * The marketing pages' "Start practising free": into the app as a guest. A
 * plain function, not a hook — safe from an onClick, never runs during render.
 * The click is sent by beacon because the page is about to reload. `to` is an
 * internal path (a topic page lands on `/learn?topic=…`); a first-time guest
 * passes through onboarding, which returns them there.
 */
export function startPractisingFree(cta: LandingCta, to: string = '/'): void {
  track({ name: 'landing_cta_clicked', props: { cta } }, { beacon: true });
  enterGuestMode();
  window.location.assign(to);
}

/** A marketing "Sign in" link's click (the link itself navigates). */
export function trackSignInLink(cta: LandingCta): void {
  track({ name: 'landing_cta_clicked', props: { cta } }, { beacon: true });
}
