// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SignInWelcome } from '../SignInWelcome';
import { WELCOME_VISIBLE_MS, welcomeLine } from '../welcomeLine';
import { hasFreshSignIn, markFreshSignIn } from '../../../lib/freshSignIn';

let profile: { username: string | null; streak_days: number } = { username: 'Léa', streak_days: 4 };
vi.mock('../../../context/AppContext', () => ({ useApp: () => ({ state: { profile } }) }));
vi.mock('../../../components/motion/Burst', () => ({ Burst: () => <span data-testid="burst" /> }));
let tourPending = false;
vi.mock('../../tour/tourState', () => ({
  hasSeenTour: () => !tourPending,
  shouldAutoStartTour: ({ seen, sessionCount }: { seen: boolean; sessionCount: number }) => !seen && sessionCount === 0,
}));

beforeEach(() => {
  profile = { username: 'Léa', streak_days: 4 };
  tourPending = false;
  sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('welcomeLine', () => {
  it('says the real streak, and nothing it cannot back up', () => {
    expect(welcomeLine(7)).toEqual({ text: '7-day streak. Keep it alive today.', streak: true });
    expect(welcomeLine(1).streak).toBe(true);
    expect(welcomeLine(1).text).toMatch(/^1-day streak/);
    const none = welcomeLine(0);
    expect(none.streak).toBe(false);
    expect(none.text).not.toMatch(/streak/i);
  });
});

describe('SignInWelcome', () => {
  it('shows nothing for a session that was merely restored', () => {
    render(<SignInWelcome />);
    expect(screen.queryByTestId('sign-in-welcome')).toBeNull();
    expect(screen.queryByTestId('burst')).toBeNull();
  });

  it('greets a learner who just signed in, by name, with their streak and a burst', () => {
    markFreshSignIn();
    render(<SignInWelcome />);
    const card = screen.getByTestId('sign-in-welcome');
    expect(card.textContent).toContain('Bon retour');
    expect(card.textContent).toContain('Léa');
    expect(card.textContent).toContain('4-day streak');
    expect(card.getAttribute('role')).toBe('status');
    expect(screen.getByTestId('burst')).toBeTruthy();
  });

  it('works without a name', () => {
    profile = { username: null, streak_days: 0 };
    markFreshSignIn();
    render(<SignInWelcome />);
    expect(screen.getByTestId('sign-in-welcome').textContent).toMatch(/Bon retour!/);
    expect(screen.getByTestId('sign-in-welcome').textContent).toContain('Your plan for today is ready');
  });

  it('consumes the marker: it cannot show twice for one sign-in', () => {
    markFreshSignIn();
    const first = render(<SignInWelcome />);
    expect(hasFreshSignIn()).toBe(false);
    first.unmount();
    render(<SignInWelcome />);
    expect(screen.queryByTestId('sign-in-welcome')).toBeNull();
  });

  it('stands down when the first-run app tour is about to open, and still uses up the marker', () => {
    tourPending = true;
    markFreshSignIn();
    render(<SignInWelcome />);
    expect(screen.queryByTestId('sign-in-welcome')).toBeNull();
    expect(screen.queryByTestId('burst')).toBeNull();
    expect(hasFreshSignIn()).toBe(false);
  });

  it('can be dismissed', async () => {
    markFreshSignIn();
    render(<SignInWelcome />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss welcome' }));
    await vi.waitFor(() => expect(screen.queryByTestId('sign-in-welcome')).toBeNull());
  });

  it('leaves by itself', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    markFreshSignIn();
    render(<SignInWelcome />);
    expect(screen.getByTestId('sign-in-welcome')).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(WELCOME_VISIBLE_MS + 10);
    });
    vi.useRealTimers();
    await vi.waitFor(() => expect(screen.queryByTestId('sign-in-welcome')).toBeNull());
  });
});
