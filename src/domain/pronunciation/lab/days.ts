/**
 * Pronunciation Lab — calendar days (pronunciation-lab plan §5.2). Pure.
 */

/** The learner's local calendar day, YYYY-MM-DD (a "day" for "≥ 2 days" is the day they sat at). */
export function localDay(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const isDay = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
