// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react';

const load = vi.fn();
const save = vi.fn();
vi.mock('../../../services/notifications/emailReportSettings', async (orig) => ({
  ...(await orig<typeof import('../../../services/notifications/emailReportSettings')>()),
  loadEmailReportSettings: (...a: unknown[]) => load(...a),
  saveEmailReportSettings: (...a: unknown[]) => save(...a),
}));

import { WeeklyEmailSettings } from '../WeeklyEmailSettings';

beforeEach(() => {
  load.mockResolvedValue({ weeklyReport: true, parentEmail: null });
  save.mockResolvedValue(true);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('WeeklyEmailSettings', () => {
  it('shows the weekly email on by default and turns it off only after the save lands', async () => {
    render(<WeeklyEmailSettings userId="u1" accountEmail="me@example.com" />);
    const toggle = await screen.findByTestId('weekly-email-toggle');
    await waitFor(() => expect((toggle as HTMLButtonElement).disabled).toBe(false));
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('false'));
    expect(save).toHaveBeenCalledWith('u1', { weeklyReport: false, parentEmail: null });
  });

  it('keeps the old value when the save fails', async () => {
    save.mockResolvedValue(false);
    render(<WeeklyEmailSettings userId="u1" accountEmail={null} />);
    const toggle = await screen.findByTestId('weekly-email-toggle');
    await waitFor(() => expect((toggle as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(toggle);
    expect((await screen.findByRole('alert')).textContent).toContain("Couldn't save");
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('adds a parent copy, refusing a bad or own address', async () => {
    render(<WeeklyEmailSettings userId="u1" accountEmail="me@example.com" />);
    await waitFor(() => expect(screen.getByTestId('weekly-email-add-parent').tagName).toBe('BUTTON'));
    fireEvent.click(screen.getByTestId('weekly-email-add-parent'));
    const input = screen.getByLabelText(/short summary each Sunday/);
    fireEvent.change(input, { target: { value: 'ME@example.com' } });
    fireEvent.submit(input.closest('form')!);
    expect((await screen.findByRole('alert')).textContent).toContain('your own address');
    fireEvent.change(input, { target: { value: ' Mum@Example.com ' } });
    fireEvent.submit(input.closest('form')!);
    expect(await screen.findByText('mum@example.com')).toBeTruthy();
    expect(save).toHaveBeenLastCalledWith('u1', { weeklyReport: true, parentEmail: 'mum@example.com' });
  });

  it('renders nothing when settings cannot be loaded', async () => {
    load.mockResolvedValue(null);
    const { container } = render(<WeeklyEmailSettings userId="u1" accountEmail={null} />);
    await waitFor(() => expect(load).toHaveBeenCalled());
    await waitFor(() => expect(container.innerHTML).toBe(''));
  });
});
