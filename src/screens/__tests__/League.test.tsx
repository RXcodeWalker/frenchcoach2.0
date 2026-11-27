// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../components/TopContextBar', () => ({ TopContextBar: () => <header /> }));
vi.mock('../../services/telemetry/telemetryService', () => ({ track: vi.fn() }));
vi.mock('../../services/shop/useCatalogue', () => ({ useCatalogue: () => [] }));
vi.mock('../../components/ui/UsernameSetupModal', () => ({ UsernameSetupModal: () => <div data-testid="username-modal" /> }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));

const getLeague = vi.fn();
let seen = false;
vi.mock('../../services/league/leagueService', () => ({
  getMyLeague: () => getLeague(),
  lastWeekCardSeen: () => seen,
  markLastWeekCardSeen: () => { seen = true; },
}));

import { League } from '../League';
import type { LeagueMember, MyLeague } from '../../types/league';

const m = (rank: number | null, xp: number, isMe = false): LeagueMember => ({
  rank, username: `user${rank ?? 'x'}`, avatarEmoji: null, equippedFrame: null, equippedNameplate: null, weeklyXp: xp, standingTier: 'silver', isMe,
});
const league = (over: Partial<MyLeague> = {}): MyLeague => ({
  status: 'active', weekKey: '2026-W48', resetsAt: '2026-11-30T00:00:00Z', tier: 'silver', myWeeklyXp: 120,
  cohort: {
    tier: 'silver', mixed: false, activeMembers: 5, promoteCount: 1, demoteCount: 1, promoteMinXp: 50,
    members: [m(1, 300), m(2, 200), m(3, 120, true), m(4, 60), m(5, 10)],
  },
  lastWeek: null,
  ...over,
});

const render_ = () => render(<MemoryRouter><League /></MemoryRouter>);

beforeEach(() => { getLeague.mockReset(); seen = false; });
afterEach(() => cleanup());

describe('League', () => {
  it('shows the group with the server’s zones', async () => {
    getLeague.mockResolvedValue({ ok: true, league: league() });
    render_();
    expect(await screen.findByTestId('league-rank')).toHaveProperty('textContent', '#3');
    expect(screen.getAllByText('Promotion zone').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Drop zone').length).toBeGreaterThan(0);
    expect(screen.getByTestId('league-standing').textContent).toContain('Safe for now');
  });

  it('explains how to join when there is no XP yet this week', async () => {
    getLeague.mockResolvedValue({ ok: true, league: league({ status: 'not_joined', cohort: null }) });
    render_();
    expect(await screen.findByTestId('league-not-joined')).toBeTruthy();
  });

  it('offers a username when one is missing', async () => {
    getLeague.mockResolvedValue({ ok: true, league: league({ status: 'needs_username', cohort: null }) });
    render_();
    fireEvent.click(await screen.findByText('Pick a username'));
    expect(screen.getByTestId('username-modal')).toBeTruthy();
  });

  it('shows last week’s result once, until dismissed', async () => {
    getLeague.mockResolvedValue({
      ok: true,
      league: league({ lastWeek: { weekKey: '2026-W47', poolTier: 'bronze', standingTier: 'bronze', rank: 1, finalXp: 300, promoted: true, demoted: false, activeMembers: 8 } }),
    });
    render_();
    expect((await screen.findByTestId('league-last-week')).textContent).toContain('Promoted to Silver');
    fireEvent.click(screen.getByText('Got it'));
    expect(screen.queryByTestId('league-last-week')).toBeNull();
  });

  it('says "being switched on" before the migration is applied', async () => {
    getLeague.mockResolvedValue({ ok: false, reason: 'not_deployed' });
    render_();
    expect(await screen.findByText(/being switched on/)).toBeTruthy();
  });
});
