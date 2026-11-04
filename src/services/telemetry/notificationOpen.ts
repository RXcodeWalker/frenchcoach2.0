/**
 * Retention loop (docs/systems/retention-notifications.md §5): every nudge and
 * weekly-email link carries utm_source=nudge, utm_medium=push|email and
 * utm_campaign=<variant>. This turns the landing URL into one
 * `notification_opened` event, so which message actually brings people back
 * is measurable. Pure; AnalyticsTracker fires it once per page load.
 */
const CAMPAIGN = /^[a-z_]{1,40}$/;

export function notificationOpenFromSearch(search: string): { campaign: string; channel: 'push' | 'email' } | null {
  const q = new URLSearchParams(search);
  if (q.get('utm_source') !== 'nudge') return null;
  const channel = q.get('utm_medium');
  const campaign = q.get('utm_campaign') ?? '';
  if ((channel !== 'push' && channel !== 'email') || !CAMPAIGN.test(campaign)) return null;
  return { campaign, channel };
}
