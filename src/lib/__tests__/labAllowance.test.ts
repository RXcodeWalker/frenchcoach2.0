import { describe, expect, it } from 'vitest';
import { LabAllowanceError, isLabAllowanceError, labAllowanceFromBody } from '../labAllowance';

describe('labAllowanceFromBody', () => {
  it('recognises the daily cap and the guest backstop, with the limit when given', () => {
    const err = labAllowanceFromBody({ detail: { error: 'daily_quota_reached', limit: 30 } });
    expect(isLabAllowanceError(err)).toBe(true);
    expect((err as LabAllowanceError).limit).toBe(30);
    expect(labAllowanceFromBody({ detail: { error: 'guest_limit_reached' } })).toBeInstanceOf(LabAllowanceError);
  });

  it('leaves a rate limit, an invite refusal and anything else alone', () => {
    expect(labAllowanceFromBody({ error: 'Rate limit exceeded: 20 per 1 minute' })).toBeNull();
    expect(labAllowanceFromBody({ detail: { error: 'invite_not_redeemed' } })).toBeNull();
    expect(labAllowanceFromBody({ detail: 'x' })).toBeNull();
    expect(labAllowanceFromBody(null)).toBeNull();
  });
});
