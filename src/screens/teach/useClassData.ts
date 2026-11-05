import { useCallback, useEffect, useState } from 'react';
import {
  getAssignmentProgress,
  getClass,
  getClassActivity,
  getClassExams,
  getRoster,
  listAssignments,
  teacherErrorMessage,
  type ActivityRow,
  type AssignmentRow,
  type ClassRow,
  type ExamAttemptRow,
  type ProgressRow,
  type RosterRow,
} from '../../services/teacher/teacherApi';
import { captureError } from '../../services/telemetry/telemetryService';
import { CLASS_WINDOW_DAYS } from './teachUtils';

export interface ClassData {
  klass: ClassRow;
  roster: RosterRow[];
  activity: ActivityRow[];
  exams: ExamAttemptRow[];
  assignments: AssignmentRow[];
  progress: ProgressRow[];
}

/** Everything a class page needs, loaded together. */
export function useClassData(classId: string | undefined): {
  data: ClassData | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
} {
  const [data, setData] = useState<ClassData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    setLoading(true);
    const since = new Date(Date.now() - CLASS_WINDOW_DAYS * 86_400_000);
    (async () => {
      try {
        const klass = await getClass(classId);
        if (!klass) throw new Error('forbidden');
        const [roster, activity, exams, assignments, progress] = await Promise.all([
          getRoster(classId),
          getClassActivity(classId, since),
          getClassExams(classId, since),
          listAssignments(classId),
          getAssignmentProgress(classId),
        ]);
        if (!cancelled) {
          setData({ klass, roster, activity, exams, assignments, progress });
          setError(null);
        }
      } catch (err) {
        captureError(err, { area: 'teacher', stage: 'loadClass' });
        if (!cancelled) setError(err instanceof Error && err.message === 'forbidden' ? "This class isn't one of yours, or it was archived." : teacherErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [classId, nonce]);

  return { data, error, loading, reload };
}
