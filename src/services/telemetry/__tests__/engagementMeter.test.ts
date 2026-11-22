// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EngagementMeter, IDLE_AFTER_MS, MIN_ACTIVE_MS, startEngagementTracking } from '../engagementMeter';

const S = 1000;

describe('EngagementMeter', () => {
  it('counts visible time as active while the learner keeps touching the page', () => {
    const m = new EngagementMeter(0, true);
    m.interact(30 * S);
    m.interact(60 * S);
    expect(m.take(60 * S)).toEqual({ activeMs: 60 * S, visibleMs: 60 * S, screens: 0 });
  });

  it('stops counting active time one idle window after the last touch, but keeps counting visible time', () => {
    const m = new EngagementMeter(0, true);
    m.interact(10 * S);
    const s = m.take(10 * S + IDLE_AFTER_MS + 600 * S); // walked away for ten more minutes
    expect(s.activeMs).toBe(10 * S + IDLE_AFTER_MS);
    expect(s.visibleMs).toBe(10 * S + IDLE_AFTER_MS + 600 * S);
  });

  it('counts nothing while the tab is behind another', () => {
    const m = new EngagementMeter(0, true);
    m.setVisible(20 * S, false);
    m.setVisible(520 * S, true); // back after eight minutes; coming back is a touch
    const s = m.take(530 * S);
    expect(s.visibleMs).toBe(30 * S);
    expect(s.activeMs).toBe(30 * S);
  });

  it('take() resets, and counts screens', () => {
    const m = new EngagementMeter(0, true);
    m.screen();
    m.screen();
    m.interact(5 * S);
    expect(m.take(5 * S).screens).toBe(2);
    expect(m.take(5 * S)).toEqual({ activeMs: 0, visibleMs: 0, screens: 0 });
  });

  it('a clock that goes backwards adds nothing', () => {
    const m = new EngagementMeter(100 * S, true);
    m.interact(50 * S);
    expect(m.take(50 * S).visibleMs).toBe(0);
  });
});

describe('startEngagementTracking', () => {
  let capture: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    vi.stubEnv('PROD', true);
    capture = vi.fn();
    const { setAnalyticsClientForTests } = await import('../posthogClient');
    setAnalyticsClientForTests({
      capture,
      identify: vi.fn(),
      reset: vi.fn(),
      register: vi.fn(),
      setPersonProperties: vi.fn(),
      get_distinct_id: () => 'd',
      group: vi.fn(),
      set_config: vi.fn(),
    } as never);
  });

  afterEach(async () => {
    const { setAnalyticsClientForTests } = await import('../posthogClient');
    setAnalyticsClientForTests(null);
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  const setVisibility = (state: 'visible' | 'hidden') => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
    document.dispatchEvent(new Event('visibilitychange'));
  };

  it('sends one visit_summary when the page is hidden, with seconds and counts only', () => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    const handle = startEngagementTracking(window, document);
    handle.noteScreen();
    vi.setSystemTime(20 * S);
    window.dispatchEvent(new Event('pointerdown'));
    vi.setSystemTime(45 * S);
    setVisibility('hidden');
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith('visit_summary', { active_s: 45, visible_s: 45, screens: 1 });
    handle.stop();
  });

  it('sends nothing for a tab flicked past', () => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    const handle = startEngagementTracking(window, document);
    vi.setSystemTime(MIN_ACTIVE_MS - 1000);
    setVisibility('hidden');
    expect(capture).not.toHaveBeenCalled();
    handle.stop();
  });
});
