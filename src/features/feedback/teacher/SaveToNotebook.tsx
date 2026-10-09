import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookMarked } from 'lucide-react';
import {
  isSameAnswer,
  keyPhrases,
  strengthQuotes,
  type NotebookDraft,
  type NotebookQuestionRef,
} from '../../../domain/learn/notebook/notebook';
import type { FeedbackV2 } from '../../../types';

/**
 * "Save to notebook" (Learn feedback Batch 6d): keep the "Say it better" answer
 * as the learner's own exam material.
 *
 *  - Never auto-saved. The only write is the learner's tap on Save, handed to
 *    `onSave`; this component imports no storage, context or dispatch.
 *  - Offered once per feedback: after a Second take or a high-scoring answer the
 *    prompt "Keep this version for your exam notes?" appears; "Not now" puts it
 *    away, leaving only the quiet Save button.
 *  - Signed-in only. A guest never sees a Save button, only a sign-in note (and
 *    only once the offer would have appeared), because a guest's notes would be
 *    left behind on a shared device.
 *  - It is "your material to adapt", never "memorise this script".
 */

interface Props {
  feedback: Pick<FeedbackV2, 'improved_answer' | 'strengths' | 'best_moment'>;
  question: NotebookQuestionRef;
  signedIn: boolean;
  /** A Second take was done, or the answer scored high. */
  offered: boolean;
  /** The answer already saved for this question, if any. */
  savedAnswer: string | null;
  onSave: (draft: NotebookDraft) => void;
}

export function SaveToNotebook({ feedback, question, signedIn, offered, savedAnswer, onSave }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const answer = feedback.improved_answer?.trim() ?? '';
  if (!answer) return null;

  if (!signedIn) {
    if (!offered) return null;
    return (
      <p className="rounded-xl surface-recessed p-3 text-xs text-ink-muted" data-testid="notebook-guest">
        Sign in to keep your notes.{' '}
        <Link to="/login" className="font-semibold text-action-text underline underline-offset-2">
          Sign in
        </Link>
      </p>
    );
  }

  const alreadySaved = justSaved || (savedAnswer !== null && isSameAnswer(savedAnswer, answer));
  if (alreadySaved) {
    return (
      <p className="flex items-center gap-1.5 rounded-xl surface-recessed p-3 text-xs text-progress-text" role="status" data-testid="notebook-saved">
        <BookMarked size={12} aria-hidden="true" />
        Saved to your notebook.
        <Link to="/notebook" className="ml-1 font-semibold text-action-text underline underline-offset-2">
          Open notebook
        </Link>
      </p>
    );
  }

  const replaces = savedAnswer !== null;
  const save = () => {
    onSave({
      ...question,
      answer,
      phrases: keyPhrases(answer, strengthQuotes(feedback)),
    });
    setJustSaved(true);
  };
  const saveLabel = replaces ? 'Replace saved version' : 'Save to notebook';

  if (offered && !dismissed) {
    return (
      <div className="space-y-2 rounded-xl surface-recessed p-3" data-testid="notebook-offer">
        <p className="text-xs text-ink">
          Keep this version for your exam notes?
          <span className="text-ink-muted">
            {' '}
            It's your own story in correct French — material to adapt, not a script to memorise.
            {replaces ? ' The version you saved before stays in its history.' : ''}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={save} className="rounded-lg bg-action px-3 py-1.5 text-[11px] font-bold text-action-ink">
            {saveLabel}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-lg px-2 py-1.5 text-[11px] font-semibold text-ink-muted underline underline-offset-2"
          >
            Not now
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={save}
      data-testid="notebook-quiet"
      className="inline-flex items-center gap-1.5 rounded-lg surface-recessed px-3 py-1.5 text-[11px] font-bold text-action-text"
    >
      <BookMarked size={11} aria-hidden="true" />
      {saveLabel}
    </button>
  );
}
