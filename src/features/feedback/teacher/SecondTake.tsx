import { useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { SpeakingConsentGate } from '../../../components/SpeakingConsentGate';
import { useAuth } from '../../../context/AuthContext';
import { compareRetake, type RetakeResult } from '../../../domain/learn/feedback/compareRetake';
import type { FeedbackPointGroup } from '../components/FeedbackPointList';
import { useRecording } from '../../recording/useRecording';
import { retakeTargets } from './retakeTargets';

/**
 * "Second take" (Learn feedback Batch 6c): after the feedback the learner says
 * the same answer again, using the fixes, and sees what was HEARD.
 *
 *  - Practice only. This component writes nothing — no evidence, session, XP,
 *    mastery, review pool, analytics or storage — and takes no dispatch. A
 *    retake made after seeing the corrections is not independent performance, so
 *    it must not feed the beliefs that drive the level read-out.
 *  - No new AI call, no score, no guest-attempt use: the check is the pure
 *    `compareRetake` over the transcript the browser's recogniser produced.
 *  - The wording reports what was heard, never a verdict. Only "Still there" is
 *    ever negative, and only when the exact error words came back without the
 *    correction; a paraphrase is "Not in this take", which is neutral.
 *  - It is skippable (Next question is outside it), uses the same consent gate
 *    as every other record control, and does not touch the per-question
 *    `extraTurnBudget` that Say It Again and follow-ups share.
 */

interface Props {
  groups: readonly FeedbackPointGroup[];
  /** Another control is recording — only one microphone at a time. */
  micLocked?: boolean;
  onMicActive?: (active: boolean) => void;
  /** Called when a take had something in it (never with the result: the parent learns only that a take happened). */
  onTaken?: () => void;
}

/**
 * The record / stop control shared by the Second take and the notebook's Recall
 * mode: one press starts, the next stops and hands the transcript up. Hidden
 * where the browser has no speech recognition. Wrap it in `SpeakingConsentGate`.
 */
export function TakeRecorder({
  locked,
  label,
  stopLabel = 'Stop and check my second take',
  onActive,
  onHeard,
}: {
  locked: boolean;
  label: string;
  stopLabel?: string;
  onActive: (active: boolean) => void;
  onHeard: (text: string) => void;
}) {
  const { consentStatus } = useAuth();
  const recording = useRecording(consentStatus === 'pending');
  if (!recording.sttSupported) return null;

  const toggle = async () => {
    if (recording.isRecording) {
      onActive(false);
      onHeard(await recording.stop());
    } else {
      onActive(true);
      recording.start();
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={locked && !recording.isRecording}
      aria-label={recording.isRecording ? stopLabel : label}
      className="inline-flex items-center gap-1.5 rounded-lg bg-action px-3 py-1.5 text-[11px] font-bold text-action-ink disabled:opacity-40"
    >
      {recording.isRecording ? <Square size={11} aria-hidden="true" /> : <Mic size={11} aria-hidden="true" />}
      {recording.isRecording ? 'Stop' : label}
    </button>
  );
}

function Result({ result }: { result: RetakeResult }) {
  if (result.empty) {
    return <p className="text-xs text-ink-muted">I couldn't hear anything in that take. Have another go whenever you like.</p>;
  }
  return (
    <ul className="space-y-1.5" aria-label="What I heard in your second take">
      {result.fixes.map((f) => (
        <li key={f.quote} className="text-xs leading-relaxed" data-state={f.state}>
          {f.state === 'heard' && (
            <span className="text-progress-text">
              I heard <span className="exam-quote italic">« {f.correction} »</span> ✓
            </span>
          )}
          {f.state === 'still' && (
            <span className="text-ink">
              Still there: <span className="exam-quote italic">« {f.quote} »</span>
            </span>
          )}
          {f.state === 'absent' && (
            <span className="text-ink-muted">
              <span className="exam-quote italic">« {f.quote} »</span> — not in this take
            </span>
          )}
        </li>
      ))}
      {result.kept.map((q) => (
        <li key={`kept:${q}`} className="text-xs leading-relaxed text-progress-text" data-state="kept">
          Kept <span className="exam-quote italic">« {q} »</span> ✓
        </li>
      ))}
    </ul>
  );
}

export function SecondTake({ groups, micLocked = false, onMicActive, onTaken }: Props) {
  const { fixes, strengths } = retakeTargets(groups);
  const [result, setResult] = useState<RetakeResult | null>(null);

  // Offered only when there was something to fix.
  if (fixes.length === 0) return null;

  return (
    <div className="space-y-2.5 rounded-xl surface-recessed p-3" data-testid="second-take">
      <SpeakingConsentGate>
        <TakeRecorder
          locked={micLocked}
          label={result ? 'Record another take' : 'Record my second take'}
          onActive={(active) => onMicActive?.(active)}
          onHeard={(text) => {
            const next = compareRetake(fixes, strengths, text);
            setResult(next);
            if (!next.empty) onTaken?.();
          }}
        />
      </SpeakingConsentGate>
      {result && (
        <div role="status">
          <Result result={result} />
        </div>
      )}
    </div>
  );
}
