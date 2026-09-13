/** Rejects anything but an internal, single-leading-slash path — `returnTo` is
 * attacker-reachable via a crafted URL, not just app-generated (Phase 4 plan §4.7). */
export function isSafeReturnTo(path: string | null): path is string {
  if (!path) return false;
  if (!path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  if (path.startsWith('/\\')) return false;
  return true;
}
