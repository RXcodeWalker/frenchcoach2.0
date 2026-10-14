// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const app = { state: { learnerTrack: 'exam' as 'exam' | 'junior' }, dispatch: vi.fn() };
vi.mock('../../../context/AppContext', () => ({ useApp: () => app }));

import { TrackSwitch } from '../TrackSwitch';

const view = () =>
  render(
    <MemoryRouter initialEntries={['/profile']}>
      <Routes>
        <Route path="/profile" element={<TrackSwitch />} />
        <Route path="/junior" element={<div data-testid="at-junior" />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  app.state = { learnerTrack: 'exam' };
  app.dispatch.mockReset();
});
afterEach(cleanup);

describe('TrackSwitch', () => {
  it('shows the current track as selected', () => {
    view();
    expect(screen.getByTestId('track-exam').getAttribute('aria-checked')).toBe('true');
    expect(screen.getByTestId('track-junior').getAttribute('aria-checked')).toBe('false');
  });

  it('switching to Junior sets the track and goes to the Junior home', () => {
    view();
    fireEvent.click(screen.getByTestId('track-junior'));
    expect(app.dispatch).toHaveBeenCalledWith({ type: 'SET_LEARNER_TRACK', track: 'junior' });
    expect(screen.getByTestId('at-junior')).toBeTruthy();
  });

  it('switching back to exam only sets the track — nothing is deleted', () => {
    app.state = { learnerTrack: 'junior' };
    view();
    fireEvent.click(screen.getByTestId('track-exam'));
    expect(app.dispatch.mock.calls).toEqual([[{ type: 'SET_LEARNER_TRACK', track: 'exam' }]]);
  });

  it('choosing the track already selected does nothing', () => {
    view();
    fireEvent.click(screen.getByTestId('track-exam'));
    expect(app.dispatch).not.toHaveBeenCalled();
  });
});
