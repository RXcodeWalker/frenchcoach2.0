// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { OnboardingCheck } from '../OnboardingCheck';

const getCoachProfileMock = vi.fn();
vi.mock('../../services/coach/coachProfileService', () => ({
  getCoachProfile: () => getCoachProfileMock(),
}));

afterEach(() => {
  cleanup();
  getCoachProfileMock.mockReset();
});

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname + location.search}</span>;
}

describe('OnboardingCheck returnTo redirect', () => {
  it('redirects to /onboarding preserving path, query, and hash as returnTo', () => {
    getCoachProfileMock.mockReturnValue({ onboardingComplete: false });
    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/duel/abc123?x=1#y']}>
        <Routes>
          <Route
            path="*"
            element={
              <OnboardingCheck>
                <span data-testid="child">child</span>
              </OnboardingCheck>
            }
          />
          <Route path="/onboarding" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(getByTestId('location').textContent).toBe(
      `/onboarding?returnTo=${encodeURIComponent('/duel/abc123?x=1#y')}`,
    );
  });

  it('renders children as-is when onboarding is already complete', () => {
    getCoachProfileMock.mockReturnValue({ onboardingComplete: true });
    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/duel/abc123']}>
        <Routes>
          <Route
            path="*"
            element={
              <OnboardingCheck>
                <span data-testid="child">child</span>
              </OnboardingCheck>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(getByTestId('child')).not.toBeNull();
  });
});
