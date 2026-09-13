/**
 * Phase 4.3 — streak-at-risk / daily-goal notification sender.
 *
 * For the given notif_type, calls get_notification_candidates, then per user:
 *   1. Compute sent_on in that user's own timezone (the same tz the RPC used
 *      for its NOT EXISTS check, returned back on the candidate row).
 *   2. Claim-before-send: upsert notifications_log(user_id, notif_type,
 *      sent_on) with ignoreDuplicates. An empty returned row array means
 *      another run (or a prior run today) already claimed this user/type/day
 *      — skip entirely, no send attempted. This gives at-most-once send
 *      ATTEMPT per user/type/day, not exactly-once delivery: if the claimed
 *      attempt then fails (push and email both fail), the user simply
 *      doesn't get today's nudge and is retried tomorrow if the condition
 *      still holds. Deliberate trade-off (a false "already sent" beats a
 *      duplicate/spammy send).
 *   3. Attempt push to every subscription in the user's aggregated array.
 *      404/410 (WebPushError.statusCode) = subscription gone, delete that
 *      row. Any other error = transient, leave the subscription alone.
 *      Either way, no retry today — today's claim is already consumed, so
 *      the next retry is tomorrow's scheduled run, if the condition still
 *      holds then.
 *   4. Email via Resend fires only if every push attempt for that user
 *      failed (or there were no subscriptions at all) — a user who gets it
 *      on one device doesn't also get an email.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... VAPID_PUBLIC_KEY=...
 *   VAPID_PRIVATE_KEY=... VAPID_SUBJECT=... RESEND_API_KEY=... \
 *     npx tsx scripts/scheduledJobs/sendNotifications.ts <streak_at_risk|daily_goal>
 */
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { Resend } from 'resend';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

type NotifType = 'streak_at_risk' | 'daily_goal';

const rawNotifType = process.argv[2];
if (rawNotifType !== 'streak_at_risk' && rawNotifType !== 'daily_goal') {
  console.error('Usage: sendNotifications.ts <streak_at_risk|daily_goal>');
  process.exit(1);
}
const notifType: NotifType = rawNotifType;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.');
  process.exit(1);
}
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
  console.error('Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT env vars.');
  process.exit(1);
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth_key: string;
}

interface Candidate {
  user_id: string;
  email: string;
  timezone: string;
  daily_goal: number | null;
  subscriptions: PushSubscriptionRow[] | null;
}

const COPY: Record<NotifType, { title: string; body: string }> = {
  // Generic, not "your N-day streak" — the server never receives the actual
  // streak count (profiles.streak_days is dead; see CLAUDE.md Known Traps),
  // only the client-local value does. Stated accepted limitation.
  streak_at_risk: { title: 'Keep your streak alive', body: "Don't lose your streak — practice today" },
  daily_goal: { title: "You haven't hit today's goal yet", body: 'A few minutes of practice keeps you on track' },
};

function localDateString(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

async function claimSend(userId: string, sentOn: string): Promise<boolean> {
  const { data, error } = await db
    .from('notifications_log')
    .upsert({ user_id: userId, notif_type: notifType, sent_on: sentOn }, { onConflict: 'user_id,notif_type,sent_on', ignoreDuplicates: true })
    .select();
  if (error) {
    console.warn(`[sendNotifications] claim failed for ${userId}:`, error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

async function sendPushToSubscription(candidate: Candidate, sub: PushSubscriptionRow, copy: { title: string; body: string }): Promise<'sent' | 'gone' | 'failed'> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
      JSON.stringify({ title: copy.title, body: copy.body, url: '/' }),
    );
    return 'sent';
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      const { error } = await db.from('push_subscriptions').delete().eq('user_id', candidate.user_id).eq('endpoint', sub.endpoint);
      if (error) console.warn(`[sendNotifications] failed to delete gone subscription for ${candidate.user_id}:`, error.message);
      return 'gone';
    }
    console.warn(`[sendNotifications] push failed (transient) for ${candidate.user_id}:`, err);
    return 'failed';
  }
}

async function sendEmail(candidate: Candidate, copy: { title: string; body: string }): Promise<void> {
  if (!resend) return;
  try {
    const { error } = await resend.emails.send({
      from: 'FrenchCoach <notifications@frenchcoach.app>',
      to: candidate.email,
      subject: copy.title,
      text: copy.body,
    });
    if (error) console.warn(`[sendNotifications] email failed for ${candidate.user_id}:`, error.message);
  } catch (err) {
    console.warn(`[sendNotifications] email error for ${candidate.user_id}:`, err);
  }
}

async function processCandidate(candidate: Candidate): Promise<void> {
  const sentOn = localDateString(candidate.timezone);
  const claimed = await claimSend(candidate.user_id, sentOn);
  if (!claimed) return; // another run already claimed this user/type/day

  const copy = COPY[notifType];
  const subscriptions = candidate.subscriptions ?? [];
  let anyPushSucceeded = false;
  for (const sub of subscriptions) {
    const result = await sendPushToSubscription(candidate, sub, copy);
    if (result === 'sent') anyPushSucceeded = true;
  }

  if (!anyPushSucceeded) {
    await sendEmail(candidate, copy);
  }
}

async function main() {
  const { data, error } = await db.rpc('get_notification_candidates', { p_notif_type: notifType });
  if (error) {
    console.error(`get_notification_candidates failed: ${error.message}`);
    process.exit(1);
  }

  const candidates = (data ?? []) as Candidate[];
  console.log(`[sendNotifications] ${notifType}: ${candidates.length} candidate(s)`);

  for (const candidate of candidates) {
    await processCandidate(candidate);
  }
}

await main();
