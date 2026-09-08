import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Mic, MicOff, ArrowLeft, Volume2, VolumeX, RotateCcw, Info } from 'lucide-react';
import { ScrollingWaveform } from '../../features/recording/ScrollingWaveform';
import { formatTime } from '../../domain/time';
import type { RecordingState } from '../../features/recording/useRecording';
import type { ExaminerAction } from '../../domain/igcse/session/types';
import { ExitConfirmDialog } from './ExitConfirmDialog';

// UI-only pacing heuristics (approximate VAD / pacing) — never logged or scored.
const NUDGE_QUIET_S = 5;
const PACING_HINT_S = 45;

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

  return (
    <div className="fixed inset-0 bg-navy flex flex-col z-40">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.03] surface">
        <motion.button
          onClick={() => setShowExitConfirm(true)}
          className="flex items-center gap-1.5 text-ink-subtle hover:text-white transition-colors text-[10px]"
          whileHover={{ x: -2 }}
        >
          <ArrowLeft size={12} /> Exit
        </motion.button>
        <div className="flex items-center gap-1.5">
          {['rolePlay', 'topic1', 'topic2'].map((p) => (
            <div key={p} className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
              part === p ? 'bg-violet-electric text-white' : 'bg-navy-400 text-ink-muted'
            }`}>
              {p === 'rolePlay' ? 'Role Play' : p === 'topic1' ? 'Topic 1' : 'Topic 2'}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[9px] text-ink-subtle tabular-nums">
            Total <span className="text-ink-muted">{formatTime(Math.round(totalElapsedS))}</span>
          </div>
          <button
            onClick={onToggleVoice}
            aria-label={voiceMuted ? 'Unmute examiner voice' : 'Mute examiner voice'}
            title={voiceMuted ? 'Unmute examiner voice' : 'Mute examiner voice'}
            className="text-ink-subtle hover:text-white transition-colors"
          >
            {voiceMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 max-w-2xl mx-auto w-full">
        <motion.div
          className={`px-3 py-1 rounded-full text-[9px] font-bold border bg-violet-electric/8 text-violet-400 border-violet-electric/15 ${
            part === 'rolePlay' && rolePlayTitle ? 'mb-1.5' : 'mb-4'
          }`}
          key={phaseLabel}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {phaseLabel}
        </motion.div>

        {part === 'rolePlay' && rolePlayTitle && (
          <div className="mb-4 max-w-md text-center space-y-1.5">
            <div className="flex items-center justify-center gap-2">
              <p className="text-[11px] text-ink-muted font-semibold">{rolePlayTitle}</p>
              {taskProgress && (
                <span className="px-2 py-0.5 rounded-full bg-navy-400 text-ink-muted text-[8px] font-bold uppercase tracking-wider">
                  Question {taskProgress.index + 1} of {taskProgress.total}
                </span>
              )}
            </div>
            {rolePlaySetup && (
              <p className="text-[10px] text-ink-subtle leading-relaxed italic">{rolePlaySetup}</p>
            )}
          </div>
        )}

        {(part === 'topic1' || part === 'topic2') && (
          <div className="mb-4 flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-wider text-ink-subtle">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-electric animate-pulse" />
            {action?.kind === 'EXTENSION_PROMPT' || action?.kind === 'FURTHER_QUESTION' ? 'Extension question' : 'Conversation in progress'}
          </div>
        )}

        <div className="w-full rounded-xl surface-raised p-5 mb-5 text-center">
          <p className="text-[9px] text-ink-subtle uppercase tracking-wider mb-1.5">{examinerLabel}</p>
          <p className="text-base font-bold text-white leading-relaxed">{action?.text ?? '…'}</p>
        </div>

        <div className="w-full space-y-4">
          {pendingSilentSkip ? (
            <motion.div
              className="w-full rounded-xl surface-raised p-5 text-center space-y-3"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <p className="text-sm font-semibold text-white">We didn't hear an answer</p>
              <p className="text-[10px] text-ink-muted">Keep trying to record, or skip this question. Skipping will be scored as no answer, just like in the real exam.</p>
              <div className="flex items-center justify-center gap-3 pt-1">
                <motion.button
                  onClick={onKeepTrying}
                  className="px-4 py-2 rounded-lg bg-gradient-to-br from-violet-electric to-indigo-500 text-white transition-all font-semibold text-[10px]"
                  whileTap={{ scale: 0.95 }}
                >
                  Keep trying
                </motion.button>
                <motion.button
                  onClick={onSkipQuestion}
                  className="px-4 py-2 rounded-lg surface-recessed hover:bg-white/[0.04] text-ink-muted transition-all font-semibold text-[10px]"
                  whileTap={{ scale: 0.95 }}
                >
                  Skip question
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <>
              <ScrollingWaveform isRecording={recording.isRecording} source={recording.micLevel} />
              <div className="text-center text-[10px] text-ink-subtle tabular-nums">{formatTime(Math.round(elapsedS))}</div>
              {showSilenceNudge ? (
                <motion.div
                  className="flex items-center justify-center gap-1.5 text-center text-[10px] italic text-ink-muted surface-recessed rounded-lg py-1.5 px-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Info size={10} className="flex-shrink-0 opacity-60" />
                  Fini ? Soumets ta réponse — ou continue à parler.
                </motion.div>
              ) : (
                recording.isRecording &&
                elapsedS >= PACING_HINT_S && (
                  <motion.div
                    className="flex items-center justify-center gap-1.5 text-center text-[10px] italic text-ink-subtle surface-recessed rounded-lg py-1.5 px-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Info size={10} className="flex-shrink-0 opacity-60" />
                    Pense à conclure ta réponse.
                  </motion.div>
                )
              )}
              <div className="flex items-center justify-center gap-3">
                <motion.button
                  onClick={recording.isRecording ? undefined : recording.start}
                  disabled={recording.isRecording}
                  className={`relative w-14 h-14 rounded-full flex items-center justify-center ${
                    recording.isRecording
                      ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                      : 'bg-gradient-to-br from-violet-electric to-indigo-500 shadow-[0_0_20px_rgba(124,58,237,0.3)]'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {recording.isRecording ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-white" />}
                  {recording.isRecording && <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-20" />}
                </motion.button>

                {recording.isRecording ? (
                  <motion.button
                    onClick={onSubmitTurn}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg surface-recessed hover:bg-white/[0.04] text-white transition-all font-semibold text-[10px]"
                    whileTap={{ scale: 0.95 }}
                  >
                    Stop &amp; Submit
                  </motion.button>
                ) : action?.kind === 'REPEAT' ? (
                  <button
                    disabled
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg surface-recessed text-ink-subtle font-semibold text-[10px] cursor-not-allowed"
                  >
                    <RotateCcw size={11} /> No repeats left
                  </button>
                ) : (
                  <motion.button
                    onClick={onRequestRepeat}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg surface-recessed hover:bg-white/[0.04] text-ink-muted transition-all font-semibold text-[10px]"
                    whileTap={{ scale: 0.95 }}
                  >
                    <RotateCcw size={11} /> Repeat question
                  </motion.button>
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
