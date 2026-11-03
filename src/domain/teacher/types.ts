/**
 * Rows the teacher dashboard works on (backend migration 20261103090000's teacher_*
 * functions, mapped by services/teacher/teacherApi.ts). Pure data, no I/O.
 */

export interface RosterRow {
  studentId: string;
  displayName: string | null;
  status: 'active' | 'left' | 'removed';
  joinedAt: string;
  endedAt: string | null;
}

/** One synced practice row (Learn answer, exam, role-play drill turn…). */
export interface ActivityRow {
  studentId: string;
  id: string;
  mode: string;
  topicKey: string | null;
  /** /10 (an exam's /40 rescaled — use examMarks.total for the real mark). */
  score: number | null;
  wordCount: number;
  durationSec: number;
  createdAt: string;
  practiceOnly: boolean | null;
  examMarks: ExamMarksRow | null;
  scoringSessionId: string | null;
  assignmentId: string | null;
  cefrLevel: string | null;
  criticalCount: number | null;
}

export interface ExamMarksRow {
  rolePlay: number;
  rolePlayMax: number;
  communication: number;
  qualityOfLanguage: number;
  total: number;
}

export interface QolErrorRow {
  quote: string;
  correction: string;
  /** Only on report errors (the post-marking report categorises). */
  category?: string;
}

/** One marked exam attempt (original envelope), server-recorded. */
export interface ExamAttemptRow {
  studentId: string;
  attemptId: string;
  sessionId: string;
  createdAt: string;
  total: number;
  rolePlay: number;
  rolePlayMax: number;
  communication: number;
  qualityOfLanguage: number;
  qolErrors: QolErrorRow[];
  /** null when the student never opened the post-marking report. */
  reportErrors: QolErrorRow[] | null;
  conductMode: 'examSim' | 'coached' | null;
  /** null for attempts scored before the server recorded it (treated as not counted). */
  countsTowardProgress: boolean | null;
  assignmentId: string | null;
  teacherTotal: number | null;
  teacherShared: boolean | null;
}

export type AssignmentKind = 'learn_topic' | 'role_play' | 'mock_exam';

export interface AssignmentRow {
  id: string;
  classId: string;
  kind: AssignmentKind;
  title: string;
  topicKey: string | null;
  rolePlayCardId: string | null;
  questionCount: number | null;
  studentIds: string[] | null;
  dueAt: string;
  createdAt: string;
  archivedAt: string | null;
}

/** One (assignment, student) homework count — teacher_assignment_progress(). */
export interface ProgressRow {
  assignmentId: string;
  studentId: string;
  /** AI-marked homework Learn answers (server allowance grants; Examiner style included). */
  learnAnswers: number;
  /** Synced sessions naming the assignment (Learn coach answers, role-play drill turns). */
  sessions: number;
  /** Marked mock exams recorded for the assignment. */
  examAttempts: number;
  lastAt: string | null;
}
