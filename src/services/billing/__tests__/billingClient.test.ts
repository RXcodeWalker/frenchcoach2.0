import { afterEach, describe, expect, it, vi } from 'vitest';

const token = { value: 'tok' as string | null };
vi.mock('../../../lib/authToken', () => ({ getAccessToken: async () => token.value }));

import {
  BillingError,
  cancelRazorpaySubscription,
  cancelSubscriptionsForDeletion,
  defaultProvider,
  formatPrice,
  getBillingStatus,
  startCheckout,
  startRazorpayCheckout,
  type RazorpayConstructor,
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
    expect((await getBillingStatus())?.providers).toEqual([]);
    expect(fetchMock.mock.calls[1][1].headers).toEqual({});
  });

  it('reads every configured provider, and treats an older backend as Stripe only', async () => {
    respond(200, {
      configured: true, premium: true, limits: {}, plans: [], prices: {},
      providers: [
        { id: 'razorpay', plans: ['monthly'], prices: { monthly: { amount: 19900, currency: 'INR', interval: 'month' } } },
        { id: 'paypal', plans: ['monthly'], prices: {} },
        { id: 'stripe', plans: [], prices: {} },
      ],
      subscription: { provider: 'razorpay', status: 'active', plan: 'monthly', currentPeriodEnd: null, cancelAtPeriodEnd: false },
    });
    const both = await getBillingStatus();
    expect(both?.providers.map((p) => p.id)).toEqual(['razorpay']);
    expect(both?.subscription?.provider).toBe('razorpay');

    respond(200, {
      configured: true, premium: true, limits: {}, plans: ['monthly', 'yearly'], prices: {},
      subscription: { status: 'active', plan: 'monthly', currentPeriodEnd: null, cancelAtPeriodEnd: false },
    });
    const old = await getBillingStatus();
    expect(old?.providers).toEqual([{ id: 'stripe', plans: ['monthly', 'yearly'], prices: {} }]);
    expect(old?.subscription?.provider).toBe('stripe');
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

  describe('Razorpay', () => {
    function fakeRazorpay(outcome: 'paid' | 'dismissed') {
      const opened: Array<Record<string, unknown>> = [];
      const Ctor = class {
        constructor(private options: { handler: (r: unknown) => void; modal: { ondismiss: () => void } } & Record<string, unknown>) {
          opened.push(options);
        }
        open() {
          if (outcome === 'paid') this.options.handler({ razorpay_payment_id: 'pay_1', razorpay_subscription_id: 'sub_1', razorpay_signature: 'sig' });
          else this.options.modal.ondismiss();
        }
        on() {}
      } as unknown as RazorpayConstructor;
      return { load: async () => Ctor, opened };
    }

    it('creates the subscription, opens Razorpay with the public key, then asks the server to re-read it', async () => {
      respond(200, { keyId: 'rzp_test_key', subscriptionId: 'sub_RzpA1b2C3d' });
      respond(200, { premium: true, subscription: null });
      const rzp = fakeRazorpay('paid');
      await expect(startRazorpayCheckout('yearly', rzp.load)).resolves.toEqual({ premium: true, subscription: null });
      expect(fetchMock.mock.calls[0][0]).toContain('/api/billing/razorpay/subscribe');
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ plan: 'yearly' });
      expect(rzp.opened[0]).toMatchObject({ key: 'rzp_test_key', subscription_id: 'sub_RzpA1b2C3d' });
      // Only the subscription id goes back — never the browser's payment id or signature.
      expect(fetchMock.mock.calls[1][0]).toContain('/api/billing/razorpay/sync');
      expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ subscriptionId: 'sub_RzpA1b2C3d' });
    });

    it('closing the window is "cancelled" and syncs nothing', async () => {
      respond(200, { keyId: 'rzp_test_key', subscriptionId: 'sub_RzpA1b2C3d' });
      await expect(startRazorpayCheckout('monthly', fakeRazorpay('dismissed').load)).rejects.toMatchObject({ code: 'checkout_cancelled' });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('a failed re-read after paying is not an error (the webhook switches Premium on)', async () => {
      respond(200, { keyId: 'rzp_test_key', subscriptionId: 'sub_RzpA1b2C3d' });
      respond(502, { detail: { error: 'payment_provider_error' } });
      await expect(startRazorpayCheckout('monthly', fakeRazorpay('paid').load)).resolves.toEqual({ premium: false });
    });

    it('a script that cannot load is "checkout unavailable"', async () => {
      respond(200, { keyId: 'rzp_test_key', subscriptionId: 'sub_RzpA1b2C3d' });
      const load = async (): Promise<RazorpayConstructor> => {
        throw new BillingError('checkout_unavailable');
      };
      await expect(startRazorpayCheckout('monthly', load)).rejects.toMatchObject({ code: 'checkout_unavailable' });
    });

    it('cancel posts to the Razorpay cancel route', async () => {
      respond(200, { premium: true });
      await cancelRazorpaySubscription();
      expect(fetchMock.mock.calls[0][0]).toContain('/api/billing/razorpay/cancel');
    });

    it('offers Razorpay first in India, Stripe elsewhere, and whatever exists otherwise', () => {
      const both = [
        { id: 'stripe' as const, plans: ['monthly' as const], prices: {} },
        { id: 'razorpay' as const, plans: ['monthly' as const], prices: {} },
      ];
      expect(defaultProvider(both, 'Asia/Kolkata')).toBe('razorpay');
      expect(defaultProvider(both, 'Asia/Calcutta')).toBe('razorpay');
      expect(defaultProvider(both, 'Europe/London')).toBe('stripe');
      expect(defaultProvider([both[1]], 'Europe/London')).toBe('razorpay');
      expect(defaultProvider([], 'Asia/Kolkata')).toBeNull();
    });

    it('formats rupees from paise', () => {
      expect(formatPrice({ amount: 19900, currency: 'INR', interval: 'month' }, 'en-IN')).toBe('₹199');
      expect(formatPrice({ amount: 400, currency: 'gbp', interval: 'month' }, 'en-GB')).toBe('£4');
    });
  });
});
