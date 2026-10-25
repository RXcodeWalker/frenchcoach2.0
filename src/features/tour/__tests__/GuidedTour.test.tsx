// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { GuidedTour } from '../GuidedTour';
import { TOUR_STEPS } from '../tourSteps';
import { TOUR_STORAGE_KEY, hasSeenTour, markTourSeen, shouldAutoStartTour, requestTourReplay, consumeTourReplay, useTourReplayRequested } from '../tourState';
import { setStorageScope } from '../../../services/persistence/storage';
import { CORE_ONLY } from '../../../config/launchScope';

afterEach(cleanup);

describe('GuidedTour', () => {
  it('walks every step with a progress indicator, then finishes', () => {
    const onEnd = vi.fn();
    render(<GuidedTour steps={TOUR_STEPS} onEnd={onEnd} ctaLabel="Start with Learn" />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(`1 of ${TOUR_STEPS.length}`)).toBeTruthy();
    fireEvent.click(screen.getByText('Show me around'));
    expect(screen.getByText(`2 of ${TOUR_STEPS.length}`)).toBeTruthy();
    for (let i = 2; i < TOUR_STEPS.length; i++) fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText(TOUR_STEPS[TOUR_STEPS.length - 1].title)).toBeTruthy();
    fireEvent.click(screen.getByText('Start with Learn'));
    expect(onEnd).toHaveBeenCalledWith('cta');
  });

  it('can be skipped from any step, by button or Escape', () => {
    const onEnd = vi.fn();
    render(<GuidedTour steps={TOUR_STEPS} onEnd={onEnd} ctaLabel="Go" />);
    fireEvent.click(screen.getByText('Show me around'));
    fireEvent.click(screen.getByText('Skip tour'));
    expect(onEnd).toHaveBeenLastCalledWith('skipped');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEnd).toHaveBeenCalledTimes(2);
  });

  it('moves with the arrow keys and labels the dialog by the step title', () => {
    render(<GuidedTour steps={TOUR_STEPS} onEnd={() => {}} ctaLabel="Go" />);
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    const dialog = screen.getByRole('dialog');
    const title = document.getElementById(dialog.getAttribute('aria-labelledby')!);
    expect(title?.textContent).toBe(TOUR_STEPS[1].title);
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(screen.getByText('1 of ' + TOUR_STEPS.length)).toBeTruthy();
  });

  it('focuses the primary action and keeps Tab inside the card', () => {
    render(<GuidedTour steps={TOUR_STEPS} onEnd={() => {}} ctaLabel="Go" />);
    const primary = screen.getByText('Show me around').closest('button')!;
    expect(document.activeElement).toBe(primary);
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });
});

describe('tour copy', () => {
  it('stays within 4–6 steps', () => {
    expect(TOUR_STEPS.length).toBeGreaterThanOrEqual(4);
    expect(TOUR_STEPS.length).toBeLessThanOrEqual(6);
  });

  it('never mentions a hidden feature while launch scope is on', () => {
    if (!CORE_ONLY) return;
    const text = TOUR_STEPS.map((s) => `${s.title} ${s.body}`).join(' ').toLowerCase();
    for (const hidden of ['scenario', 'shop', 'league', 'ranking', 'challenge', 'duel', 'notebook', 'gem']) {
      expect(text).not.toContain(hidden);
    }
  });

  it('only anchors to nav items that exist', () => {
    const nav = readFileSync('src/components/Navigation.tsx', 'utf-8');
    const ids = [...nav.matchAll(/\{ id: '(\w+)'/g)].map((m) => `nav-${m[1]}`);
    for (const step of TOUR_STEPS) for (const a of step.anchors ?? []) expect(ids).toContain(a);
    expect(nav).toContain('data-tour={`nav-${');
  });
});

describe('tourState', () => {
  beforeEach(() => localStorage.clear());

  it('remembers completion per identity', () => {
    setStorageScope('guest');
    expect(hasSeenTour()).toBe(false);
    markTourSeen();
    expect(hasSeenTour()).toBe(true);
    expect(localStorage.getItem(`${TOUR_STORAGE_KEY}::guest`)).toBe('true');
    setStorageScope('user-123');
    expect(hasSeenTour()).toBe(false);
  });

  it('treats unreadable storage as not seen instead of throwing', () => {
    setStorageScope('guest');
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(hasSeenTour()).toBe(false);
    spy.mockRestore();
  });

  it('auto-starts only for someone new', () => {
    expect(shouldAutoStartTour({ seen: false, sessionCount: 0 })).toBe(true);
    expect(shouldAutoStartTour({ seen: true, sessionCount: 0 })).toBe(false);
    expect(shouldAutoStartTour({ seen: false, sessionCount: 3 })).toBe(false);
  });

  it('replay requests are one-shot', () => {
    const { result } = renderHook(() => useTourReplayRequested());
    expect(result.current).toBe(false);
    act(() => requestTourReplay());
    expect(result.current).toBe(true);
    act(() => consumeTourReplay());
    expect(result.current).toBe(false);
  });
});
