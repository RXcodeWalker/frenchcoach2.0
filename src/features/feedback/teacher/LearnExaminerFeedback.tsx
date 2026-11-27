import { useEffect, useMemo, useState } from 'react';
import { Segmented } from '../../../components/ui/Segmented';
import type { QuestionDemands } from '../../../domain/learn/demand/types';
import type { HeardAsNote } from '../../../domain/transcription/misheardExpressions';
import { HowItSounded } from '../../pronunciation/HowItSounded';
import { isExaminerFeedbackEmpty, type ExaminerFailureKind, type ExaminerFeedback } from '../../../services/coaching/examinerFeedback';
import { ExaminerFeedbackCard } from '../components/ExaminerFeedbackCard';
import { examinerGroups } from '../components/examinerGroups';
import { buildTeacherScript } from './buildTeacherScript';
import { correctedAnswer } from './examinerAnswer';
import { ExaminerBreakdown } from './ExaminerBreakdown';
import { ExaminerOverview, type ExaminerJump } from './ExaminerOverview';
import { PredictionResults } from './PredictionResults';
import type { FirstId } from './firsts';
import { PredictCard } from './PredictCard';
import {
  calibrationLines,
  fixesFromGroups,
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
 * Redesigned 2026-11-27 like the Coach style: an overview (counts and where
 * the mistakes are) above two tabs that never repeat each other — Examiner
 * (the conversation, then "How it sounded" on the answer with every correction
 * applied) and Breakdown (what examiners look for, predictions, the answer
 * corrected in place, the exam moves it makes). The next step's descriptor
 * lives only in the Breakdown.
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
  demands?: (Pick<QuestionDemands, 'cognitiveDemand' | 'timeFrames'> & Partial<Pick<QuestionDemands, 'structures'>>) | null;
  /** The question's authored follow-up, when Learn will ask it on Continue (Batch 6c). */
  nextQuestion?: string | null;
  /** Milestones Learn has proven are firsts for this answer (Batch 6c). */
  firsts?: readonly FirstId[];
  /** With the Pronunciation Lab live: the recording, for "How it sounded" under the conversation. */
  howItSounded?: {
    answerBlob: Blob | null;
    heardAs?: readonly HeardAsNote[];
    onPractiseOpened?: () => void;
  };
}

type View = 'examiner' | 'breakdown';

export function LearnExaminerFeedback({
  status,
  result,
  failureKind,
  onSwitchToCoach,
  onRetry,
  transcript,
  name,
  demands,
  nextQuestion,
  firsts,
  howItSounded,
}: Props) {
  const [view, setView] = useState<View>('examiner');
  const [showAllSignal, setShowAllSignal] = useState(0);
  const checks = useMemo(() => predictionChecks(demands), [demands]);
  const [answers, setAnswers] = useState<Partial<Record<PredictionCheckId, PredictionAnswer>>>({});
  const pending = status === 'pending';
  const elapsedMs = useElapsedMs(pending);

  // A new attempt starts with no predictions.
  useEffect(() => {
    if (!result) setAnswers({});
    setView('examiner');
  }, [result]);

  const groups = useMemo(
    () => (status === 'done' && result && !isExaminerFeedbackEmpty(result) ? examinerGroups(result, false, { descriptorNote: false }) : null),
    [status, result],
  );
  const calibration = useMemo(
    () => (groups ? calibrationLines(checks, answers, transcript, fixesFromGroups(groups)) : []),
    [groups, checks, answers, transcript],
  );
  const lines = useMemo(() => {
    if (!groups) return null;
    return buildTeacherScript({
      register: 'examiner',
      transcript,
      name,
      groups,
      calibration,
      secondTake: true,
      nextQuestion,
      firsts,
    });
  }, [groups, transcript, name, calibration, nextQuestion, firsts]);

  const learn = result?.profile === 'learn' ? result : null;
  const corrected = useMemo(() => (learn ? correctedAnswer(transcript, learn.errors) : null), [learn, transcript]);
  const wordCount = useMemo(() => transcript.trim().split(/\s+/).filter(Boolean).length, [transcript]);

  const jumpTo = (to: ExaminerJump) => {
    const next: View = to === 'look-for' ? 'breakdown' : 'examiner';
    setView(next);
    if (next === 'examiner') setShowAllSignal((n) => n + 1);
    const selectors = to === 'fixes' ? ['fixes', 'more-fixes'] : [to];
    setTimeout(() => {
      for (const sel of selectors) {
        const el = document.querySelector<HTMLElement>(`[data-section="${sel}"]`);
        if (el) {
          const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
          el.scrollIntoView?.({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
          return;
        }
      }
    }, 60);
  };

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

  if (lines && result) {
    return (
      <div className="space-y-3">
        {learn && <ExaminerOverview result={learn} wordCount={wordCount} onJump={jumpTo} />}
        {learn && (
          <Segmented
            label="Feedback view"
            value={view}
            onChange={setView}
            testIdPrefix="examiner-tab"
            options={[
              { id: 'examiner', label: 'Examiner' },
              { id: 'breakdown', label: 'Breakdown' },
            ]}
          />
        )}
        {view === 'breakdown' && learn ? (
          <ExaminerBreakdown result={learn} transcript={transcript} predictions={<PredictionResults lines={calibration} />} />
        ) : (
          <>
            <TeacherConversation lines={lines} revealKey={result} showAllSignal={showAllSignal} />
            {howItSounded && (howItSounded.answerBlob || corrected) && (
              <HowItSounded
                answerBlob={howItSounded.answerBlob}
                heardAs={howItSounded.heardAs}
                sentence={corrected ?? ''}
                nativeLabel="Corrected version"
                onPractiseOpened={howItSounded.onPractiseOpened}
              />
            )}
          </>
        )}
      </div>
    );
  }

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
