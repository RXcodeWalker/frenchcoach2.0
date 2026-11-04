import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMyAssignments, type MyAssignment } from '../../services/teacher/teacherApi';
import { captureError } from '../../services/telemetry/telemetryService';

/**
 * The signed-in learner's open homework (my_assignments()). null while loading,
 * signed out, or when it couldn't be read — a screen then simply shows no homework.
 */
export function useMyHomework(enabled = true): { assignments: MyAssignment[] | null; reload: () => void } {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<MyAssignment[] | null>(null);
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!enabled || !user) {
      setAssignments(null);
      return;
    }
    let cancelled = false;
    getMyAssignments()
      .then((rows) => {
        if (!cancelled) setAssignments(rows);
      })
      .catch((err) => {
        captureError(err, { area: 'teacher', stage: 'getMyAssignments' });
        if (!cancelled) setAssignments(null);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, user, nonce]);

  return { assignments, reload };
}
