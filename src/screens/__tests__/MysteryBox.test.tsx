// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../components/TopContextBar', () => ({ TopContextBar: () => <header /> }));

const claim = vi.fn();
const trackMock = vi.fn();
vi.mock('../../services/telemetry/telemetryService', () => ({ track: (e: unknown) => trackMock(e) }));
vi.mock('../../services/mysteryBox/mysteryBoxService', () => ({ claimMysteryBox: () => claim() }));

import { MysteryBox } from '../MysteryBox';

function setup() {
  return render(
    <MemoryRouter>
      <MysteryBox />
    </MemoryRouter>,
  );
}

describe('MysteryBox', () => {
  beforeEach(() => {
    claim.mockReset();
    trackMock.mockReset();
  });
  afterEach(() => cleanup());

  it('reveals the server-chosen reward', async () => {
    claim.mockResolvedValue({ ok: true, alreadyClaimed: false, xpAwarded: 100 });
    setup();
    fireEvent.click(screen.getByTestId('mb-open'));
    await waitFor(() => expect(screen.getByTestId('mb-revealed')).toBeTruthy(), { timeout: 3000 });
    expect(screen.getByText('Mega XP Boost')).toBeTruthy();
    expect(screen.getByTestId('mb-xp').textContent).toBe('100');
    expect(trackMock).toHaveBeenCalledWith({ name: 'mystery_box_opened', props: { outcome: 'revealed', xp: 100 } });
  });

  it('says so when the box was already opened today', async () => {
    claim.mockResolvedValue({ ok: true, alreadyClaimed: true, xpAwarded: 0 });
    setup();
    fireEvent.click(screen.getByTestId('mb-open'));
    await waitFor(() => expect(screen.getByTestId('mb-claimed')).toBeTruthy(), { timeout: 3000 });
  });

  it('asks a signed-out learner to sign in instead of retrying', async () => {
    claim.mockResolvedValue({ ok: false, reason: 'not_authenticated' });
    setup();
    fireEvent.click(screen.getByTestId('mb-open'));
    await waitFor(() => expect(screen.getByTestId('mb-error')).toBeTruthy(), { timeout: 3000 });
    expect(screen.getByText('Sign in to open the box')).toBeTruthy();
    expect(screen.queryByText('Try again')).toBeNull();
  });
});
