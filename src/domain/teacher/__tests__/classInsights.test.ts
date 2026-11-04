import { describe, expect, it } from 'vitest';
import {
  areaReport,
  assignmentStatus,
  buildDigest,
  buildExportRows,
  buildWeekRows,
  commonSlips,
  csvCell,
  homeworkCell,
  isCountedAttempt,
  studentExamSummary,
  summariseWeek,
  toCsv,
  topicStats,
} from '../classInsights';
import { median, weekRange } from '../week';
import type { ActivityRow, AssignmentRow, ExamAttemptRow, ProgressRow, RosterRow } from '../types';

const NOW = new Date('2026-11-05T12:00:00Z'); // a Thursday
const WEEK = weekRange(NOW, 'Europe/London');

const roster: RosterRow[] = [
  { studentId: 'a', displayName: 'Aisha', status: 'active', joinedAt: '2026-10-01T09:00:00Z', endedAt: null },
  { studentId: 'b', displayName: 'Ben', status: 'active', joinedAt: '2026-10-01T09:00:00Z', endedAt: null },
  { studentId: 'c', displayName: null, status: 'active', joinedAt: '2026-11-04T09:00:00Z', endedAt: null },
  { studentId: 'gone', displayName: 'Gone', status: 'left', joinedAt: '2026-09-01T09:00:00Z', endedAt: '2026-10-01T00:00:00Z' },
];

function act(over: Partial<ActivityRow>): ActivityRow {
  return {
    studentId: 'a', id: Math.random().toString(36), mode: 'practice', topicKey: 'school', score: 7, wordCount: 30,
    durationSec: 60, createdAt: '2026-11-04T10:00:00Z', practiceOnly: null, examMarks: null, scoringSessionId: null,
    assignmentId: null, cefrLevel: 'A2', criticalCount: 0, ...over,
  };
}

function exam(over: Partial<ExamAttemptRow>): ExamAttemptRow {
  return {
    studentId: 'a', attemptId: Math.random().toString(36), sessionId: 's', createdAt: '2026-11-04T11:00:00Z',
    total: 24, rolePlay: 8, rolePlayMax: 10, communication: 9, qualityOfLanguage: 7, qolErrors: [], reportErrors: null,
    conductMode: 'examSim', countsTowardProgress: true, assignmentId: null, teacherTotal: null, teacherShared: null, ...over,
  };
}

describe('weekRange', () => {
  it('is Monday 00:00 to next Monday 00:00 in the class time zone', () => {
    expect(WEEK.start.toISOString()).toBe('2026-11-02T00:00:00.000Z'); // London is UTC in November
    expect(WEEK.end.toISOString()).toBe('2026-11-09T00:00:00.000Z');
    const paris = weekRange(NOW, 'Europe/Paris');
    expect(paris.start.toISOString()).toBe('2026-11-01T23:00:00.000Z');
    expect(weekRange(NOW, 'Europe/London', 1).start.toISOString()).toBe('2026-10-26T00:00:00.000Z');
  });

  it('crosses a DST change correctly and falls back to UTC for a bad zone', () => {
    const summer = weekRange(new Date('2026-07-08T12:00:00Z'), 'Europe/London');
    expect(summer.start.toISOString()).toBe('2026-07-05T23:00:00.000Z');
    expect(weekRange(NOW, 'Not/AZone').start.toISOString()).toBe('2026-11-02T00:00:00.000Z');
  });

  it('median handles even, odd and empty lists', () => {
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 10])).toBe(2.5);
  });
});

describe('isCountedAttempt', () => {
  it('counts only server-recorded Exam Sim attempts', () => {
    expect(isCountedAttempt(exam({}))).toBe(true);
    expect(isCountedAttempt(exam({ conductMode: 'coached', countsTowardProgress: false }))).toBe(false);
    expect(isCountedAttempt(exam({ countsTowardProgress: null, conductMode: null }))).toBe(false);
    expect(isCountedAttempt(exam({ conductMode: 'coached', countsTowardProgress: true }))).toBe(false);
  });
});

describe('This week', () => {
  const activity = [
    act({ studentId: 'a', durationSec: 90 }),
    act({ studentId: 'a', durationSec: 90 }),
    act({ studentId: 'a', createdAt: '2026-10-20T10:00:00Z' }), // last week
    act({ studentId: 'b', createdAt: '2026-10-28T10:00:00Z' }), // only last week
    act({ studentId: 'gone' }),
  ];
  const exams = [
    exam({ studentId: 'a', total: 22, createdAt: '2026-10-10T10:00:00Z' }),
    exam({ studentId: 'a', total: 27 }),
    exam({ studentId: 'b', total: 30, conductMode: 'coached', countsTowardProgress: false }),
  ];
  const rows = buildWeekRows(roster, activity, exams, WEEK);

  it('leaves out students who left, and sorts least active first', () => {
    expect(rows.map((r) => r.studentId)).toEqual(['c', 'b', 'a']);
    expect(rows[0].name).toBe('Unnamed student');
    expect(rows[0].lastActiveAt).toBeNull();
  });

  it('counts this week only and keeps practice exams out of the latest counted mark', () => {
    const a = rows.find((r) => r.studentId === 'a')!;
    expect(a.answersThisWeek).toBe(2);
    expect(a.minutesThisWeek).toBe(3); // 90 + 90 s of this week's activity rows
    expect(a.countedExamsThisWeek).toBe(1);
    expect(a.latestCounted).toEqual({ total: 27, n: 2 });
    const b = rows.find((r) => r.studentId === 'b')!;
    expect(b.practiceExamsThisWeek).toBe(1);
    expect(b.latestCounted).toBeNull();
    expect(b.practisedThisWeek).toBe(true); // a Coached exam is still practice
  });

  it('summarises the week for the header and digest', () => {
    const s = summariseWeek(rows, exams, WEEK);
    expect(s).toMatchObject({ activeStudents: 3, practised: 2, notPractisedNames: ['Unnamed student'], countedExams: 1, medianCounted: 27 });
  });
});

describe('Insights', () => {
  it('ranks slips by distinct students, gives one example per student and reports coverage', () => {
    const exams = [
      exam({ studentId: 'a', reportErrors: [
        { quote: 'je mange hier', correction: "j'ai mangé", category: 'tense' },
        { quote: 'je vais hier', correction: 'je suis allé', category: 'tense' },
        { quote: 'je vais hier', correction: 'je suis allé', category: 'tense' },
      ] }),
      exam({ studentId: 'b', reportErrors: [{ quote: 'la problème', correction: 'le problème', category: 'gender' }] }),
      exam({ studentId: 'c', reportErrors: [{ quote: 'il a allé', correction: 'il est allé', category: 'tense' }] }),
      exam({ studentId: 'b', reportErrors: null, qolErrors: [{ quote: 'x', correction: 'y' }] }),
      exam({ studentId: 'a', reportErrors: [{ quote: 'q', correction: 'r', category: 'nonsense' }] }),
    ];
    const slips = commonSlips(exams);
    expect(slips.categories[0]).toMatchObject({ category: 'tense', students: 2, occurrences: 4 });
    expect(slips.categories[0].examples.map((e) => e.studentId)).toEqual(['a', 'c']);
    expect(slips.categories.find((c) => c.category === 'other')?.occurrences).toBe(1);
    expect(slips.categorisedAttempts).toBe(4);
    expect(slips.markedAttempts).toBe(5);
    expect(slips.uncategorisedStudents).toBe(1);
  });

  it('area medians use each student’s latest counted attempt and name the weakest area', () => {
    const report = areaReport([
      exam({ studentId: 'a', rolePlay: 4, communication: 5, qualityOfLanguage: 5, createdAt: '2026-10-01T00:00:00Z' }),
      exam({ studentId: 'a', rolePlay: 8, communication: 12, qualityOfLanguage: 6 }),
      exam({ studentId: 'b', rolePlay: 10, communication: 10, qualityOfLanguage: 8 }),
      exam({ studentId: 'c', rolePlay: 0, communication: 0, qualityOfLanguage: 0, conductMode: 'coached', countsTowardProgress: false }),
    ]);
    expect(report.students).toBe(2);
    expect(report.areas.map((a) => [a.area, a.max, a.median])).toEqual([
      ['rolePlay', 10, 9], ['communication', 15, 11], ['qualityOfLanguage', 15, 7],
    ]);
    expect(report.weakest).toBe('qualityOfLanguage');
    expect(areaReport([]).weakest).toBeNull();
  });

  it('topic stats count Learn answers only and never fabricate an average', () => {
    const stats = topicStats([
      act({ studentId: 'a', topicKey: 'school', score: 6 }),
      act({ studentId: 'b', topicKey: 'school', score: 8 }),
      act({ studentId: 'a', topicKey: 'food', score: null }),
      act({ studentId: 'a', mode: 'exam', topicKey: 'school' }),
    ]);
    expect(stats).toEqual([
      { topicKey: 'school', answers: 2, students: 2, averageScore: 7 },
      { topicKey: 'food', answers: 1, students: 1, averageScore: null },
    ]);
  });

  it('a student summary shows no trend under three counted attempts', () => {
    const two = studentExamSummary('a', [exam({ total: 20, createdAt: '2026-10-01T00:00:00Z' }), exam({ total: 25 })]);
    expect(two).toMatchObject({ latest: 25, best: 25, median: 22.5, change: null });
    const three = studentExamSummary('a', [
      exam({ total: 20, createdAt: '2026-10-01T00:00:00Z' }), exam({ total: 22, createdAt: '2026-10-15T00:00:00Z' }),
      exam({ total: 26 }), exam({ total: 38, conductMode: 'coached', countsTowardProgress: false }),
    ]);
    expect(three.change).toBe(6);
    expect(three.practice).toHaveLength(1);
  });
});

describe('Homework', () => {
  const learn: AssignmentRow = {
    id: 'h1', classId: 'k', kind: 'learn_topic', title: 'Holidays', topicKey: 'holidays', rolePlayCardId: null,
    questionCount: 3, studentIds: null, dueAt: '2026-11-07T17:00:00Z', createdAt: '2026-11-03T09:00:00Z', archivedAt: null,
  };
  const progress: ProgressRow[] = [
    { assignmentId: 'h1', studentId: 'a', learnAnswers: 3, sessions: 1, examAttempts: 0, lastAt: '2026-11-05T10:00:00Z' },
    { assignmentId: 'h1', studentId: 'b', learnAnswers: 0, sessions: 1, examAttempts: 0, lastAt: '2026-11-05T10:00:00Z' },
    { assignmentId: 'h1', studentId: 'c', learnAnswers: 3, sessions: 0, examAttempts: 0, lastAt: '2026-11-08T10:00:00Z' },
  ];

  it('derives done / in progress / late / not started from the server counts', () => {
    const status = assignmentStatus(learn, roster, progress);
    const byStudent = Object.fromEntries(status.cells.map((c) => [c.studentId, c.state]));
    expect(byStudent).toEqual({ a: 'done', b: 'in_progress', c: 'late' });
    expect(status).toMatchObject({ done: 1, late: 1, inProgress: 1, notStarted: 0, assigned: 3 });
  });

  it('respects targeted students and other kinds', () => {
    expect(assignmentStatus({ ...learn, studentIds: ['b'] }, roster, progress).assigned).toBe(1);
    const mock = { ...learn, kind: 'mock_exam' as const, questionCount: null };
    expect(homeworkCell(mock, undefined, 'a', 5)).toMatchObject({ state: 'not_started', detail: 'Not yet' });
    expect(homeworkCell(mock, { learnAnswers: 0, sessions: 0, examAttempts: 1, lastAt: '2026-11-04T00:00:00Z' }, 'a', 5).state).toBe('done');
    const rp = { ...learn, kind: 'role_play' as const };
    expect(homeworkCell(rp, { learnAnswers: 0, sessions: 2, examAttempts: 0, lastAt: null }, 'a', 5).detail).toBe('2 of 5 exchanges');
  });
});

describe('Export and digest', () => {
  it('escapes CSV cells and neutralises formulas', () => {
    expect(csvCell('Smith, Jo')).toBe('"Smith, Jo"');
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell(null)).toBe('');
  });

  it('builds one CSV row per active student with counted marks only', () => {
    const exams = [exam({ studentId: 'a', total: 27 }), exam({ studentId: 'b', total: 33, conductMode: 'coached', countsTowardProgress: false })];
    const weekRows = buildWeekRows(roster, [], exams, WEEK);
    const csv = toCsv(buildExportRows(weekRows, exams, []));
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain('Latest /40');
    expect(lines.find((l) => l.startsWith('Aisha'))).toContain(',27,27,27,');
    expect(lines.find((l) => l.startsWith('Ben'))).toContain(',0,,,,');
  });

  it('the digest names who did not practise and the top slip, and skips empty classes', () => {
    const d = buildDigest('Year 11', { activeStudents: 3, practised: 2, notPractisedNames: ['Ben'], countedExams: 2, medianCounted: 25, totalAnswers: 9, totalMinutes: 30 }, {
      categories: [{ category: 'tense', label: 'Tense', students: 2, occurrences: 5, examples: [] }], categorisedAttempts: 2, markedAttempts: 2, uncategorisedStudents: 0,
    });
    expect(d.subject).toBe('Year 11 — last week');
    expect(d.lines).toEqual([
      "2 of 3 practised · 1 didn't (Ben)",
      '2 counted mock exams · class median 25/40',
      'Most common slip: tense (2 students, from 2 marked exams with a report)',
    ]);
    expect(buildDigest('Empty', { activeStudents: 0, practised: 0, notPractisedNames: [], countedExams: 0, medianCounted: null, totalAnswers: 0, totalMinutes: 0 }, { categories: [], categorisedAttempts: 0, markedAttempts: 0, uncategorisedStudents: 0 }).worthSending).toBe(false);
  });
});
