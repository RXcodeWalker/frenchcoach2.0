// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { setStorageScope } from '../../../services/persistence/storage';

const track = vi.fn();
vi.mock('../../../services/telemetry/telemetryService', () => ({ track: (e: unknown) => track(e) }));
vi.mock('../../../context/AppContext', () => ({
  useApp: () => ({ state: { learnerTrack: 'exam', recentSessions: [] }, migrationPhase: null }),
}));

import { TourHost } from '../TourHost';
import { TOUR_STEPS } from '../tourSteps';
import { hasSeenTour, requestTourReplay } from '../tourState';

function renderHost() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <TourHost />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  setStorageScope('guest');
  track.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('TourHost', () => {
  it('starts on its own for a new learner, and counts the start', () => {
    renderHost();
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => void vi.advanceTimersByTime(800));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(track).toHaveBeenCalledWith({ name: 'tour_started', props: { entry: 'auto' } });
  });

  it('tells someone who skips an automatic tour where to find it again', () => {
    renderHost();
    act(() => void vi.advanceTimersByTime(800));
    fireEvent.click(screen.getByText('Show me around'));
    fireEvent.click(screen.getByText('Skip tour'));
    expect(hasSeenTour()).toBe(true);
    expect(screen.getByRole('status').textContent).toMatch(/replay the tour any time from Profile/i);
    expect(track).toHaveBeenCalledWith({
      name: 'tour_ended',
      props: { entry: 'auto', reason: 'skipped', last_step: TOUR_STEPS[1].id, steps_seen: 2 },
    });
    act(() => void vi.advanceTimersByTime(6100));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('does not nag a replay: no note, and the entry is recorded as a replay', () => {
    localStorage.setItem('frenchCoach_tourSeen_v1::guest', 'true');
    renderHost();
    act(() => void vi.advanceTimersByTime(800));
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => requestTourReplay());
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('status')).toBeNull();
    expect(track).toHaveBeenCalledWith({ name: 'tour_started', props: { entry: 'replay' } });
  });
});
