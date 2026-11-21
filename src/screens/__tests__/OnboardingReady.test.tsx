// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { OnboardingReady } from '../OnboardingReady';
import { markFreshSignIn, hasFreshSignIn } from '../../lib/freshSignIn';

let reduced = false;
vi.mock('framer-motion', async (orig) => ({
  ...(await orig<typeof import('framer-motion')>()),
  useReducedMotion: () => reduced,
}));
// Tiny timings so the whole "building" beat runs in ~100 ms.
vi.mock('../../features/onboarding/planSummary', async (orig) => ({
  ...(await orig<typeof import('../../features/onboarding/planSummary')>()),
  BUILD_STEP_MS: 20,
  BUILD_HOLD_MS: 20,
}));
vi.mock('../../context/AppContext', () => ({ useApp: () => ({ state: { profile: { username: 'Léa' } }, dispatch: vi.fn() }) }));
vi.mock('../../services/coach/coachProfileService', () => ({
  getCoachProfile: () => ({ onboardingComplete: true, goals: [], activeGoalId: null, examDate: '2999-01-01' }),
  getActiveGoal: () => ({ type: 'igcse' }),
}));
const preloadScreenFor = vi.fn((path: string) => {
  void path;
  return Promise.resolve();
});
vi.mock('../../routing/screens', () => ({ preloadScreenFor: (p: string) => preloadScreenFor(p) }));
const track = vi.fn();
vi.mock('../../services/telemetry/telemetryService', () => ({ track: (e: unknown) => track(e) }));
// The canvas has nothing to draw in jsdom; the burst has its own tests.
vi.mock('../../components/motion/Burst', () => ({ Burst: () => <span data-testid="burst" /> }));

function Probe() {
  const l = useLocation();
  return <span data-testid="location">{l.pathname + l.search}</span>;
}
const view = (search = '') =>
  render(
    <MemoryRouter initialEntries={[`/onboarding/ready${search}`]}>
      <Routes>
        <Route path="/onboarding/ready" element={<OnboardingReady />} />
        <Route path="*" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  reduced = false;
  track.mockClear();
  preloadScreenFor.mockClear();
  sessionStorage.clear();
});
afterEach(cleanup);

describe('OnboardingReady', () => {
  it('builds the plan from the learner\'s own answers, then reveals "all set"', async () => {
    view();
    expect(screen.getByTestId('onboarding-building')).toBeTruthy();
    expect(screen.getByText(/Building your plan, Léa/)).toBeTruthy();
    expect(screen.queryByTestId('onboarding-ready')).toBeNull();

    await screen.findByTestId('onboarding-ready');
    expect(screen.getByText(/You're all set, Léa\./)).toBeTruthy();
    expect(screen.getByText('Goal set: IGCSE French speaking')).toBeTruthy();
    expect(screen.getByText(/days to go$/)).toBeTruthy();
    expect(screen.getByText('Find your level')).toBeTruthy(); // the road ahead
    expect(screen.getByTestId('burst')).toBeTruthy();
    expect(track).toHaveBeenCalledWith({ name: 'onboarding_ready_viewed', props: {} });
  });

  it('downloads the screens the learner is about to open while they watch', () => {
    view();
    expect(preloadScreenFor).toHaveBeenCalledWith('/onboarding/placement');
    expect(preloadScreenFor).toHaveBeenCalledWith('/');
    expect(preloadScreenFor).toHaveBeenCalledWith('/learn');
  });

  it('is the welcome for a new account: it clears the "just signed in" marker so Home does not welcome twice', () => {
    markFreshSignIn();
    expect(hasFreshSignIn()).toBe(true);
    view();
    expect(hasFreshSignIn()).toBe(false);
  });

  it('"Find my level" goes to the placement check and keeps the returnTo', async () => {
    view('?returnTo=%2Fduel%2Fabc123');
    fireEvent.click(await screen.findByTestId('onboarding-ready-placement'));
    const loc = screen.getByTestId('location').textContent ?? '';
    expect(loc.startsWith('/onboarding/placement?returnTo=')).toBe(true);
    expect(decodeURIComponent(loc.split('returnTo=')[1])).toBe('/duel/abc123');
    expect(track).toHaveBeenCalledWith({ name: 'onboarding_ready_action', props: { action: 'placement' } });
  });

  it('"Skip" goes straight to the destination, never through the check', async () => {
    view('?returnTo=%2Flearn');
    fireEvent.click(await screen.findByTestId('onboarding-ready-skip'));
    expect(screen.getByTestId('location').textContent).toBe('/learn');
    expect(track).toHaveBeenCalledWith({ name: 'onboarding_ready_action', props: { action: 'skip' } });
  });

  it.each(['https://evil.example', '//evil.example', '/\\evil.example'])(
    'a malicious returnTo (%s) falls back to /',
    async (bad) => {
      view(`?returnTo=${encodeURIComponent(bad)}`);
      fireEvent.click(await screen.findByTestId('onboarding-ready-skip'));
      expect(screen.getByTestId('location').textContent).toBe('/');
    },
  );

  it('under reduced motion the build beat is skipped and the reveal shows at once', async () => {
    reduced = true;
    view();
    await waitFor(() => expect(screen.getByTestId('onboarding-ready')).toBeTruthy());
  });

  it('a skipped survey gets the short version: no building beat, straight to the reveal', () => {
    view('?skipped=1');
    expect(screen.queryByTestId('onboarding-building')).toBeNull();
    expect(screen.getByTestId('onboarding-ready')).toBeTruthy();
  });

  it('says nothing about a mark, grade or level', async () => {
    view();
    await screen.findByTestId('onboarding-ready');
    expect(document.body.textContent ?? '').not.toMatch(/\b(grade|band|predicted|guarantee)\b/i);
  });
});
