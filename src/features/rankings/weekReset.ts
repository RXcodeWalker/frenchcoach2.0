/** Time until the next UTC Monday 00:00 — the boundary the shared week-key util rolls over on. */
export function weekResetsIn(now: Date = new Date()): string {
  const day = now.getUTCDay(); // Sunday=0..Saturday=6
  const daysUntilMonday = day === 1 ? 7 : ((8 - day) % 7) || 7;
  const nextMonday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday);
  const ms = nextMonday - now.getTime();
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h ${minutes}m`;
}
