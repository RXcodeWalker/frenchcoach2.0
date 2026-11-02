import { describe, expect, it } from 'vitest';
import { isAdminUser } from '../adminAccess';

const admin = { app_metadata: { role: 'admin' } };

describe('isAdminUser', () => {
  it('accepts the owner with the admin role (case-insensitive)', () => {
    expect(isAdminUser({ ...admin, email: 'omjhamvar29@gmail.com' })).toBe(true);
    expect(isAdminUser({ ...admin, email: 'OmJhamvar29@Gmail.com' })).toBe(true);
  });
  it('rejects the admin role on any other email', () => {
    expect(isAdminUser({ ...admin, email: 'jhamvar@gmail.com' })).toBe(false);
  });
  it('rejects the owner without the role, a missing email, and no user', () => {
    expect(isAdminUser({ email: 'omjhamvar29@gmail.com', app_metadata: {} })).toBe(false);
    expect(isAdminUser(admin)).toBe(false);
    expect(isAdminUser(null)).toBe(false);
  });
});
