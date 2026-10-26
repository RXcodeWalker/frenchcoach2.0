import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, Loader2, Mic } from 'lucide-react';
import { formatTime } from '../../domain/time';
import type { RecordingState } from '../../features/recording/useRecording';
import type { MicLevelController } from '../../features/recording/useMicLevel';
import { enter } from '../../components/motion/variants';

/** Where the answer is after Stop: 0 transcribing, 1 checking grammar, 2 scoring (or writing comments). */
export type ProcessingStep = 0 | 1 | 2;

interface Props {
  isActive: boolean;
  recording: RecordingState;
  onStop: () => void;
  /** Set while the answer is being processed; the panel then shows the stepped status. */
  processing?: ProcessingStep | null;
  /** The Examiner style gives comments, not a score, so its last step is named for that. */
  unscored?: boolean;
  /** Mobile: a sticky dock at the bottom of the session instead of a centred card. */
  compact?: boolean;
}

const BARS = 40;
const SAMPLE_MS = 60;

/**
 * The `record` motion: 40 bars, 3px wide, that follow the live mic level —
 * the newest sample on the right — while recording, and settle to a 4px
 * baseline when it stops. Heights are written straight to the DOM each frame
 * so React doesn't re-render 16 times a second.
 */
function LevelBars({ active, source, centred }: { active: boolean; source: MicLevelController; centred: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const sourceRef = useRef(source);
  sourceRef.current = source;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const bars = Array.from(el.children) as HTMLElement[];
    const settle = () => bars.forEach(b => {
      b.style.height = '4px';
      b.style.background = 'var(--ink-muted)';
    });
    if (!active) {
      settle();
      return;
    }
    const hist = new Array<number>(BARS).fill(0);
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      if (t - last > SAMPLE_MS) {
        last = t;
        const lv = Math.max(0, Math.min(1, sourceRef.current?.levelRef?.current ?? 0));
        hist.push(lv);
        hist.shift();
        bars.forEach((b, i) => {
          b.style.height = `${4 + 32 * hist[i]}px`;
          b.style.background = 'var(--ink)';
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      settle();
    };
  }, [active]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`flex h-10 w-full items-center gap-[3px] overflow-hidden ${centred ? 'max-w-[360px] justify-center' : ''}`}
    >
      {Array.from({ length: BARS }, (_, i) => (
        <span key={i} className="h-1 w-[3px] shrink-0 rounded-pill bg-ink-muted transition-[height] duration-100 ease-linear" />
      ))}
    </div>
  );
}

/** The length meter: fills over 60s, turns green at 30s, with a nudge for each stretch. */
function LengthMeter({ seconds }: { seconds: number }) {
  const good = seconds >= 30;
  const msg = seconds < 10 ? 'Warm up — say your opinion'
    : seconds < 30 ? 'Keep going — add a reason'
    : seconds <= 60 ? 'Good length'
    : 'Wrap up when ready';
  return (
    <div className="flex w-full flex-col gap-1.5" data-testid="length-meter">
      <span className="block h-1 overflow-hidden rounded-pill bg-track">
        <span
          className="block h-full rounded-pill transition-[width,background-color] duration-200 ease-linear"
          style={{ width: `${Math.min(100, (seconds / 60) * 100)}%`, background: good ? 'var(--progress)' : 'var(--ink-subtle)' }}
        />
      </span>
      <span className="flex justify-between gap-2 text-caption text-ink-subtle">
        <span className={good ? 'font-medium text-progress-text' : ''}>{msg}</span>
        <span className="font-numeral">aim 30–60s</span>
      </span>
    </div>
  );
}

function ProcessingSteps({ step, labels }: { step: ProcessingStep; labels: string[] }) {
  return (
    <ol className="flex flex-col gap-1.5" aria-live="polite">
      {labels.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li
            key={label}
            className={`flex items-center gap-2 text-[14px] transition-colors duration-state ease-smooth
              ${done ? 'text-ink-muted' : active ? 'font-semibold text-ink' : 'text-ink-subtle'}`}
            aria-current={active ? 'step' : undefined}
          >
            <span className="flex w-4 justify-center" aria-hidden="true">
              {done ? (
                <motion.span variants={enter} initial="hidden" animate="show" className="flex text-progress-text"><Check size={14} /></motion.span>
              ) : (
                <span className={`h-1.5 w-1.5 rounded-pill ${active ? 'bg-action' : 'bg-track'}`} />
              )}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The recorder (Design System v2): a 64px record button (action) that becomes
 * an ink stop button with a ring, the live level bars, a timer with a red REC
 * dot, the speaking-length meter, and — after Stop — the stepped processing
 * status (Transcribing → Checking grammar → Scoring).
 */
export function RecordingPanel({ isActive, recording, onStop, processing = null, unscored = false, compact = false }: Props) {
  if (!isActive && processing === null) return null;

  const isRec = recording.isRecording;
  const isProc = processing !== null && !isRec;
  const labels = ['Transcribing', 'Checking grammar', unscored ? 'Writing comments' : 'Scoring'];

  const button = isProc ? (
    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-pill border border-hairline bg-surface-recessed text-ink-muted">
      <Loader2 size={24} className="animate-spin" aria-hidden="true" />
      <span className="sr-only">Processing your answer</span>
    </span>
  ) : isRec ? (
    <button
      type="button"
      onClick={onStop}
      aria-label="Stop recording"
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-pill bg-ink shadow-[0_0_0_6px_var(--surface),0_0_0_7px_var(--hairline-strong)]
        transition-transform duration-press active:scale-[.97]"
    >
      <span className="h-[18px] w-[18px] rounded-[4px] bg-surface" />
    </button>
  ) : (
    <button
      type="button"
      onClick={recording.start}
      aria-label="Record your answer"
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-pill bg-action text-action-ink
        transition-[background-color,transform] duration-state ease-smooth hover:bg-action-hover active:scale-[.97] active:bg-action-press"
    >
      <Mic size={24} aria-hidden="true" />
    </button>
  );

  const warnings = (
    <>
      {!recording.sttSupported && (
        <p className="flex w-full items-start gap-2 rounded-control bg-reward-soft px-3 py-2.5 text-[13px] text-reward-text">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          This browser doesn't support live speech transcription. Try Chrome or Edge for the best experience.
        </p>
      )}
      {recording.sttSupported && recording.sttError && (
        <p className="flex w-full items-start gap-2 rounded-control bg-reward-soft px-3 py-2.5 text-[13px] text-reward-text">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          Speech recognition error ({recording.sttError}). Your recording may not have been transcribed.
        </p>
      )}
    </>
  );

  const timer = (
    <span className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-pill bg-correction" aria-hidden="true" />
      <span className="font-numeral text-[15px] text-ink" aria-label={`Recording, ${formatTime(recording.elapsedTime)}`}>
        {formatTime(recording.elapsedTime)}
      </span>
    </span>
  );

  if (compact) {
    return (
      <motion.div
        variants={enter}
        initial="hidden"
        animate="show"
        className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4 shadow-card"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {warnings}
        <div className="flex items-center gap-4">
          {button}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {isProc ? (
              <span className="flex items-center gap-2 text-[14px] font-semibold text-ink" aria-live="polite">
                {labels[processing]}…
                <span className="font-numeral font-medium text-ink-subtle">{processing + 1}/3</span>
              </span>
            ) : isRec ? (
              <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                <span className="h-2 w-2 rounded-pill bg-correction" aria-hidden="true" />Recording
                <span className="font-numeral font-medium text-ink-muted">{formatTime(recording.elapsedTime)}</span>
              </span>
            ) : (
              <span className="text-[14px] font-semibold text-ink">Tap to start recording</span>
            )}
            <LevelBars active={isRec} source={recording.micLevel} centred={false} />
            {isRec && <LengthMeter seconds={recording.elapsedTime} />}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={enter}
      initial="hidden"
      animate="show"
      className="flex flex-col items-center gap-4 rounded-card border border-hairline bg-surface px-6 py-7"
    >
      {warnings}
      <LevelBars active={isRec} source={recording.micLevel} centred />
      {button}
      {isProc ? (
        <ProcessingSteps step={processing} labels={labels} />
      ) : isRec ? (
        <>
          <span className="flex flex-col items-center gap-0.5">
            {timer}
            <span className="text-[13px] text-ink-muted">Recording · tap to stop</span>
          </span>
          <div className="w-full max-w-[360px]"><LengthMeter seconds={recording.elapsedTime} /></div>
        </>
      ) : (
        <span className="flex flex-col items-center gap-0.5 text-center">
          <span className="text-[14px] font-semibold text-ink">Tap to start recording</span>
          <span className="text-[13px] text-ink-muted">Answer in French — three or four sentences</span>
        </span>
      )}
    </motion.div>
  );
}
