// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { Burst } from '../Burst';

let reduced = false;
vi.mock('framer-motion', async (orig) => ({
  ...(await orig<typeof import('framer-motion')>()),
  useReducedMotion: () => reduced,
}));

afterEach(() => {
  cleanup();
  reduced = false;
  vi.restoreAllMocks();
});

function fakeContext() {
  return {
    scale: vi.fn(), clearRect: vi.fn(), save: vi.fn(), restore: vi.fn(), translate: vi.fn(), rotate: vi.fn(),
    fillRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(),
    globalAlpha: 1, fillStyle: '',
  } as unknown as CanvasRenderingContext2D;
}

describe('Burst', () => {
  it('draws on a click-through, screen-reader-hidden canvas', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeContext());
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    const { getByTestId } = render(<Burst />);
    const canvas = getByTestId('burst');
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
    expect(canvas.className).toContain('pointer-events-none');
  });

  it('under reduced motion renders nothing and reports done at once', () => {
    reduced = true;
    const onDone = vi.fn();
    const { queryByTestId } = render(<Burst onDone={onDone} />);
    expect(queryByTestId('burst')).toBeNull();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('where a canvas is unavailable it ends quietly instead of throwing', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const onDone = vi.fn();
    const { queryByTestId } = render(<Burst onDone={onDone} />);
    expect(queryByTestId('burst')).toBeNull();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('runs to the end and removes itself, calling onDone once', () => {
    const ctx = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
    // Drive the animation frames by hand, 50 ms at a time.
    let t = 0;
    const callbacks: FrameRequestCallback[] = [];
    vi.spyOn(performance, 'now').mockImplementation(() => t);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      callbacks.push(cb);
      return callbacks.length;
    });
    const onDone = vi.fn();
    const { queryByTestId } = render(<Burst preset="cannons" onDone={onDone} />);
    expect(queryByTestId('burst')).not.toBeNull();
    for (let i = 0; i < 200 && callbacks.length; i++) {
      t += 50;
      const cb = callbacks.shift()!;
      act(() => cb(t));
    }
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(queryByTestId('burst')).toBeNull();
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0); // it did paint
  });

  it('stops animating when unmounted mid-burst', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeContext());
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(42);
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');
    const { unmount } = render(<Burst />);
    unmount();
    expect(cancel).toHaveBeenCalledWith(42);
  });
});
