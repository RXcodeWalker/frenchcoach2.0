/**
 * S4 pure diff builder — one row per criterion per envelope. Null fields
 * when a teacher mark is absent, never fabricated. Hard scope redline: this
 * computes per-criterion diff rows only — no aggregate stats, no heuristic
 * guardrails (e.g. flagging |delta| > 3). Those are S6/S5/S8/S9 territory.
 */

import type { ScoringEnvelope } from '../envelope/types';
import type { Criterion, TeacherMark, TeacherMarkSet } from './teacherMark';

export interface DiffRow {
  sessionId: string;
  attemptId: string;
  criterion: Criterion;
  taskId?: string;
  scorerMark: number;
  teacherMark: number | null;
  delta: number | null;
  justification: string;
  quotedEvidence: string[];
  meanWordConfidence: number;
  lowConfidenceSpanRatio: number;
}

function findTeacherMark(
  marks: TeacherMark[],
  criterion: Criterion,
  taskId?: string,
): TeacherMark | undefined {
  if (criterion === 'rolePlayTask') {
    return marks.find((m) => m.criterion === criterion && m.taskId === taskId);
  }
  return marks.find((m) => m.criterion === criterion);
}

/** Pure — one row per criterion (role-play tasks expand to one row each). */
export function buildDiffRows(envelope: ScoringEnvelope, teacherMarks?: TeacherMarkSet): DiffRow[] {
  const marks = teacherMarks?.marks ?? [];
  const rows: DiffRow[] = [];

  for (const task of envelope.rolePlayTasks) {
    const teacher = findTeacherMark(marks, 'rolePlayTask', task.taskId);
    rows.push({
      sessionId: envelope.sessionId,
      attemptId: envelope.attemptId,
      criterion: 'rolePlayTask',
      taskId: task.taskId,
      scorerMark: task.mark,
      teacherMark: teacher ? teacher.mark : null,
      delta: teacher ? task.mark - teacher.mark : null,
      justification: task.justification,
      quotedEvidence: task.evidenceSpans.map((s) => s.quote),
      meanWordConfidence: envelope.transcriptConfidence.meanWordConfidence,
      lowConfidenceSpanRatio: envelope.transcriptConfidence.lowConfidenceSpanRatio,
    });
  }

  const commTeacher = findTeacherMark(marks, 'communication');
  rows.push({
    sessionId: envelope.sessionId,
    attemptId: envelope.attemptId,
    criterion: 'communication',
    scorerMark: envelope.communication.mark,
    teacherMark: commTeacher ? commTeacher.mark : null,
    delta: commTeacher ? envelope.communication.mark - commTeacher.mark : null,
    justification: envelope.communication.justification,
    quotedEvidence: envelope.communication.evidenceSpans.map((s) => s.quote),
    meanWordConfidence: envelope.transcriptConfidence.meanWordConfidence,
    lowConfidenceSpanRatio: envelope.transcriptConfidence.lowConfidenceSpanRatio,
  });

  const qolTeacher = findTeacherMark(marks, 'qualityOfLanguage');
  rows.push({
    sessionId: envelope.sessionId,
    attemptId: envelope.attemptId,
    criterion: 'qualityOfLanguage',
    scorerMark: envelope.qualityOfLanguage.mark,
    teacherMark: qolTeacher ? qolTeacher.mark : null,
    delta: qolTeacher ? envelope.qualityOfLanguage.mark - qolTeacher.mark : null,
    justification: envelope.qualityOfLanguage.justification,
    quotedEvidence: envelope.qualityOfLanguage.evidenceSpans.map((s) => s.quote),
    meanWordConfidence: envelope.transcriptConfidence.meanWordConfidence,
    lowConfidenceSpanRatio: envelope.transcriptConfidence.lowConfidenceSpanRatio,
  });

  return rows;
}
