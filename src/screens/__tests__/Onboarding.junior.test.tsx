// @vitest-environment jsdom
// The Junior (Grades 4–7) route out of the exam-goal wizard.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Onboarding } from '../Onboarding';
import { JUNIOR_TRACK_SELECTABLE } from '../../config/launchScope';

const dispatch = vi.fn();
vi.mock('../../context/AppContext', () => ({ useApp: () => ({ state: {}, dispatch }) }));
const setActiveGoal = vi.fn(() => ({}));
vi.mock('../../services/coach/coachProfileService', () => ({
  getCoachProfile: () => ({ onboardingComplete: false, goals: [], activeGoalId: null }),
  setActiveGoal: (...args: unknown[]) => setActiveGoal(...(args as [])),
  setExamDate: vi.fn(),
  getActiveGoal: () => null,
  updateCoachProfile: vi.fn(),
}));
vi.mock('../../services/coach/decisionEngine', () => ({ invalidateDailyPlan: vi.fn() }));

function Probe() {
  const l = useLocation();
  return <span data-testid="location">{l.pathname + l.search}</span>;
}
const view = (search = '') =>
  render(
    <MemoryRouter initialEntries={[`/onboarding${search}`]}>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  dispatch.mockReset();
  setActiveGoal.mockClear();
});
afterEach(cleanup);

describe('Onboarding — Junior', () => {
  it.skipIf(!JUNIOR_TRACK_SELECTABLE)('"I\'m in Grades 4–7" completes onboarding like skipping, switches the track and lands on the Junior home', () => {
    view('?returnTo=%2Flearn');
    fireEvent.click(screen.getByTestId('onboarding-junior'));
    expect(setActiveGoal).toHaveBeenCalledWith('general_speaking', undefined);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_LEARNER_TRACK', track: 'junior' });
    // Straight to Junior, not through the exam placement diagnostic, whatever the returnTo was.
    expect(screen.getByTestId('location').textContent).toBe('/junior');
  });

  it.skipIf(JUNIOR_TRACK_SELECTABLE)('is not offered while the launch scope hides the Junior track', () => {
    view();
    expect(screen.queryByTestId('onboarding-junior')).toBeNull();
  });

  it('is not offered when editing goals from Profile', () => {
    view('?from=profile');
    expect(screen.queryByTestId('onboarding-junior')).toBeNull();
  });
});
