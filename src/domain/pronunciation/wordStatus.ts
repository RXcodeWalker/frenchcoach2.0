/**
 * Extracted from src/screens/AccentAnalyzer.tsx's statusForAccuracy — same
 * signature, same 90/60 thresholds, same null -> 'good' behavior for that
 * function's own (still route-dead) callers. AccentAnalyzer.tsx itself is
 * not migrated to import this; the extraction just avoids
 * PronunciationHeatMap reinventing the same three-tier logic.
 */
export function statusForAccuracy(accuracyScore: number | null): 'perfect' | 'good' | 'missed' {
  if (accuracyScore === null) return 'good';
  if (accuracyScore >= 90) return 'perfect';
  if (accuracyScore >= 60) return 'good';
  return 'missed';
}
