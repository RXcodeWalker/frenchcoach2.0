import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Play, Volume2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { GuardianConsentNotice } from '../../components/GuardianConsentNotice';
import { SpeakingConsentGate } from '../../components/SpeakingConsentGate';
import { useSpaceToRecord } from '../../lib/useSpaceToRecord';
import { enter, enterReduced, fill } from '../../components/motion/variants';
import { AudioTooShortError } from '../../domain/pronunciation/audioNormalizer';
import { BENCHMARK_SENTENCES } from '../../domain/pronunciation/lab/benchmark';
import { clipWindow } from '../../domain/pronunciation/lab/clipWindows';
import { localDay } from '../../domain/pronunciation/lab/days';
import { MIN_SAVED_SENTENCES, buildCheckResult, checkTrend, latestCheck, totals as sumSentences, type CheckTrend, type MonthlyCheckResult } from '../../domain/pronunciation/lab/monthlyCheck';
import { wordPlayTexts } from '../../domain/pronunciation/lab/textFeatures';
import { buildLabTake, type LabWordItem } from '../../domain/pronunciation/lab/wordStates';
import { AuthRequiredError } from '../../lib/authToken';
import { isConsentRequiredError } from '../../lib/consentRequired';
import { isLabAllowanceError } from '../../lib/labAllowance';
import { assessPronunciation } from '../../services/pronunciation/pronunciationClient';
import { loadLabHistory, recordLabTake, saveMonthlyCheck } from './labStore';
import { track } from '../../services/telemetry/telemetryService';
import { useAudioBlobRecorder } from '../recording/useAudioBlobRecorder';
import { playClip, stopClip } from './audio/clipPlayer';
import { playNative, stopNative } from './audio/nativeVoice';
import { CompareSentence, Legend } from './LabPractice';
import { RecordControl } from './RecordControl';
import { useLabAllowance } from './useLabAllowance';
import {
  ALLOWANCE_RECORD_LABEL,
  CHECK_INTRO,
  CHECK_NOTICE_TEXT,
  NATIVE_UNAVAILABLE,
  allowanceLine,
  checkAllowanceLine,
  clearHeadline,
  dayLabel,
  monthLabel,
  sentenceProgress,
  trendLine,
} from './labCopy';
import type { CheckFailure } from './labPracticeState';
import { SENTENCE_COUNT, canTry, checkTotals, initialMonthlyCheckState, monthlyCheckReducer } from './monthlyCheckState';

/**
 * The monthly check (pronunciation-lab plan §3.3): the same five benchmark
 * sentences, said once each, "N of M words clear" for every one and for the
 * whole check. It is the only honest progress line the Lab has, so the first
 * checked take of each sentence is the one that counts and nothing is retaken
 * for a better number.
 *
 *  - Each take is the Lab's scripted check (`assessPronunciation` with
 *    `source: 'pronunciation_lab'`); recordings stay in memory for the sitting.
 *  - Writes only the Lab's local history (`labStore`): each counted take's
 *    sound-family evidence and, at the end, the check's counts. No XP, Session,
 *    mastery, review or evidence write, and nothing is sent anywhere but the
 *    existing `/api/pronunciation` upload and one content-free
 *    `monthly_check_done` count.
 *  - Never a trap: Skip and Leave are always on screen; mic, check and
 *    too-short problems are notices; consent and sign-in end the check with the
 *    reason and a Continue button.
 */

interface Props {
  /** Leaves the check (back to where the learner came from). */
  onDone: () => void;
}

function failureOf(err: unknown): CheckFailure {
  if (isLabAllowanceError(err)) return 'allowance';
  if (isConsentRequiredError(err)) return 'consent';
  if (err instanceof AuthRequiredError) return 'sign-in';
  if (err instanceof AudioTooShortError) return 'too-short';
  return 'failed';
}

function ProgressBar({ index, done, reduced }: { index: number; done: boolean; reduced: boolean }) {
  return (
    <ol className="grid grid-cols-5 gap-2" aria-label="Sentences">
      {BENCHMARK_SENTENCES.map((_, i) => (
        <li key={i} aria-current={i === index && !done ? 'step' : undefined}>
          <span className="block h-1 overflow-hidden rounded-pill bg-track">
            <motion.span
              className="block h-full rounded-pill bg-action"
              initial={false}
              animate={{ width: done || i <= index ? '100%' : '0%' }}
              transition={reduced ? { duration: 0 } : fill(0)}
            />
          </span>
          <span className="sr-only">Sentence {i + 1}</span>
        </li>
      ))}
    </ol>
  );
}

export function MonthlyCheck({ onDone }: Props) {
  const reduced = useReducedMotion() ?? false;
  const [state, dispatch] = useReducer(monthlyCheckReducer, initialMonthlyCheckState);
  const recorder = useAudioBlobRecorder();
  const allowance = useLabAllowance();
  /** Today's checks are gone: the sentence can still be heard and skipped, but not recorded. */
  const outOfChecks = allowance.remaining === 0;
  const alive = useRef(true);
  const starting = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const playSeq = useRef(0);
  /** The counted take's recording (this sentence only). In memory; dropped with the component. */
  const takeBlob = useRef<Blob | null>(null);
  const saved = useRef(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [nativeUnavailable, setNativeUnavailable] = useState(false);
  const [outcome, setOutcome] = useState<{ result: MonthlyCheckResult | null; trend: CheckTrend | null } | null>(null);
  const previous = useMemo(() => latestCheck(loadLabHistory().checks), []);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      abortRef.current?.abort();
      stopClip();
      stopNative();
    };
  }, []);

  const sentence = BENCHMARK_SENTENCES[state.index];
  const busy = state.activity.kind !== 'idle';

  // Save the finished check once, at the summary.
  useEffect(() => {
    if (state.phase !== 'summary' || saved.current) return;
    saved.current = true;
    const day = localDay(new Date());
    const result = buildCheckResult(state.results, day);
    if (!result) {
      setOutcome({ result: null, trend: null });
      return;
    }
    const before = loadLabHistory().checks;
    saveMonthlyCheck(result);
    const totals = checkTotals(state.results);
    track({
      name: 'monthly_check_done',
      props: { words_clear: totals.clear, words_total: totals.total, sentences_measured: totals.measured, first_check: before.length === 0 },
    });
    setOutcome({ result, trend: checkTrend(loadLabHistory().checks) });
  }, [state.phase, state.results]);

  const stopAudio = () => {
    playSeq.current += 1;
    stopClip();
    stopNative();
  };

  const native = async (text: string | readonly string[], speed = 1) => {
    // The benchmark sentences are recorded in advance (`collectLines.ts`), so no on-demand synthesis is asked for.
    const result = await playNative(text, { speed });
    if (alive.current && result === 'unavailable') setNativeUnavailable(true);
  };

  useSpaceToRecord({
    enabled: state.phase === 'sentence' && (state.activity.kind === 'recording' || !busy),
    isRecording: state.activity.kind === 'recording',
    onStart: () => void startRecording(),
    onStop: () => void stopRecording(),
  });

  const startRecording = async () => {
    if (!canTry(state) || starting.current || outOfChecks) return;
    stopAudio();
    starting.current = true;
    try {
      await recorder.start();
      if (alive.current) dispatch({ type: 'recordStarted' });
    } catch {
      if (alive.current) dispatch({ type: 'micUnavailable' });
    } finally {
      starting.current = false;
    }
  };

  const stopRecording = async () => {
    if (state.activity.kind !== 'recording') return;
    const captured = await recorder.stop();
    if (!alive.current) return;
    if (!captured) {
      dispatch({ type: 'micUnavailable' });
      return;
    }
    dispatch({ type: 'checking' });
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const assessment = await assessPronunciation({
        audioBlob: captured.blob,
        targetText: sentence,
        source: 'pronunciation_lab',
        mode: 'scripted',
        signal: controller.signal,
      });
      if (!alive.current) return;
      allowance.refresh();
      const take = buildLabTake(sentence, assessment);
      if (take.refused === null) {
        takeBlob.current = captured.blob;
        setSelected(null);
        recordLabTake(take);
      }
      dispatch({ type: 'checked', take });
    } catch (err) {
      if (alive.current) {
        if (isLabAllowanceError(err)) allowance.exhaust();
        else allowance.refresh();
        dispatch({ type: 'checkFailed', reason: failureOf(err) });
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  /** One word of the counted take: you, then native. */
  const playWord = async (item: LabWordItem) => {
    stopAudio();
    const seq = playSeq.current;
    setSelected(item.tokenIndex);
    const window = clipWindow(item.source);
    if (takeBlob.current && window) {
      await playClip(takeBlob.current, window);
      if (seq !== playSeq.current || !alive.current) return;
    }
    await native(wordPlayTexts(sentence, item.tokenIndex));
  };

  const playBoth = async () => {
    stopAudio();
    const seq = playSeq.current;
    if (takeBlob.current) {
      await playClip(takeBlob.current);
      if (seq !== playSeq.current || !alive.current) return;
    }
    await native(sentence);
  };

  const leave = () => {
    stopAudio();
    abortRef.current?.abort();
    onDone();
  };

  if (state.stopped) {
    return (
      <div className="space-y-3 rounded-card border border-hairline bg-surface-raised p-5" data-testid="monthly-check">
        {state.stopped === 'consent' ? (
          <GuardianConsentNotice />
        ) : (
          <p className="text-body-s text-ink">Sign in to check how your words sound. The monthly check needs your recordings checked, so it waits for you.</p>
        )}
        <Button className="w-full" onClick={leave}>
          Continue
        </Button>
      </div>
    );
  }

  const totals = checkTotals(state.results);

  return (
    <motion.section
      variants={reduced ? enterReduced : enter}
      initial="hidden"
      animate="show"
      className="space-y-5 rounded-card border border-hairline bg-surface-raised p-5"
      aria-label="Monthly sound check"
      data-testid="monthly-check"
    >
      {state.phase === 'intro' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-eyebrow uppercase text-action-text">{CHECK_INTRO.title}</p>
            <h2 className="text-title text-ink">{CHECK_INTRO.lead}</h2>
          </div>
          <p className="text-body-s text-ink">{CHECK_INTRO.why}</p>
          <p className="text-body-s text-ink-muted">{CHECK_INTRO.how}</p>
          <p className="text-caption text-ink-muted">{CHECK_INTRO.leaving}</p>
          {previous && (
            <p className="rounded-control bg-surface-recessed px-3 py-2.5 text-body-s text-ink">
              Last check ({dayLabel(previous.day)}): {clearHeadline(sumSentences(previous.sentences))}.
            </p>
          )}
          {checkAllowanceLine(allowance.remaining, SENTENCE_COUNT, MIN_SAVED_SENTENCES) && (
            <p className="text-body-s text-ink-muted" data-testid="lab-allowance">
              {checkAllowanceLine(allowance.remaining, SENTENCE_COUNT, MIN_SAVED_SENTENCES)}
            </p>
          )}
          <Button
            className="w-full"
            disabled={allowance.remaining !== null && allowance.remaining < MIN_SAVED_SENTENCES}
            onClick={() => dispatch({ type: 'begin' })}
          >
            Start the check
          </Button>
        </div>
      )}

      {state.phase !== 'intro' && (
        <div className="space-y-3">
          <p className="text-eyebrow uppercase text-action-text">{CHECK_INTRO.title}</p>
          <ProgressBar index={state.index} done={state.phase === 'summary'} reduced={reduced} />
          {state.phase !== 'summary' && <p className="text-caption text-ink-muted">{sentenceProgress(state.index, SENTENCE_COUNT)}</p>}
        </div>
      )}

      {state.phase === 'sentence' && (
        <div className="space-y-4">
          <p className="text-[20px] leading-relaxed text-ink" lang="fr">{sentence}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => { stopAudio(); void native(sentence); }}>
              <Volume2 size={16} aria-hidden="true" /> Listen
            </Button>
            <Button variant="secondary" size="sm" onClick={() => { stopAudio(); void native(sentence, 0.75); }}>
              <Volume2 size={16} aria-hidden="true" /> Slowly
            </Button>
          </div>
          <SpeakingConsentGate>
            <RecordControl
              recording={state.activity.kind === 'recording'}
              checking={state.activity.kind === 'checking'}
              disabled={busy || outOfChecks || !canTry(state)}
              label={outOfChecks ? ALLOWANCE_RECORD_LABEL : canTry(state) ? 'Tap and say the sentence' : 'No more tries for this sentence'}
              onStart={() => void startRecording()}
              onStop={() => void stopRecording()}
              level={recorder.micLevel}
            />
          </SpeakingConsentGate>
          <Button variant="quiet" size="sm" disabled={busy} onClick={() => dispatch({ type: 'skip' })}>
            Skip this sentence
          </Button>
        </div>
      )}

      {state.phase === 'result' && state.take && (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="font-numeral text-title text-ink" aria-live="polite">{clearHeadline(state.take.counts)}</p>
            <p className="text-body-s text-ink-muted">This take counts for your check.</p>
          </div>
          <CompareSentence take={state.take} newlyClear={new Set()} selected={selected} reduced={reduced} onWord={(item) => void playWord(item)} />
          <Legend hasExtra={state.take.counts.extra > 0} />
          <p className="text-caption text-ink-muted">Tap a word to hear you, then the native speaker.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => void playBoth()}>
              <Play size={16} aria-hidden="true" /> Play both
            </Button>
            <Button size="sm" onClick={() => { stopAudio(); dispatch({ type: 'next' }); }}>
              {state.index + 1 < SENTENCE_COUNT ? 'Next sentence' : 'See my check'}
            </Button>
          </div>
        </div>
      )}

      {state.phase === 'summary' && (
        <div className="space-y-4" data-testid="monthly-check-summary">
          {totals.measured > 0 ? (
            <div className="space-y-1">
              <p className="text-eyebrow uppercase text-ink-subtle">{monthLabel(localDay(new Date()))} check</p>
              <p className="font-numeral text-title text-ink" aria-live="polite">{clearHeadline({ clear: totals.clear, total: totals.total })}</p>
            </div>
          ) : (
            <p className="text-section text-ink">Nothing could be checked this time.</p>
          )}
          <ul className="space-y-1.5" aria-label="Your sentences">
            {BENCHMARK_SENTENCES.map((text, i) => {
              const r = state.results[i];
              return (
                <li key={i} className="flex items-baseline justify-between gap-3 text-body-s">
                  <span className="min-w-0 truncate text-ink-muted" lang="fr">{text}</span>
                  <span className="shrink-0 font-numeral text-ink">{r ? clearHeadline({ clear: r.wordsClear, total: r.wordsTotal }) : 'Not checked'}</span>
                </li>
              );
            })}
          </ul>
          {outcome?.trend && <p className="text-body-s text-progress-text">{trendLine(outcome.trend)}</p>}
          {outcome && outcome.result === null && (
            <p className="text-body-s text-ink-muted">Too few sentences could be checked to keep this one, so nothing was saved. You can try the check again whenever you like.</p>
          )}
          {outcome?.result && !outcome.trend && (
            <p className="text-body-s text-ink-muted">Saved. Do the check again next month and you’ll see the two side by side.</p>
          )}
        </div>
      )}

      {state.phase === 'sentence' && allowanceLine(allowance.remaining) && (
        <p className="text-caption text-ink-muted" data-testid="lab-allowance">{allowanceLine(allowance.remaining)}</p>
      )}
      {state.notice && (
        <p className="rounded-control bg-reward-soft px-3 py-2.5 text-[13px] text-reward-text" role="status">
          {CHECK_NOTICE_TEXT[state.notice]}
        </p>
      )}
      {nativeUnavailable && <p className="text-caption text-ink-muted">{NATIVE_UNAVAILABLE}</p>}

      {state.phase !== 'intro' && (
        <Button variant={state.phase === 'summary' ? 'primary' : 'quiet'} className="w-full" onClick={leave}>
          {state.phase === 'summary' ? 'Done' : 'Leave the check'}
        </Button>
      )}
      {state.phase === 'intro' && (
        <Button variant="quiet" className="w-full" onClick={leave}>
          Not now
        </Button>
      )}
    </motion.section>
  );
}
