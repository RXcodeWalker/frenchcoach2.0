import { describe, expect, it } from 'vitest';
import { buildParentReport, dayKey, MIN_TREND_SAMPLES, WEEKLY_DAYS_TARGET } from '../buildReport';
import type { RawParentReport, RawSession, RawSpeaking } from '../rawReport';

// A fixed local "now": Wednesday 4 Nov 2026, 18:00 local time.
const NOW = new Date(2026, 10, 4, 18, 0, 0);
const ago = (days: number, hour = 17) => new Date(2026, 10, 4 - days, hour, 0, 0).toISOString();

function learn(days: number, over: Partial<RawSession> = {}): RawSession {
  return { at: ago(days), mode: 'practice', topic: 'school', score: 6, durationSec: 600, words: 40, cefr: 'A2', nextStep: null, highlight: null, exam: null, ...over };
}
function exam(days: number, over: Partial<RawSession> = {}): RawSession {
  return { at: ago(days), mode: 'exam', topic: null, score: 7.5, durationSec: 600, words: 300, cefr: null, nextStep: null, highlight: null, exam: { practiceOnly: false, marks: { rolePlay: 8, rolePlayMax: 10, communication: 11, qualityOfLanguage: 11, total: 30 } }, ...over };
}
function spoken(days: number, over: Partial<RawSpeaking> = {}): RawSpeaking {
  return { at: ago(days), topic: 'school', wpm: 80, startDelayS: 1, pausesOver2s: 2, longestPauseS: 3, words: 40, speakingS: 30, ...over };
}
function raw(sessions: RawSession[], speaking: RawSpeaking[] = [], name: string | null = 'Sam'): RawParentReport {
  return { learnerName: name, linkLabel: 'Mum', generatedAt: NOW.toISOString(), sessions, speaking };
}

describe('status', () => {
  it('is "new" with no practice, and suggests sitting in on the first session', () => {
    const r = buildParentReport(raw([], [], null), NOW);
    expect(r.learnerName).toBe('Your child');
    expect(r.status.kind).toBe('new');
    expect(r.daysSinceActive).toBeNull();
    expect(r.suggestions[0].id).toBe('first-session');
  });

  it('is "inactive" after a week with no practice', () => {
    const r = buildParentReport(raw([learn(9)]), NOW);
    expect(r.status.kind).toBe('inactive');
    expect(r.status.headline).toBe('No practice for 9 days');
    expect(r.suggestions.map(s => s.id)).toContain('restart');
  });

  it(`is "steady" at ${WEEKLY_DAYS_TARGET} days in the last 7, and "light" below`, () => {
    const steady = buildParentReport(raw([learn(0), learn(1), learn(3), learn(6)]), NOW);
    expect(steady.status.kind).toBe('steady');
    const light = buildParentReport(raw([learn(0), learn(2), learn(7)]), NOW);
    expect(light.status.kind).toBe('light');
    expect(light.suggestions[0].id).toBe('rhythm');
  });
});

describe('this week', () => {
  it('counts days, minutes, sessions and answers for the last 7 days vs the 7 before', () => {
    const r = buildParentReport(raw([learn(0), learn(0), learn(6), learn(7), learn(13), learn(14)], [spoken(0), spoken(8)]), NOW);
    expect(r.week).toEqual({ daysPractised: 2, minutes: 30, sessions: 3, answers: 1 });
    expect(r.prevWeek).toEqual({ daysPractised: 2, minutes: 20, sessions: 2, answers: 1 });
  });

  it('builds a 28-day calendar ending today', () => {
    const r = buildParentReport(raw([learn(0), learn(27)]), NOW);
    expect(r.calendar).toHaveLength(28);
    expect(r.calendar[27]).toMatchObject({ key: dayKey(NOW), today: true, sessions: 1, minutes: 10 });
    expect(r.calendar[0].sessions).toBe(1);
  });

  it('keeps a streak alive when today is not practised yet', () => {
    expect(buildParentReport(raw([learn(1), learn(2), learn(3)]), NOW).streakDays).toBe(3);
    expect(buildParentReport(raw([learn(0), learn(1)]), NOW).streakDays).toBe(2);
    expect(buildParentReport(raw([learn(2), learn(3)]), NOW).streakDays).toBe(0);
  });
});

describe('trends', () => {
  it(`claims no Learn trend with fewer than ${MIN_TREND_SAMPLES} marked answers on either side`, () => {
    const r = buildParentReport(raw([learn(1, { score: 8 }), learn(2, { score: 8 }), learn(20, { score: 5 }), learn(21, { score: 5 }), learn(22, { score: 5 })]), NOW);
    expect(r.learn.change).toBeNull();
    expect(r.learn.recentCount).toBe(2);
  });

  it('reports an improving Learn score and suggests specific praise', () => {
    const rows = [learn(1, { score: 7 }), learn(2, { score: 7.5 }), learn(3, { score: 7 }), learn(20, { score: 5 }), learn(21, { score: 5.5 }), learn(22, { score: 5 })];
    const r = buildParentReport(raw(rows), NOW);
    expect(r.learn.change).toEqual({ from: 5.2, to: 7.2, direction: 'up' });
    const praise = r.suggestions.find(s => s.id === 'praise-progress');
    expect(praise?.detail).toContain('from 5.2 to 7.2');
    const flat = buildParentReport(raw([learn(1, { score: 7 }), learn(2, { score: 7 }), learn(3, { score: 7 }), learn(20), learn(21), learn(22)]), NOW);
    expect(flat.suggestions.find(s => s.id === 'praise-progress')?.detail).toContain('from 6.0 to 7.0');
  });

  it('treats a tiny change as "same", and ignores unscored answers', () => {
    const rows = [learn(1, { score: 6.1 }), learn(2, { score: 6 }), learn(3, { score: 6 }), learn(4, { score: null }), learn(20), learn(21), learn(22)];
    expect(buildParentReport(raw(rows), NOW).learn.change?.direction).toBe('same');
  });

  it('reads fewer long pauses as a fall and faster pace as a rise', () => {
    const sp = [spoken(1, { wpm: 95, pausesOver2s: 0 }), spoken(2, { wpm: 100, pausesOver2s: 1 }), spoken(3, { wpm: 90, pausesOver2s: 0 }), spoken(20), spoken(21), spoken(22)];
    const r = buildParentReport(raw([learn(1)], sp), NOW);
    expect(r.fluency.pace).toEqual({ from: 80, to: 95, direction: 'up' });
    expect(r.fluency.longPauses).toEqual({ from: 2, to: 0.3, direction: 'down' });
  });

  it('gives 8 weekly Learn averages, oldest first', () => {
    const r = buildParentReport(raw([learn(0, { score: 8 }), learn(1, { score: 6 }), learn(50, { score: 4 })]), NOW);
    expect(r.learn.weeks).toHaveLength(8);
    expect(r.learn.weeks[7]).toMatchObject({ avg: 7, count: 2 });
    expect(r.learn.weeks[0]).toMatchObject({ avg: 4, count: 1 });
  });
});

describe('exam', () => {
  it('headlines the newest attempt under exam conditions, never a coached one', () => {
    const r = buildParentReport(raw([exam(10), exam(2, { exam: { practiceOnly: true, marks: null }, score: 9 })]), NOW);
    expect(r.exam.latest).toMatchObject({ total: 30, condition: 'sim' });
    expect(r.exam.attempts.map(a => a.condition)).toEqual(['practice', 'sim']);
    expect(r.exam.daysSinceLast).toBe(2);
    expect(r.exam.areas.map(a => [a.key, a.mark, a.max])).toEqual([['rolePlay', 8, 10], ['communication', 11, 15], ['qualityOfLanguage', 11, 15]]);
    expect(r.exam.weakestArea?.key).toBe('communication');
  });

  it('recovers /40 from the /10 score for rows without marks, labelled "unknown" conditions', () => {
    const r = buildParentReport(raw([exam(3, { exam: null, score: 6.3 })]), NOW);
    expect(r.exam.latest).toMatchObject({ total: 25, condition: 'unknown', marks: null });
    expect(r.exam.areas).toEqual([]);
  });

  it('suggests a sample exam when they practise but have not sat one for over 14 days', () => {
    const practising = [learn(0), learn(1), learn(2)];
    expect(buildParentReport(raw(practising), NOW).suggestions.map(s => s.id)).toContain('sample-exam');
    expect(buildParentReport(raw([...practising, exam(20)]), NOW).suggestions.map(s => s.id)).toContain('sample-exam');
    expect(buildParentReport(raw([...practising, exam(5)]), NOW).suggestions.map(s => s.id)).not.toContain('sample-exam');
  });
});

describe('topics and coach notes', () => {
  it('names the strongest and weakest topic only with two scored sessions each', () => {
    const rows = [learn(1, { topic: 'school', score: 8 }), learn(2, { topic: 'school', score: 8 }), learn(3, { topic: 'food', score: 4 }), learn(4, { topic: 'food', score: 5 }), learn(5, { topic: 'family', score: 2 })];
    const r = buildParentReport(raw(rows), NOW);
    expect(r.topics.strongest?.key).toBe('school');
    expect(r.topics.needsWork?.key).toBe('food');
    expect(r.topics.practised.map(t => t.key)).toEqual(['food', 'school', 'family']);
    expect(r.topics.notTried.map(t => t.key)).toEqual(['hobbies', 'holidays', 'home', 'future', 'environment']);
    expect(r.suggestions.find(s => s.id === 'topic-talk')?.title).toContain('Food & Health');
  });

  it('does not call a topic the weakest when it is within 0.5 of the strongest', () => {
    const rows = [learn(1, { topic: 'school', score: 7 }), learn(2, { topic: 'school', score: 7 }), learn(3, { topic: 'food', score: 6.6 }), learn(4, { topic: 'food', score: 6.6 })];
    const r = buildParentReport(raw(rows), NOW);
    expect(r.topics.strongest?.key).toBe('school');
    expect(r.topics.needsWork).toBeNull();
    expect(r.suggestions.map(s => s.id)).toContain('try-topic');
  });

  it('keeps the three newest distinct coach next steps and a recent highlight', () => {
    const rows = [
      learn(30, { nextStep: 'Old', highlight: 'Old « Je suis »' }),
      learn(3, { nextStep: 'Add a past event' }),
      learn(2, { nextStep: 'Give a reason' }),
      learn(1, { nextStep: 'Add a past event', highlight: 'Your « parce que » links a reason' }),
      learn(0, { nextStep: 'Use the future' }),
    ];
    const r = buildParentReport(raw(rows), NOW);
    expect(r.coachNotes.nextSteps).toEqual(['Use the future', 'Add a past event', 'Give a reason']);
    expect(r.coachNotes.highlight).toBe('Your « parce que » links a reason');
    expect(r.suggestions.find(s => s.id === 'say-it-to-me')?.quote).toBe('Your « parce que » links a reason');
  });

  it('always has between 1 and 4 suggestions', () => {
    const quiet = buildParentReport(raw([learn(0), learn(1), learn(2), learn(3), exam(1)]), NOW);
    expect(quiet.suggestions.length).toBeGreaterThanOrEqual(1);
    const busy = buildParentReport(raw([learn(0, { highlight: 'x' }), learn(8), learn(9), exam(30)]), NOW);
    expect(busy.suggestions.length).toBeLessThanOrEqual(4);
  });
});
