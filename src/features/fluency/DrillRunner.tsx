import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, RotateCcw, Square } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { SpeakingConsentGate } from '../../components/SpeakingConsentGate';
import { fadeUp } from '../../components/motion/variants';
import { useAuth } from '../../context/AuthContext';
import { useBackHandler } from '../../lib/useBackHandler';
import { useSpaceToRecord } from '../../lib/useSpaceToRecord';
import { DRILL_ROUNDS_S, DRILL_VERSION, summarizeDrill, type DrillRecord, type DrillRoundResult } from '../../domain/fluency/drill432';
import { summarizeSpeech } from '../../domain/fluency/speechMetrics';
import { MIN_SPEAKING_SPAN_S, pausesPerMinute } from '../../domain/fluency/flowMeasures';
import { measureAnswerSpeech } from '../pronunciation/audio/answerSpeech';
import { LevelBars } from '../recording/LevelBars';
import { useRecording } from '../recording/useRecording';
import { ChangeList } from './ChangeList';
import { drillReducer, initialDrillState, measuredRounds, type RoundOutcome } from './drillMachine';
import {
  GET_READY,
  MEASURE_DISPLAY,
  MEASURING,
  NEXT_ROUND,
  NO_STT_NOTE,
  RECORD_LABEL,
  ROUND_INSTRUCTION,
  ROUND_NO_SPEECH,
  ROUND_NO_WORDS,
  ROUND_TOO_SHORT,
  ROUND_UNMEASURED,
  SEE_RESULTS,
  STOP_LABEL,
  TRY_AGAIN_ROUND,
  compareCaption,
  formatMeasure,
  roundLabel,
} from './fluencyCopy';

/**
 * Runs one 4-3-2 drill (fluency-trainer §3.2): three timed rounds of the same
 * answer, each measured on this device by the exam pronunciation silence gate
 * (`measureAnswerSpeech` → `summarizeSpeech`, the same path as the speaking log).
 *
 * No AI call and no upload: words come from the browser's live captions
 * (`useRecording`), and the audio is decoded and measured in memory, then
 * dropped. It writes no XP, Session, mastery or evidence. The finished drill
 * is handed to `onFinished` as numbers only.
 */

export interface DrillQuestion {
  id: string | null;
  text: string;
  topicKey: string | null;
}

interface Props {
  question: DrillQuestion;
  onFinished: (record: DrillRecord) => void;
}

function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function RoundNumbers({ result }: { result: DrillRoundResult }) {
  const m = result.metrics;
  if (!m) return null;
  const rows: Array<[string, string, string]> = [
    [MEASURE_DISPLAY.wordsPerMinute.label, formatMeasure('wordsPerMinute', m.wordsPerMinute), MEASURE_DISPLAY.wordsPerMinute.unit],
    [MEASURE_DISPLAY.pausesPerMinute.label, formatMeasure('pausesPerMinute', pausesPerMinute(m)), MEASURE_DISPLAY.pausesPerMinute.unit],
    [MEASURE_DISPLAY.longestPauseS.label, formatMeasure('longestPauseS', m.longestPauseS), MEASURE_DISPLAY.longestPauseS.unit],
    ['Speaking time', m.speakingSpanS.toFixed(0), `s of ${result.limitS}`],
  ];
  return (
    <dl className="grid grid-cols-2 gap-3" data-testid="drill-round-numbers">
      {rows.map(([label, value, unit]) => (
        <div key={label} className="flex flex-col gap-0.5 rounded-control surface-recessed p-3">
          <dt className="text-caption font-semibold text-ink-muted">{label}</dt>
          <dd className="flex items-baseline gap-1">
            <span className="font-numeral text-num-m text-ink">{value}</span>
            <span className="text-caption text-ink-muted">{unit}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function DrillRunner({ question, onFinished }: Props) {
  const { consentStatus } = useAuth();
  const blocked = consentStatus === 'pending';
  const rec = useRecording(blocked);
  const [state, dispatch] = useReducer(drillReducer, undefined, initialDrillState);
  const { phase } = state;
  const [elapsed, setElapsed] = useState(0);
  const stoppingRef = useRef(false);
  const startedAtRef = useRef(0);
  const finishedRef = useRef(false);
  const recRef = useRef(rec);
  recRef.current = rec;

  const round = phase.kind === 'done' ? DRILL_ROUNDS_S.length - 1 : phase.round;
  const limitS = DRILL_ROUNDS_S[round];

  // "Get ready" countdown.
  useEffect(() => {
    if (phase.kind !== 'countdown') return;
    const id = window.setInterval(() => dispatch({ type: 'tick' }), 1000);
    return () => window.clearInterval(id);
  }, [phase.kind, round]);

  const endRound = useCallback(async (stoppedEarly: boolean) => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    dispatch({ type: 'stop' });
    const r = recRef.current;
    let outcome: RoundOutcome = 'unmeasured';
    let result: DrillRoundResult | null = null;
    try {
      const text = await r.stop();
      const blob = await r.audioBlobPromise();
      const speech = blob ? await measureAnswerSpeech(blob) : null;
      if (speech && !speech.hasSpeech) outcome = 'noSpeech';
      else if (speech) {
        const metrics = summarizeSpeech(speech, text);
        if (metrics && metrics.speakingSpanS < MIN_SPEAKING_SPAN_S) outcome = 'tooShort';
        else if (metrics) {
          outcome = 'ok';
          result = { limitS: DRILL_ROUNDS_S[round], metrics, stoppedEarly };
        }
      }
    } catch {
      outcome = 'unmeasured';
    }
    dispatch({ type: 'measured', outcome, result });
  }, [round]);

  // Recording: start the mic, run the clock, stop at the time limit.
  useEffect(() => {
    if (phase.kind !== 'recording') return;
    stoppingRef.current = false;
    recRef.current.start();
    startedAtRef.current = performance.now();
    setElapsed(0);
    const id = window.setInterval(() => {
      const e = (performance.now() - startedAtRef.current) / 1000;
      setElapsed(e);
      if (e >= DRILL_ROUNDS_S[round]) void endRound(false);
    }, 200);
    return () => window.clearInterval(id);
  }, [phase.kind, round, endRound]);

  const measured = measuredRounds(state);

  // Hand the finished drill over once.
  useEffect(() => {
    if (phase.kind !== 'done' || finishedRef.current) return;
    finishedRef.current = true;
    onFinished({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: new Date().toISOString(),
      drillVersion: DRILL_VERSION,
      questionId: question.id,
      topicKey: question.topicKey,
      rounds: measured,
    });
  }, [phase.kind, measured, onFinished, question.id, question.topicKey]);

  useSpaceToRecord({
    enabled: (phase.kind === 'countdown' || phase.kind === 'recording') && !blocked,
    isRecording: phase.kind === 'recording',
    onStart: () => dispatch({ type: 'skipCountdown' }),
    onStop: () => void endRound(true),
  });

  // Escape / Back while recording stops the round (and measures it) instead of leaving.
  useBackHandler(() => {
    if (phase.kind !== 'recording') return false;
    void endRound(true);
    return true;
  }, phase.kind === 'recording');

  const soFar = useMemo(() => summarizeDrill(measured), [measured]);
  const current = phase.kind === 'review' ? state.rounds[phase.round] : null;
  const isLast = round === DRILL_ROUNDS_S.length - 1;
  const remaining = limitS - elapsed;

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex flex-col gap-6" data-testid="drill-runner">
      <div className="flex flex-col gap-3">
        <ol className="flex gap-2" aria-label="Rounds">
          {DRILL_ROUNDS_S.map((s, i) => {
            const done = state.rounds[i] !== null;
            const now = i === round && phase.kind !== 'done';
            return (
              <li
                key={s}
                aria-current={now ? 'step' : undefined}
                className={`flex-1 rounded-control border px-3 py-2 text-center text-label ${
                  now ? 'border-action bg-action-soft text-action-text' : done ? 'border-hairline bg-progress-soft text-progress-text' : 'border-hairline text-ink-subtle'
                }`}
              >
                {s} s
              </li>
            );
          })}
        </ol>
        <p className="text-eyebrow uppercase text-ink-subtle">{roundLabel(round, DRILL_ROUNDS_S.length)}</p>
        <p lang="fr" className="text-title text-ink" data-testid="drill-question">{question.text}</p>
        <p className="text-body-s text-ink-muted">{ROUND_INSTRUCTION[round]}</p>
        {!rec.sttSupported && <p className="text-caption text-ink-subtle">{NO_STT_NOTE}</p>}
      </div>

      <SpeakingConsentGate>
        <div className="flex flex-col items-center gap-3 rounded-card border border-hairline bg-surface p-6" data-testid="drill-stage">
          {phase.kind === 'countdown' && (
            <>
              <p className="text-label text-ink-muted" aria-live="polite">{GET_READY}</p>
              <p className="font-numeral text-num-xl text-ink" data-testid="drill-countdown">{phase.left}</p>
              <Button variant="secondary" onClick={() => dispatch({ type: 'skipCountdown' })} disabled={blocked}>
                <Mic size={16} aria-hidden="true" />
                {RECORD_LABEL}
              </Button>
            </>
          )}

          {phase.kind === 'recording' && (
            <>
              <p className="font-numeral text-num-xl text-ink" data-testid="drill-clock" aria-label={`${clock(remaining)} left`}>{clock(remaining)}</p>
              <div className="h-1.5 w-full overflow-hidden rounded-pill bg-track" aria-hidden="true">
                <div className="h-full bg-action" style={{ width: `${Math.max(0, Math.min(100, (remaining / limitS) * 100))}%` }} />
              </div>
              <LevelBars active source={rec.micLevel} centred />
              <Button variant="primary" size="lg" onClick={() => void endRound(true)} data-testid="drill-stop">
                <Square size={16} aria-hidden="true" />
                {STOP_LABEL}
              </Button>
              <p className="text-caption text-ink-subtle">Space or Esc stops early</p>
            </>
          )}

          {phase.kind === 'measuring' && <p className="text-label text-ink-muted" aria-live="polite">{MEASURING}</p>}

          {phase.kind === 'review' && (
            <div className="flex w-full flex-col gap-4" data-testid="drill-review" data-outcome={phase.outcome}>
              {phase.outcome === 'noSpeech' && <p className="text-body-s text-ink">{ROUND_NO_SPEECH}</p>}
              {phase.outcome === 'unmeasured' && <p className="text-body-s text-ink">{ROUND_UNMEASURED}</p>}
              {phase.outcome === 'tooShort' && <p className="text-body-s text-ink">{ROUND_TOO_SHORT}</p>}
              {phase.outcome === 'ok' && current && (
                <>
                  <RoundNumbers result={current} />
                  {current.metrics && current.metrics.wordCount === 0 && <p className="text-caption text-ink-muted">{ROUND_NO_WORDS}</p>}
                  {phase.round > 0 && soFar.from !== null && soFar.to !== null && soFar.changes.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <p className="text-caption text-ink-muted">{compareCaption(measured[soFar.from].limitS, measured[soFar.to].limitS)}</p>
                      <ChangeList changes={soFar.changes} />
                    </div>
                  )}
                </>
              )}
              <div className="flex flex-wrap justify-center gap-2">
                {phase.outcome === 'ok' ? (
                  <>
                    <Button variant="primary" onClick={() => dispatch({ type: 'next' })} data-testid="drill-next">
                      {isLast ? SEE_RESULTS : NEXT_ROUND}
                    </Button>
                    <Button variant="quiet" onClick={() => dispatch({ type: 'retry' })}>
                      <RotateCcw size={14} aria-hidden="true" />
                      {TRY_AGAIN_ROUND}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="primary" onClick={() => dispatch({ type: 'retry' })} data-testid="drill-retry">
                      <RotateCcw size={14} aria-hidden="true" />
                      {TRY_AGAIN_ROUND}
                    </Button>
                    {measured.length > 0 && (
                      <Button variant="quiet" onClick={() => dispatch({ type: 'finish' })}>{SEE_RESULTS}</Button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </SpeakingConsentGate>
    </motion.div>
  );
}
