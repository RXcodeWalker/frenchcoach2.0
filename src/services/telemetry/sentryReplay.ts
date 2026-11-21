/**
 * Session Replay, kept in a module of its own so the recorder (about 50 KB
 * gzipped) is a separate download: main.tsx imports this only through a
 * dynamic import() once the first screen is up. Nothing else may import it
 * statically (the vendor-sentry-replay chunk would join startup).
 */
import { replayIntegration } from '@sentry/react';

export type ReplayOptions = NonNullable<Parameters<typeof replayIntegration>[0]>;

export function createReplayIntegration(options: ReplayOptions) {
  return replayIntegration(options);
}
