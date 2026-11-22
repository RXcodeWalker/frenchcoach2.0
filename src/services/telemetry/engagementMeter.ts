/**
 * How long a learner actually spent in the app, as opposed to how long a tab
 * stayed open. PostHog's session duration counts a tab left open behind a
 * homework document; for a school trial "minutes of real use per student" is
 * the number that matters.
 *
 *   visible — the tab was in front.
 *   active  — it was in front AND the learner touched it (tap, key, scroll)
 *             within IDLE_AFTER_MS. The window is long on purpose: speaking an
 *             answer or an exam turn means a minute or more with no taps.
 *
 * Event-driven, no timers: every input advances the clock by the gap since the
 * last one, so an idle tab costs nothing. `EngagementMeter` is pure (callers
 * pass the time) and tested; `startEngagementTracking` is the only DOM part.
 * It reports one `visit_summary` each time the page is hidden or unloaded —
 * counts and seconds only, never what was on screen.
 */
import { track } from './telemetryService';

export const IDLE_AFTER_MS = 90_000;
/** A summary with less active time than this (a tab flicked past) is not worth an event. */
export const MIN_ACTIVE_MS = 3_000;

export interface EngagementSample {
  activeMs: number;
  visibleMs: number;
  screens: number;
}

export class EngagementMeter {
  private last: number;
  private lastInteraction: number;
  private visible: boolean;
  private activeMs = 0;
  private visibleMs = 0;
  private screens = 0;

  constructor(now: number, visible: boolean, private readonly idleAfterMs = IDLE_AFTER_MS) {
    this.last = now;
    this.lastInteraction = now;
    this.visible = visible;
  }

  private advance(now: number): void {
    if (now <= this.last) return;
    if (this.visible) {
      this.visibleMs += now - this.last;
      const activeUntil = Math.min(now, this.lastInteraction + this.idleAfterMs);
      this.activeMs += Math.max(0, activeUntil - this.last);
    }
    this.last = now;
  }

  /** A tap, key press or scroll. */
  interact(now: number): void {
    this.advance(now);
    this.lastInteraction = now;
  }

  /** The tab came to the front or went behind. Coming back counts as an interaction. */
  setVisible(now: number, visible: boolean): void {
    this.advance(now);
    this.visible = visible;
    if (visible) this.lastInteraction = now;
  }

  /** A screen was opened (route change). */
  screen(): void {
    this.screens += 1;
  }

  /** Everything counted since the last take(), then starts again from zero. */
  take(now: number): EngagementSample {
    this.advance(now);
    const sample = { activeMs: this.activeMs, visibleMs: this.visibleMs, screens: this.screens };
    this.activeMs = 0;
    this.visibleMs = 0;
    this.screens = 0;
    return sample;
  }
}

export interface EngagementHandle {
  /** Call on every route change. */
  noteScreen(): void;
  stop(): void;
}

/** Wires a meter to the page. Once per page load: AnalyticsTracker never unmounts. */
export function startEngagementTracking(win: Window = window, doc: Document = document): EngagementHandle {
  const meter = new EngagementMeter(Date.now(), doc.visibilityState === 'visible');
  const flush = () => {
    const s = meter.take(Date.now());
    if (s.activeMs < MIN_ACTIVE_MS) return;
    track(
      {
        name: 'visit_summary',
        props: { active_s: Math.round(s.activeMs / 1000), visible_s: Math.round(s.visibleMs / 1000), screens: s.screens },
      },
      { beacon: true },
    );
  };
  const touch = () => meter.interact(Date.now());
  const onVisibility = () => {
    if (doc.visibilityState === 'hidden') {
      meter.setVisible(Date.now(), false);
      flush();
    } else {
      meter.setVisible(Date.now(), true);
    }
  };
  const interactions = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const;
  for (const type of interactions) win.addEventListener(type, touch, { passive: true, capture: true });
  doc.addEventListener('visibilitychange', onVisibility);
  win.addEventListener('pagehide', flush);
  return {
    noteScreen: () => meter.screen(),
    stop: () => {
      for (const type of interactions) win.removeEventListener(type, touch, { capture: true });
      doc.removeEventListener('visibilitychange', onVisibility);
      win.removeEventListener('pagehide', flush);
    },
  };
}
