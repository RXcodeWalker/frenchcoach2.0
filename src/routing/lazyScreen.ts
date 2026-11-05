/**
 * Code splitting: a screen whose code is downloaded the first time it is
 * needed, not with the app (the app was one 4 MB file; see `screens.ts`).
 *
 * Why not plain `React.lazy`:
 * - A screen that is already downloaded renders straight away. `React.lazy`
 *   suspends once on every first render, even for a loaded module, which shows
 *   a fallback frame on a non-transition render.
 * - A failed download can be tried again. `React.lazy` remembers a rejection
 *   forever, so one dropped connection would break that screen until reload.
 * - `preload()` lets the app start a download before the screen renders (the
 *   screen in the URL at boot, the main tabs once the app is idle).
 *
 * Navigation is a React transition (React Router 7 wraps every history update
 * in `startTransition`), so while the next screen downloads the current one
 * stays on display; `RouteLoadingBar` appears if that takes a moment. A failed
 * download throws a `ChunkLoadError` for `RouteChunkBoundary` to show — never
 * the app-wide crash screen.
 */
import { createElement, type ComponentType, type ReactElement } from 'react';
import { markScreenSettled, markScreenWaiting } from './routeLoading';

export class ChunkLoadError extends Error {
  readonly cause: unknown;
  constructor(readonly screen: string, cause: unknown) {
    super(`Screen "${screen}" could not be downloaded`);
    this.name = 'ChunkLoadError';
    this.cause = cause;
  }
}

export function isChunkLoadError(err: unknown): err is ChunkLoadError {
  return err instanceof Error && err.name === 'ChunkLoadError';
}

/** Waits between download attempts while online (a flaky connection often recovers within a second). */
export const RETRY_DELAYS_MS = [500, 1500] as const;

function online(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

async function importWithRetry<M>(load: () => Promise<M>, delays: readonly number[]): Promise<M> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await load();
    } catch (err) {
      // Offline, another attempt can only fail the same way.
      if (attempt >= delays.length || !online()) throw err;
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }
}

/** Reloads the page — `ScreenUnavailable`'s last resort (a seam for tests). */
export const reloader = { reload: (): void => window.location.reload() };

/** Screens whose last render-time download failed; `retryFailedScreens` clears them. */
const failedScreens = new Set<() => void>();

/** Lets every screen that failed to download try again on its next render (the boundary's reset). */
export function retryFailedScreens(): void {
  for (const clear of failedScreens) clear();
  failedScreens.clear();
}

export interface LazyScreen<P> {
  (props: P): ReactElement;
  displayName: string;
  /** Starts (or joins) the download. Never rejects — a failed preload is simply tried again on render. */
  preload(): Promise<void>;
  /** True once the code is here (tests, prefetch). */
  isLoaded(): boolean;
}

/**
 * `lazyScreen(() => import('../screens/Home'), 'Home')` — the module's named
 * export is the screen. Keep the `import()` literal so Vite can split it.
 */
export function lazyScreen<M, K extends keyof M & string>(
  load: () => Promise<M>,
  exportName: K,
  options: { retryDelaysMs?: readonly number[] } = {},
): LazyScreen<M[K] extends ComponentType<infer P> ? P : never> {
  type P = M[K] extends ComponentType<infer Q> ? Q : never;
  const delays = options.retryDelaysMs ?? RETRY_DELAYS_MS;
  let component: ComponentType<P> | null = null;
  let inFlight: Promise<ComponentType<P>> | null = null;
  let failure: ChunkLoadError | null = null;

  const download = (): Promise<ComponentType<P>> => {
    inFlight ??= importWithRetry(load, delays).then(
      (mod) => {
        component = mod[exportName] as unknown as ComponentType<P>;
        inFlight = null;
        return component;
      },
      (err: unknown) => {
        inFlight = null;
        throw new ChunkLoadError(exportName, err);
      },
    );
    return inFlight;
  };

  function Screen(props: P): ReactElement {
    // Always the same element type once loaded, so a screen is never remounted.
    if (component) return createElement(component as ComponentType<object>, props as object);
    if (failure) throw failure;
    // Suspend until the code arrives. A failure is remembered until the
    // boundary asks for a retry — re-throwing a fresh download here would make
    // React's own error retry loop download forever while offline.
    const waiting = download().then(
      () => undefined,
      (err: ChunkLoadError) => {
        failure = err;
        failedScreens.add(() => {
          failure = null;
        });
      },
    );
    markScreenWaiting(exportName);
    void waiting.finally(() => markScreenSettled(exportName));
    throw waiting;
  }

  Screen.displayName = `Lazy(${exportName})`;
  Screen.preload = () => (component ? Promise.resolve() : download().then(() => undefined, () => undefined));
  Screen.isLoaded = () => component !== null;
  return Screen as LazyScreen<P>;
}
