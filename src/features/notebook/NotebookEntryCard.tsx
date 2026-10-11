import { useState } from 'react';
import type { NotebookEntry } from '../../domain/learn/notebook/notebook';
import { SpeakButton } from '../feedback/teacher/SpeakButton';
import { RecallMode } from './RecallMode';

/**
 * One saved answer: the question, the learner's improved answer (listen to it in
 * French), Recall mode, and the earlier versions kept as history. Display only —
 * nothing here is written anywhere.
 */

interface Props {
  entry: NotebookEntry;
  micLocked?: boolean;
  onMicActive?: (active: boolean) => void;
}

export function NotebookEntryCard({ entry, micLocked, onMicActive }: Props) {
  const [recall, setRecall] = useState(false);

  return (
    <article className="space-y-2.5 rounded-xl surface p-4" data-testid="notebook-entry">
      <p className="text-eyebrow uppercase text-ink-muted" lang="fr">
        {entry.question}
      </p>

      {recall ? (
        <RecallMode entry={entry} micLocked={micLocked} onMicActive={onMicActive} />
      ) : (
        <p className="text-sm leading-relaxed text-ink" lang="fr">
          {entry.answer}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <SpeakButton text={entry.answer} label="Listen to this answer" />
        <button
          type="button"
          onClick={() => {
            // Leaving Recall mode unmounts its recorder, so release the shared microphone.
            if (recall) onMicActive?.(false);
            setRecall((r) => !r);
          }}
          aria-pressed={recall}
          className="rounded-lg surface-recessed px-3 py-1.5 text-[11px] font-bold text-action-text"
        >
          {recall ? 'Back to the answer' : 'Recall mode'}
        </button>
      </div>

      {entry.history.length > 0 && (
        <details className="text-xs text-ink-muted">
          <summary className="cursor-pointer select-none">Earlier versions ({entry.history.length})</summary>
          <ul className="mt-2 space-y-2">
            {entry.history.map((h) => (
              <li key={h.savedAt + h.answer} className="leading-relaxed" lang="fr">
                {h.answer}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
