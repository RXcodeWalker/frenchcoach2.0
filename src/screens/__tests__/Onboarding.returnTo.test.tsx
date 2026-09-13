// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Onboarding } from '../Onboarding';

vi.mock('../../services/coach/coachProfileService', () => ({
  getCoachProfile: () => ({ onboardingComplete: false, goals: [], activeGoalId: null }),
  setActiveGoal: vi.fn(() => ({})),
  setExamDate: vi.fn(),
  getActiveGoal: () => null,
  updateCoachProfile: vi.fn(),
}));
vi.mock('../../services/coach/decisionEngine', () => ({
  invalidateDailyPlan: vi.fn(),
}));

afterEach(cleanup);

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname + location.search}</span>;
}

function renderOnboarding(searchSuffix: string) {
  return render(
    <MemoryRouter initialEntries={[`/onboarding${searchSuffix}`]}>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function completeWizard() {
  // Step 1: pick "Just learning" -> jumps straight to step 3.
  fireEvent.click(screen.getByText('Just learning'));
  fireEvent.click(screen.getByText('Next'));
  // Step 3: pick "Casual learning" -> complete.
  fireEvent.click(await screen.findByText('Casual learning'));
  fireEvent.click(screen.getByText('Get Started'));
}

describe('Onboarding returnTo handling', () => {
  it('navigates to the valid returnTo destination via the placement route after completing', async () => {
    renderOnboarding('?returnTo=%2Fduel%2Fabc123');
    await completeWizard();
    const location = screen.getByTestId('location').textContent ?? '';
    expect(location.startsWith('/onboarding/placement?returnTo=')).toBe(true);
    expect(decodeURIComponent(location.split('returnTo=')[1])).toBe('/duel/abc123');
  });

  it('falls back to / when no returnTo is present (regression guard)', async () => {
    renderOnboarding('');
    await completeWizard();
    const location = screen.getByTestId('location').textContent ?? '';
    expect(decodeURIComponent(location.split('returnTo=')[1])).toBe('/');
  });

  it.each([
    ['https://evil.example'],
    ['//evil.example'],
    ['/\\evil.example'],
  ])('falls back to / for a malicious returnTo=%s', async (malicious) => {
    renderOnboarding(`?returnTo=${encodeURIComponent(malicious)}`);
    await completeWizard();
    const location = screen.getByTestId('location').textContent ?? '';
    expect(decodeURIComponent(location.split('returnTo=')[1])).toBe('/');
  });

  it('skip-for-now navigates directly to a valid returnTo (not through placement)', () => {
    renderOnboarding('?returnTo=%2Fduel%2Fabc123');
    fireEvent.click(screen.getByText('Skip for now'));
    const location = screen.getByTestId('location').textContent ?? '';
    expect(location).toBe('/duel/abc123');
  });
});
