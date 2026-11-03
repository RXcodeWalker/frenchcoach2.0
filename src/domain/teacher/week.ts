/**
 * Week boundaries for the teacher dashboard: Monday 00:00 → next Monday 00:00 in the
 * class's own time zone (classes.timezone), returned as real instants. Pure.
 */

/** The wall-clock parts of `instant` in `timeZone`. */
function zonedParts(instant: Date, timeZone: string): { y: number; m: number; d: number; hh: number; mm: number; ss: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short', hourCycle: 'h23',
  });
  const parts = Object.fromEntries(fmt.formatToParts(instant).map((p) => [p.type, p.value]));
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return {
    y: Number(parts.year), m: Number(parts.month), d: Number(parts.day),
    hh: Number(parts.hour), mm: Number(parts.minute), ss: Number(parts.second),
    weekday: weekdays.indexOf(String(parts.weekday)),
  };
}

function safeZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone });
    return timeZone;
  } catch {
    return 'UTC';
  }
}

/** The instant at which the wall clock in `timeZone` reads y-m-d 00:00. */
function zonedMidnight(y: number, m: number, d: number, timeZone: string): Date {
  // Start from UTC midnight of that date and correct by the zone's offset (twice, for DST edges).
  let guess = Date.UTC(y, m - 1, d);
  for (let i = 0; i < 2; i++) {
    const p = zonedParts(new Date(guess), timeZone);
    const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm, p.ss);
    guess += Date.UTC(y, m - 1, d) - asUtc;
  }
  return new Date(guess);
}

export interface WeekRange {
  start: Date;
  end: Date;
}

/** The Monday-to-Monday week containing `now` (offset 0) or `weeksAgo` weeks before it. */
export function weekRange(now: Date, timeZone: string, weeksAgo = 0): WeekRange {
  const zone = safeZone(timeZone);
  const p = zonedParts(now, zone);
  const local = new Date(Date.UTC(p.y, p.m - 1, p.d));
  local.setUTCDate(local.getUTCDate() - p.weekday - 7 * weeksAgo);
  const next = new Date(local);
  next.setUTCDate(next.getUTCDate() + 7);
  return {
    start: zonedMidnight(local.getUTCFullYear(), local.getUTCMonth() + 1, local.getUTCDate(), zone),
    end: zonedMidnight(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), zone),
  };
}

export function inRange(iso: string, range: WeekRange): boolean {
  const t = new Date(iso).getTime();
  return t >= range.start.getTime() && t < range.end.getTime();
}

/** Median of a list, or null when empty. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
