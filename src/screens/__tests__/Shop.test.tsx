// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ShopItem } from '../../types/shop';

vi.mock('../../components/TopContextBar', () => ({
  TopContextBar: ({ title, onBack }: { title: string; onBack?: () => void }) => (
    <header>
      <h1>{title}</h1>
      <button onClick={onBack}>Back to Explore</button>
    </header>
  ),
}));

const item = (over: Partial<ShopItem> & Pick<ShopItem, 'id' | 'kind' | 'priceGems'>): ShopItem => ({
  consumable: over.kind === 'consumable',
  maxOwned: null,
  requirement: {},
  emoji: null,
  active: true,
  sortOrder: 0,
  ...over,
});

const CATALOGUE: ShopItem[] = [
  item({ id: 'streak_freeze', kind: 'consumable', priceGems: 100, sortOrder: 1 }),
  item({ id: 'focus_token', kind: 'consumable', priceGems: 500, sortOrder: 2 }),
  item({ id: 'avatar_croissant', kind: 'avatar', priceGems: 50, sortOrder: 3 }),
  item({ id: 'avatar_renard', kind: 'avatar', priceGems: 300, requirement: { achievement: 'triple_jour' }, sortOrder: 4 }),
];
vi.mock('../../services/shop/useCatalogue', () => ({ useCatalogue: () => CATALOGUE }));

const dispatch = vi.fn();
const app = {
  dispatch,
  state: {
    achievements: [] as { id: string; unlocked: boolean }[],
    profile: {
      gems: 250,
      total_xp: 0,
      streak_days: 1,
      username: 'lea_m',
      inventory: {} as Record<string, number>,
      equipped: { avatar: null, frame: null, nameplate: null },
    },
  },
};
vi.mock('../../context/AppContext', () => ({ useApp: () => app }));
const auth = { user: { id: 'u1' } as null | { id: string } };
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));

const purchase = vi.fn();
vi.mock('../../services/shop/shopService', () => ({
  purchase: (...a: unknown[]) => purchase(...a),
  equip: vi.fn(async () => undefined),
  makeIdempotencyKey: () => 'key-1',
  getTransactionHistory: vi.fn(async () => []),
}));

import { Shop } from '../Shop';

beforeEach(() => {
  localStorage.clear();
  dispatch.mockReset();
  purchase.mockReset();
  auth.user = { id: 'u1' };
  app.state.profile.gems = 250;
  app.state.profile.inventory = {};
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }),
  });
});
afterEach(cleanup);

function view() {
  return render(
    <MemoryRouter initialEntries={['/shop']}>
      <Routes>
        <Route path="/shop" element={<Shop />} />
        <Route path="/explore" element={<p>Explore page</p>} />
        <Route path="/learn" element={<p>Learn page</p>} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
const click = (el: HTMLElement) => act(async () => { fireEvent.click(el); });

describe('Shop screen', () => {
  it('shows the balance, the look and the three sections', () => {
    view();
    expect(screen.getByTestId('shop-balance').textContent).toBe('250');
    expect(screen.getByTestId('shop-look').textContent).toContain('lea_m');
    for (const label of ['Gear', 'Identity', 'Locker']) expect(screen.getByRole('button', { name: label })).toBeTruthy();
    expect(screen.getByText('Streak Freeze')).toBeTruthy();
  });

  it('asks for confirmation before spending, then buys once', async () => {
    purchase.mockResolvedValue({ ok: true, balance: 150, qty: 1 });
    view();
    await click(screen.getByRole('button', { name: /Streak Freeze, details/ }));
    const dialog = screen.getByRole('dialog');
    expect(purchase).not.toHaveBeenCalled();
    expect(within(dialog).getByText('After buying').nextSibling?.textContent).toBe('150');
    await click(within(dialog).getByRole('button', { name: /Buy for 100/ }));
    expect(purchase).toHaveBeenCalledTimes(1);
    expect(purchase).toHaveBeenCalledWith('streak_freeze', 'key-1');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ECONOMY', balance: 150, inventory: { streak_freeze: 1 } });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('shop-notice').textContent).toContain('Streak Freeze');
  });

  it('keeps the dialog open with a plain reason when the purchase fails', async () => {
    const { ShopError } = await import('../../types/shop');
    purchase.mockRejectedValue(new ShopError('network_error'));
    view();
    await click(screen.getByRole('button', { name: /Streak Freeze, details/ }));
    await click(within(screen.getByRole('dialog')).getByRole('button', { name: /Buy for 100/ }));
    expect(within(screen.getByRole('dialog')).getByRole('alert').textContent).toBe('Reconnect to purchase.');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('cannot buy what costs more than the balance, and says how far off it is', async () => {
    view();
    await click(screen.getByRole('button', { name: /Focus Token, details/ }));
    const dialog = screen.getByRole('dialog');
    const buy = within(dialog).getByRole('button', { name: /Not enough gems/ });
    expect((buy as HTMLButtonElement).disabled).toBe(true);
    expect(dialog.textContent).toContain('about 5 more sessions');
  });

  it('shows a locked item with its requirement and a way to advance it', async () => {
    view();
    await click(screen.getByRole('button', { name: 'Identity' }));
    await click(screen.getByRole('button', { name: /Le Renard, details/ }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('3-day streak');
    expect(within(dialog).getByRole('progressbar').getAttribute('aria-valuenow')).toBe('33');
    expect(within(dialog).queryByRole('button', { name: /Buy/ })).toBeNull();
    await click(within(dialog).getByRole('button', { name: /Practise in Learn/ }));
    expect(screen.getByText('Learn page')).toBeTruthy();
  });

  it('counts the collection in the Locker, owned first', async () => {
    app.state.profile.inventory = { avatar_croissant: 1 };
    view();
    await click(screen.getByRole('button', { name: 'Locker' }));
    expect(screen.getByTestId('shop-collection').textContent).toBe('1 of 4 collected');
    await click(screen.getByRole('button', { name: 'Owned' }));
    expect(screen.getByText('Le Croissant')).toBeTruthy();
    expect(screen.queryByText('Le Renard')).toBeNull();
  });

  it('tells a guest to sign in and cannot buy', async () => {
    auth.user = null;
    view();
    expect(screen.getByText(/browsing as a guest/)).toBeTruthy();
    await click(screen.getByRole('button', { name: /Streak Freeze, details/ }));
    const buy = within(screen.getByRole('dialog')).getByRole('button', { name: /Buy for 100/ });
    expect((buy as HTMLButtonElement).disabled).toBe(true);
  });

  it('goes back to Explore', async () => {
    view();
    await click(screen.getByRole('button', { name: 'Back to Explore' }));
    expect(screen.getByText('Explore page')).toBeTruthy();
  });
});
