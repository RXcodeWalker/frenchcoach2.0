// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const rpcMock = vi.fn();
const trackMock = vi.fn();

vi.mock('../../../lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
  supabaseConfigured: true,
}));
vi.mock('../../../services/telemetry/telemetryService', () => ({
  track: (...args: unknown[]) => trackMock(...args),
  captureError: vi.fn(),
}));

import { ContactDialog } from '../ContactDialog';
import { safeRoute, sendFeedback } from '../../../services/contact/sendFeedback';

afterEach(cleanup);
beforeEach(() => {
  rpcMock.mockReset();
  trackMock.mockReset();
});

describe('sendFeedback', () => {
  it('sends a pathname only, never a query or hash (auth links carry tokens)', async () => {
    rpcMock.mockResolvedValue({ error: null });
    await sendFeedback({ kind: 'bug', message: '  It broke  ', route: '/learn?token=abc#access_token=x' });
    const [fn, args] = rpcMock.mock.calls[0];
    expect(fn).toBe('submit_feedback');
    expect(args).toMatchObject({ p_kind: 'bug', p_message: 'It broke', p_route: '/learn', p_contact_email: null });
    expect(safeRoute('?x=1')).toBeUndefined();
  });

  it('maps the server rate limit to rate_limited', async () => {
    rpcMock.mockResolvedValue({ error: { message: 'feedback_rate_limited' } });
    expect(await sendFeedback({ kind: 'idea', message: 'hello' })).toEqual({ ok: false, reason: 'rate_limited' });
  });

  it('drops an implausible reply address instead of failing', async () => {
    rpcMock.mockResolvedValue({ error: null });
    await sendFeedback({ kind: 'idea', message: 'hello', contactEmail: 'not-an-email' });
    expect(rpcMock.mock.calls[0][1].p_contact_email).toBeNull();
  });
});

describe('ContactDialog', () => {
  it('prefills the email, sends, and tracks a content-free count', async () => {
    rpcMock.mockResolvedValue({ error: null });
    render(<ContactDialog open onClose={() => {}} defaultEmail="me@example.com" route="/profile" />);
    const send = screen.getByTestId('contact-send');
    expect((send as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId('contact-email') as HTMLInputElement).value).toBe('me@example.com');

    fireEvent.click(screen.getByTestId('contact-kind-marking'));
    fireEvent.change(screen.getByTestId('contact-message'), { target: { value: 'Q3 was marked wrong' } });
    fireEvent.click(send);

    await waitFor(() => expect(screen.queryByTestId('contact-sent')).not.toBeNull());
    expect(rpcMock.mock.calls[0][1]).toMatchObject({ p_kind: 'marking', p_contact_email: 'me@example.com', p_route: '/profile' });
    expect(trackMock).toHaveBeenCalledWith({ name: 'feedback_sent', props: { kind: 'marking', has_email: true } });
  });

  it('keeps the draft and says so when sending fails', async () => {
    rpcMock.mockResolvedValue({ error: { message: 'boom' } });
    render(<ContactDialog open onClose={() => {}} />);
    fireEvent.change(screen.getByTestId('contact-message'), { target: { value: 'Something broke' } });
    fireEvent.click(screen.getByTestId('contact-send'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('couldn’t be sent'));
    expect((screen.getByTestId('contact-message') as HTMLTextAreaElement).value).toBe('Something broke');
  });
});
