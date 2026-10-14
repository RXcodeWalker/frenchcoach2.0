// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { JUNIOR_BANK } from '../../../data/junior';
import { emptyJuniorState, type JuniorState } from '../../../domain/junior/state';

const app = { state: { junior: emptyJuniorState() as JuniorState, learnerTrack: 'junior' }, dispatch: vi.fn() };
vi.mock('../../../context/AppContext', () => ({ useApp: () => app }));

import { JuniorHome } from '../JuniorHome';

const view = () => render(<MemoryRouter><JuniorHome /></MemoryRouter>);

beforeEach(() => {
  app.state = { junior: emptyJuniorState(), learnerTrack: 'junior' };
});
afterEach(cleanup);

describe('JuniorHome', () => {
  it('is a picture map of the pilot themes, each linking to its mission', () => {
    view();
    const tiles = screen.getAllByTestId('junior-theme');
    expect(tiles.map((t) => t.getAttribute('data-theme-id'))).toEqual(JUNIOR_BANK.themes.map((t) => t.id));
    for (const tile of tiles) {
      const href = within(tile).getAllByRole('link')[0].getAttribute('href');
      expect(href).toBe(`/junior/${tile.getAttribute('data-theme-id')}`);
    }
  });

  it('shows earned stickers as earned and the rest as not yet, with no counts or scores', () => {
    const theme = JUNIOR_BANK.themes[0];
    app.state = { ...app.state, junior: { ...app.state.junior, stickers: { [theme.id]: [theme.stickers[0].id, theme.stickers[1].id] } } };
    view();
    const tile = screen.getAllByTestId('junior-theme')[0];
    const earned = within(tile).getAllByTestId('junior-sticker').filter((s) => s.getAttribute('data-earned') === 'true');
    expect(earned).toHaveLength(2);
    expect(within(tile).getAllByTestId('junior-sticker')).toHaveLength(theme.stickers.length);
    expect(screen.getByTestId('junior-home').textContent).not.toMatch(/\d/);
  });

  it('offers Continue on the theme of a resumable mission, and nothing about a lost one after 24 h', () => {
    const theme = JUNIOR_BANK.themes[0];
    app.state = {
      ...app.state,
      junior: { ...emptyJuniorState(), activeMission: { themeId: theme.id, startedAt: Date.now() - 1000, results: [{ turnId: 'x', outcome: 'got' }] } },
    };
    view();
    expect(screen.getAllByTestId('junior-theme')[0].textContent).toContain('Continue');
    cleanup();
    app.state = {
      ...app.state,
      junior: { ...emptyJuniorState(), activeMission: { themeId: theme.id, startedAt: Date.now() - 25 * 3600 * 1000, results: [{ turnId: 'x', outcome: 'got' }] } },
    };
    view();
    expect(screen.getAllByTestId('junior-theme')[0].textContent).not.toContain('Continue');
    expect(document.body.textContent).not.toMatch(/lost|expired/i);
  });

  it('shows the unlocked outfit on Léo and the unlocked background', () => {
    const [moi, couleurs] = JUNIOR_BANK.themes;
    app.state = { ...app.state, junior: { ...emptyJuniorState(), unlocks: [moi.unlock.id, couleurs.unlock.id] } };
    view();
    expect(screen.getByTestId('leo-accessory').textContent).toBe(moi.unlock.emoji);
    expect(screen.getByTestId('junior-background').textContent).toContain(couleurs.unlock.name);
  });

  it('has no duels, leagues or rankings', () => {
    view();
    expect(screen.getByTestId('junior-home').textContent).not.toMatch(/duel|league|ranking|leaderboard|score|xp/i);
  });

  it('links grown-ups to Profile, where the track can be switched back', () => {
    view();
    expect(screen.getByTestId('junior-grownups').getAttribute('href')).toBe('/profile');
  });
});
