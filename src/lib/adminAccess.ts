/**
 * Admin = the `admin` role in app_metadata AND an allow-listed email. The role
 * alone is never enough (mirrors backend `lib/auth.py` and SQL `is_admin()`).
 * This is UX gating only; the backend and RLS are the real enforcement.
 */
export const ADMIN_EMAILS: readonly string[] = ['omjhamvar29@gmail.com'];

export function isAdminUser(
  user: { email?: string | null; app_metadata?: unknown } | null | undefined,
): boolean {
  if (!user) return false;
  const role = (user.app_metadata as { role?: string } | undefined)?.role;
  const email = (user.email ?? '').trim().toLowerCase();
  return role === 'admin' && ADMIN_EMAILS.includes(email);
}
