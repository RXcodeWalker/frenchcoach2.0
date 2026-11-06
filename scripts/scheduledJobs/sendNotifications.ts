/**
 * Retention notifications sender — run hourly by
 * .github/workflows/notifications-streak-and-goal.yml.
 * Spec: docs/systems/retention-notifications.md.
 *
 *   daily_nudge   — at most ONE push per learner per local day, chosen by
 *                   retention/dailyNudge.ts from what the server knows (their
 *                   real streak, today's answers, the mistake the coach is
 *                   tracking, their usual practice hour). Email only as a
 *                   fallback when every push subscription failed.
 *   weekly_report — Sunday evening (learner's local time) progress email to the
 *                   learner and, if they added one, a parent/guardian copy.
 *
 * Claim-before-send, unchanged from Phase 4.3: upsert notifications_log
 * (user_id, notif_type, sent_on) with ignoreDuplicates; an empty result means
 * another run already claimed it, so nothing is sent. At-most-once ATTEMPT,
 * not exactly-once delivery — a failed send is not retried that day (a missed
 * nudge beats a duplicate). The claim row then records `variant` and `channel`
 * (push / email / failed) so the owner can see what went out.
 *
 * Push 404/410 = the subscription is gone: its row is deleted. Anything else
 * is transient and left alone.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... VAPID_PUBLIC_KEY=... \
 *   VAPID_PRIVATE_KEY=... VAPID_SUBJECT=... RESEND_API_KEY=... APP_URL=... \
 *     npx tsx scripts/scheduledJobs/sendNotifications.ts <daily_nudge|weekly_report> [--dry-run]
 *
 * --dry-run prints what would be sent and claims/sends nothing.
 */
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { Resend } from 'resend';
import { chooseDailyNudge, medianRunGapHours, trackedUrl, type DailyNudgeCandidate, type Nudge } from './retention/dailyNudge';
import { buildWeeklyEmail, parentDashboardLink, type Audience, type WeeklyReportCandidate } from './retention/weeklyReport';
import { renderNudgeEmail } from './retention/nudgeEmail';

type Job = 'daily_nudge' | 'weekly_report';
type LogType = 'daily_nudge' | 'weekly_report' | 'weekly_report_parent';
type Channel = 'push' | 'email' | 'failed';

const env = process.env;
const job = process.argv[2] as Job;
const dryRun = process.argv.includes('--dry-run');
if (job !== 'daily_nudge' && job !== 'weekly_report') {
  console.error('Usage: sendNotifications.ts <daily_nudge|weekly_report> [--dry-run]');
  process.exit(1);
}
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.');
  process.exit(1);
}

const APP_URL = (env.APP_URL || 'https://french.beyondthebasics.me').replace(/\/+$/, '');
// Must be on a domain verified in Resend (mail.french.beyondthebasics.me is).
const FROM = env.NOTIFY_FROM_EMAIL || 'FrenchCoach <notifications@mail.french.beyondthebasics.me>';
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function claim(userId: string, type: LogType, sentOn: string, variant: string): Promise<boolean> {
  if (dryRun) return true;
  const { data, error } = await db
    .from('notifications_log')
    .upsert({ user_id: userId, notif_type: type, sent_on: sentOn, variant }, { onConflict: 'user_id,notif_type,sent_on', ignoreDuplicates: true })
    .select('user_id');
  if (error) {
    console.warn(`[notify] claim failed for ${userId}:`, error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

async function recordChannel(userId: string, type: LogType, sentOn: string, channel: Channel): Promise<void> {
  if (dryRun) return;
  const { error } = await db.from('notifications_log').update({ channel })
    .eq('user_id', userId).eq('notif_type', type).eq('sent_on', sentOn);
  if (error) console.warn(`[notify] channel update failed for ${userId}:`, error.message);
}

async function sendEmail(to: string, subject: string, html: string, text: string, unsubscribeUrl?: string): Promise<boolean> {
  if (!resend || dryRun) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
      text,
      ...(unsubscribeUrl ? { headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` } } : {}),
    });
    if (error) {
      console.warn('[notify] email failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[notify] email error:', err);
    return false;
  }
}

/**
 * GitHub's "hourly" schedule really fires every few hours. Record this run and
 * return the recent median gap, so the nudge rules can send early rather than
 * miss a learner's window entirely (retention-notifications.md §2).
 */
async function recordRunAndGap(): Promise<number> {
  const { data, error } = await db.from('notification_runs').select('ran_at')
    .eq('job', job).order('ran_at', { ascending: false }).limit(7);
  if (error) console.warn('[notify] could not read past runs:', error.message);
  const times = (data ?? []).map(r => r.ran_at as string);
  times.push(new Date().toISOString());
  if (!dryRun) {
    const { error: insertError } = await db.from('notification_runs').insert({ job });
    if (insertError) console.warn('[notify] could not record this run:', insertError.message);
  }
  return medianRunGapHours(times);
}

// ── daily nudge ───────────────────────────────────────────────────────────────

async function pushTo(c: DailyNudgeCandidate, nudge: Nudge): Promise<boolean> {
  const payload = JSON.stringify({
    title: nudge.title,
    body: nudge.body,
    url: trackedUrl(APP_URL, nudge.path, 'push', nudge.variant),
    // One visible nudge at a time: a newer one replaces an unread older one.
    tag: 'frenchcoach-daily',
  });
  let any = false;
  for (const sub of c.subscriptions ?? []) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } }, payload, { TTL: 4 * 3600 });
      any = true;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        const { error } = await db.from('push_subscriptions').delete().eq('user_id', c.user_id).eq('endpoint', sub.endpoint);
        if (error) console.warn(`[notify] could not delete gone subscription for ${c.user_id}:`, error.message);
      } else {
        console.warn(`[notify] push failed (transient) for ${c.user_id}:`, status ?? err);
      }
    }
  }
  return any;
}

async function runDailyNudge(): Promise<void> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    console.error('Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT env vars.');
    process.exit(1);
  }
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

  const { data, error } = await db.rpc('get_daily_nudge_candidates');
  if (error) {
    console.error(`get_daily_nudge_candidates failed: ${error.message} (is migration 20261104120000_retention_loop applied?)`);
    process.exit(1);
  }
  const runGapHours = await recordRunAndGap();
  const now = new Date();
  const candidates = (data ?? []) as DailyNudgeCandidate[];
  const tally: Record<string, number> = {};
  for (const c of candidates) {
    const nudge = chooseDailyNudge(c, now, { runGapHours });
    if (!nudge) continue;
    if (dryRun) {
      console.log(`[dry-run] ${c.user_id} ${nudge.variant}: "${nudge.title}" — ${nudge.body} → ${nudge.path}`);
      tally[nudge.variant] = (tally[nudge.variant] ?? 0) + 1;
      continue;
    }
    if (!(await claim(c.user_id, 'daily_nudge', c.local_date, nudge.variant))) continue;
    let channel: Channel = 'failed';
    if (await pushTo(c, nudge)) {
      channel = 'push';
    } else if (c.email) {
      const mail = renderNudgeEmail(nudge, trackedUrl(APP_URL, nudge.path, 'email', nudge.variant), new URL('/profile', APP_URL).toString());
      if (await sendEmail(c.email, nudge.title, mail.html, mail.text)) channel = 'email';
    }
    await recordChannel(c.user_id, 'daily_nudge', c.local_date, channel);
    tally[`${nudge.variant}:${channel}`] = (tally[`${nudge.variant}:${channel}`] ?? 0) + 1;
  }
  console.log(`[notify] daily_nudge: ${candidates.length} candidate(s), run gap ~${runGapHours.toFixed(1)} h`, tally);
}

// ── weekly report ─────────────────────────────────────────────────────────────

async function sendWeekly(c: WeeklyReportCandidate, audience: Audience, now: Date): Promise<Channel | null> {
  const to = audience === 'parent' ? c.parent_email : c.email;
  if (!to) return null;
  const type: LogType = audience === 'parent' ? 'weekly_report_parent' : 'weekly_report';
  const mail = buildWeeklyEmail(c, audience, APP_URL, now);
  if (dryRun) {
    console.log(`[dry-run] ${c.user_id} ${audience}: "${mail.subject}"`);
    return null;
  }
  if (!(await claim(c.user_id, type, c.local_date, audience))) return null;
  // The parent copy links to the parent dashboard with a fresh 5-week token, minted only once
  // the send is claimed. No token (learner turned the link off, or the RPC failed) = no link.
  const final = audience === 'parent'
    ? buildWeeklyEmail(c, audience, APP_URL, now, { dashboardUrl: await parentDashboardUrl(c) })
    : mail;
  const channel: Channel = (await sendEmail(to, final.subject, final.html, final.text, final.unsubscribeUrl)) ? 'email' : 'failed';
  await recordChannel(c.user_id, type, c.local_date, channel);
  return channel;
}

async function parentDashboardUrl(c: WeeklyReportCandidate): Promise<string | null> {
  if (!c.parent_email) return null;
  const { data, error } = await db.rpc('mint_parent_digest_token', { p_user_id: c.user_id, p_parent_email: c.parent_email });
  if (error) {
    console.warn(`[notify] parent dashboard link skipped for ${c.user_id}:`, error.message);
    return null;
  }
  return typeof data === 'string' && /^[0-9a-f]{64}$/.test(data) ? parentDashboardLink(APP_URL, data) : null;
}

async function runWeeklyReport(): Promise<void> {
  if (!resend && !dryRun) {
    console.warn('[notify] RESEND_API_KEY not set — weekly_report skipped.');
    return;
  }
  const { data, error } = await db.rpc('get_weekly_report_candidates');
  if (error) {
    console.error(`get_weekly_report_candidates failed: ${error.message} (is migration 20261104120000_retention_loop applied?)`);
    process.exit(1);
  }
  const now = new Date();
  const candidates = (data ?? []) as WeeklyReportCandidate[];
  const tally: Record<string, number> = {};
  for (const c of candidates) {
    for (const audience of ['student', 'parent'] as const) {
      if (audience === 'student' ? !c.student_due : !c.parent_due) continue;
      const result = await sendWeekly(c, audience, now);
      if (result) tally[`${audience}:${result}`] = (tally[`${audience}:${result}`] ?? 0) + 1;
    }
  }
  console.log(`[notify] weekly_report: ${candidates.length} candidate(s)`, tally);
}

await (job === 'daily_nudge' ? runDailyNudge() : runWeeklyReport());
