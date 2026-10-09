import { useEffect, useMemo, useState } from 'react';
import type { QuestionDemands } from '../../../domain/learn/demand/types';
import { isExaminerFeedbackEmpty, type ExaminerFailureKind, type ExaminerFeedback } from '../../../services/coaching/examinerFeedback';
import { ExaminerFeedbackCard } from '../components/ExaminerFeedbackCard';
import { examinerGroups } from '../components/examinerGroups';
import { buildTeacherScript } from './buildTeacherScript';
import { PredictCard } from './PredictCard';
import {
  calibrationLines,
  predictionChecks,
  type PredictionAnswer,
  type PredictionCheckId,
} from './predictionQuestions';
import { TeacherConversation } from './TeacherConversation';
import { useElapsedMs } from './useElapsedMs';

/**
 * The Learn examiner-style feedback as the teacher's conversation, in the formal
 * register (Learn feedback Batch 6b). It wraps the existing examiner groups —
 * `examiner-v3` is unchanged — and every state that is not a finished, non-empty
 * commentary (failed, quota, skipped, empty) is still `ExaminerFeedbackCard`'s.
 *
 * No mark, band or grade is spoken or shown (ADR 0005/0009): the framing
 * strings are tested against the shared mark/band filter. The repeated-mistake
 * memory line is coach-only for now — it resolves a fix to a skill through the
 * coach feedback's grammar themes, which examiner errors do not carry.
 */

interface Props {
  status: 'pending' | 'done' | 'failed' | 'quota-exhausted' | 'skipped';
  result: ExaminerFeedback | null;
  failureKind?: ExaminerFailureKind;
  onSwitchToCoach: () => void;
  onRetry: () => void;
  /** The learner's answer. */
  transcript: string;
  name?: string | null;
  demands?: Pick<QuestionDemands, 'cognitiveDemand' | 'timeFrames'> | null;
}

export function LearnExaminerFeedback({
  status,
  result,
  failureKind,
  onSwitchToCoach,
  onRetry,
  transcript,
  name,
  demands,
}: Props) {
  const checks = useMemo(() => predictionChecks(demands), [demands]);
  const [answers, setAnswers] = useState<Partial<Record<PredictionCheckId, PredictionAnswer>>>({});
  const pending = status === 'pending';
  const elapsedMs = useElapsedMs(pending);

  // A new attempt starts with no predictions.
  useEffect(() => {
    if (!result) setAnswers({});
  }, [result]);

  const lines = useMemo(() => {
    if (status !== 'done' || !result || isExaminerFeedbackEmpty(result)) return null;
    return buildTeacherScript({
      register: 'examiner',
      transcript,
      name,
      groups: examinerGroups(result, false),
      calibration: calibrationLines(checks, answers, transcript),
    });
  }, [status, result, transcript, name, checks, answers]);

  if (pending) {
    return (
      <PredictCard
        checks={checks}
        answers={answers}
        onAnswer={(id, answer) => setAnswers((a) => ({ ...a, [id]: answer }))}
        // One model call is in flight, so the honest phase is "generating".
        phase="generating"
        elapsedMs={elapsedMs}
        register="examiner"
      />
    );
  }

  if (lines && result) return <TeacherConversation lines={lines} revealKey={result} />;

  return (
    <ExaminerFeedbackCard
      status={status}
      result={result}
      failureKind={failureKind}
      onSwitchToCoach={onSwitchToCoach}
      onRetry={onRetry}
    />
  );
}
