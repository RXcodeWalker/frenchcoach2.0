/**
 * Extracted from src/screens/AccentAnalyzer.tsx's statusForAccuracy — same
 * signature and 90/60 thresholds. Unlike that (still route-dead) function,
 * null is treated as 'unknown', not 'good' — a skipped word (no accuracy
 * score from Azure) must never render as if it were assessed and correct.
 * AccentAnalyzer.tsx keeps its own private copy and is untouched.
 */
export function statusForAccuracy(accuracyScore: number | null): 'perfect' | 'good' | 'missed' | 'unknown' {
  if (accuracyScore === null) return 'unknown';
  if (accuracyScore >= 90) return 'perfect';
  if (accuracyScore >= 60) return 'good';
  return 'missed';
}
