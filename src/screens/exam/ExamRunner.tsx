import { useEffect, useMemo, useRef, useState } from 'react';
import { buildTurnLabels } from './turnLabels';
import { Volume2, VolumeX, RotateCcw, Info, MessageSquareText } from 'lucide-react';
import { formatTime } from '../../domain/time';
import { Button } from '../../components/ui/Button';
import { ExamTranscript } from './ExamTranscript';
import { ExamComposer } from './ExamComposer';
import { ExamCorrectionsRail } from './ExamCorrectionsRail';
import type { UseExamCorrectionsRail } from '../../services/exam/turnFeedback';
import type { RecordingState } from '../../features/recording/useRecording';
import type { ExaminerAction, ConductLogEntry } from '../../domain/igcse/session/types';
import { ExitConfirmDialog } from './ExitConfirmDialog';

// UI-only pacing heuristics (approximate VAD / pacing) — never logged or scored.
const NUDGE_QUIET_S = 5;
const PACING_HINT_S = 45;

// Target minutes per part, advertised on the intro screen. The exam engine has
// no hard limit, so the header timer counts down from these and simply holds at
// 0:00 — it is a pacing aid, never a cutoff.
const PART_TARGET_S: Record<string, number> = {
  rolePlay: 2 * 60,
  topic1: 4 * 60,
  topic2: 4 * 60,
};

/**
 * exam-conduct §10: the current PART's elapsed time (the session clock at its
 * first examiner action, subtracted from the current total), not the whole
 * exam's — a role play running long must never eat into topic time on
 * screen. Derived from the ConductLog entries already passed in, no new prop
 * needed.
 */
function partStartS(entries: ConductLogEntry[], part: string): number {
  const first = entries.find((e) => e.kind === 'examiner' && e.part === part);
  return first && first.kind === 'examiner' ? first.atS : 0;
}

/**
 * exam-conduct §7 (Bug 1): a PAUSE (two-part) task's part 2 re-emits
 * READ_MAIN/REPEAT for the SAME questionId+part as part 1, with different
 * text — the label must call it out as part 2 rather than showing "Question N
 * of 5" twice with no distinction. Two or more READ_MAIN entries logged for
 * the same (part, questionId) means the current one is the second part.
 */
function isSecondPart(action: ExaminerAction | null, entries: ConductLogEntry[]): boolean {
  if (!action || !action.questionId || (action.kind !== 'READ_MAIN' && action.kind !== 'REPEAT')) return false;
  const mainReads = entries.filter(
    (e) => e.kind === 'examiner' && e.action === 'READ_MAIN' && e.part === action.part && e.questionId === action.questionId,
  );
  return mainReads.length >= 2;
}

const PARTS = ['rolePlay', 'topic1', 'topic2'] as const;
const PART_SHORT: Record<string, string> = {
  rolePlay: 'Role Play',
  topic1: 'Topic 1',
  topic2: 'Topic 2',
};

const PART_LABEL: Record<string, string> = {
  rolePlay: 'Part 1: Role Play',
  topic1: 'Part 2: Topic Conversation 1',
  topic2: 'Part 3: Topic Conversation 2',
};

interface Props {
  action: ExaminerAction | null;
  entries: ConductLogEntry[];
  totalElapsedS: number;
  recording: RecordingState;
  /** True while a submitted turn is awaiting the next examiner action (network round-trip). */
  turnBusy: boolean;
  onStartRecording: () => void;
  onSubmitSpeech: () => void;
  onSubmitText: (text: string) => void;
  onRequestRepeat: () => void;
  onExit: () => void;
  voiceMuted: boolean;
  onToggleVoice: () => void;
  pendingSilentSkip: boolean;
  pendingTranscriptionFailure: boolean;
  onKeepTrying: () => void;
  onSkipQuestion: () => void;
  rolePlayTitle?: string;
  rolePlaySetup?: string;
  taskProgress?: { index: number; total: number };
  /** W1/W5: Coached Practice (rail live every turn) vs Exam Sim (rail sealed until submission). Defaults to false (sealed) so existing callers/tests are unaffected. */
  coached?: boolean;
  /**
   * W6: lifted up to ExamMode (was previously owned by this component) so the
   * accumulated entries survive past 'running' into the results screen.
   * Defaults to an empty, inert rail so existing callers/tests are unaffected.
   */
  rail?: UseExamCorrectionsRail;
}

const EMPTY_RAIL: UseExamCorrectionsRail = { entries: [], disabledReason: null, retry: () => {} };

export function ExamRunner({
  action,
  entries,
  totalElapsedS,
  recording,
  turnBusy,
  onStartRecording,
  onSubmitSpeech,
  onSubmitText,
  onRequestRepeat,
  onExit,
  voiceMuted,
  onToggleVoice,
  pendingSilentSkip,
  pendingTranscriptionFailure,
  onKeepTrying,
  onSkipQuestion,
  rolePlayTitle,
  rolePlaySetup,
  taskProgress,
  coached = false,
  rail = EMPTY_RAIL,
}: Props) {
  const part = action?.part ?? 'rolePlay';
  const phaseLabel = PART_LABEL[part] ?? part;

  const [showSilenceNudge, setShowSilenceNudge] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [highlightedTurnKey, setHighlightedTurnKey] = useState<number | null>(null);

  const [highlightedQuote, setHighlightedQuote] = useState<string | null>(null);
  const turnLabels = useMemo(() => buildTurnLabels(entries), [entries]);
  const highlightTimer = useRef<number | undefined>(undefined);

  const handleIssueClick = (turnKey: number, quote: string) => {
    setMobileSheetOpen(true);
    setHighlightedTurnKey(turnKey);
    setHighlightedQuote(quote);
    window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => {
      setHighlightedTurnKey(null);
      setHighlightedQuote(null);
    }, 2500);
    // After the render that mounts the highlight (and the mobile sheet), scroll
    // each rail copy to the exact clicked row, falling back to the turn's card.
    window.setTimeout(() => {
      document.querySelectorAll(`[data-turn-key="${turnKey}"]`).forEach((card) => {
        const row = Array.from(card.querySelectorAll<HTMLElement>('[data-quote]')).find(
          (el) => el.dataset.quote === quote,
        );
        (row ?? card).scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }, 50);
  };

  useEffect(() => {
    if (!recording.isRecording) {
      setShowSilenceNudge(false);
      return;
    }
    const interval = window.setInterval(() => {
      const quietFor = recording.lastActivityAt ? (Date.now() - recording.lastActivityAt) / 1000 : 0;
      setShowSilenceNudge(quietFor >= NUDGE_QUIET_S);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [recording.isRecording, recording.lastActivityAt]);

  // exam-conduct §10: countdown from the CURRENT part's own target, counting
  // down from when that part started (not the whole exam) — held at 0, never
  // negative. Exam Sim only; Coached has no time-based countdown (§24).
  const currentPartStartS = partStartS(entries, part);
  const partElapsedS = Math.max(totalElapsedS - currentPartStartS, 0);
  const remainingS = Math.max(Math.round((PART_TARGET_S[part] ?? 0) - partElapsedS), 0);
  const currentPartIndex = PARTS.indexOf(part as (typeof PARTS)[number]);
  const secondPart = isSecondPart(action, entries);

  const rec = recording.isRecording;
  const composerDisabled = turnBusy || pendingSilentSkip || pendingTranscriptionFailure;
  const canRepeat = !rec && action?.kind !== 'REPEAT';

  return (
    <div data-hatch="immersive" className="fixed inset-0 bg-bg flex flex-col z-40">
      <header className="grid grid-cols-3 items-center px-5 py-3 border-b border-hairline surface shrink-0">
        {/* Segmented position bar — answered parts in --action, current outlined */}
        <div className="flex items-center gap-1.5">
          {PARTS.map((p, i) => {
            const answered = i < currentPartIndex;
            const current = i === currentPartIndex;
            return (
              <span
                key={p}
                title={PART_SHORT[p]}
                className={`h-1 w-10 rounded-pill ${
                  answered
                    ? 'bg-action'
                    : current
                      ? 'bg-transparent ring-1 ring-inset ring-action'
                      : 'bg-track'
                }`}
              />
            );
          })}
        </div>

        {/* Countdown — top-centre, mono, title size. exam-conduct §24: Coached has no time-based countdown. */}
        <div className="justify-self-center font-numeral text-title text-ink tabular-nums">
          {!coached && formatTime(remainingS)}
        </div>

        <div className="justify-self-end flex items-center gap-3">
          <span className="font-numeral text-body-s text-ink-subtle tabular-nums">
            {formatTime(Math.round(totalElapsedS))}
          </span>
          <button
            onClick={onToggleVoice}
            aria-label={voiceMuted ? 'Unmute examiner voice' : 'Mute examiner voice'}
            title={voiceMuted ? 'Unmute examiner voice' : 'Mute examiner voice'}
            className="text-ink-subtle hover:text-ink transition-colors duration-state ease-smooth"
          >
            {voiceMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <Button variant="destructive" size="sm" onClick={() => setShowExitConfirm(true)}>
            End exam
          </Button>
        </div>
      </header>

      <div className="px-5 py-2 border-b border-hairline shrink-0">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <span className="text-eyebrow uppercase text-ink-subtle">{phaseLabel}</span>
          {part === 'rolePlay' && rolePlayTitle && (
            <>
              <span className="text-ink-subtle">·</span>
              <span className="text-body-s font-semibold text-ink-muted truncate">{rolePlayTitle}</span>
              {taskProgress && (
                <span className="ml-auto text-eyebrow uppercase text-ink-subtle shrink-0">
                  Question {taskProgress.index + 1} of {taskProgress.total}
                  {secondPart && ' · part 2'}
                </span>
              )}
            </>
          )}
        </div>
        {part === 'rolePlay' && rolePlaySetup && (
          <p className="max-w-2xl mx-auto text-body-s text-ink-subtle leading-relaxed mt-1">{rolePlaySetup}</p>
        )}
      </div>

      <div className="flex-1 flex md:flex-row overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 max-w-2xl mx-auto w-full">
          <ExamTranscript
            entries={entries}
            voiceMuted={voiceMuted}
            isAwaitingExaminer={turnBusy}
            railEntries={rail.entries}
            onIssueClick={handleIssueClick}
          />

          <div className="px-5 pb-5 pt-2 space-y-3 shrink-0">
            {pendingTranscriptionFailure ? (
              <div className="w-full rounded-card surface-recessed p-5 text-center space-y-3">
                <p className="text-body-base font-semibold text-ink">We couldn&rsquo;t transcribe your answer</p>
                <p className="text-body-s text-ink-muted">
                  Something went wrong on our end, not with your answer. You can try again or skip this question.
                </p>
                <div className="flex items-center justify-center gap-3 pt-1">
                  <Button variant="primary" size="sm" onClick={onKeepTrying}>
                    Try again
                  </Button>
                  <Button variant="secondary" size="sm" onClick={onSkipQuestion}>
                    Skip question
                  </Button>
                </div>
              </div>
            ) : pendingSilentSkip ? (
              <div className="w-full rounded-card surface-recessed p-5 text-center space-y-3">
                <p className="text-body-base font-semibold text-ink">We can&rsquo;t hear you — check your mic</p>
                <p className="text-body-s text-ink-muted">
                  Keep trying to record, or skip this question. Skipping is scored as no answer, just like in the real exam.
                </p>
                <div className="flex items-center justify-center gap-3 pt-1">
                  <Button variant="primary" size="sm" onClick={onKeepTrying}>
                    Keep trying
                  </Button>
                  <Button variant="secondary" size="sm" onClick={onSkipQuestion}>
                    Skip question
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {showSilenceNudge ? (
                  <div className="flex items-center justify-center gap-1.5 text-center text-body-s text-ink-muted surface-recessed rounded-control py-1.5 px-3">
                    <Info size={12} className="flex-shrink-0 opacity-60" />
                    Fini&nbsp;? Soumets ta réponse — ou continue à parler.
                  </div>
                ) : (
                  rec && recording.elapsedTime >= PACING_HINT_S && (
                    <div className="flex items-center justify-center gap-1.5 text-center text-body-s text-ink-subtle surface-recessed rounded-control py-1.5 px-3">
                      <Info size={12} className="flex-shrink-0 opacity-60" />
                      Pense à conclure ta réponse.
                    </div>
                  )
                )}

                <ExamComposer
                  recording={recording}
                  disabled={composerDisabled}
                  onStartRecording={onStartRecording}
                  onSubmitSpeech={onSubmitSpeech}
                  onSubmitText={onSubmitText}
                  coached={coached}
                />

                <div className="flex items-center justify-center">
                  {canRepeat ? (
                    <Button variant="quiet" size="sm" onClick={onRequestRepeat} disabled={composerDisabled}>
                      <RotateCcw size={12} /> Repeat question
                    </Button>
                  ) : (
                    !rec && (
                      <Button variant="quiet" size="sm" disabled>
                        <RotateCcw size={12} /> No repeats left
                      </Button>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="hidden lg:block w-80 shrink-0 border-l border-hairline p-4 overflow-y-auto">
          <ExamCorrectionsRail
            coached={coached}
            entries={rail.entries}
            disabledReason={rail.disabledReason}
            onRetry={rail.retry}
            highlightedTurnKey={highlightedTurnKey}
            highlightedQuote={highlightedQuote}
            turnLabels={turnLabels}
          />
        </div>
      </div>

      <button
        onClick={() => setMobileSheetOpen(true)}
        className="lg:hidden fixed right-4 bottom-40 z-40 flex items-center justify-center w-11 h-11 rounded-pill
          bg-action text-action-ink shadow-lg transition-colors duration-state ease-smooth"
        aria-label="Show live corrections"
      >
        <MessageSquareText size={18} />
      </button>

      {mobileSheetOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-[90] bg-black/50"
            onClick={() => setMobileSheetOpen(false)}
          />
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[95] surface-raised rounded-t-2xl p-5 pb-8 max-h-[70vh] overflow-y-auto">
            <div className="w-10 h-1.5 rounded-full bg-hairline-strong mx-auto mb-4" />
            <ExamCorrectionsRail
              coached={coached}
              entries={rail.entries}
              disabledReason={rail.disabledReason}
              onRetry={rail.retry}
              highlightedTurnKey={highlightedTurnKey}
            highlightedQuote={highlightedQuote}
            turnLabels={turnLabels}
            />
          </div>
        </>
      )}

      <ExitConfirmDialog
        open={showExitConfirm}
        onCancel={() => setShowExitConfirm(false)}
        onConfirm={onExit}
      />
    </div>
  );
}
