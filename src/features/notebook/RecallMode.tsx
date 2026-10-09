import { useMemo, useState } from 'react';
import { SpeakingConsentGate } from '../../components/SpeakingConsentGate';
import { blankPhrases, recallCheck, type NotebookEntry, type RecallResult } from '../../domain/learn/notebook/notebook';
import { TakeRecorder } from '../feedback/teacher/SecondTake';

/**
 * Recall mode (Learn feedback Batch 6d): the saved answer with its key phrases
 * blanked; the learner says the answer aloud, and the same logic as the Second
 * take reports which of the blanked phrases were HEARD.
 *
 * It reports what was heard, never a verdict: a phrase that was not heard is
 * "not in this take" (neutral — a paraphrase, or the recogniser, may be why),
 * and the answer is framed as material to adapt, not a script. It writes
 * nothing — no score, evidence, XP, storage or analytics — and takes no dispatch.
 */

interface Props {
  entry: Pick<NotebookEntry, 'answer' | 'phrases'>;
  /** Another recorder (this screen's) is running — one microphone at a time. */
  micLocked?: boolean;
  onMicActive?: (active: boolean) => void;
}

export function RecallMode({ entry, micLocked = false, onMicActive }: Props) {
  const segments = useMemo(() => blankPhrases(entry.answer, entry.phrases), [entry.answer, entry.phrases]);
  const [result, setResult] = useState<RecallResult | null>(null);
  const blanks = segments.filter((s) => s.kind === 'blank');

  if (blanks.length === 0) {
    return (
      <p className="text-xs text-ink-muted" data-testid="recall-unavailable">
        This one has no key phrases of yours to blank out. Listen to it, then say it in your own words.
      </p>
    );
  }

  return (
    <div className="space-y-2.5" data-testid="recall-mode">
      <p className="text-xs leading-relaxed text-ink" lang="fr" aria-label="Your answer with your key phrases blanked out">
        {segments.map((s, i) =>
          s.kind === 'text' ? (
            <span key={i}>{s.text}</span>
          ) : (
            <span
              key={i}
              data-testid="recall-blank"
              className="mx-0.5 inline-block min-w-[5rem] border-b-2 border-hairline text-center text-ink-muted"
              aria-label="blank"
            >
              {' '}
            </span>
          ),
        )}
      </p>
      <SpeakingConsentGate>
        <TakeRecorder
          locked={micLocked}
          label={result ? 'Say it again' : 'Say it from memory'}
          stopLabel="Stop and check what I said"
          onActive={(active) => onMicActive?.(active)}
          onHeard={(text) => setResult(recallCheck(entry.phrases, text))}
        />
      </SpeakingConsentGate>
      {result && (
        <div role="status">
          {result.empty ? (
            <p className="text-xs text-ink-muted">I couldn't hear anything in that take. Have another go whenever you like.</p>
          ) : (
            <ul className="space-y-1.5" aria-label="What I heard">
              {result.recalled.map((p) => (
                <li key={`r:${p}`} className="text-xs leading-relaxed text-progress-text" data-state="recalled">
                  I heard <span className="exam-quote italic">« {p} »</span> ✓
                </li>
              ))}
              {result.notHeard.map((p) => (
                <li key={`n:${p}`} className="text-xs leading-relaxed text-ink-muted" data-state="not-heard">
                  <span className="exam-quote italic">« {p} »</span> — not in this take
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
