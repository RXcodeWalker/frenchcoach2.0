// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const TOKEN = 'c'.repeat(64);
const list = vi.fn();
const create = vi.fn();
const revoke = vi.fn();
vi.mock('../parentLinkService', async () => {
  const actual = await vi.importActual<typeof import('../parentLinkService')>('../parentLinkService');
  return { ...actual, listParentLinks: () => list(), createParentLink: (l: string) => create(l), revokeParentLink: (id: string) => revoke(id) };
});

import { ParentLinksCard } from '../ParentLinksCard';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('ParentLinksCard', () => {
  it('makes a link, shows it once, and lists when each link was opened', async () => {
    list.mockResolvedValue([{ id: 'old', label: 'Dad', createdAt: '2026-10-01T00:00:00Z', lastViewedAt: '2026-11-02T00:00:00Z', viewCount: 3 }]);
    create.mockResolvedValue({ id: 'new', token: TOKEN, label: 'Mum', createdAt: '2026-11-04T00:00:00Z', lastViewedAt: null, viewCount: 0 });
    render(<ParentLinksCard />);

    expect(await screen.findByText('Dad')).toBeTruthy();
    expect(screen.getByText(/3 views/)).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('e.g. Mum'), { target: { value: 'Mum' } });
    fireEvent.click(screen.getByRole('button', { name: 'Make a parent link' }));

    const input = (await screen.findByLabelText('Parent link')) as HTMLInputElement;
    expect(create).toHaveBeenCalledWith('Mum');
    expect(input.value).toBe(`${window.location.origin}/parent#${TOKEN}`);
    expect(screen.getByText(/Not opened yet/)).toBeTruthy();
  });

  it('asks before turning a link off, then removes it', async () => {
    list.mockResolvedValue([{ id: 'old', label: 'Dad', createdAt: '2026-10-01T00:00:00Z', lastViewedAt: null, viewCount: 0 }]);
    revoke.mockResolvedValue(undefined);
    render(<ParentLinksCard />);
    await screen.findByText('Dad');

    fireEvent.click(screen.getByRole('button', { name: 'Turn off' }));
    expect(revoke).not.toHaveBeenCalled();
    const offs = screen.getAllByRole('button', { name: 'Turn off' });
    fireEvent.click(offs[offs.length - 1]);
    await waitFor(() => expect(screen.queryByText('Dad')).toBeNull());
    expect(revoke).toHaveBeenCalledWith('old');
  });

  it('hides the form at 5 links', async () => {
    list.mockResolvedValue(Array.from({ length: 5 }, (_, i) => ({ id: `l${i}`, label: `L${i}`, createdAt: '2026-10-01T00:00:00Z', lastViewedAt: null, viewCount: 0 })));
    render(<ParentLinksCard />);
    await screen.findByText('L0');
    expect(screen.queryByRole('button', { name: 'Make a parent link' })).toBeNull();
  });
});

describe('ParentLinksCard — weekly email link', () => {
  it('names the Sunday email link and leaves it out of the 5-link cap', async () => {
    list.mockResolvedValue([
      { id: 'w', label: 'Weekly email', source: 'weekly_email', createdAt: '2026-10-01T00:00:00Z', lastViewedAt: '2026-11-02T00:00:00Z', viewCount: 2 },
      ...Array.from({ length: 4 }, (_, i) => ({ id: `l${i}`, label: `L${i}`, source: 'manual', createdAt: '2026-10-01T00:00:00Z', lastViewedAt: null, viewCount: 0 })),
    ]);
    render(<ParentLinksCard />);
    expect(await screen.findByText('Weekly email to your parent')).toBeTruthy();
    expect(screen.getByText(/Opened from the Sunday email/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Make a parent link' })).toBeTruthy();
  });
});
