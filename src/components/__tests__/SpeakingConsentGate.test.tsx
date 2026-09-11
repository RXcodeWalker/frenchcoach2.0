// @vitest-environment jsdom
// Phase 1.6 Part C — SpeakingConsentGate: the mic control renders normally
// unless consentStatus is exactly 'pending'.

import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SpeakingConsentGate } from '../SpeakingConsentGate';

const useAuthMock = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

afterEach(() => {
  cleanup();
  useAuthMock.mockReset();
});

describe('SpeakingConsentGate', () => {
  it('renders children when consentStatus is granted', () => {
    useAuthMock.mockReturnValue({ consentStatus: 'granted' });
    render(
      <SpeakingConsentGate>
        <button data-testid="mic">Record</button>
      </SpeakingConsentGate>,
    );
    expect(screen.getByTestId('mic')).not.toBeNull();
  });

  it('renders children when consentStatus is 13_plus_not_required', () => {
    useAuthMock.mockReturnValue({ consentStatus: '13_plus_not_required' });
    render(
      <SpeakingConsentGate>
        <button data-testid="mic">Record</button>
      </SpeakingConsentGate>,
    );
    expect(screen.getByTestId('mic')).not.toBeNull();
  });

  it('renders children when consentStatus is unknown (still loading / guest)', () => {
    useAuthMock.mockReturnValue({ consentStatus: 'unknown' });
    render(
      <SpeakingConsentGate>
        <button data-testid="mic">Record</button>
      </SpeakingConsentGate>,
    );
    expect(screen.getByTestId('mic')).not.toBeNull();
  });

  it('replaces children with the waiting message when consentStatus is pending', () => {
    useAuthMock.mockReturnValue({ consentStatus: 'pending' });
    render(
      <SpeakingConsentGate>
        <button data-testid="mic">Record</button>
      </SpeakingConsentGate>,
    );
    expect(screen.queryByTestId('mic')).toBeNull();
    expect(screen.getByText(/waiting for your parent\/guardian/i)).not.toBeNull();
  });

  it('renders children again when consentStatus flips from pending to revoked-then-granted flow (granted)', () => {
    useAuthMock.mockReturnValue({ consentStatus: 'granted' });
    render(
      <SpeakingConsentGate>
        <button data-testid="mic">Record</button>
      </SpeakingConsentGate>,
    );
    expect(screen.getByTestId('mic')).not.toBeNull();
  });
});
