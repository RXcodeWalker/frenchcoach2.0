// @vitest-environment jsdom
// Reliability plan §2.5 — AuthContext's getSession().then() had no .catch(),
// so a rejected getSession() left `loading` stuck true forever.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

const getSessionMock = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => getSessionMock(),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
  supabaseConfigured: true,
}));

import { AuthProvider, useAuth } from '../AuthContext';

function LoadingProbe() {
  const { loading } = useAuth();
  return <div data-testid="loading">{String(loading)}</div>;
}

afterEach(() => {
  cleanup();
  getSessionMock.mockReset();
});

describe('AuthProvider — getSession() rejection', () => {
  it('clears loading instead of hanging forever when getSession() rejects', async () => {
    getSessionMock.mockRejectedValue(new Error('network down'));

    render(
      <AuthProvider>
        <LoadingProbe />
      </AuthProvider>,
    );

    expect(screen.getByTestId('loading').textContent).toBe('true');
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
  });
});
