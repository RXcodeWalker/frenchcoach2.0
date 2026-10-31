// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const removeFriend = vi.hoisted(() => vi.fn().mockResolvedValue({ ok: true }));

vi.mock('../../components/TopContextBar', () => ({ TopContextBar: () => <header /> }));
vi.mock('../../components/ui/UsernameSetupModal', () => ({ UsernameSetupModal: () => null }));
vi.mock('../../context/AppContext', () => ({ useApp: () => ({ state: { profile: { username: 'me', total_xp: 10 } } }) }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('../../services/shop/useCatalogue', () => ({ useCatalogue: () => [] }));
vi.mock('../../services/social/leaderboardService', () => ({
  getWeeklyLeaderboard: vi.fn().mockResolvedValue([
    { id: 'a', username: 'Alice', totalXP: 900, weeklyXP: 120, streak: 9, rank: 1 },
    { id: 'u1', username: 'me', totalXP: 10, weeklyXP: 5, streak: 1, rank: 2, isCurrentUser: true },
  ]),
  getAllTimeLeaderboard: vi.fn().mockResolvedValue([]),
  getMyWeeklyRank: vi.fn(), getMyAllTimeRank: vi.fn(), getMyAllTimeXp: vi.fn(),
}));
vi.mock('../../services/social/friendsService', () => ({
  listFriendships: vi.fn().mockResolvedValue([
    { userId: 'f1', username: 'Bob', status: 'accepted', requestedByMe: false },
    { userId: 'f2', username: 'Cara', status: 'pending', requestedByMe: false },
  ]),
  acceptFriendRequest: vi.fn(), declineFriendRequest: vi.fn(), cancelFriendRequest: vi.fn(),
  removeFriend, sendFriendRequest: vi.fn(),
}));
vi.mock('../../services/social/searchService', () => ({ searchUsernames: vi.fn().mockResolvedValue([]) }));

import { Rankings } from '../Rankings';

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true, writable: true,
    value: (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }),
  });
});
afterEach(cleanup);

const renderScreen = () =>
  render(<MemoryRouter initialEntries={['/rankings']}><Routes><Route path="/rankings" element={<Rankings />} /></Routes></MemoryRouter>);

describe('Rankings', () => {
  it('lists the board with your rank and a "You" marker', async () => {
    renderScreen();
    expect(await screen.findByText('Alice')).toBeTruthy();
    expect(screen.getByTestId('rank-mine').textContent).toContain('#2');
    expect(screen.getByText('You')).toBeTruthy();
    expect(screen.getByText('120')).toBeTruthy();
  });

  it('asks before removing a friend', async () => {
    renderScreen();
    fireEvent.click(await screen.findByTestId('rank-tab-friends'));
    fireEvent.click(await screen.findByRole('button', { name: 'Remove Bob from friends' }));
    expect(removeFriend).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(removeFriend).toHaveBeenCalledWith('f1'));
  });

  it('shows the incoming count on the Requests tab', async () => {
    renderScreen();
    await screen.findByText('Alice');
    fireEvent.click(screen.getByTestId('rank-tab-requests'));
    expect(await screen.findByText('Cara')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Accept' })).toBeTruthy();
  });
});
