import { afterEach, describe, expect, it, vi } from 'vitest';

const token = { value: 'tok' as string | null };
vi.mock('../../../lib/authToken', () => ({ getAccessToken: async () => token.value }));

import {
  BillingError,
  cancelSubscriptionsForDeletion,
  formatPrice,
  getBillingStatus,
  startCheckout,
} from '../billingClient';

const fetchMock = vi.fn();

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  token.value = 'tok';
});

function respond(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce({ ok: status < 300, status, json: async () => body });
  vi.stubGlobal('fetch', fetchMock);
}

describe('billingClient', () => {
  it('reads status with the token when signed in, without it as a guest', async () => {
    respond(200, { configured: true, plans: ['monthly'], premium: false, subscription: null, limits: {}, prices: {} });
    expect((await getBillingStatus())?.configured).toBe(true);
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer tok' });
    token.value = null;
    respond(200, { configured: false, premium: false });
    expect((await getBillingStatus())?.plans).toEqual([]);
    expect(fetchMock.mock.calls[1][1].headers).toEqual({});
  });

  it('status is null when unreadable', async () => {
    respond(503, {});
    expect(await getBillingStatus()).toBeNull();
  });

  it('checkout sends the plan and navigates to the URL Stripe gave', async () => {
    respond(200, { url: 'https://checkout.stripe.com/c/pay/x' });
    const go = vi.fn();
    await startCheckout('yearly', go);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ plan: 'yearly' });
    expect(go).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/x');
  });

  it('checkout needs a signed-in account and maps server refusals', async () => {
    token.value = null;
    await expect(startCheckout('monthly', vi.fn())).rejects.toMatchObject({ code: 'sign_in_required' });
    token.value = 'tok';
    respond(409, { detail: { error: 'already_premium' } });
    await expect(startCheckout('monthly', vi.fn())).rejects.toMatchObject({ code: 'already_premium' });
    respond(503, { detail: { error: 'billing_not_configured' } });
    await expect(startCheckout('monthly', vi.fn())).rejects.toBeInstanceOf(BillingError);
  });

  it('cancel-for-deletion treats "billing off" as nothing to cancel', async () => {
    respond(503, { detail: { error: 'billing_not_configured' } });
    await expect(cancelSubscriptionsForDeletion()).resolves.toBeUndefined();
    respond(502, { detail: { error: 'payment_provider_error' } });
    await expect(cancelSubscriptionsForDeletion()).rejects.toMatchObject({ code: 'provider_error' });
  });

  it('formats Stripe amounts in the smallest currency unit', () => {
    expect(formatPrice({ amount: 499, currency: 'gbp', interval: 'month' }, 'en-GB')).toBe('£4.99');
    expect(formatPrice({ amount: 500, currency: 'jpy', interval: 'month' }, 'en-GB')).toBe('JP¥500');
    expect(formatPrice({ amount: null, currency: 'gbp', interval: null })).toBeNull();
    expect(formatPrice(undefined)).toBeNull();
  });
});
