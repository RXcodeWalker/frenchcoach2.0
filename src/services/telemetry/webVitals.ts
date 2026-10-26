/**
 * Core web vitals (LCP, INP, CLS), sent once per page load as one `web_vitals`
 * event when the page is first hidden (tab switch, close, navigation away) —
 * the moment web-vitals reports final values. Only runs when PostHog is on.
 */
import { track } from './telemetryService';
import { analyticsEnabled } from './posthogClient';

let started = false;

export function startWebVitals(): void {
  if (started || !analyticsEnabled()) return;
  started = true;
  const values: { lcp_ms: number | null; inp_ms: number | null; cls: number | null } = { lcp_ms: null, inp_ms: null, cls: null };
  let sent = false;

  const send = () => {
    if (sent || document.visibilityState !== 'hidden') return;
    if (values.lcp_ms === null && values.inp_ms === null && values.cls === null) return;
    sent = true;
    track({ name: 'web_vitals', props: { ...values } }, { beacon: true });
  };

  void import('web-vitals')
    .then(({ onLCP, onINP, onCLS }) => {
      onLCP((m) => { values.lcp_ms = Math.round(m.value); });
      onINP((m) => { values.inp_ms = Math.round(m.value); });
      onCLS((m) => { values.cls = Math.round(m.value * 1000) / 1000; });
      // Registered after web-vitals' own listeners, so the final values are in by the time this runs.
      document.addEventListener('visibilitychange', send);
    })
    .catch(() => undefined);
}
