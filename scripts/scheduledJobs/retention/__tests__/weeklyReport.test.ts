import { describe, expect, it } from 'vitest';
import { buildWeeklyEmail, escapeHtml, liveStreak, weekDays, type WeeklyReportCandidate } from '../weeklyReport';

const NOW = new Date('2026-11-08T18:30:00Z'); // Sunday
const APP = 'https://app.test';

function cand(over: Partial<WeeklyReportCandidate> = {}): WeeklyReportCandidate {
  return {
    user_id: 'u1',
    email: 'alex@example.com',
    username: 'alex',
    timezone: 'Europe/London',
    local_date: '2026-11-08',
    student_due: true,
    parent_email: 'mum@example.com',
    parent_due: true,
    student_unsub_token: 'stu-token',
    parent_unsub_token: 'par-token',
    days_active: [true, true, false, true, true, false, false],
    sessions_week: 9,
    sessions_prev_week: 6,
    minutes_week: 14,
    words_week: 420,
    xp_week: 180,
    scored_week: 8,
    avg_score_week: 6.8,
    scored_prev_week: 5,
    avg_score_prev_week: '6.1',
    best_score_week: '8.50',
    best_question_week: 'Décris ta routine scolaire.',
    exams_week: 0,
    top_topic_week: 'school',
    exam_available: true,
    last_active: '2026-11-06T19:00:00Z',
    streak_count: 3,
    streak_last_date: '2026-11-07',
    focus_skill_id: 'tense_past',
    focus_label: 'Past Tense',
    focus_hint: 'passé composé / imparfait',
    focus_misses: 3,
    focus_has_drill: true,
    ...over,
  };
}

describe('buildWeeklyEmail — student', () => {
  const mail = buildWeeklyEmail(cand(), 'student', APP, NOW);

  it('leads with real numbers', () => {
    expect(mail.subject).toBe('Your French week: 4 of 7 days, 9 answers');
    expect(mail.html).toContain('You practised on 4 days this week');
    expect(mail.html).toContain('Up on last week.');
  });

  it('shows the score trend only from real marked answers', () => {
    expect(mail.html).toContain('Average <strong>6.8/10</strong>');
    expect(mail.html).toContain('up 0.7 on last week');
    expect(mail.text).toContain('Average answer score: 6.8/10 (up 0.7 on last week)');
    const thin = buildWeeklyEmail(cand({ scored_week: 2 }), 'student', APP, NOW);
    expect(thin.html).not.toContain('Answer scores');
  });

  it('names one fix with a tracked deep link to its drill', () => {
    expect(mail.html).toContain('Your one fix for next week');
    expect(mail.html).toContain(`${APP}/fix/tense_past?utm_source=nudge&amp;utm_medium=email&amp;utm_campaign=weekly_fix`);
    expect(mail.preheader).toBe('Your one fix for next week: past tense.');
  });

  it('offers the sample exam only when the weekly allowance is free', () => {
    expect(mail.html).toContain('/exam?utm_source=nudge');
    expect(buildWeeklyEmail(cand({ exam_available: false }), 'student', APP, NOW).html).not.toContain('/exam?');
  });

  it('shows a live streak, never a broken one', () => {
    expect(mail.html).toContain('3-day streak. Practise today to keep it.');
    expect(buildWeeklyEmail(cand({ streak_last_date: '2026-11-08' }), 'student', APP, NOW).html).toContain('Keep it going tomorrow');
    expect(buildWeeklyEmail(cand({ streak_last_date: '2026-11-05' }), 'student', APP, NOW).html).not.toContain('day streak');
  });

  it('carries the student unsubscribe link', () => {
    expect(mail.unsubscribeUrl).toBe(`${APP}/unsubscribe?t=stu-token`);
    expect(mail.html).toContain('Stop these emails');
    expect(mail.text).toContain(`${APP}/unsubscribe?t=stu-token`);
  });

  it('turns an empty week into one easy restart', () => {
    const empty = buildWeeklyEmail(cand({ sessions_week: 0, days_active: Array(7).fill(false), scored_week: 0 }), 'student', APP, NOW);
    expect(empty.subject).toBe('Your free sample exam is ready, and a fresh week starts now');
    expect(empty.html).toContain('Answer one question now');
    expect(empty.html).not.toContain('Answer scores');
  });
});

describe('buildWeeklyEmail — parent', () => {
  const mail = buildWeeklyEmail(cand(), 'parent', APP, NOW);

  it('is about the learner, with no app CTA or XP', () => {
    expect(mail.subject).toBe("alex's French this week: 4 of 7 days");
    expect(mail.html).toContain('alex practised French on 4 days this week');
    expect(mail.html).not.toContain('>XP<');
    expect(mail.html).not.toContain('/learn?');
    expect(mail.html).toContain('One easy way to help');
    expect(mail.html).toContain('What they are working on');
  });

  it('uses the parent token', () => {
    expect(mail.unsubscribeUrl).toBe(`${APP}/unsubscribe?t=par-token`);
    expect(mail.html).toContain('added this address');
  });

  it('is honest about a quiet week', () => {
    const quiet = buildWeeklyEmail(cand({ sessions_week: 0, days_active: Array(7).fill(false) }), 'parent', APP, NOW);
    expect(quiet.subject).toBe("alex's French this week: a quiet week");
  });
});

describe('safety and helpers', () => {
  it('escapes everything client-written', () => {
    const evil = buildWeeklyEmail(cand({
      username: '<script>x</script>',
      focus_label: '<img src=x onerror=alert(1)>',
      best_question_week: '"><b>q</b>',
    }), 'parent', APP, NOW);
    expect(evil.html).not.toContain('<script>');
    expect(evil.html).not.toContain('<img');
    expect(evil.html).not.toContain('<b>q</b>');
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });

  it('labels the 7 days ending today', () => {
    expect(weekDays('2026-11-08')).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  });

  it('treats a streak as live only through yesterday', () => {
    expect(liveStreak({ streak_count: 5, streak_last_date: '2026-11-07' }, NOW)).toBe(5);
    expect(liveStreak({ streak_count: 5, streak_last_date: '2026-11-06' }, NOW)).toBe(0);
  });
});
