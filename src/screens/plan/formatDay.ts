/** A local YYYY-MM-DD as a date at local noon (safe across DST). */
export function dayDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

/** "12 Jan". */
export function shortDay(ymd: string): string {
  return dayDate(ymd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** "Mon 12 Jan". */
export function weekdayDay(ymd: string): string {
  return dayDate(ymd).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "Monday 12 January 2027". */
export function longDay(ymd: string): string {
  return dayDate(ymd).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** "12 Jan – 3 Feb", or one date when both ends are the same day. */
export function dayRange(from: string, to: string): string {
  return from === to ? shortDay(from) : `${shortDay(from)} – ${shortDay(to)}`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
