/**
 * Teacher dashboard — the Monday email (docs/systems/teacher-dashboard.md §6).
 *
 * Runs hourly (.github/workflows/teacher-digest.yml). For each class whose teacher wants
 * the email, when it is Monday between 07:00 and 08:59 in the class's own time zone:
 *   1. Claim-before-send: insert teacher_digest_log(class_id, week_start) — a duplicate
 *      means another run already took this week, so skip. At-most-once attempt per class
 *      per week, never a duplicate email (same trade-off as sendNotifications.ts).
 *   2. Read last week's activity for active members only, from their join date onward —
 *      the same rule the teacher_* RPCs apply (ADR 0015) — and build the five lines with
 *      the dashboard's own pure functions (src/domain/teacher/classInsights.ts), so the
 *      email and the screen can never disagree.
 *   3. Send through Resend to the teacher's own account email (from auth, service key).
 *
 * Nothing in the email is a transcript or an answer: counts, a median, first names of
 * who didn't practise, and the top slip category.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... RESEND_API_KEY=... [APP_BASE_URL=...] \
 *     npx tsx scripts/scheduledJobs/sendTeacherDigest.ts [--dry-run] [--force]
 *
 * --dry-run prints each email instead of claiming/sending; --force ignores the Monday window.
 */
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { buildDigest, buildWeekRows, commonSlips, summariseWeek } from '../../src/domain/teacher/classInsights';
import { weekRange } from '../../src/domain/teacher/week';
import type { ActivityRow, ExamAttemptRow, RosterRow } from '../../src/domain/teacher/types';
import { toExamAttemptRow } from '../../src/domain/teacher/rows';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_BASE_URL = (process.env.APP_BASE_URL || 'https://frenchcoach.app').replace(/\/$/, '');
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.');
  process.exit(1);
}
if (!RESEND_API_KEY && !DRY_RUN) {
  console.log('RESEND_API_KEY not set — nothing to send with. Exiting.');
  process.exit(0);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/** Monday 07:00–08:59 in the zone — two hourly runs, so one missed run still sends. */
export function inDigestWindow(now: Date, timeZone: string): boolean {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short', hour: '2-digit', hourCycle: 'h23' })
        .formatToParts(now)
        .map((p) => [p.type, p.value]),
    );
    const hour = Number(parts.hour);
    return parts.weekday === 'Mon' && hour >= 7 && hour <= 8;
  } catch {
    return false;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

interface ClassRowDb {
  id: string;
  name: string;
  timezone: string;
  teacher_id: string;
}

async function main(): Promise<void> {
  const now = new Date();
  const { data: classes, error } = await db
    .from('classes')
    .select('id, name, timezone, teacher_id')
    .is('archived_at', null)
    .eq('digest_enabled', true);
  if (error) throw error;

  let sent = 0;
  for (const klass of (classes ?? []) as unknown as ClassRowDb[]) {
    if (!FORCE && !inDigestWindow(now, klass.timezone)) continue;
    const last = weekRange(now, klass.timezone, 1);
    const weekStart = last.start.toISOString().slice(0, 10);

    if (!DRY_RUN) {
      const { data: claimed, error: claimError } = await db
        .from('teacher_digest_log')
        .upsert({ class_id: klass.id, week_start: weekStart }, { onConflict: 'class_id,week_start', ignoreDuplicates: true })
        .select('class_id');
      if (claimError) {
        console.error(`[digest] claim failed for class ${klass.id}:`, claimError.message);
        continue;
      }
      if (!claimed || claimed.length === 0) continue; // already taken this week
    }

    try {
      const content = await buildClassDigest(klass, last);
      if (!content) continue;
      // Every teacher of the class (owner and co-teachers) who hasn't opted out.
      const { data: teacherRows, error: tErr } = await db
        .from('class_teachers')
        .select('teacher_id, teacher_profiles!inner(digest_opt_out)')
        .eq('class_id', klass.id)
        .eq('teacher_profiles.digest_opt_out', false);
      if (tErr) throw tErr;
      const emails: string[] = [];
      for (const row of (teacherRows ?? []) as { teacher_id: string }[]) {
        const { data: teacher } = await db.auth.admin.getUserById(row.teacher_id);
        if (teacher?.user?.email) emails.push(teacher.user.email);
      }
      if (emails.length === 0) continue;
      const link = `${APP_BASE_URL}/teach/class/${klass.id}`;
      const html =
        `<p style="font:600 16px system-ui">${escapeHtml(content.subject)}</p>` +
        content.lines.map((l) => `<p style="font:14px system-ui;margin:4px 0">${escapeHtml(l)}</p>`).join('') +
        `<p style="font:14px system-ui;margin-top:16px"><a href="${link}">Open the class</a></p>` +
        `<p style="font:12px system-ui;color:#666">You can turn this email off in the class's settings.</p>`;
      if (DRY_RUN || !resend) {
        console.log(`--- ${emails.join(', ')}\n${content.subject}\n${content.lines.join('\n')}\n${link}`);
        continue;
      }
      // One email per teacher, so no teacher sees another's address.
      for (const to of emails) {
        const { error: sendError } = await resend.emails.send({
          from: 'FrenchCoach <notifications@frenchcoach.app>',
          to,
          subject: content.subject,
          html,
          text: `${content.lines.join('\n')}\n\nOpen the class: ${link}`,
        });
        if (sendError) throw new Error(sendError.message);
      }
      await db.from('teacher_digest_log').update({ sent_at: new Date().toISOString() }).eq('class_id', klass.id).eq('week_start', weekStart);
      sent += emails.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[digest] class ${klass.id} failed:`, message);
      if (!DRY_RUN) {
        await db.from('teacher_digest_log').update({ error: message.slice(0, 300) }).eq('class_id', klass.id).eq('week_start', weekStart);
      }
    }
  }
  console.log(`[digest] sent ${sent}`);
}

async function buildClassDigest(klass: ClassRowDb, week: { start: Date; end: Date }) {
  const { data: members, error } = await db
    .from('class_members')
    .select('student_id, joined_at, status, profiles!inner(username)')
    .eq('class_id', klass.id)
    .eq('status', 'active');
  if (error) throw error;
  const roster: RosterRow[] = ((members ?? []) as unknown as { student_id: string; joined_at: string; profiles: { username: string | null } }[]).map((m) => ({
    studentId: m.student_id,
    displayName: m.profiles?.username ?? null,
    status: 'active',
    joinedAt: m.joined_at,
    endedAt: null,
  }));
  if (roster.length === 0) return null;
  const ids = roster.map((r) => r.studentId);
  const joinedAt = new Map(roster.map((r) => [r.studentId, r.joinedAt]));
  const afterJoin = (userId: string, at: string) => at >= (joinedAt.get(userId) ?? at);
  const startIso = week.start.toISOString();
  const endIso = week.end.toISOString();

  const { data: sessions, error: sErr } = await db
    .from('sessions')
    .select('id, user_id, mode, topic_key, score, word_count, duration_sec, created_at, practice_only')
    .in('user_id', ids)
    .gte('created_at', startIso)
    .lt('created_at', endIso);
  if (sErr) throw sErr;
  const activity: ActivityRow[] = ((sessions ?? []) as Record<string, unknown>[])
    .filter((s) => afterJoin(String(s.user_id), String(s.created_at)))
    .map((s) => ({
      studentId: String(s.user_id), id: String(s.id), mode: String(s.mode), topicKey: (s.topic_key as string) ?? null,
      score: typeof s.score === 'number' ? s.score : null, wordCount: Number(s.word_count ?? 0),
      durationSec: Number(s.duration_sec ?? 0), createdAt: String(s.created_at), practiceOnly: (s.practice_only as boolean) ?? null,
      examMarks: null, scoringSessionId: null, assignmentId: null, cefrLevel: null, criticalCount: null,
    }));

  const { data: envelopes, error: eErr } = await db
    .from('scoring_envelopes')
    .select('attempt_id, session_id, user_id, created_at, envelope')
    .in('user_id', ids)
    .is('regraded_from', null)
    .gte('created_at', startIso)
    .lt('created_at', endIso);
  if (eErr) throw eErr;
  const envRows = ((envelopes ?? []) as { attempt_id: string; session_id: string; user_id: string; created_at: string; envelope: Record<string, unknown> }[])
    .filter((e) => afterJoin(e.user_id, e.created_at));
  const attemptIds = envRows.map((e) => e.attempt_id);
  const [{ data: reports }, { data: metas }] = await Promise.all([
    attemptIds.length ? db.from('exam_feedback_reports').select('envelope_id, report').in('envelope_id', attemptIds) : Promise.resolve({ data: [] }),
    attemptIds.length ? db.from('exam_attempt_meta').select('user_id, session_id, conduct_mode, counts_toward_progress').in('user_id', ids) : Promise.resolve({ data: [] }),
  ]);
  const reportOf = new Map(((reports ?? []) as { envelope_id: string; report: Record<string, unknown> }[]).map((r) => [r.envelope_id, r.report]));
  const metaOf = new Map(((metas ?? []) as { user_id: string; session_id: string; conduct_mode: string; counts_toward_progress: boolean }[]).map((m) => [`${m.user_id}:${m.session_id}`, m]));
  const exams: ExamAttemptRow[] = envRows.map((e) => {
    const env = e.envelope as { total?: number; rolePlayTasks?: { mark: number }[]; communication?: { mark: number }; qualityOfLanguage?: { mark: number; errors?: unknown } };
    const meta = metaOf.get(`${e.user_id}:${e.session_id}`);
    const report = reportOf.get(e.attempt_id) as { qualityOfLanguage?: { errors?: unknown } } | undefined;
    return toExamAttemptRow({
      student_id: e.user_id, attempt_id: e.attempt_id, session_id: e.session_id, created_at: e.created_at,
      total: env.total, role_play: (env.rolePlayTasks ?? []).reduce((s, t) => s + t.mark, 0), role_play_max: (env.rolePlayTasks ?? []).length * 2,
      communication: env.communication?.mark, quality_of_language: env.qualityOfLanguage?.mark,
      qol_errors: env.qualityOfLanguage?.errors ?? [], report_errors: report?.qualityOfLanguage?.errors ?? null,
      conduct_mode: meta?.conduct_mode ?? null, counts_toward_progress: meta?.counts_toward_progress ?? null,
    });
  });

  const rows = buildWeekRows(roster, activity, exams, week);
  const digest = buildDigest(klass.name, summariseWeek(rows, exams, week), commonSlips(exams));
  return digest.worthSending ? digest : null;
}

main().catch((err) => {
  console.error('[digest] failed:', err);
  process.exit(1);
});
