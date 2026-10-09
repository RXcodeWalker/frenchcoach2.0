import { useState } from 'react';
import { Mic, Square } from 'lucide-react';
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
      className="inline-flex items-center gap-1 rounded-lg surface-recessed px-2.5 py-1.5 text-[11px] font-bold text-action-text disabled:opacity-40"
    >
      {recording.isRecording ? <Square size={11} aria-hidden="true" /> : <Mic size={11} aria-hidden="true" />}
      {recording.isRecording ? 'Stop' : 'Say it'}
    </button>
  );
}

export function TryItFirst({ fix, highlightedQuote, micLocked = false, onMicActive, onResolved }: Props) {
  const [revealed, setRevealed] = useState<Revealed | null>(null);
  const [attempt, setAttempt] = useState('');

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
      <div className="space-y-1.5">
        {revealed !== 'shown' && (
          <p className="text-[11px] font-semibold text-progress-text" role="status">
            {revealed === 'match' ? "Yes, that's it." : "Here's how I'd say it:"}
          </p>
        )}
        <FixRow point={fix} compact={false} hl={highlightedQuote} action={<SpeakButton text={fix.correction} />} />
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="try-it-first">
      <p className="text-xs text-ink leading-relaxed">{tryItHint(fix.quote, fix.tag)}</p>
      <input
        type="text"
        lang="fr"
        value={attempt}
        onChange={(e) => setAttempt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') check(attempt, 'text');
        }}
        aria-label={`Your fix for « ${fix.quote} »`}
        placeholder="Type your fix…"
        className="w-full rounded-lg surface-recessed px-3 py-1.5 text-xs text-ink placeholder:text-ink-muted"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => check(attempt, 'text')}
          disabled={!attempt.trim()}
          className="rounded-lg bg-action px-3 py-1.5 text-[11px] font-bold text-action-ink disabled:opacity-40"
        >
          Check
        </button>
        <SpeakingConsentGate>
          <FixMicButton locked={micLocked} onActive={(active) => onMicActive?.(active)} onHeard={(text) => check(text, 'speech')} />
        </SpeakingConsentGate>
        <button
          type="button"
          onClick={() => reveal('shown')}
          className="rounded-lg px-2 py-1.5 text-[11px] font-semibold text-ink-muted underline underline-offset-2"
        >
          Just show me
        </button>
      </div>
    </div>
  );
}
