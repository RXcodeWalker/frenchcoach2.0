/**
 * Which speaking segment is today's featured one — docs/systems/daily-news.md §7.
 *
 * Pure. The featured segment depends on the weekday, so the week has a shape
 * (Mon/Thu L'interview, Tue/Sat Pour ou contre, Wed Le journaliste, Fri Et
 * après ?). Segments not built yet fall back to one that is (`FALLBACK`), so a
 * day is never empty. The story's other segments stay open as practice.
 */
export type SegmentId = 'interview' | 'debate';

/** Every segment the show plans, built or not. */
export type PlannedSegment = SegmentId | 'journalist' | 'predict';

/** getDay() index (0 = Sunday) → that day's featured segment. */
export const FEATURED_BY_WEEKDAY: Record<number, PlannedSegment> = {
  0: 'interview',
  1: 'interview',
  2: 'debate',
  3: 'journalist',
  4: 'interview',
  5: 'predict',
  6: 'debate',
};

/** Planned segments not built yet → the built segment that stands in (daily-news §7). */
const FALLBACK: Record<Exclude<PlannedSegment, SegmentId>, SegmentId> = {
  journalist: 'interview',
  predict: 'debate',
};

export const SEGMENT_ORDER: readonly SegmentId[] = ['interview', 'debate'];

export const SEGMENT_INFO: Record<SegmentId, { title: string; skill: string; turns: number }> = {
  interview: { title: "L'interview", skill: 'Answer in role, in the present, past and future', turns: 3 },
  debate: { title: 'Pour ou contre', skill: 'Give an opinion with a reason, then argue the other side', turns: 2 },
};

/** Day of the week for a 'YYYY-MM-DD' local day (0 = Sunday). */
export function weekdayOf(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function featuredSegment(day: string): SegmentId {
  const planned = FEATURED_BY_WEEKDAY[weekdayOf(day)];
  return planned === 'interview' || planned === 'debate' ? planned : FALLBACK[planned];
}

/** The story's other segments, playable as practice once the featured one is done. */
export function practiceSegments(featured: SegmentId): SegmentId[] {
  return SEGMENT_ORDER.filter(s => s !== featured);
}

/**
 * The show's participation score, 0–10, stored as Session.score and never
 * shown on the news screen (daily-news §4, §8): it rewards taking part — the
 * Intox ou info round and the turns answered — never the quality of the French.
 */
export function showScore(intoxRight: boolean, answered: number, expected: number): number {
  const turns = expected > 0 ? Math.min(1, answered / expected) : 0;
  return Math.round((0.3 * (intoxRight ? 1 : 0) + 0.7 * turns) * 100) / 10;
}
