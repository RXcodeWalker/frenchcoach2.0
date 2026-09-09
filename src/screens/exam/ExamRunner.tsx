import { useEffect, useState } from 'react';
import { Volume2, VolumeX, RotateCcw, Info } from 'lucide-react';
import { ScrollingWaveform } from '../../features/recording/ScrollingWaveform';
import { formatTime } from '../../domain/time';
import { Button } from '../../components/ui/Button';
import type { RecordingState } from '../../features/recording/useRecording';
import type { ExaminerAction } from '../../domain/igcse/session/types';
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

const PARTS = ['rolePlay', 'topic1', 'topic2'] as const;
const PART_SHORT: Record<string, string> = {
  rolePlay: 'Role Play',
  topic1: 'Topic 1',
  topic2: 'Topic 2',
};

interface Props {
  action: ExaminerAction | null;
  elapsedS: number;
  totalElapsedS: number;
  recording: RecordingState;
  onSubmitTurn: () => void;
  onRequestRepeat: () => void;
  onExit: () => void;
  voiceMuted: boolean;
  onToggleVoice: () => void;
  pendingSilentSkip: boolean;
  onKeepTrying: () => void;
  onSkipQuestion: () => void;
  rolePlayTitle?: string;
  rolePlaySetup?: string;
  taskProgress?: { index: number; total: number };
}

const PART_LABEL: Record<string, string> = {
  rolePlay: 'Part 1: Role Play',
  topic1: 'Part 2: Topic Conversation 1',
  topic2: 'Part 3: Topic Conversation 2',
};

const ACTION_LABEL: Record<string, string> = {
  READ_MAIN: 'Examiner',
  REPEAT: 'Examiner (repeating)',
  READ_ALTERNATIVE: 'Examiner (alternative question)',
  EXTENSION_PROMPT: 'Examiner',
  FURTHER_QUESTION: 'Examiner',
};

export function ExamRunner({
  action,
  elapsedS,
  totalElapsedS,
  recording,
  onSubmitTurn,
  onRequestRepeat,
  onExit,
  voiceMuted,
  onToggleVoice,
  pendingSilentSkip,
  onKeepTrying,
  onSkipQuestion,
  rolePlayTitle,
  rolePlaySetup,
  taskProgress,
}: Props) {
  const part = action?.part ?? 'rolePlay';
  const phaseLabel = PART_LABEL[part] ?? part;
  const examinerLabel = action ? (ACTION_LABEL[action.kind] ?? 'Examiner') : 'Examiner';

  const [showSilenceNudge, setShowSilenceNudge] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

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

  // Countdown from the part target, held at 0 (never negative). Exam mode shows
  // this instead of the session's count-up.
  const remainingS = Math.max(Math.round((PART_TARGET_S[part] ?? 0) - totalElapsedS), 0);
  const currentPartIndex = PARTS.indexOf(part as (typeof PARTS)[number]);

  const rec = recording.isRecording;
  // While recording, everything that isn't the live control steps back.
  const quietInk = rec ? 'text-ink-subtle' : 'text-ink-muted';

  return (
    <div data-hatch="immersive" className="fixed inset-0 bg-bg flex flex-col z-40">
      <header className="grid grid-cols-3 items-center px-5 py-3 border-b border-hairline surface">
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

        {/* Countdown — top-centre, mono, title size */}
        <div className="justify-self-center font-numeral text-title text-ink tabular-nums">
          {formatTime(remainingS)}
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

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 max-w-2xl mx-auto w-full">
        <div className={`text-eyebrow uppercase ${quietInk} ${part === 'rolePlay' && rolePlayTitle ? 'mb-1.5' : 'mb-4'}`}>
          {phaseLabel}
        </div>

        {part === 'rolePlay' && rolePlayTitle && (
          <div className="mb-4 max-w-md text-center space-y-1.5">
            <div className="flex items-center justify-center gap-2">
              <p className={`text-body-s font-semibold ${quietInk}`}>{rolePlayTitle}</p>
              {taskProgress && (
                <span className={`text-eyebrow uppercase ${rec ? 'text-ink-subtle' : 'text-ink-subtle'}`}>
                  Question {taskProgress.index + 1} of {taskProgress.total}
                </span>
              )}
            </div>
            {rolePlaySetup && (
              <p className="text-body-s text-ink-subtle leading-relaxed">{rolePlaySetup}</p>
            )}
          </div>
        )}

        {(part === 'topic1' || part === 'topic2') && (
          <div className={`mb-4 text-eyebrow uppercase ${quietInk}`}>
            {action?.kind === 'EXTENSION_PROMPT' || action?.kind === 'FURTHER_QUESTION'
              ? 'Extension question'
              : 'Conversation in progress'}
          </div>
        )}

        <div className={`w-full rounded-card surface p-5 mb-5 text-center ${rec ? 'opacity-70' : ''}`}>
          <p className="text-eyebrow uppercase text-ink-subtle mb-1.5">{examinerLabel}</p>
          <p className={`exam-serif text-display-m leading-snug ${rec ? 'text-ink-subtle' : 'text-ink'}`}>
            {action?.text ?? '…'}
          </p>
        </div>

        <div className="w-full space-y-4">
          {pendingSilentSkip ? (
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
              <ScrollingWaveform isRecording={rec} source={recording.micLevel} />
              <div className="text-center font-numeral text-body-s text-ink-subtle tabular-nums">
                {formatTime(Math.round(elapsedS))}
              </div>
              {showSilenceNudge ? (
                <div className="flex items-center justify-center gap-1.5 text-center text-body-s text-ink-muted surface-recessed rounded-control py-1.5 px-3">
                  <Info size={12} className="flex-shrink-0 opacity-60" />
                  Fini&nbsp;? Soumets ta réponse — ou continue à parler.
                </div>
              ) : (
                rec && elapsedS >= PACING_HINT_S && (
                  <div className="flex items-center justify-center gap-1.5 text-center text-body-s text-ink-subtle surface-recessed rounded-control py-1.5 px-3">
                    <Info size={12} className="flex-shrink-0 opacity-60" />
                    Pense à conclure ta réponse.
                  </div>
                )
              )}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={rec ? onSubmitTurn : recording.start}
                  aria-label={rec ? 'Stop and submit' : 'Start recording'}
                  className="w-[60px] h-[60px] rounded-pill bg-action hover:bg-action-hover
                    flex items-center justify-center transition-colors duration-state ease-smooth"
                >
                  <span
                    className={`bg-action-ink transition-all duration-state ease-smooth ${
                      rec ? 'w-[18px] h-[18px] rounded-[4px]' : 'w-4 h-4 rounded-pill'
                    }`}
                  />
                </button>

                {rec ? (
                  <Button variant="secondary" size="sm" onClick={onSubmitTurn}>
                    Stop &amp; submit
                  </Button>
                ) : action?.kind === 'REPEAT' ? (
                  <Button variant="secondary" size="sm" disabled>
                    <RotateCcw size={12} /> No repeats left
                  </Button>
                ) : (
                  <Button variant="quiet" size="sm" onClick={onRequestRepeat}>
                    <RotateCcw size={12} /> Repeat question
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <ExitConfirmDialog
        open={showExitConfirm}
        onCancel={() => setShowExitConfirm(false)}
        onConfirm={onExit}
      />
    </div>
  );
}
