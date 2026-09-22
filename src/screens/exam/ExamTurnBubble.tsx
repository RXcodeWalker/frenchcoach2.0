import { Repeat } from 'lucide-react';
import { speakExaminerText, getExaminerVoiceGeneration, hasFrenchVoice } from '../../services/exam/examinerVoice';
import type { ConductLogEntry } from '../../domain/igcse/session/types';

const ACTION_LABEL: Record<string, string> = {
  READ_MAIN: 'Examiner',
  REPEAT: 'Examiner (repeating)',
  READ_ALTERNATIVE: 'Examiner (alternative question)',
  EXTENSION_PROMPT: 'Examiner',
  FURTHER_QUESTION: 'Examiner',
  TRANSITION: 'Examiner',
  END: 'Examiner',
};

interface Props {
  entry: ConductLogEntry;
  voiceMuted: boolean;
}

/**
 * One chat bubble for the exam transcript. A candidate bubble is plain text
 * for now — the plan's "wavy-underline error, click -> rail card" wiring
 * needs per-turn ExaminerFeedback (getExaminerFeedback), which only W3's
 * corrections rail produces. Until that lands there is no feedback to mark
 * up here, so this renders the transcript verbatim (documented deviation,
 * see exam-overhaul plan W2/W3 boundary).
 */
export function ExamTurnBubble({ entry, voiceMuted }: Props) {
  const isExaminer = entry.kind === 'examiner';

  if (isExaminer) {
    const label = ACTION_LABEL[entry.action] ?? 'Examiner';
    const canReplay = hasFrenchVoice() && !voiceMuted;
    return (
      <div className="flex justify-start">
        <div className="flex flex-col gap-1 max-w-[85%]">
          <p className="text-eyebrow uppercase text-ink-subtle">{label}</p>
          <div className="relative rounded-card rounded-tl-none surface px-4 py-3">
            <p className="exam-serif text-body-l text-ink leading-snug">{entry.text}</p>
            {canReplay && (
              <button
                onClick={() => void speakExaminerText(entry.text, getExaminerVoiceGeneration())}
                aria-label="Replay examiner's line"
                className="absolute -bottom-3 right-3 flex items-center justify-center w-7 h-7 rounded-pill bg-action
                  text-action-ink shadow-sm hover:bg-action-hover transition-colors duration-state ease-smooth"
              >
                <Repeat size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <div className="flex flex-col gap-1 items-end max-w-[85%]">
        <p className="text-eyebrow uppercase text-ink-subtle">
          You{entry.inputMode === 'text' ? ' (typed)' : ''}
        </p>
        <div className="rounded-card rounded-tr-none bg-action text-action-ink px-4 py-3">
          <p className="text-body-base leading-snug">{entry.transcript}</p>
        </div>
      </div>
    </div>
  );
}
