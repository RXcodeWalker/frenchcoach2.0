import { Component, startTransition, type ReactNode } from 'react';
import { ScreenUnavailable } from './ScreenUnavailable';
import { captureError } from '../services/telemetry/telemetryService';
import { isChunkLoadError, retryFailedScreens } from './lazyScreen';

interface Props {
  /** A new value (the pathname) clears the error: the learner went somewhere else. */
  resetKey: string;
  children: ReactNode;
}

interface State {
  error: unknown;
  /** The current attempt was started by the connection coming back. */
  afterReconnect: boolean;
}

/**
 * Catches a screen whose code could not be downloaded (`ChunkLoadError`, code
 * splitting) and says why, with the navigation still around it. Every other
 * error is re-thrown to the app's Sentry boundary exactly as before.
 *
 * Offline, the screen opens by itself once the connection is back: it is
 * tried again in place, and if that fails too the page reloads — Chrome
 * remembers a failed `import()` for the life of the page, so only a reload
 * can fetch it again there. Online (after `lazyScreen`'s own retries) a
 * reload is offered — it also picks up a deploy that replaced the files this
 * tab was built from.
 */
export class RouteChunkBoundary extends Component<Props, State> {
  state: State = { error: null, afterReconnect: false };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error };
  }

  componentDidCatch(error: unknown): void {
    if (!isChunkLoadError(error) || this.state.afterReconnect) return;
    // Offline is expected (the screen was never downloaded); online it is worth knowing about.
    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
      captureError(error, { area: 'app_load', stage: 'screen_chunk', screen: error.screen });
    }
  }

  componentDidUpdate(prev: Props): void {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.retry();
  }

  retry = (afterReconnect = false): void => {
    retryFailedScreens();
    // A transition, so this message stays up while the screen downloads instead
    // of the app being swapped for the loading spinner.
    startTransition(() => this.setState({ error: null, afterReconnect }));
  };

  private retryAfterReconnect = (): void => this.retry(true);

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (!isChunkLoadError(error)) throw error;
    // Failing again right after reconnecting means this browser kept the failure (Chrome): reload.
    return <ScreenUnavailable onRetry={this.retryAfterReconnect} reloadNow={this.state.afterReconnect} />;
  }
}
