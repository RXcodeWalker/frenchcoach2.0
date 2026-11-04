/**
 * Pure mappers from the teacher RPCs' snake_case rows to domain/teacher/types.ts.
 * Shared by services/teacher/teacherApi.ts and scripts/scheduledJobs/sendTeacherDigest.ts.
 */
import type { ActivityRow, ExamAttemptRow, ExamMarksRow, QolErrorRow } from './types';


type Raw = Record<string, unknown>;
export const str = (v: unknown): string => (typeof v === 'string' ? v : '');
export const strOrNull = (v: unknown): string | null => (typeof v === 'string' ? v : null);
export const num = (v: unknown): number => (typeof v === 'number' ? v : typeof v === 'string' && v !== '' ? Number(v) : 0);
export const numOrNull = (v: unknown): number | null =>
  typeof v === 'number' ? v : typeof v === 'string' && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : null;
export const boolOrNull = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);

export function toExamMarks(v: unknown): ExamMarksRow | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Raw;
  if (typeof o.total !== 'number') return null;
  return {
    rolePlay: num(o.rolePlay),
    rolePlayMax: num(o.rolePlayMax) || 10,
    communication: num(o.communication),
    qualityOfLanguage: num(o.qualityOfLanguage),
    total: o.total,
  };
}

export function toQolErrors(v: unknown): QolErrorRow[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((e): e is Raw => !!e && typeof e === 'object')
    .map((e) => ({
      quote: str(e.quote),
      correction: str(e.correction),
      ...(typeof e.category === 'string' ? { category: e.category } : {}),
    }))
    .filter((e) => e.quote.length > 0);
}

export function toActivityRow(r: Raw): ActivityRow {
  return {
    studentId: str(r.student_id),
    id: str(r.id),
    mode: str(r.mode),
    topicKey: strOrNull(r.topic_key),
    score: numOrNull(r.score),
    wordCount: num(r.word_count),
    durationSec: num(r.duration_sec),
    createdAt: str(r.created_at),
    practiceOnly: boolOrNull(r.practice_only),
    examMarks: toExamMarks(r.exam_marks),
    scoringSessionId: strOrNull(r.scoring_session_id),
    assignmentId: strOrNull(r.assignment_id),
    cefrLevel: strOrNull(r.cefr_level),
    criticalCount: numOrNull(r.critical_count),
  };
}

export function toExamAttemptRow(r: Raw): ExamAttemptRow {
  const mode = r.conduct_mode;
  return {
    studentId: str(r.student_id),
    attemptId: str(r.attempt_id),
    sessionId: str(r.session_id),
    createdAt: str(r.created_at),
    total: num(r.total),
    rolePlay: num(r.role_play),
    rolePlayMax: num(r.role_play_max) || 10,
    communication: num(r.communication),
    qualityOfLanguage: num(r.quality_of_language),
    qolErrors: toQolErrors(r.qol_errors),
    reportErrors: Array.isArray(r.report_errors) ? toQolErrors(r.report_errors) : null,
    conductMode: mode === 'examSim' || mode === 'coached' ? mode : null,
    countsTowardProgress: boolOrNull(r.counts_toward_progress),
    assignmentId: strOrNull(r.assignment_id),
    teacherTotal: numOrNull(r.teacher_total),
    teacherShared: boolOrNull(r.teacher_shared),
  };
}

