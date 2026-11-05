// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { BillingStatus } from '../../services/billing/billingClient';

const auth = { user: null as null | { id: string } };
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../components/TopContextBar', () => ({ TopContextBar: ({ title }: { title: string }) => <h1>{title}</h1> }));

const billing = {
  status: null as BillingStatus | null,
  getBillingStatus: vi.fn(async () => billing.status),
  startCheckout: vi.fn<(plan: string) => Promise<void>>(async () => undefined),
  openBillingPortal: vi.fn(async () => undefined),
  syncCheckout: vi.fn<(id: string) => Promise<{ premium: boolean }>>(async () => ({ premium: true })),
  startRazorpayCheckout: vi.fn<(plan: string) => Promise<{ premium: boolean }>>(async () => ({ premium: true })),
  cancelRazorpaySubscription: vi.fn(async () => undefined),
};
vi.mock('../../services/billing/billingClient', async (orig) => {
  const real = await orig<typeof import('../../services/billing/billingClient')>();
  return {
    ...real,
    getBillingStatus: () => billing.getBillingStatus(),
    startCheckout: (plan: string) => billing.startCheckout(plan),
    openBillingPortal: () => billing.openBillingPortal(),
    syncCheckout: (id: string) => billing.syncCheckout(id),
    startRazorpayCheckout: (plan: string) => billing.startRazorpayCheckout(plan),
    cancelRazorpaySubscription: () => billing.cancelRazorpaySubscription(),
    // Pinned so the tests do not depend on the machine's time zone.
    defaultProvider: (providers: BillingStatus['providers']) => providers[0]?.id ?? null,
  };
});

import { Premium } from '../Premium';

const LIMITS: BillingStatus['limits'] = {
  learn_answer: { free: 3, premium: 30 },
  exam_attempt: { free: 1, premium: 1 },
  pronunciation_lab: { free: 30, premium: 60 },
};

const STRIPE: BillingStatus['providers'][number] = {
  id: 'stripe',
  plans: ['monthly', 'yearly'],
  prices: { monthly: { amount: 499, currency: 'gbp', interval: 'month' }, yearly: { amount: 3999, currency: 'gbp', interval: 'year' } },
};
const RAZORPAY: BillingStatus['providers'][number] = {
  id: 'razorpay',
  plans: ['monthly'],
  prices: { monthly: { amount: 19900, currency: 'INR', interval: 'month' } },
};

function status(over: Partial<BillingStatus> = {}): BillingStatus {
  return {
    configured: true,
    providers: [STRIPE],
    premium: false,
    subscription: null,
    limits: LIMITS,
    ...over,
  };
}

function view(url = '/premium') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Premium />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  auth.user = null;
  billing.status = null;
  vi.clearAllMocks();
});

describe('Premium screen', () => {
  it('shows free vs Premium limits from the server, with the weekly free exam', async () => {
    billing.status = status();
    view();
    const table = await screen.findByTestId('premium-limits');
    expect(table.textContent).toContain('3 a day');
    expect(table.textContent).toContain('30 a day');
    expect(table.textContent).toContain('1 a week');
    expect(screen.getByText(/never changes how your answers are marked/)).toBeTruthy();
  });

  it('a guest is asked to sign in, never sent to checkout', async () => {
    billing.status = status();
    view();
    expect((await screen.findByTestId('premium-sign-in')).getAttribute('href')).toBe('/login');
    expect(screen.queryByTestId('premium-subscribe')).toBeNull();
  });

  it('a signed-in learner picks a plan and goes to Stripe', async () => {
    auth.user = { id: 'u1' };
    billing.status = status();
    view();
    expect((await screen.findByText(/£39\.99/)).textContent).toContain('/ year');
    fireEvent.click(screen.getByTestId('premium-plan-yearly'));
    fireEvent.click(screen.getByTestId('premium-subscribe'));
    await waitFor(() => expect(billing.startCheckout).toHaveBeenCalledWith('yearly'));
  });

  it('a subscriber sees their plan and can manage it', async () => {
    auth.user = { id: 'u1' };
    billing.status = status({
      premium: true,
      subscription: { provider: 'stripe', status: 'active', plan: 'monthly', currentPeriodEnd: '2030-03-17T00:00:00Z', cancelAtPeriodEnd: true },
    });
    view();
    expect(await screen.findByText(/Premium · Monthly/)).toBeTruthy();
    expect(screen.getByText(/Ends on/)).toBeTruthy();
    expect(screen.queryByTestId('premium-subscribe')).toBeNull();
    fireEvent.click(screen.getByTestId('premium-manage'));
    await waitFor(() => expect(billing.openBillingPortal).toHaveBeenCalled());
  });

  it('a failed card payment says how to keep Premium', async () => {
    auth.user = { id: 'u1' };
    billing.status = status({ premium: true, subscription: { provider: 'stripe', status: 'past_due', plan: 'monthly', currentPeriodEnd: null, cancelAtPeriodEnd: false } });
    view();
    expect(await screen.findByText(/last payment didn't go through/)).toBeTruthy();
  });

  it('shows "coming soon" while Stripe is not configured', async () => {
    billing.status = status({ configured: false, providers: [] });
    view();
    expect(await screen.findByText('Premium is coming soon.')).toBeTruthy();
    expect(screen.queryByTestId('premium-subscribe')).toBeNull();
  });

  it('confirms the subscription when Stripe sends the learner back', async () => {
    auth.user = { id: 'u1' };
    billing.status = status({ premium: true });
    view('/premium?checkout=success&session_id=cs_test_1');
    expect(await screen.findByText(/You're Premium now/)).toBeTruthy();
    expect(billing.syncCheckout).toHaveBeenCalledWith('cs_test_1');
  });

  it('a cancelled checkout says nothing was taken', async () => {
    billing.status = status();
    view('/premium?checkout=cancelled');
    expect(await screen.findByText(/No payment was taken/)).toBeTruthy();
  });

  describe('with Razorpay', () => {
    it('offers both ways to pay and uses each one\'s own plans and prices', async () => {
      auth.user = { id: 'u1' };
      billing.status = status({ providers: [RAZORPAY, STRIPE] });
      view();
      expect(await screen.findByText('UPI & Indian cards')).toBeTruthy();
      expect(screen.getByText(/₹199/)).toBeTruthy();
      expect(screen.queryByTestId('premium-plan-yearly')).toBeNull(); // Razorpay has monthly only here
      fireEvent.click(screen.getByTestId('premium-provider-stripe'));
      expect(await screen.findByText(/£39\.99/)).toBeTruthy();
      fireEvent.click(screen.getByTestId('premium-plan-yearly'));
      fireEvent.click(screen.getByTestId('premium-provider-razorpay'));
      // Yearly does not exist under Razorpay, so the monthly plan is what is bought.
      fireEvent.click(screen.getByTestId('premium-subscribe'));
      await waitFor(() => expect(billing.startRazorpayCheckout).toHaveBeenCalledWith('monthly'));
      expect(billing.startCheckout).not.toHaveBeenCalled();
      expect(await screen.findByText(/You're Premium now/)).toBeTruthy();
    });

    it('closing the Razorpay window says nothing was taken', async () => {
      auth.user = { id: 'u1' };
      billing.status = status({ providers: [RAZORPAY] });
      const { BillingError } = await import('../../services/billing/billingClient');
      billing.startRazorpayCheckout.mockRejectedValueOnce(new BillingError('checkout_cancelled'));
      view();
      expect(screen.queryByTestId('premium-provider-razorpay')).toBeNull(); // one provider: no choice shown
      fireEvent.click(await screen.findByTestId('premium-subscribe'));
      expect(await screen.findByText(/No payment was taken/)).toBeTruthy();
    });

    it('a Razorpay subscriber cancels here (there is no portal), after confirming', async () => {
      auth.user = { id: 'u1' };
      billing.status = status({
        providers: [RAZORPAY],
        premium: true,
        subscription: { provider: 'razorpay', status: 'active', plan: 'monthly', currentPeriodEnd: '2030-03-17T00:00:00Z', cancelAtPeriodEnd: false },
      });
      view();
      expect(await screen.findByText(/Renews on/)).toBeTruthy();
      expect(screen.queryByTestId('premium-manage')).toBeNull();
      fireEvent.click(screen.getByTestId('premium-stop-renewing'));
      expect(await screen.findByText(/You won't be charged again/)).toBeTruthy();
      fireEvent.click(screen.getByTestId('premium-confirm-stop'));
      await waitFor(() => expect(billing.cancelRazorpaySubscription).toHaveBeenCalled());
      expect(billing.openBillingPortal).not.toHaveBeenCalled();
    });

    it('a Razorpay renewal that failed says Razorpay is retrying', async () => {
      auth.user = { id: 'u1' };
      billing.status = status({
        providers: [RAZORPAY],
        premium: true,
        subscription: { provider: 'razorpay', status: 'pending', plan: 'monthly', currentPeriodEnd: null, cancelAtPeriodEnd: false },
      });
      view();
      expect(await screen.findByText(/Razorpay will try again/)).toBeTruthy();
    });
  });
});
