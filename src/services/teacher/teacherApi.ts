/**
 * Teacher dashboard data access (docs/systems/teacher-dashboard.md; ADR 0014).
 *
 * Every call is a Supabase RPC from backend migration 20261103091000. A teacher
 * reads a student's data ONLY through the class-scoped teacher_* functions, which
 * check the caller owns the class and the student is an active member, and return
 * rows from the student's join date onward. Nothing here reads local-only data
 * (notebook, speaking log, Pronunciation Lab history — see their privacy tests).
 *
 * Errors are mapped to a small code set so screens can show plain language.
 */
import { supabase, supabaseConfigured } from '../../lib/supabase';
import type {
  ActivityRow, AssignmentKind, AssignmentRow, ExamAttemptRow, ExamMarksRow, ProgressRow, QolErrorRow, RosterRow,
} from '../../domain/teacher/types';
import { boolOrNull, num, numOrNull, str, strOrNull, toActivityRow, toExamAttemptRow } from '../../domain/teacher/rows';

export { toActivityRow, toExamAttemptRow };
export type {
  ActivityRow, AssignmentKind, AssignmentRow, ExamAttemptRow, ExamMarksRow, ProgressRow, QolErrorRow, RosterRow,
};

export type TeacherErrorCode =
  | 'offline'
  | 'not_authenticated'
  | 'forbidden'
  | 'not_a_teacher'
  | 'invalid_code'
  | 'code_expired'
  | 'code_used_up'
  | 'invalid_display_name'
  | 'invalid_name'
  | 'too_many_classes'
  | 'own_class'
  | 'already_in_class'
  | 'class_full'
  | 'invalid_due_date'
  | 'invalid_assignment'
  | 'invalid_students'
  | 'too_many_assignments'
  | 'invalid_mark_set'
  | 'invalid_total'
  | 'not_found'
  | 'unknown';

const KNOWN_CODES: TeacherErrorCode[] = [
  'not_authenticated', 'forbidden', 'not_a_teacher', 'invalid_code', 'code_expired', 'code_used_up',
  'invalid_display_name', 'invalid_name', 'too_many_classes', 'own_class', 'already_in_class', 'class_full',
  'invalid_due_date', 'invalid_assignment', 'invalid_students', 'too_many_assignments', 'invalid_mark_set',
  'invalid_total', 'not_found',
];

export class TeacherApiError extends Error {
  constructor(public readonly code: TeacherErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'TeacherApiError';
  }
}

export function mapTeacherError(message: string | undefined | null): TeacherApiError {
  const text = message ?? '';
  const code = KNOWN_CODES.find((c) => text.includes(c)) ?? 'unknown';
  return new TeacherApiError(code, text || code);
}

const ERROR_COPY: Record<TeacherErrorCode, string> = {
  offline: 'You need to be online and signed in for this.',
  not_authenticated: 'Please sign in again.',
  forbidden: "You don't have access to this class.",
  not_a_teacher: 'This account is not set up as a teacher yet.',
  invalid_code: "That code doesn't match an open class. Check it with your teacher.",
  code_expired: 'That teacher invite code has expired.',
  code_used_up: 'That teacher invite code has already been used.',
  invalid_display_name: 'Enter the name students will see (up to 60 characters).',
  invalid_name: 'Enter a class name (up to 60 characters).',
  too_many_classes: 'You can have up to 20 classes. Archive one first.',
  own_class: "That's your own class — students join it with this code.",
  already_in_class: "You're already in another class.",
  class_full: 'This class is full (60 students).',
  invalid_due_date: 'Pick a due date in the future.',
  invalid_assignment: 'Some homework details are missing.',
  invalid_students: 'Pick at least one student who is in the class.',
  too_many_assignments: 'This class already has 30 open pieces of homework.',
  invalid_mark_set: "That mark couldn't be saved.",
  invalid_total: 'A total must be between 0 and 40.',
  not_found: "That attempt isn't available (the student may have left the class).",
  unknown: 'Something went wrong. Please try again.',
};

export function teacherErrorMessage(err: unknown): string {
  if (err instanceof TeacherApiError) return ERROR_COPY[err.code];
  return ERROR_COPY.unknown;
}

async function rpc<T>(name: string, params?: Record<string, unknown>): Promise<T> {
  if (!supabaseConfigured) throw new TeacherApiError('offline');
  const { data, error } = await supabase.rpc(name, params ?? {});
  if (error) throw mapTeacherError(error.message);
  return data as T;
}

// ── Rows ────────────────────────────────────────────────────────────────────

export interface TeacherProfile {
  userId: string;
  displayName: string;
  schoolName: string | null;
  digestOptOut: boolean;
}

export interface ClassRow {
  id: string;
  name: string;
  examYear: string | null;
  joinCode: string;
  codeActive: boolean;
  timezone: string;
  digestEnabled: boolean;
  createdAt: string;
}

export interface StudentSessionRow extends Omit<ActivityRow, 'studentId' | 'cefrLevel' | 'criticalCount'> {
  questionText: string | null;
  transcript: string | null;
  feedback: Record<string, unknown> | null;
}

export interface MyAssignment {
  id: string;
  kind: AssignmentKind;
  title: string;
  topicKey: string | null;
  rolePlayCardId: string | null;
  questionCount: number | null;
  dueAt: string;
  createdAt: string;
  className: string;
  teacherName: string;
}

export interface MyClass {
  classId: string;
  className: string;
  examYear: string | null;
  teacherName: string;
  joinedAt: string;
}

export interface ClassPreview {
  classId: string;
  className: string;
  examYear: string | null;
  teacherName: string;
  isOwnClass: boolean;
  alreadyMember: boolean;
  currentClassName: string | null;
}

export interface ExamAttemptDetail {
  studentId: string;
  studentName: string | null;
  attemptId: string;
  sessionId: string;
  createdAt: string;
  envelope: unknown;
  report: unknown | null;
  conductMode: 'examSim' | 'coached' | null;
  countsTowardProgress: boolean | null;
  assignmentId: string | null;
  teacherMarkSet: unknown | null;
  teacherShared: boolean;
  teacherMarkedAt: string | null;
}

export interface SharedTeacherMark {
  attemptId: string;
  sessionId: string;
  total: number;
  markSet: unknown;
  teacherName: string;
  updatedAt: string;
}

// ── Mappers ─────────────────────────────────────────────────────────────────
// The row mappers live in domain/teacher/rows.ts (pure — the Monday digest script
// imports them too, and must not load this browser module).

type Raw = Record<string, unknown>;
function toAssignmentRow(r: Raw): AssignmentRow {
  return {
    id: str(r.id),
    classId: str(r.class_id),
    kind: str(r.kind) as AssignmentKind,
    title: str(r.title),
    topicKey: strOrNull(r.topic_key),
    rolePlayCardId: strOrNull(r.role_play_card_id),
    questionCount: numOrNull(r.question_count),
    studentIds: Array.isArray(r.student_ids) ? (r.student_ids as string[]) : null,
    dueAt: str(r.due_at),
    createdAt: str(r.created_at),
    archivedAt: strOrNull(r.archived_at),
  };
}

function toClassRow(r: Raw): ClassRow {
  return {
    id: str(r.id),
    name: str(r.name),
    examYear: strOrNull(r.exam_year),
    joinCode: str(r.join_code),
    codeActive: r.code_active === true,
    timezone: str(r.timezone) || 'Europe/London',
    digestEnabled: r.digest_enabled !== false,
    createdAt: str(r.created_at),
  };
}

// ── Teacher setup ───────────────────────────────────────────────────────────

export async function getMyTeacherProfile(userId: string): Promise<TeacherProfile | null> {
  if (!supabaseConfigured) return null;
  const { data, error } = await supabase
    .from('teacher_profiles')
    .select('user_id, display_name, school_name, digest_opt_out')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw mapTeacherError(error.message);
  if (!data) return null;
  const r = data as Raw;
  return {
    userId: str(r.user_id),
    displayName: str(r.display_name),
    schoolName: strOrNull(r.school_name),
    digestOptOut: r.digest_opt_out === true,
  };
}

export async function redeemTeacherInvite(code: string, displayName: string, schoolName: string): Promise<void> {
  await rpc('redeem_teacher_invite', { p_code: code.trim(), p_display_name: displayName.trim(), p_school_name: schoolName.trim() || null });
}

export async function setTeacherDigestOptOut(optOut: boolean): Promise<void> {
  await rpc('set_teacher_digest_opt_out', { p_opt_out: optOut });
}

// ── Classes ─────────────────────────────────────────────────────────────────

export async function listMyClasses(): Promise<ClassRow[]> {
  if (!supabaseConfigured) throw new TeacherApiError('offline');
  const { data, error } = await supabase
    .from('classes')
    .select('id, name, exam_year, join_code, code_active, timezone, digest_enabled, created_at')
    .is('archived_at', null)
    .order('created_at', { ascending: true });
  if (error) throw mapTeacherError(error.message);
  return ((data ?? []) as Raw[]).map(toClassRow);
}

export async function getClass(classId: string): Promise<ClassRow | null> {
  return (await listMyClasses()).find((c) => c.id === classId) ?? null;
}

export async function createClass(name: string, examYear: string, timezone: string): Promise<{ classId: string; joinCode: string }> {
  const r = await rpc<Raw>('create_class', { p_name: name.trim(), p_exam_year: examYear.trim() || null, p_timezone: timezone });
  return { classId: str(r.class_id), joinCode: str(r.join_code) };
}

export async function updateClass(c: Pick<ClassRow, 'id' | 'name' | 'examYear' | 'timezone' | 'digestEnabled'>): Promise<void> {
  await rpc('update_class', {
    p_class_id: c.id, p_name: c.name.trim(), p_exam_year: c.examYear?.trim() || null,
    p_timezone: c.timezone, p_digest_enabled: c.digestEnabled,
  });
}

export async function rotateClassCode(classId: string): Promise<string> {
  return str((await rpc<Raw>('rotate_class_code', { p_class_id: classId })).join_code);
}

export async function setClassCodeActive(classId: string, active: boolean): Promise<void> {
  await rpc('set_class_code_active', { p_class_id: classId, p_active: active });
}

export async function archiveClass(classId: string): Promise<void> {
  await rpc('archive_class', { p_class_id: classId });
}

export async function removeClassMember(classId: string, studentId: string): Promise<void> {
  await rpc('remove_class_member', { p_class_id: classId, p_student_id: studentId });
}

// ── Teacher reads ───────────────────────────────────────────────────────────

export async function getRoster(classId: string): Promise<RosterRow[]> {
  const rows = await rpc<Raw[]>('teacher_class_roster', { p_class_id: classId });
  return (rows ?? []).map((r) => ({
    studentId: str(r.student_id),
    displayName: strOrNull(r.display_name),
    status: (str(r.status) || 'active') as RosterRow['status'],
    joinedAt: str(r.joined_at),
    endedAt: strOrNull(r.ended_at),
  }));
}

export async function getClassActivity(classId: string, since: Date): Promise<ActivityRow[]> {
  const rows = await rpc<Raw[]>('teacher_class_sessions', { p_class_id: classId, p_since: since.toISOString() });
  return (rows ?? []).map(toActivityRow);
}

export async function getClassExams(classId: string, since: Date): Promise<ExamAttemptRow[]> {
  const rows = await rpc<Raw[]>('teacher_class_exams', { p_class_id: classId, p_since: since.toISOString() });
  return (rows ?? []).map(toExamAttemptRow);
}

export async function getStudentSessions(classId: string, studentId: string, since: Date): Promise<StudentSessionRow[]> {
  const rows = await rpc<Raw[]>('teacher_student_sessions', {
    p_class_id: classId, p_student_id: studentId, p_since: since.toISOString(),
  });
  return (rows ?? []).map((r) => {
    const { studentId: _s, cefrLevel: _c, criticalCount: _k, ...rest } = toActivityRow(r);
    void _s; void _c; void _k;
    return {
      ...rest,
      questionText: strOrNull(r.question_text),
      transcript: strOrNull(r.transcript),
      feedback: r.feedback && typeof r.feedback === 'object' ? (r.feedback as Record<string, unknown>) : null,
    };
  });
}

export async function getExamAttempt(classId: string, attemptId: string): Promise<ExamAttemptDetail> {
  const r = await rpc<Raw>('teacher_exam_attempt', { p_class_id: classId, p_attempt_id: attemptId });
  const mode = r.conduct_mode;
  return {
    studentId: str(r.student_id),
    studentName: strOrNull(r.student_name),
    attemptId: str(r.attempt_id),
    sessionId: str(r.session_id),
    createdAt: str(r.created_at),
    envelope: r.envelope,
    report: r.report ?? null,
    conductMode: mode === 'examSim' || mode === 'coached' ? mode : null,
    countsTowardProgress: boolOrNull(r.counts_toward_progress),
    assignmentId: strOrNull(r.assignment_id),
    teacherMarkSet: r.teacher_mark_set ?? null,
    teacherShared: r.teacher_shared === true,
    teacherMarkedAt: strOrNull(r.teacher_marked_at),
  };
}

export async function saveTeacherMark(
  classId: string, attemptId: string, markSet: unknown, total: number, shared: boolean,
): Promise<void> {
  await rpc('save_teacher_mark', {
    p_class_id: classId, p_attempt_id: attemptId, p_mark_set: markSet, p_total: total, p_shared: shared,
  });
}

// ── Assignments ─────────────────────────────────────────────────────────────

export async function listAssignments(classId: string): Promise<AssignmentRow[]> {
  if (!supabaseConfigured) throw new TeacherApiError('offline');
  const { data, error } = await supabase
    .from('assignments')
    .select('id, class_id, kind, title, topic_key, role_play_card_id, question_count, student_ids, due_at, created_at, archived_at')
    .eq('class_id', classId)
    .is('archived_at', null)
    .order('due_at', { ascending: false });
  if (error) throw mapTeacherError(error.message);
  return ((data ?? []) as Raw[]).map(toAssignmentRow);
}

export interface NewAssignment {
  classId: string;
  kind: AssignmentKind;
  title: string;
  topicKey?: string | null;
  rolePlayCardId?: string | null;
  questionCount?: number | null;
  dueAt: Date;
  /** Empty/undefined = the whole class. */
  studentIds?: string[];
}

export async function createAssignment(a: NewAssignment): Promise<string> {
  const r = await rpc<Raw>('create_assignment', {
    p_class_id: a.classId,
    p_kind: a.kind,
    p_title: a.title.trim(),
    p_topic_key: a.topicKey ?? null,
    p_role_play_card_id: a.rolePlayCardId ?? null,
    p_question_count: a.questionCount ?? null,
    p_due_at: a.dueAt.toISOString(),
    p_student_ids: a.studentIds && a.studentIds.length > 0 ? a.studentIds : null,
  });
  return str(r.assignment_id);
}

export async function getAssignmentProgress(classId: string): Promise<ProgressRow[]> {
  const rows = await rpc<Raw[]>('teacher_assignment_progress', { p_class_id: classId });
  return (rows ?? []).map((r) => ({
    assignmentId: str(r.assignment_id),
    studentId: str(r.student_id),
    learnAnswers: num(r.learn_answers),
    sessions: num(r.sessions),
    examAttempts: num(r.exam_attempts),
    lastAt: strOrNull(r.last_at),
  }));
}

export async function archiveAssignment(assignmentId: string): Promise<void> {
  await rpc('archive_assignment', { p_assignment_id: assignmentId });
}

// ── Student side ────────────────────────────────────────────────────────────

export async function previewClass(code: string): Promise<ClassPreview> {
  const r = await rpc<Raw>('preview_class', { p_code: code.trim() });
  return {
    classId: str(r.class_id),
    className: str(r.class_name),
    examYear: strOrNull(r.exam_year),
    teacherName: str(r.teacher_name),
    isOwnClass: r.is_own_class === true,
    alreadyMember: r.already_member === true,
    currentClassName: strOrNull(r.current_class_name),
  };
}

export async function joinClass(code: string, leaveCurrent: boolean): Promise<string> {
  return str((await rpc<Raw>('join_class', { p_code: code.trim(), p_leave_current: leaveCurrent })).class_id);
}

export async function leaveClass(): Promise<void> {
  await rpc('leave_class');
}

export async function getMyClass(): Promise<MyClass | null> {
  const r = await rpc<Raw>('my_class');
  const c = r?.class as Raw | null | undefined;
  if (!c) return null;
  return {
    classId: str(c.class_id),
    className: str(c.class_name),
    examYear: strOrNull(c.exam_year),
    teacherName: str(c.teacher_name),
    joinedAt: str(c.joined_at),
  };
}

export async function getMyAssignments(): Promise<MyAssignment[]> {
  const rows = await rpc<Raw[]>('my_assignments');
  return (rows ?? []).map((r) => ({
    id: str(r.id),
    kind: str(r.kind) as AssignmentKind,
    title: str(r.title),
    topicKey: strOrNull(r.topic_key),
    rolePlayCardId: strOrNull(r.role_play_card_id),
    questionCount: numOrNull(r.question_count),
    dueAt: str(r.due_at),
    createdAt: str(r.created_at),
    className: str(r.class_name),
    teacherName: str(r.teacher_name),
  }));
}

export async function getMySharedTeacherMarks(): Promise<SharedTeacherMark[]> {
  const rows = await rpc<Raw[]>('my_shared_teacher_marks');
  return (rows ?? []).map((r) => ({
    attemptId: str(r.attempt_id),
    sessionId: str(r.session_id),
    total: num(r.total),
    markSet: r.mark_set,
    teacherName: str(r.teacher_name),
    updatedAt: str(r.updated_at),
  }));
}
