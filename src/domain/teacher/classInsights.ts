/**
 * The teacher dashboard's numbers (docs/systems/teacher-dashboard.md §3–§4). Pure functions
 * over the rows the class-scoped RPCs return. Rules that every function here keeps:
 *
 *  - Mark summaries use only attempts the server recorded as counting toward progress
 *    (ADR 0007). An attempt with no server record (scored before the record existed) or a
 *    Coached one is shown as practice and never feeds a median, trend or "latest".
 *  - Every number says how much evidence is behind it (`n`, coverage). No trend under
 *    TREND_MIN_ATTEMPTS counted attempts.
 *  - No grade (A*–G): Cambridge grade thresholds are not in rubric.ts (Core rule 3). Area
 *    maxima come from rubric.ts, never restated here.
 *  - Nothing here changes or recomputes a mark; it only reads the envelope's marks.
 */
import { COMMUNICATION, QUALITY_OF_LANGUAGE, ROLE_PLAY, TOTAL_MARKS } from '../igcse/rubric';
import { ERROR_CATEGORY_LABELS, type ErrorCategory } from '../examFeedback/shared/errorCategories';
import type { ActivityRow, AssignmentRow, ExamAttemptRow, ProgressRow, RosterRow } from './types';
import { inRange, median, type WeekRange } from './week';

export const TREND_MIN_ATTEMPTS = 3;
export { TOTAL_MARKS };

/** Server-recorded "counts toward progress" — the only attempts mark summaries use. */
export function isCountedAttempt(a: Pick<ExamAttemptRow, 'countsTowardProgress' | 'conductMode'>): boolean {
  return a.countsTowardProgress === true && a.conductMode !== 'coached';
}

function displayName(r: Pick<RosterRow, 'displayName'>): string {
  return r.displayName?.trim() || 'Unnamed student';
}

// ── This week (Q1) ──────────────────────────────────────────────────────────

export interface WeekStudentRow {
  studentId: string;
  name: string;
  joinedAt: string;
  /** Most recent activity of any kind since joining, or null if none yet. */
  lastActiveAt: string | null;
  /** Learn answers, role-play turns and other practice this week (exams counted separately). */
  answersThisWeek: number;
  /** Speaking time this week, whole minutes (exams included). */
  minutesThisWeek: number;
  /** Marked exams this week that count (Exam Sim, not edited/typed). */
  countedExamsThisWeek: number;
  /** Practice-only (Coached etc.) exams this week. */
  practiceExamsThisWeek: number;
  /** Latest counted /40 since joining, with how many counted attempts exist. */
  latestCounted: { total: number; n: number } | null;
  /** True when the student has practised at all this week. */
  practisedThisWeek: boolean;
}

export function buildWeekRows(roster: RosterRow[], activity: ActivityRow[], exams: ExamAttemptRow[], week: WeekRange): WeekStudentRow[] {
  const active = roster.filter((r) => r.status === 'active');
  const rows = active.map((member): WeekStudentRow => {
    const mine = activity.filter((a) => a.studentId === member.studentId);
    const myExams = exams.filter((e) => e.studentId === member.studentId);
    const weekActivity = mine.filter((a) => inRange(a.createdAt, week));
    const weekExams = myExams.filter((e) => inRange(e.createdAt, week));
    const practiceRows = weekActivity.filter((a) => a.mode !== 'exam');
    const counted = myExams.filter(isCountedAttempt).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const lastTimes = [...mine.map((a) => a.createdAt), ...myExams.map((e) => e.createdAt)].sort();
    const seconds = weekActivity.reduce((sum, a) => sum + Math.max(0, a.durationSec), 0);
    const countedThisWeek = weekExams.filter(isCountedAttempt).length;
    return {
      studentId: member.studentId,
      name: displayName(member),
      joinedAt: member.joinedAt,
      lastActiveAt: lastTimes.length > 0 ? lastTimes[lastTimes.length - 1] : null,
      answersThisWeek: practiceRows.length,
      minutesThisWeek: Math.round(seconds / 60),
      countedExamsThisWeek: countedThisWeek,
      practiceExamsThisWeek: weekExams.length - countedThisWeek,
      latestCounted: counted.length > 0 ? { total: counted[0].total, n: counted.length } : null,
      practisedThisWeek: practiceRows.length > 0 || weekExams.length > 0,
    };
  });
  // Least active first: the students who need a nudge are at the top, not buried.
  return rows.sort((a, b) => {
    const activityA = a.answersThisWeek + a.countedExamsThisWeek + a.practiceExamsThisWeek;
    const activityB = b.answersThisWeek + b.countedExamsThisWeek + b.practiceExamsThisWeek;
    if (activityA !== activityB) return activityA - activityB;
    const lastA = a.lastActiveAt ?? '';
    const lastB = b.lastActiveAt ?? '';
    if (lastA !== lastB) return lastA.localeCompare(lastB);
    return a.name.localeCompare(b.name);
  });
}

export interface WeekSummary {
  activeStudents: number;
  practised: number;
  notPractisedNames: string[];
  countedExams: number;
  /** Median of this week's counted /40s; null when there are none. */
  medianCounted: number | null;
  totalAnswers: number;
  totalMinutes: number;
}

export function summariseWeek(rows: WeekStudentRow[], exams: ExamAttemptRow[], week: WeekRange): WeekSummary {
  const ids = new Set(rows.map((r) => r.studentId));
  const counted = exams.filter((e) => ids.has(e.studentId) && inRange(e.createdAt, week) && isCountedAttempt(e));
  return {
    activeStudents: rows.length,
    practised: rows.filter((r) => r.practisedThisWeek).length,
    notPractisedNames: rows.filter((r) => !r.practisedThisWeek).map((r) => r.name),
    countedExams: counted.length,
    medianCounted: median(counted.map((e) => e.total)),
    totalAnswers: rows.reduce((s, r) => s + r.answersThisWeek, 0),
    totalMinutes: rows.reduce((s, r) => s + r.minutesThisWeek, 0),
  };
}

// ── Insights (Q2) ───────────────────────────────────────────────────────────

export interface SlipExample {
  studentId: string;
  quote: string;
  correction: string;
}

export interface SlipCategory {
  category: ErrorCategory;
  label: string;
  /** Distinct students who made at least one slip of this kind. */
  students: number;
  /** Total slips of this kind (shown second — one student repeating it must not dominate). */
  occurrences: number;
  examples: SlipExample[];
}

export interface CommonSlips {
  categories: SlipCategory[];
  /** Marked attempts whose post-marking report exists (only those carry categories). */
  categorisedAttempts: number;
  markedAttempts: number;
  /** Students with listed errors in attempts that have no report yet (uncategorised). */
  uncategorisedStudents: number;
}

const KNOWN_CATEGORIES = new Set(Object.keys(ERROR_CATEGORY_LABELS));

export function commonSlips(exams: ExamAttemptRow[], maxExamples = 3): CommonSlips {
  const byCategory = new Map<ErrorCategory, { students: Set<string>; occurrences: number; examples: SlipExample[] }>();
  const uncategorised = new Set<string>();
  let categorisedAttempts = 0;
  for (const exam of exams) {
    if (exam.reportErrors === null) {
      if (exam.qolErrors.length > 0) uncategorised.add(exam.studentId);
      continue;
    }
    categorisedAttempts += 1;
    for (const err of exam.reportErrors) {
      const category = (err.category && KNOWN_CATEGORIES.has(err.category) ? err.category : 'other') as ErrorCategory;
      const entry = byCategory.get(category) ?? { students: new Set<string>(), occurrences: 0, examples: [] };
      entry.students.add(exam.studentId);
      entry.occurrences += 1;
      // One example per student, so the examples show the spread, not one learner's habit.
      if (entry.examples.length < maxExamples && !entry.examples.some((e) => e.studentId === exam.studentId)) {
        entry.examples.push({ studentId: exam.studentId, quote: err.quote, correction: err.correction });
      }
      byCategory.set(category, entry);
    }
  }
  const categories = [...byCategory.entries()]
    .map(([category, v]) => ({
      category,
      label: ERROR_CATEGORY_LABELS[category],
      students: v.students.size,
      occurrences: v.occurrences,
      examples: v.examples,
    }))
    // 'other' is never the headline unless it is all there is.
    .sort((a, b) => (b.students - a.students) || (b.occurrences - a.occurrences) || (a.category === 'other' ? 1 : b.category === 'other' ? -1 : 0));
  return { categories, categorisedAttempts, markedAttempts: exams.length, uncategorisedStudents: uncategorised.size };
}

export type Area = 'rolePlay' | 'communication' | 'qualityOfLanguage';

export interface AreaSummary {
  area: Area;
  label: string;
  max: number;
  /** Class median over counted attempts (latest counted attempt per student), or null. */
  median: number | null;
  /** median / max, for comparing areas of different sizes. */
  fraction: number | null;
}

export interface AreaReport {
  areas: AreaSummary[];
  /** Students whose latest counted attempt fed the medians. */
  students: number;
  /** The area furthest below its maximum, when there is any evidence. */
  weakest: Area | null;
}

export function areaReport(exams: ExamAttemptRow[]): AreaReport {
  const latestByStudent = new Map<string, ExamAttemptRow>();
  for (const e of exams.filter(isCountedAttempt)) {
    const prev = latestByStudent.get(e.studentId);
    if (!prev || e.createdAt > prev.createdAt) latestByStudent.set(e.studentId, e);
  }
  const latest = [...latestByStudent.values()];
  const make = (area: Area, label: string, max: number, pick: (e: ExamAttemptRow) => number): AreaSummary => {
    const m = median(latest.map(pick));
    return { area, label, max, median: m, fraction: m === null ? null : m / max };
  };
  const areas = [
    make('rolePlay', ROLE_PLAY.name, ROLE_PLAY.maxMarks, (e) => e.rolePlay),
    make('communication', 'Communication', COMMUNICATION.maxMarks, (e) => e.communication),
    make('qualityOfLanguage', 'Quality of language', QUALITY_OF_LANGUAGE.maxMarks, (e) => e.qualityOfLanguage),
  ];
  const withEvidence = areas.filter((a) => a.fraction !== null);
  const weakest = withEvidence.length > 0
    ? withEvidence.reduce((lo, a) => ((a.fraction as number) < (lo.fraction as number) ? a : lo)).area
    : null;
  return { areas, students: latest.length, weakest };
}

export interface TopicStat {
  topicKey: string;
  answers: number;
  students: number;
  /** Mean of real /10 scores; null when none were scored (never a fabricated 0). */
  averageScore: number | null;
}

/** Learn practice by topic (exam rows and other modes left out). */
export function topicStats(activity: ActivityRow[]): TopicStat[] {
  const byTopic = new Map<string, { answers: number; students: Set<string>; scores: number[] }>();
  for (const a of activity) {
    if (a.mode !== 'practice' || !a.topicKey) continue;
    const entry = byTopic.get(a.topicKey) ?? { answers: 0, students: new Set<string>(), scores: [] };
    entry.answers += 1;
    entry.students.add(a.studentId);
    if (typeof a.score === 'number') entry.scores.push(a.score);
    byTopic.set(a.topicKey, entry);
  }
  return [...byTopic.entries()]
    .map(([topicKey, v]) => ({
      topicKey,
      answers: v.answers,
      students: v.students.size,
      averageScore: v.scores.length > 0 ? Math.round((v.scores.reduce((s, x) => s + x, 0) / v.scores.length) * 10) / 10 : null,
    }))
    .sort((a, b) => b.answers - a.answers || a.topicKey.localeCompare(b.topicKey));
}

// ── One student ─────────────────────────────────────────────────────────────

export interface StudentExamSummary {
  counted: ExamAttemptRow[];
  practice: ExamAttemptRow[];
  latest: number | null;
  best: number | null;
  median: number | null;
  /** Only with ≥ TREND_MIN_ATTEMPTS counted attempts: last minus first. */
  change: number | null;
}

export function studentExamSummary(studentId: string, exams: ExamAttemptRow[]): StudentExamSummary {
  const mine = exams.filter((e) => e.studentId === studentId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const counted = mine.filter(isCountedAttempt);
  const totals = counted.map((e) => e.total);
  return {
    counted,
    practice: mine.filter((e) => !isCountedAttempt(e)),
    latest: totals.length > 0 ? totals[totals.length - 1] : null,
    best: totals.length > 0 ? Math.max(...totals) : null,
    median: median(totals),
    change: totals.length >= TREND_MIN_ATTEMPTS ? totals[totals.length - 1] - totals[0] : null,
  };
}

// ── Homework (Q3) ───────────────────────────────────────────────────────────

export type HomeworkState = 'not_started' | 'in_progress' | 'done' | 'late';

export interface HomeworkCell {
  studentId: string;
  state: HomeworkState;
  /** "2 of 5", "1 mock", … */
  detail: string;
  lastAt: string | null;
}

/** How much a learner has done of one assignment, from the server's counts. */
export function homeworkCell(
  assignment: Pick<AssignmentRow, 'kind' | 'questionCount' | 'dueAt'>,
  progress: Pick<ProgressRow, 'learnAnswers' | 'sessions' | 'examAttempts' | 'lastAt'> | undefined,
  studentId: string,
  rolePlayTasks: number,
): HomeworkCell {
  const p = progress ?? { learnAnswers: 0, sessions: 0, examAttempts: 0, lastAt: null };
  let done = 0;
  let needed = 1;
  let detail = '';
  if (assignment.kind === 'learn_topic') {
    needed = Math.max(1, assignment.questionCount ?? 1);
    done = Math.min(needed, Math.max(p.learnAnswers, p.sessions));
    detail = `${done} of ${needed}`;
  } else if (assignment.kind === 'role_play') {
    needed = Math.max(1, rolePlayTasks);
    done = Math.min(needed, p.sessions);
    detail = `${done} of ${needed} exchanges`;
  } else {
    done = Math.min(1, Math.max(p.examAttempts, 0));
    detail = done > 0 ? 'Marked' : 'Not yet';
  }
  let state: HomeworkState = done === 0 ? 'not_started' : done < needed ? 'in_progress' : 'done';
  if (state === 'done' && p.lastAt && new Date(p.lastAt).getTime() > new Date(assignment.dueAt).getTime()) state = 'late';
  return { studentId, state, detail, lastAt: p.lastAt };
}

export interface AssignmentStatus {
  assignmentId: string;
  cells: HomeworkCell[];
  done: number;
  late: number;
  inProgress: number;
  notStarted: number;
  /** Students this assignment is for (targeted, else the whole active class). */
  assigned: number;
}

export function assignmentStatus(
  assignment: AssignmentRow,
  roster: RosterRow[],
  progress: ProgressRow[],
  rolePlayTasks = 5,
): AssignmentStatus {
  const targets = roster.filter(
    (r) => r.status === 'active' && (assignment.studentIds === null || assignment.studentIds.includes(r.studentId)),
  );
  const cells = targets.map((r) =>
    homeworkCell(
      assignment,
      progress.find((p) => p.assignmentId === assignment.id && p.studentId === r.studentId),
      r.studentId,
      rolePlayTasks,
    ),
  );
  return {
    assignmentId: assignment.id,
    cells,
    done: cells.filter((c) => c.state === 'done').length,
    late: cells.filter((c) => c.state === 'late').length,
    inProgress: cells.filter((c) => c.state === 'in_progress').length,
    notStarted: cells.filter((c) => c.state === 'not_started').length,
    assigned: targets.length,
  };
}

// ── Export (Stage 5) ────────────────────────────────────────────────────────

export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  // Neutralise spreadsheet formula injection and quote anything with separators.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export interface ExportRow {
  name: string;
  joinedAt: string;
  answersThisWeek: number;
  minutesThisWeek: number;
  countedAttempts: number;
  latest: number | null;
  best: number | null;
  median: number | null;
  latestRolePlay: number | null;
  latestCommunication: number | null;
  latestQualityOfLanguage: number | null;
  homeworkDone: number;
  homeworkSet: number;
}

export function buildExportRows(
  weekRows: WeekStudentRow[],
  exams: ExamAttemptRow[],
  statuses: AssignmentStatus[],
): ExportRow[] {
  return weekRows
    .map((w) => {
      const s = studentExamSummary(w.studentId, exams);
      const last = s.counted[s.counted.length - 1];
      const cells = statuses.flatMap((st) => st.cells.filter((c) => c.studentId === w.studentId));
      return {
        name: w.name,
        joinedAt: w.joinedAt.slice(0, 10),
        answersThisWeek: w.answersThisWeek,
        minutesThisWeek: w.minutesThisWeek,
        countedAttempts: s.counted.length,
        latest: s.latest,
        best: s.best,
        median: s.median,
        latestRolePlay: last ? last.rolePlay : null,
        latestCommunication: last ? last.communication : null,
        latestQualityOfLanguage: last ? last.qualityOfLanguage : null,
        homeworkDone: cells.filter((c) => c.state === 'done' || c.state === 'late').length,
        homeworkSet: cells.length,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function toCsv(rows: ExportRow[]): string {
  const header = [
    'Student', 'Joined', 'Answers this week', 'Minutes this week', 'Counted mock exams',
    `Latest /${TOTAL_MARKS}`, `Best /${TOTAL_MARKS}`, `Median /${TOTAL_MARKS}`,
    `Latest role play /${ROLE_PLAY.maxMarks}`, `Latest communication /${COMMUNICATION.maxMarks}`,
    `Latest quality of language /${QUALITY_OF_LANGUAGE.maxMarks}`, 'Homework done', 'Homework set',
  ];
  const lines = rows.map((r) =>
    [
      r.name, r.joinedAt, r.answersThisWeek, r.minutesThisWeek, r.countedAttempts, r.latest, r.best, r.median,
      r.latestRolePlay, r.latestCommunication, r.latestQualityOfLanguage, r.homeworkDone, r.homeworkSet,
    ].map(csvCell).join(','),
  );
  return [header.map(csvCell).join(','), ...lines].join('\r\n') + '\r\n';
}

// ── Monday digest (shared with scripts/scheduledJobs/sendTeacherDigest.ts) ──

export interface DigestContent {
  subject: string;
  lines: string[];
  /** False when the class has no active students — nothing is sent. */
  worthSending: boolean;
}

export function buildDigest(className: string, summary: WeekSummary, slips: CommonSlips): DigestContent {
  const lines: string[] = [];
  const names = summary.notPractisedNames;
  const shown = names.slice(0, 6).join(', ') + (names.length > 6 ? `, +${names.length - 6} more` : '');
  lines.push(
    `${summary.practised} of ${summary.activeStudents} practised` +
      (names.length > 0 ? ` · ${names.length} didn't (${shown})` : ' · everyone practised'),
  );
  lines.push(
    summary.countedExams > 0
      ? `${summary.countedExams} counted mock ${summary.countedExams === 1 ? 'exam' : 'exams'} · class median ${summary.medianCounted}/${TOTAL_MARKS}`
      : 'No counted mock exams last week',
  );
  const top = slips.categories[0];
  if (top) {
    lines.push(`Most common slip: ${top.label.toLowerCase()} (${top.students} ${top.students === 1 ? 'student' : 'students'}, from ${slips.categorisedAttempts} marked ${slips.categorisedAttempts === 1 ? 'exam' : 'exams'} with a report)`);
  }
  return { subject: `${className} — last week`, lines, worthSending: summary.activeStudents > 0 };
}
