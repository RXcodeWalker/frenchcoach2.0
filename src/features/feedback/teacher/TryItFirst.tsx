import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Mic, Square } from 'lucide-react';
import { enter, enterReduced } from '../../../components/motion/variants';
import { SpeakingConsentGate } from '../../../components/SpeakingConsentGate';
import { useAuth } from '../../../context/AuthContext';
import { fixMatch } from '../../../domain/learn/feedback/fixMatch';
import { useRecording } from '../../recording/useRecording';
import { FixRow, type FeedbackPoint } from '../components/FeedbackPointList';
import { SpeakButton } from './SpeakButton';
import { tryItHint } from './tryItHint';

/**
 * "Try it first" (Learn feedback Batch 6b): one of the first fixes starts as a
 * nudge — the learner's own words and what kind of slip it is, never the
 * correction — and they type or say a fix, or tap "Just show me".
 *
 * Saying a fix fills the box with what was heard; only Check (or Enter) reveals.
 * Whatever they do, the answer is then revealed. The check only ever says yes
 * (`fixMatch`): a clear match → "Yes, that's it."; anything else →
 * "Here's how I'd say it:". There is no "wrong" or "close", because the
 * correction is one valid rewrite and a valid alternative must never be marked
 * as a mistake.
 *
 * Never scored: this component writes nothing — no XP, belief, session,
 * analytics or storage — and takes no dispatch. The learner's attempt lives in
 * component state and is gone with it.
 */

type Fix = Extract<FeedbackPoint, { kind: 'fix' }>;
type Revealed = 'match' | 'unsure' | 'shown';

interface Props {
  fix: Fix;
  /** The quote the learner clicked in the answer; its row is highlighted once revealed. */
  highlightedQuote?: string | null;
  /** Another nudge is recording — only one microphone at a time. */
  micLocked?: boolean;
  onMicActive?: (active: boolean) => void;
  /** Called once the answer has been revealed, however it got there. */
  onResolved?: () => void;
}

function FixMicButton({
  locked,
  onActive,
  onHeard,
}: {
  locked: boolean;
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
      aria-label={recording.isRecording ? 'Stop and check what you said' : 'Say your fix'}
      className="inline-flex items-center gap-1.5 rounded-control border border-hairline bg-surface px-3 py-2 text-label text-action-text transition-colors duration-state hover:bg-action-soft disabled:opacity-40"
    >
      {recording.isRecording ? <Square size={14} aria-hidden="true" /> : <Mic size={14} aria-hidden="true" />}
      {recording.isRecording ? 'Stop' : 'Say it'}
    </button>
  );
}

export function TryItFirst({ fix, highlightedQuote, micLocked = false, onMicActive, onResolved }: Props) {
  const reduced = useReducedMotion() ?? false;
  const [revealed, setRevealed] = useState<Revealed | null>(null);
  const [attempt, setAttempt] = useState('');
  // Whether the text in the box was spoken (and not yet edited) or typed.
  const [attemptMode, setAttemptMode] = useState<'speech' | 'text'>('text');

  const reveal = (how: Revealed) => {
    setRevealed(how);
    onResolved?.();
  };

  const check = (text: string, mode: 'speech' | 'text') => {
    const heard = text.trim();
    if (!heard) return;
    reveal(fixMatch(heard, fix.quote, fix.correction, mode));
  };

  if (revealed) {
    return (
      <motion.div variants={reduced ? enterReduced : enter} initial="hidden" animate="show" className="space-y-1.5">
        {revealed !== 'shown' && (
          <p className="flex items-center gap-1.5 text-label text-progress-text" role="status">
            {revealed === 'match' && (
              <span className="flex h-5 w-5 items-center justify-center rounded-pill bg-progress-soft" aria-hidden="true">
                <Check size={13} />
              </span>
            )}
            {revealed === 'match' ? "Yes, that's it." : "Here's how I'd say it:"}
          </p>
        )}
        <FixRow point={fix} compact={false} hl={highlightedQuote} action={<SpeakButton text={fix.correction} />} />
      </motion.div>
    );
  }

  return (
    <div className="space-y-2.5" data-testid="try-it-first">
      <p className="text-body-s text-ink">{tryItHint(fix.quote, fix.tag)}</p>
      <input
        type="text"
        lang="fr"
        value={attempt}
        onChange={(e) => {
          setAttempt(e.target.value);
          setAttemptMode('text');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') check(attempt, attemptMode);
        }}
        aria-label={`Your fix for « ${fix.quote} »`}
        placeholder="Type your fix…"
        className="w-full rounded-control border border-hairline surface-recessed px-3 py-2 text-body-s text-ink placeholder:text-ink-muted focus:border-action focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => check(attempt, attemptMode)}
          disabled={!attempt.trim()}
          className="rounded-control bg-action px-4 py-2 text-label text-action-ink transition-colors duration-state hover:bg-action-hover active:scale-[.97] disabled:opacity-40"
        >
          Check
        </button>
        <SpeakingConsentGate>
          <FixMicButton locked={micLocked} onActive={(active) => onMicActive?.(active)} onHeard={(text) => {
            // Show what was heard; the learner presses Check (nothing is revealed yet).
            if (!text.trim()) return;
            setAttempt(text.trim());
            setAttemptMode('speech');
          }} />
        </SpeakingConsentGate>
        <button
          type="button"
          onClick={() => reveal('shown')}
          className="rounded-control px-2 py-2 text-label text-ink-muted underline underline-offset-2 hover:text-ink"
        >
          Just show me
        </button>
      </div>
    </div>
  );
}
