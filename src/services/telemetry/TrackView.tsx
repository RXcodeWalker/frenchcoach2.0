import { useEffect } from 'react';
import { track, type TelemetryEvent } from './telemetryService';

/**
 * Fires `event` once when this element mounts — for "this screen / notice was
 * shown" events inside components with early returns, where a hook can't go.
 * Renders nothing.
 */
export function TrackView({ event }: { event: TelemetryEvent }) {
  useEffect(() => {
    track(event);
    // Once per mount by design: the event describes the first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
