// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { Component, Suspense, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { lazyScreen, isChunkLoadError, reloader, retryFailedScreens } from '../lazyScreen';
import { RouteChunkBoundary } from '../RouteChunkBoundary';
import { isWaitingForScreen } from '../routeLoading';

vi.mock('../../services/telemetry/telemetryService', () => ({ captureError: vi.fn() }));

function Hello({ name }: { name: string }) {
  return <p>Hello {name}</p>;
}

let online = true;
beforeEach(() => {
  online = true;
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => online });
});
afterEach(() => {
  cleanup();
  retryFailedScreens();
});

class Outer extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  render() {
    return this.state.error ? <p>outer caught: {String((this.state.error as Error).message)}</p> : this.props.children;
  }
}

function mount(node: ReactNode, path = '/x') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Outer>
        <RouteChunkBoundary resetKey={path}>
          <Suspense fallback={<p>loading…</p>}>{node}</Suspense>
        </RouteChunkBoundary>
      </Outer>
    </MemoryRouter>,
  );
}

type HelloModule = { Hello: typeof Hello };
const loader = () => vi.fn<() => Promise<HelloModule>>();

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

describe('lazyScreen (code splitting)', () => {
  it('downloads on first render, passes props through, and marks the wait for the loading bar', async () => {
    let resolve!: (m: { Hello: typeof Hello }) => void;
    const Screen = lazyScreen(() => new Promise<{ Hello: typeof Hello }>((r) => { resolve = r; }), 'Hello');
    mount(<Screen name="Léa" />);
    expect(screen.getByText('loading…')).toBeTruthy();
    await flush();
    expect(isWaitingForScreen()).toBe(true);
    await act(async () => resolve({ Hello }));
    expect(screen.getByText('Hello Léa')).toBeTruthy();
    expect(isWaitingForScreen()).toBe(false);
    expect(Screen.isLoaded()).toBe(true);
  });

  it('renders a preloaded screen straight away — no fallback frame', async () => {
    const Screen = lazyScreen(async () => ({ Hello }), 'Hello');
    await Screen.preload();
    mount(<Screen name="Tom" />);
    expect(screen.getByText('Hello Tom')).toBeTruthy();
    expect(screen.queryByText('loading…')).toBeNull();
  });

  it('tries again while online before giving up', async () => {
    const load = loader()
      .mockRejectedValueOnce(new TypeError('Failed to fetch dynamically imported module'))
      .mockResolvedValueOnce({ Hello });
    const Screen = lazyScreen(load, 'Hello', { retryDelaysMs: [0] });
    mount(<Screen name="Zoé" />);
    await flush();
    await flush();
    expect(screen.getByText('Hello Zoé')).toBeTruthy();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('offline: shows "not saved on this device yet" (not the crash screen) and opens the screen once back online', async () => {
    online = false;
    const load = loader().mockRejectedValue(new TypeError('Failed to fetch dynamically imported module'));
    const Screen = lazyScreen(load, 'Hello', { retryDelaysMs: [0, 0] });
    mount(<Screen name="Max" />);
    await flush();
    expect(screen.getByTestId('screen-unavailable').textContent).toContain('You’re offline');
    expect(load).toHaveBeenCalledTimes(1); // no pointless retries while offline
    expect(screen.queryByText(/outer caught/)).toBeNull();

    load.mockResolvedValue({ Hello });
    online = true;
    await act(async () => { window.dispatchEvent(new Event('online')); });
    await flush();
    expect(screen.getByText('Hello Max')).toBeTruthy();
  });

  it('reloads the page when the in-place retry after reconnecting fails too (Chrome keeps a failed import)', async () => {
    const reload = vi.spyOn(reloader, 'reload').mockImplementation(() => {});
    online = false;
    const load = loader().mockRejectedValue(new TypeError('Failed to fetch dynamically imported module'));
    const Screen = lazyScreen(load, 'Hello', { retryDelaysMs: [] });
    mount(<Screen name="Lou" />);
    await flush();
    expect(reload).not.toHaveBeenCalled();
    online = true;
    await act(async () => { window.dispatchEvent(new Event('online')); });
    await flush();
    expect(load).toHaveBeenCalledTimes(2);
    expect(reload).toHaveBeenCalledTimes(1);
    reload.mockRestore();
  });

  it('online failure offers a reload; a failure is not re-downloaded in a loop', async () => {
    const load = loader().mockRejectedValue(new TypeError('Failed to fetch dynamically imported module'));
    const Screen = lazyScreen(load, 'Hello', { retryDelaysMs: [0] });
    mount(<Screen name="Ana" />);
    await flush();
    await flush();
    expect(screen.getByTestId('screen-unavailable').textContent).toContain('This screen didn’t load');
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy();
    const calls = load.mock.calls.length;
    await flush();
    expect(load.mock.calls.length).toBe(calls);
  });

  it('passes any other error up to the app boundary unchanged', async () => {
    function Broken(): never {
      throw new Error('boom');
    }
    const Screen = lazyScreen(async () => ({ Broken }), 'Broken');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mount(<Screen />);
    await flush();
    expect(screen.getByText('outer caught: boom')).toBeTruthy();
  });

  it('preload never rejects, and a failed preload does not poison the next render', async () => {
    const load = loader()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({ Hello });
    const Screen = lazyScreen(load, 'Hello', { retryDelaysMs: [] });
    await expect(Screen.preload()).resolves.toBeUndefined();
    mount(<Screen name="Noé" />);
    await flush();
    expect(screen.getByText('Hello Noé')).toBeTruthy();
  });

  it('tags download failures as ChunkLoadError', () => {
    const err = Object.assign(new Error('x'), { name: 'ChunkLoadError' });
    expect(isChunkLoadError(err)).toBe(true);
    expect(isChunkLoadError(new Error('x'))).toBe(false);
  });
});
