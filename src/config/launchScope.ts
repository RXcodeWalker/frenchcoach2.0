/**
 * Launch scope: the public launch ships one path — Home, Learn, Exam,
 * Progress, Profile. Everything else stays in the codebase but is hidden:
 * no nav entry, and visiting its URL redirects to Home (MainLayout).
 *
 * To bring a feature back, remove its path here and re-add its nav entry.
 * Set CORE_ONLY to false to restore every route at once.
 */
export const CORE_ONLY = true;

// The Junior track is intentionally not listed: an account already on it gets
// JuniorHome at `/` and needs `/junior/*`. New learners just can't choose it.
const HIDDEN_PATH_PREFIXES = [
  '/explore',
  '/shop',
  '/about',
  '/rankings',
  '/study-groups',
  '/accent-analyzer',
  '/listening-mode',
  '/daily-challenge',
  '/league',
  '/weakness-analysis',
  '/sentence-rebuilder',
  '/rapid-fire',
  '/speed-speaking',
  '/friend-challenges',
  '/duel',
  '/roadmap',
  '/fluency-heatmap',
  '/story-mode',
  '/scenario',
  '/scenario-architect',
  '/word-drop',
  '/mastery',
  '/boss-battle',
  '/emoji-master',
  '/mystery-box',
  '/survival',
  '/speaking-arena',
  '/challenges',
  '/daily-news',
];

export function isHiddenPath(pathname: string): boolean {
  if (!CORE_ONLY) return false;
  return HIDDEN_PATH_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Whether new learners may pick the Junior track (Onboarding, Profile). */
export const JUNIOR_TRACK_SELECTABLE = !CORE_ONLY;
