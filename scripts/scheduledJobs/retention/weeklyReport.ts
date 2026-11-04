/**
 * Weekly progress email (student, and an optional parent/guardian copy).
 * Spec: docs/systems/retention-notifications.md §4.
 *
 * Pure: candidate row in, { subject, html, text, unsubscribeUrl } out. Every
 * number in the email comes straight from get_weekly_report_candidates() — no
 * invented praise, no projected grades. A section with too little data to be
 * honest is left out rather than shown as zero (scores need ≥ 3 marked answers;
 * a trend needs ≥ 3 in both weeks).
 *
 * Every value from the database is HTML-escaped (the focus label, username and
 * question text are client-written).
 */

import { dayBefore, trackedUrl } from './dailyNudge';

export interface WeeklyReportCandidate {
  user_id: string;
  email: string | null;
  username: string | null;
  timezone: string;
  local_date: string;
  student_due: boolean;
  parent_email: string | null;
  parent_due: boolean;
  student_unsub_token: string;
  parent_unsub_token: string;
  days_active: boolean[];
  sessions_week: number;
  sessions_prev_week: number;
  minutes_week: number;
  words_week: number;
  xp_week: number;
  scored_week: number;
  avg_score_week: number | string | null;
  scored_prev_week: number;
  avg_score_prev_week: number | string | null;
  best_score_week: number | string | null;
  best_question_week: string | null;
  exams_week: number;
  top_topic_week: string | null;
  exam_available: boolean;
  last_active: string | null;
  streak_count: number;
  streak_last_date: string | null;
  focus_skill_id: string | null;
  focus_label: string | null;
  focus_hint: string | null;
  focus_misses: number | null;
  focus_has_drill: boolean;
}

export type Audience = 'student' | 'parent';

export interface WeeklyEmail {
  subject: string;
  /** Inbox preview line (hidden pre-header). */
  preheader: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
}

/** Fewer marked answers than this and an average says nothing. */
export const MIN_SCORED_FOR_AVERAGE = 3;

const DAY_MS = 86_400_000;
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Light palette from src/index.css (email clients ignore CSS variables).
const C = {
  bg: '#F6F5F1',
  surface: '#FFFFFF',
  recessed: '#F1F0EC',
  hairline: '#E6E4DE',
  ink: '#1C1A17',
  muted: '#56524B',
  subtle: '#6E6A62',
  action: '#7C3AED',
  actionText: '#6D28D9',
  progress: '#12805A',
  progressText: '#0C6646',
  streak: '#D4561C',
  correction: '#B42318',
};

const TOPIC_LABELS: Record<string, string> = {
  school: 'School', hobbies: 'Hobbies', family: 'Family', holidays: 'Holidays', home: 'Home',
  future: 'Future plans', food: 'Food', environment: 'Environment',
};

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
}

function topicLabel(key: string): string {
  return TOPIC_LABELS[key] ?? key.replace(/[_-]+/g, ' ').replace(/^./, ch => ch.toUpperCase());
}

/** Display name for a parent email; never the email address. */
export function learnerName(username: string | null): string | null {
  const u = username?.trim();
  if (!u || u.length > 40) return null;
  return u;
}

/** Weekday initials for the 7 local days ending `localDate` (oldest first). */
export function weekDays(localDate: string): string[] {
  const end = Date.parse(`${localDate}T12:00:00Z`);
  return Array.from({ length: 7 }, (_, i) => WEEKDAY[new Date(end - (6 - i) * DAY_MS).getUTCDay()]);
}

/** The learner's local calendar day of `now` (the app's streak day, src/lib/localDay.ts). */
export function localDateIn(now: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** The app's streak is alive if its last (local) day is today or yesterday. */
export function liveStreak(c: Pick<WeeklyReportCandidate, 'streak_count' | 'streak_last_date' | 'timezone'>, now: Date): number {
  if (!c.streak_last_date || c.streak_count < 1) return 0;
  const today = localDateIn(now, c.timezone);
  const yesterday = dayBefore(today, 1);
  return c.streak_last_date === today || c.streak_last_date === yesterday ? c.streak_count : 0;
}

interface Model {
  audience: Audience;
  name: string | null;
  daysActive: number;
  days: { label: string; on: boolean }[];
  sessions: number;
  prevSessions: number;
  minutes: number;
  words: number;
  xp: number;
  avg: number | null;
  prevAvg: number | null;
  best: { score: number; question: string } | null;
  exams: number;
  topTopic: string | null;
  examAvailable: boolean;
  streak: number;
  /** The streak's last day is yesterday (local): it ends tonight unless they practise today. */
  streakDueToday: boolean;
  focus: { id: string; label: string; hint: string | null; misses: number; hasDrill: boolean } | null;
}

export function buildModel(c: WeeklyReportCandidate, audience: Audience, now: Date): Model {
  const days = weekDays(c.local_date).map((label, i) => ({ label, on: Boolean(c.days_active?.[i]) }));
  const avg = c.scored_week >= MIN_SCORED_FOR_AVERAGE ? num(c.avg_score_week) : null;
  const prevAvg = avg !== null && c.scored_prev_week >= MIN_SCORED_FOR_AVERAGE ? num(c.avg_score_prev_week) : null;
  const bestScore = num(c.best_score_week);
  const focusMisses = c.focus_misses ?? 0;
  return {
    audience,
    name: learnerName(c.username),
    daysActive: days.filter(d => d.on).length,
    days,
    sessions: c.sessions_week,
    prevSessions: c.sessions_prev_week,
    minutes: c.minutes_week,
    words: c.words_week,
    xp: c.xp_week,
    avg,
    prevAvg,
    best: bestScore !== null && c.best_question_week ? { score: bestScore, question: c.best_question_week } : null,
    exams: c.exams_week,
    topTopic: c.top_topic_week ? topicLabel(c.top_topic_week) : null,
    examAvailable: c.exam_available,
    streak: liveStreak(c, now),
    streakDueToday: c.streak_last_date !== localDateIn(now, c.timezone),
    focus: c.focus_skill_id && c.focus_label && focusMisses >= 2
      ? { id: c.focus_skill_id, label: c.focus_label, hint: c.focus_hint, misses: focusMisses, hasDrill: c.focus_has_drill }
      : null,
  };
}

function fmtScore(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function headline(m: Model): { subject: string; title: string; lede: string; preheader: string } {
  const who = m.name ?? 'Your learner';
  if (m.audience === 'parent') {
    if (m.sessions === 0) {
      return {
        subject: `${who}'s French this week: a quiet week`,
        title: `A quiet week for ${who}`,
        lede: 'No French speaking practice this week. A quick, friendly nudge from you is the most effective reminder there is.',
        preheader: 'No practice this week. Here is one easy way to help.',
      };
    }
    return {
      subject: `${who}'s French this week: ${m.daysActive} of 7 days`,
      title: `${who} practised French on ${plural(m.daysActive, 'day')} this week`,
      lede: `${plural(m.sessions, 'spoken answer')}, ${plural(m.words, 'French word')} said out loud.`,
      preheader: `${plural(m.sessions, 'answer')} and ${plural(m.minutes, 'minute')} of speaking practice.`,
    };
  }
  if (m.sessions === 0) {
    return {
      subject: m.examAvailable ? 'Your free sample exam is ready, and a fresh week starts now' : 'A fresh French week starts now',
      title: 'A fresh week starts now',
      lede: 'No practice last week, and that is fine. The quickest way back is one answer today. It takes about two minutes.',
      preheader: 'One answer today restarts everything.',
    };
  }
  const trend = m.sessions > m.prevSessions && m.prevSessions > 0 ? ' Up on last week.' : '';
  return {
    subject: `Your French week: ${m.daysActive} of 7 days, ${plural(m.sessions, 'answer')}`,
    title: `You practised on ${plural(m.daysActive, 'day')} this week`,
    lede: `${plural(m.sessions, 'spoken answer')} and ${plural(m.words, 'French word')} said out loud.${trend}`,
    preheader: m.focus ? `Your one fix for next week: ${m.focus.label.toLowerCase()}.` : `${plural(m.minutes, 'minute')} of speaking practice.`,
  };
}

// ── HTML pieces (table layout + inline styles: what email clients render) ─────

function button(href: string, label: string, primary = true): string {
  const style = primary
    ? `background:${C.action};color:#FFFFFF;border:1px solid ${C.action};`
    : `background:${C.surface};color:${C.actionText};border:1px solid ${C.hairline};`;
  return `<a href="${escapeHtml(href)}" style="${style}display:inline-block;padding:12px 20px;border-radius:999px;font-weight:600;font-size:15px;text-decoration:none;">${escapeHtml(label)}</a>`;
}

function dayStrip(m: Model): string {
  const cells = m.days.map(d => {
    const dot = d.on
      ? `<div style="width:28px;height:28px;line-height:28px;border-radius:999px;background:${C.progress};color:#FFFFFF;font-size:14px;font-weight:700;margin:0 auto;">&#10003;</div>`
      : `<div style="width:28px;height:28px;line-height:28px;border-radius:999px;background:${C.recessed};border:1px solid ${C.hairline};margin:0 auto;box-sizing:border-box;">&nbsp;</div>`;
    return `<td align="center" style="padding:0 2px;font-size:12px;color:${C.subtle};">${dot}<div style="margin-top:6px;">${d.label}</div></td>`;
  }).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 4px;"><tr>${cells}</tr></table>`;
}

function stat(value: string, label: string): string {
  return `<td width="25%" align="center" style="padding:12px 4px;background:${C.recessed};border-radius:12px;">
    <div style="font-size:22px;font-weight:700;color:${C.ink};">${value}</div>
    <div style="font-size:12px;color:${C.subtle};margin-top:2px;">${label}</div></td>`;
}

function stats(m: Model): string {
  const gap = '<td width="8" style="width:8px;"></td>';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;"><tr>
    ${stat(String(m.sessions), m.sessions === 1 ? 'answer' : 'answers')}${gap}
    ${stat(String(m.minutes), m.minutes === 1 ? 'minute' : 'minutes')}${gap}
    ${stat(m.words.toLocaleString('en-GB'), 'words spoken')}${gap}
    ${m.audience === 'student' ? stat(m.xp.toLocaleString('en-GB'), 'XP') : stat(`${m.daysActive}/7`, 'days practised')}
  </tr></table>`;
}

function section(title: string, body: string, accent = C.hairline): string {
  return `<tr><td style="padding:0 24px 16px;"><div style="border:1px solid ${C.hairline};border-left:4px solid ${accent};border-radius:12px;padding:16px;background:${C.surface};">
    <div style="font-size:13px;font-weight:700;color:${C.subtle};text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;">${title}</div>
    ${body}</div></td></tr>`;
}

const P = `style="margin:0 0 10px;font-size:15px;line-height:1.5;color:${C.ink};"`;

function scoreSection(m: Model): string {
  if (m.avg === null) return '';
  let trend = '';
  if (m.prevAvg !== null) {
    const d = Math.round((m.avg - m.prevAvg) * 10) / 10;
    trend = d > 0
      ? ` <span style="color:${C.progressText};font-weight:600;">up ${fmtScore(d)} on last week</span>`
      : d < 0
        ? ` <span style="color:${C.muted};">down ${fmtScore(-d)} on last week</span>`
        : ` <span style="color:${C.muted};">the same as last week</span>`;
  }
  const best = m.best
    ? `<p ${P}>Best answer: <strong>${fmtScore(m.best.score)}/10</strong> on <em>${escapeHtml(m.best.question)}</em></p>`
    : '';
  return section('Answer scores', `<p ${P}>Average <strong>${fmtScore(m.avg)}/10</strong>${trend}.</p>${best}`, C.progress);
}

function focusSection(m: Model, appUrl: string, medium: 'email'): string {
  if (!m.focus) return '';
  const hint = m.focus.hint ? ` <span style="color:${C.muted};">(${escapeHtml(m.focus.hint)})</span>` : '';
  if (m.audience === 'parent') {
    return section('What they are working on',
      `<p ${P}><strong>${escapeHtml(m.focus.label)}</strong>${hint} came up ${plural(m.focus.misses, 'time')} in their answers this week.${m.focus.hasDrill ? ' The app has a short drill for it.' : ''}</p>`,
      C.streak);
  }
  const cta = m.focus.hasDrill
    ? `<p style="margin:12px 0 0;">${button(trackedUrl(appUrl, `/fix/${encodeURIComponent(m.focus.id)}`, medium, 'weekly_fix'), 'Fix it in 60 seconds', false)}</p>`
    : '';
  return section('Your one fix for next week',
    `<p ${P}><strong>${escapeHtml(m.focus.label)}</strong>${hint} tripped you up ${plural(m.focus.misses, 'time')} this week. Fix this one thing and every answer gets better.</p>${cta}`,
    C.streak);
}

function examSection(m: Model, appUrl: string): string {
  if (m.audience === 'parent') {
    return m.exams > 0
      ? section('Exam practice', `<p ${P}>${escapeHtml(m.name ?? 'They')} took ${plural(m.exams, 'full sample speaking exam')} this week.</p>`, C.action)
      : '';
  }
  if (!m.examAvailable) return '';
  return section('Exam practice',
    `<p ${P}>Your free Cambridge-style sample speaking exam is ready${m.exams > 0 ? ' again' : ''}. Marked out of 40, like the real thing.</p>
     <p style="margin:12px 0 0;">${button(trackedUrl(appUrl, '/exam', 'email', 'weekly_exam'), 'Take this week’s exam', false)}</p>`,
    C.action);
}

function parentTip(m: Model): string {
  if (m.audience !== 'parent') return '';
  const who = escapeHtml(m.name ?? 'them');
  return section('One easy way to help',
    `<p ${P}>Ask ${who} to tell you about their weekend in French: three sentences, no pressure. Speaking out loud to a real person is exactly what the exam tests.</p>`,
    C.progress);
}

function footer(m: Model, unsubscribeUrl: string, appUrl: string): string {
  const why = m.audience === 'parent'
    ? `${escapeHtml(m.name ?? 'A FrenchCoach learner')} added this address to receive a weekly summary of their French speaking practice.`
    : 'You get this because weekly progress emails are on for your FrenchCoach account.';
  const settings = m.audience === 'student'
    ? ` · <a href="${escapeHtml(new URL('/profile', appUrl).toString())}" style="color:${C.subtle};">Settings</a>`
    : '';
  return `<tr><td style="padding:8px 24px 32px;font-size:12px;line-height:1.5;color:${C.subtle};">
    ${why}<br><a href="${escapeHtml(unsubscribeUrl)}" style="color:${C.subtle};">Stop these emails</a>${settings}</td></tr>`;
}

function streakText(m: Model): string {
  return m.streakDueToday
    ? `${m.streak}-day streak. Practise today to keep it.`
    : `${m.streak}-day streak. Keep it going tomorrow.`;
}

function renderHtml(m: Model, h: ReturnType<typeof headline>, appUrl: string, unsubscribeUrl: string): string {
  const streakLine = m.audience === 'student' && m.streak >= 2
    ? `<p style="margin:12px 0 0;font-size:15px;color:${C.streak};font-weight:600;">${streakText(m)}</p>`
    : '';
  const topic = m.topTopic && m.sessions > 0
    ? `<p style="margin:8px 0 0;font-size:14px;color:${C.muted};">Most practised topic: ${escapeHtml(m.topTopic)}</p>`
    : '';
  const cta = m.audience === 'student'
    ? `<tr><td align="center" style="padding:8px 24px 24px;">${button(trackedUrl(appUrl, '/learn', 'email', 'weekly_report'), m.sessions === 0 ? 'Answer one question now' : 'Start this week’s first answer')}</td></tr>`
    : '';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(h.subject)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(h.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.surface};border:1px solid ${C.hairline};border-radius:16px;">
  <tr><td style="padding:24px 24px 0;font-size:13px;font-weight:700;color:${C.actionText};letter-spacing:.04em;text-transform:uppercase;">FrenchCoach · ${m.audience === 'parent' ? 'Weekly summary' : 'Your week'}</td></tr>
  <tr><td style="padding:8px 24px 0;">
    <h1 style="margin:0;font-size:24px;line-height:1.25;color:${C.ink};">${escapeHtml(h.title)}</h1>
    <p style="margin:8px 0 0;font-size:15px;line-height:1.5;color:${C.muted};">${escapeHtml(h.lede)}</p>
    ${dayStrip(m)}${streakLine}${topic}
    ${m.sessions > 0 ? stats(m) : '<div style="height:16px;"></div>'}
  </td></tr>
  ${scoreSection(m)}
  ${focusSection(m, appUrl, 'email')}
  ${examSection(m, appUrl)}
  ${parentTip(m)}
  ${cta}
  ${footer(m, unsubscribeUrl, appUrl)}
</table></td></tr></table></body></html>`;
}

function renderText(m: Model, h: ReturnType<typeof headline>, appUrl: string, unsubscribeUrl: string): string {
  const lines: string[] = [h.title, '', h.lede, ''];
  lines.push(m.days.map(d => `${d.label} ${d.on ? '✓' : '·'}`).join('  '), '');
  if (m.sessions > 0) {
    lines.push(`${plural(m.sessions, 'answer')} · ${plural(m.minutes, 'minute')} · ${plural(m.words, 'word')} spoken${m.audience === 'student' ? ` · ${m.xp} XP` : ''}`);
  }
  if (m.audience === 'student' && m.streak >= 2) lines.push(streakText(m));
  if (m.avg !== null) {
    let t = `Average answer score: ${fmtScore(m.avg)}/10`;
    if (m.prevAvg !== null) {
      const d = Math.round((m.avg - m.prevAvg) * 10) / 10;
      t += d > 0 ? ` (up ${fmtScore(d)} on last week)` : d < 0 ? ` (down ${fmtScore(-d)} on last week)` : ' (same as last week)';
    }
    lines.push(t);
  }
  if (m.focus) {
    lines.push('', m.audience === 'parent'
      ? `What they are working on: ${m.focus.label}${m.focus.hint ? ` (${m.focus.hint})` : ''}, ${plural(m.focus.misses, 'slip')} this week.`
      : `Your one fix for next week: ${m.focus.label}${m.focus.hint ? ` (${m.focus.hint})` : ''}, ${plural(m.focus.misses, 'slip')} this week.`);
    if (m.audience === 'student' && m.focus.hasDrill) lines.push(`Fix it in 60 seconds: ${trackedUrl(appUrl, `/fix/${encodeURIComponent(m.focus.id)}`, 'email', 'weekly_fix')}`);
  }
  if (m.audience === 'student' && m.examAvailable) {
    lines.push('', `Your free sample speaking exam is ready: ${trackedUrl(appUrl, '/exam', 'email', 'weekly_exam')}`);
  }
  if (m.audience === 'parent') {
    if (m.exams > 0) lines.push('', `Full sample speaking exams this week: ${m.exams}`);
    lines.push('', `One easy way to help: ask ${m.name ?? 'them'} to tell you about their weekend in French. Three sentences, no pressure.`);
  } else {
    lines.push('', `Start now: ${trackedUrl(appUrl, '/learn', 'email', 'weekly_report')}`);
  }
  lines.push('', '—', `Stop these emails: ${unsubscribeUrl}`);
  return lines.join('\n');
}

export function buildWeeklyEmail(c: WeeklyReportCandidate, audience: Audience, appUrl: string, now: Date): WeeklyEmail {
  const m = buildModel(c, audience, now);
  const h = headline(m);
  const token = audience === 'parent' ? c.parent_unsub_token : c.student_unsub_token;
  const unsubscribeUrl = new URL(`/unsubscribe?t=${encodeURIComponent(token)}`, appUrl).toString();
  return {
    subject: h.subject,
    preheader: h.preheader,
    html: renderHtml(m, h, appUrl, unsubscribeUrl),
    text: renderText(m, h, appUrl, unsubscribeUrl),
    unsubscribeUrl,
  };
}
