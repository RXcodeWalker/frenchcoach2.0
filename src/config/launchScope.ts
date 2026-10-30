/**
 * Launch scope: the five core screens (Home, Learn, Exam, Progress, Profile)
 * plus Explore, the hub for every other mode, are in the nav. A path listed
 * below stays in the codebase but is hidden: visiting it redirects to Home
 * (MainLayout).
 *
 * Explore was brought back on 2026-10-30 together with everything it (or a
 * screen it opens) links to, so no Explore tile lands on a hidden path. To
 * hide a feature again, add its prefix here and remove its Explore tile.
 * Set CORE_ONLY to false to restore every route at once.
 */
export const CORE_ONLY = true;

// The Junior track is intentionally not listed: an account already on it gets
// JuniorHome at `/` and needs `/junior/*`. New learners just can't choose it.
const HIDDEN_PATH_PREFIXES = [
  '/about',
  '/study-groups',
];

export function isHiddenPath(pathname: string): boolean {
  if (!CORE_ONLY) return false;
  return HIDDEN_PATH_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Whether new learners may pick the Junior track (Onboarding, Profile). */
export const JUNIOR_TRACK_SELECTABLE = !CORE_ONLY;
