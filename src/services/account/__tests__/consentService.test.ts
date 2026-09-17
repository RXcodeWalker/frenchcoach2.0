// @vitest-environment jsdom
// Phase 1.6 Part C — consentService RPC wrappers. Mocks only the Supabase
// client boundary, per dailyChallengeService.test.ts's precedent.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const rpcMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    auth: { getSession: () => getSessionMock() },
  },
  supabaseConfigured: true,
}));

import {
  setAgeBand,
  correctAgeBand,
  requestGuardianConsent,
  grantGuardianConsent,
  revokeGuardianConsent,
  buildGuardianConsentLink,
  sendGuardianConsentEmail,
  ConsentError,
} from '../consentService';

beforeEach(() => {
  rpcMock.mockReset();
  getSessionMock.mockReset();
  getSessionMock.mockResolvedValue({ data: { session: null } });
});

describe('setAgeBand', () => {
  it('calls set_age_band with the chosen band', async () => {
    rpcMock.mockResolvedValueOnce({ data: { ok: true }, error: null });
    await setAgeBand('under_13');
    expect(rpcMock).toHaveBeenCalledWith('set_age_band', { p_band: 'under_13' });
  });

  it('maps a known RPC error code to a typed ConsentError', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'age_band_already_set' } });
    await expect(setAgeBand('13_plus')).rejects.toMatchObject({
      name: 'ConsentError',
      code: 'age_band_already_set',
    });
  });

  it('maps an unrecognized error message to "unknown"', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'something else broke' } });
    const err = await setAgeBand('13_plus').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ConsentError);
    expect((err as ConsentError).code).toBe('unknown');
  });
});

describe('correctAgeBand', () => {
  it('calls correct_age_band with the chosen band', async () => {
    rpcMock.mockResolvedValueOnce({ data: { ok: true }, error: null });
    await correctAgeBand('13_plus');
    expect(rpcMock).toHaveBeenCalledWith('correct_age_band', { p_band: '13_plus' });
  });

  it('maps age_band_unchanged to a typed ConsentError', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'age_band_unchanged' } });
    await expect(correctAgeBand('under_13')).rejects.toMatchObject({
      name: 'ConsentError',
      code: 'age_band_unchanged',
    });
  });
});

describe('requestGuardianConsent', () => {
  it('returns the consent id and raw token from the RPC', async () => {
    rpcMock.mockResolvedValueOnce({ data: { consent_id: 'c1', token: 'abc123' }, error: null });
    const result = await requestGuardianConsent('parent@example.com');
    expect(rpcMock).toHaveBeenCalledWith('request_guardian_consent', { p_guardian_email: 'parent@example.com' });
    expect(result).toEqual({ consentId: 'c1', token: 'abc123' });
  });

  it('maps not_under_13 to a typed error', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'not_under_13' } });
    await expect(requestGuardianConsent('parent@example.com')).rejects.toMatchObject({ code: 'not_under_13' });
  });
});

describe('grantGuardianConsent / revokeGuardianConsent', () => {
  it('grant returns the child_user_id on success', async () => {
    rpcMock.mockResolvedValueOnce({ data: { child_user_id: 'child-1' }, error: null });
    const result = await grantGuardianConsent('tok', 'Parent');
    expect(rpcMock).toHaveBeenCalledWith('grant_guardian_consent', { p_token: 'tok', p_relationship: 'Parent' });
    expect(result).toEqual({ childUserId: 'child-1' });
  });

  it('grant maps an expired/used token to invalid_or_used_token', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'invalid_or_used_token' } });
    await expect(grantGuardianConsent('tok', 'Parent')).rejects.toMatchObject({
      name: 'GuardianActionError',
      code: 'invalid_or_used_token',
    });
  });

  it('revoke calls the RPC with the child id and resolves on success', async () => {
    rpcMock.mockResolvedValueOnce({ data: { ok: true }, error: null });
    await expect(revokeGuardianConsent('child-1')).resolves.toBeUndefined();
    expect(rpcMock).toHaveBeenCalledWith('revoke_guardian_consent', { p_child_user_id: 'child-1' });
  });

  it('revoke maps no_active_consent to a typed error', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'no_active_consent' } });
    await expect(revokeGuardianConsent('child-1')).rejects.toMatchObject({
      code: 'no_active_consent',
    });
  });
});

describe('buildGuardianConsentLink', () => {
  it('builds a same-origin /guardian-consent URL carrying the token', () => {
    const link = buildGuardianConsentLink('tok en');
    expect(link).toContain('/guardian-consent?token=');
    expect(link).toContain(encodeURIComponent('tok en'));
  });
});

describe('sendGuardianConsentEmail', () => {
  it('returns false with no active session, never calls fetch', async () => {
    getSessionMock.mockResolvedValueOnce({ data: { session: null } });
    const sent = await sendGuardianConsentEmail('parent@example.com', 'tok');
    expect(sent).toBe(false);
  });
});
