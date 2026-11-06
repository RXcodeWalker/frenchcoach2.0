/**
 * In-app "Send feedback" → the owner's inbox.
 *
 * Learners write to public.user_feedback through the submit_feedback RPC
 * (backend migration 20261104090000). This job, run hourly by
 * .github/workflows/feedback-notify.yml, emails every row whose notified_at is
 * NULL to FEEDBACK_NOTIFY_EMAIL — one email per message, with Reply-To set to
 * the sender's address when they left one, so replying is one click.
 *
 * Claim-before-send, as in sendNotifications.ts: a row is stamped notified_at
 * (only if still NULL) before its email goes out, so two overlapping runs can
 * never email the same message twice. If Resend then fails, the claim is
 * undone so the next run retries it.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... RESEND_API_KEY=... \
 *   FEEDBACK_NOTIFY_EMAIL=you@example.com \
 *     npx tsx scripts/scheduledJobs/sendFeedbackDigest.ts
 */
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FEEDBACK_NOTIFY_EMAIL = process.env.FEEDBACK_NOTIFY_EMAIL;
// Must be on a domain verified in Resend (mail.french.beyondthebasics.me is) — Resend's shared test
// sender is refused by a key restricted to that domain.
const FEEDBACK_FROM = process.env.FEEDBACK_FROM || 'FrenchCoach Feedback <feedback@mail.french.beyondthebasics.me>';

const BATCH = 50;

const KIND_LABEL: Record<string, string> = {
  bug: 'Bug',
  marking: 'Marking',
  idea: 'Idea',
  other: 'Other',
};

export interface FeedbackRow {
  id: string;
  created_at: string;
  user_id: string | null;
  kind: string;
  message: string;
  contact_email: string | null;
  route: string | null;
  user_agent: string | null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** The email for one message. Pure, so it can be tested without Supabase or Resend. */
export function buildFeedbackEmail(row: FeedbackRow): { subject: string; text: string; html: string } {
  const kind = KIND_LABEL[row.kind] ?? row.kind;
  const firstLine = row.message.split('\n')[0].slice(0, 60);
  const subject = `[FrenchCoach ${kind}] ${firstLine}${row.message.length > 60 ? '…' : ''}`;
  const who = row.user_id ? `Account ${row.user_id}` : 'Guest (not signed in)';
  const facts = [
    ['From', row.contact_email ?? 'No email left — cannot reply'],
    ['Who', who],
    ['Page', row.route ?? '—'],
    ['Sent', new Date(row.created_at).toUTCString()],
    ['Browser', row.user_agent ?? '—'],
  ];
  const text = `${row.message}\n\n---\n${facts.map(([k, v]) => `${k}: ${v}`).join('\n')}\n`;
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5">
<p style="white-space:pre-wrap;margin:0 0 16px">${escapeHtml(row.message)}</p>
<table style="font-size:13px;color:#555;border-top:1px solid #ddd;padding-top:8px">
${facts.map(([k, v]) => `<tr><td style="padding-right:12px;vertical-align:top"><b>${k}</b></td><td>${escapeHtml(v)}</td></tr>`).join('\n')}
</table></div>`;
  return { subject, text, html };
}

async function main(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.');
    process.exit(1);
  }
  if (!RESEND_API_KEY || !FEEDBACK_NOTIFY_EMAIL) {
    // Not an error: messages stay in user_feedback until both are set, then all go out.
    console.log('::warning title=Feedback email off::Set RESEND_API_KEY and FEEDBACK_NOTIFY_EMAIL to receive feedback by email. Messages are kept in the user_feedback table meanwhile.');
    return;
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const resend = new Resend(RESEND_API_KEY);

  const { data: rows, error } = await db
    .from('user_feedback')
    .select('id, created_at, user_id, kind, message, contact_email, route, user_agent')
    .is('notified_at', null)
    .order('created_at', { ascending: true })
    .limit(BATCH);
  if (error) {
    console.error('Reading user_feedback failed:', error.message);
    process.exit(1);
  }

  let sent = 0;
  let failed = 0;
  for (const row of (rows ?? []) as FeedbackRow[]) {
    const { data: claimed, error: claimError } = await db
      .from('user_feedback')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('notified_at', null)
      .select('id');
    if (claimError || !claimed || claimed.length === 0) continue; // another run has it

    const email = buildFeedbackEmail(row);
    const { error: sendError } = await resend.emails.send({
      from: FEEDBACK_FROM,
      to: FEEDBACK_NOTIFY_EMAIL,
      subject: email.subject,
      text: email.text,
      html: email.html,
      ...(row.contact_email ? { replyTo: row.contact_email } : {}),
    });
    if (sendError) {
      failed += 1;
      console.error(`Email for ${row.id} failed: ${sendError.message}`);
      await db.from('user_feedback').update({ notified_at: null }).eq('id', row.id);
      continue;
    }
    sent += 1;
  }

  console.log(`Feedback emails: ${sent} sent, ${failed} failed, ${(rows ?? []).length} pending at start.`);
  if (failed > 0) process.exit(1);
}

// Run only when executed directly (the test imports buildFeedbackEmail).
if (process.argv[1]?.endsWith('sendFeedbackDigest.ts')) {
  void main();
}
