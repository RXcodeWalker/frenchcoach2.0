import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Mic, Play, Volume2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { GuardianConsentNotice } from '../../components/GuardianConsentNotice';
import { SpeakingConsentGate } from '../../components/SpeakingConsentGate';
import { useSpaceToRecord } from '../../lib/useSpaceToRecord';
import { correct, enter, enterReduced, fill } from '../../components/motion/variants';
import { clipWindow } from '../../domain/pronunciation/lab/clipWindows';
import { tokenizeSentence, watchOutFor, wordPlayTexts, type SentenceToken } from '../../domain/pronunciation/lab/textFeatures';
import { SOUND_TIPS, tipFor } from '../../domain/pronunciation/lab/tips';
import { buildLabTake, drillVerdict, takeWords, type LabTake, type LabWordItem } from '../../domain/pronunciation/lab/wordStates';
import { isLabAllowanceError } from '../../lib/labAllowance';
import { assessPronunciation } from '../../services/pronunciation/pronunciationClient';
import { track, type LabEntry } from '../../services/telemetry/telemetryService';
import { useAudioBlobRecorder } from '../recording/useAudioBlobRecorder';
import { failureOf } from './checkFailure';
import { recordLabDrill, recordLabTake } from './labStore';
import { RecordControl } from './RecordControl';
import { playClip, stopClip } from './audio/clipPlayer';
import { playNative, stopNative } from './audio/nativeVoice';
import { useLabAllowance } from './useLabAllowance';
import {
  ALLOWANCE_RECORD_LABEL,
  DRILL_VERDICT_DISPLAY,
  NATIVE_PREPARING,
  NATIVE_UNAVAILABLE,
  NOTICE_TEXT,
  STEP_LABELS,
  WORD_STATE_DISPLAY,
  allowanceLine,
  clearHeadline,
  comparisonLine,
  focusLead,
  legendStates,
} from './labCopy';
import {
  canRecordSentence,
  canRecordWord,
  firstVsBest,
  initialLabPracticeState,
  labPracticeReducer,
  latestTake,
  type LabStep,
  type LabTarget,
} from './labPracticeState';

/**
 * The Pronunciation Lab practice flow (pronunciation-lab plan §3.2): one
 * sentence, four steps — Listen, Say it, Compare, Focus.
 *
 *  - Word states come only from a scripted Azure check of THIS sentence
 *    (`buildLabTake`); anything else shows the words plain with "I couldn't
 *    check the words this time".
 *  - The only number is "N of M words clear" (owner D5); each word state has
 *    an icon and a word, and the legend is always on screen.
 *  - Recordings stay in memory for this sitting only (no storage, sync or
 *    analytics); the one upload is the existing `/api/pronunciation` check.
 *  - No XP, Session, mastery, review or evidence write (owner D4, plan §4).
 *  - Never a trap: Done is always on screen; a consent or sign-in refusal says
 *    why and offers Continue.
 */

interface Props {
  /** The sentence to practise (Learn: the corrected answer). */
  targetSentence: string;
  /** Where the Lab was opened from (analytics only). */
  entry: LabEntry;
  /** Leaves the Lab (Learn: on to the next question). */
  onDone: () => void;
}

const STEP_INDEX: Record<LabStep, number> = { listen: 0, say: 1, compare: 2, focus: 3 };

function Stepper({ step, reduced }: { step: LabStep; reduced: boolean }) {
  const current = STEP_INDEX[step];
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Steps">
      {STEP_LABELS.map((label, i) => (
        <li key={label} className="flex flex-col gap-1.5" aria-current={i === current ? 'step' : undefined}>
          <span className="block h-1 overflow-hidden rounded-pill bg-track">
            <motion.span
              className="block h-full rounded-pill bg-action"
              initial={false}
              animate={{ width: i <= current ? '100%' : '0%' }}
              transition={reduced ? { duration: 0 } : fill(0)}
            />
          </span>
          <span className={`text-caption ${i === current ? 'font-semibold text-ink' : 'text-ink-muted'}`}>{label}</span>
        </li>
      ))}
    </ol>
  );
}

/** The sentence before a take: each word plays on its own; "watch out for" sounds are underlined. */
function ListenSentence({
  tokens,
  underlines,
  onWord,
}: {
  tokens: SentenceToken[];
  underlines: Map<number, Array<[number, number]>>;
  onWord: (index: number) => void;
}) {
  return (
    <p className="flex flex-wrap gap-x-1.5 gap-y-1 text-[20px] leading-relaxed text-ink" lang="fr">
      {tokens.map((token, i) => {
        const ranges = underlines.get(i) ?? [];
        const parts: Array<{ text: string; marked: boolean }> = [];
        let at = 0;
        for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
          if (start > at) parts.push({ text: token.text.slice(at, start), marked: false });
          parts.push({ text: token.text.slice(Math.max(start, at), end), marked: true });
          at = Math.max(at, end);
        }
        if (at < token.text.length) parts.push({ text: token.text.slice(at), marked: false });
        return (
          <button
            key={`${token.start}`}
            type="button"
            onClick={() => onWord(i)}
            aria-label={`Hear « ${token.norm} »`}
            className="rounded-[6px] px-0.5 transition-colors duration-state ease-smooth hover:bg-track"
          >
            {parts.map((p, j) =>
              p.marked ? (
                <span key={j} className="underline decoration-action decoration-dotted decoration-2 underline-offset-4">
                  {p.text}
                </span>
              ) : (
                <span key={j}>{p.text}</span>
              ),
            )}
          </button>
        );
      })}
    </p>
  );
}

export function Legend({ hasExtra }: { hasExtra: boolean }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-label="What the marks mean">
      {legendStates(hasExtra).map((s) => (
        <li key={s} className="flex items-center gap-1 text-caption text-ink-muted">
          <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-[6px] px-1 font-semibold ${WORD_STATE_DISPLAY[s].chip}`} aria-hidden="true">
            {WORD_STATE_DISPLAY[s].glyph}
          </span>
          {WORD_STATE_DISPLAY[s].label}
        </li>
      ))}
    </ul>
  );
}

/** The checked sentence: one chip per word (icon + colour; the label is in the legend and the chip's name). */
export function CompareSentence({
  take,
  newlyClear,
  selected,
  reduced,
  onWord,
}: {
  take: LabTake;
  newlyClear: Set<number>;
  selected: number | null;
  reduced: boolean;
  onWord: (item: LabWordItem) => void;
}) {
  return (
    <p className="flex flex-wrap gap-1.5 text-[18px] leading-relaxed" lang="fr">
      {take.items.map((item, i) => {
        if (item.kind === 'extra') {
          const d = WORD_STATE_DISPLAY.extra;
          return (
            <span key={`x${i}`} className={`inline-flex items-center gap-1 rounded-control px-2 py-0.5 text-[15px] ${d.chip}`}>
              <span aria-hidden="true">{d.glyph}</span>
              <span>{item.text}</span>
              <span className="sr-only">: {d.label}</span>
            </span>
          );
        }
        const d = WORD_STATE_DISPLAY[item.state];
        const isSelected = selected === item.tokenIndex;
        const chip = (
          <button
            type="button"
            onClick={() => onWord(item)}
            aria-label={item.state === 'unknown' ? `Hear « ${item.text} »` : `« ${item.text} »: ${d.label}. Hear you, then native`}
            aria-pressed={isSelected}
            className={`inline-flex items-center gap-1 rounded-control px-2 py-0.5 transition-colors duration-state ease-smooth
              ${d.chip} ${isSelected ? 'outline outline-2 outline-offset-1 outline-focus' : 'hover:outline hover:outline-1 hover:outline-hairline-strong'}`}
          >
            {d.glyph && <span className="text-[13px] font-semibold" aria-hidden="true">{d.glyph}</span>}
            <span>{item.text}</span>
          </button>
        );
        return newlyClear.has(item.tokenIndex) && !reduced ? (
          <motion.span key={`w${i}`} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={correct.fix(0)}>
            {chip}
          </motion.span>
        ) : (
          <span key={`w${i}`}>{chip}</span>
        );
      })}
    </p>
  );
}

export function LabPractice({ targetSentence, entry, onDone }: Props) {
  const reduced = useReducedMotion() ?? false;
  const [state, dispatch] = useReducer(labPracticeReducer, initialLabPracticeState);
  const recorder = useAudioBlobRecorder();
  const allowance = useLabAllowance();
  /** Today's checks are gone (the server said so, or the counter reads 0): record controls wait for tomorrow. */
  const outOfChecks = state.allowanceUsed || allowance.remaining === 0;
  const tokens = useMemo(() => tokenizeSentence(targetSentence), [targetSentence]);
  const underlines = useMemo(() => {
    const map = new Map<number, Array<[number, number]>>();
    for (const feature of watchOutFor(targetSentence)) {
      for (const h of feature.highlights) map.set(h.tokenIndex, [...(map.get(h.tokenIndex) ?? []), [h.start, h.end]]);
    }
    return map;
  }, [targetSentence]);

  /** Each sentence take's recording, by take index. In memory only; dropped with the component. */
  const takeBlobs = useRef<Blob[]>([]);
  const playSeq = useRef(0);
  const starting = useRef(false);
  const alive = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const focusTracked = useRef(new Set<number>());
  const [selected, setSelected] = useState<number | null>(null);
  const [nativeUnavailable, setNativeUnavailable] = useState(false);
  const [nativePreparing, setNativePreparing] = useState(false);
  /** Only the latest Native play may clear the "preparing" line (an older one resolves 'stopped' later). */
  const nativeCall = useRef(0);

  useEffect(() => {
    track({ name: 'lab_opened', props: { entry } });
    alive.current = true;
    return () => {
      alive.current = false;
      abortRef.current?.abort();
      stopClip();
      stopNative();
    };
  }, [entry]);

  const take = latestTake(state);
  const comparison = firstVsBest(state);
  const busy = state.activity.kind !== 'idle';
  const recordingTarget = state.activity.kind === 'recording' ? state.activity.target : null;
  const checkingTarget = state.activity.kind === 'checking' ? state.activity.target : null;

  /** Words that turned Clear since the previous usable take (the `correct` motion). */
  const newlyClear = useMemo(() => {
    const out = new Set<number>();
    const usable = state.takes.filter((t) => t.refused === null);
    const latest = state.takes[state.takes.length - 1];
    if (!latest || latest.refused || usable.length < 2) return out;
    const prev = takeWords(usable[usable.length - 2]);
    for (const w of takeWords(latest)) if (w.state === 'clear' && prev[w.tokenIndex]?.state !== 'clear') out.add(w.tokenIndex);
    return out;
  }, [state.takes]);

  /** `sentence`: the whole target sentence, which may be AI-written — recorded on demand when it has no file (Stage 4b). */
  const native = async (text: string | readonly string[], speed = 1, sentence = false) => {
    const call = ++nativeCall.current;
    const result = await playNative(text, {
      speed,
      synthesize: sentence,
      onPreparing: () => {
        if (alive.current && call === nativeCall.current) setNativePreparing(true);
      },
    });
    if (!alive.current || call !== nativeCall.current) return;
    setNativePreparing(false);
    if (result === 'unavailable') setNativeUnavailable(true);
  };

  const stopAudio = () => {
    playSeq.current += 1;
    stopClip();
    stopNative();
  };

  const focusText = (index: number): string => {
    const word = state.focus[index];
    if (!word) return '';
    const texts = wordPlayTexts(targetSentence, word.tokenIndex);
    return texts[texts.length - 1] ?? word.text;
  };

  const startRecording = async (target: LabTarget) => {
    if (busy || starting.current || outOfChecks) return;
    if (target.kind === 'sentence' ? !canRecordSentence(state) : !canRecordWord(state, target.index)) return;
    stopAudio();
    starting.current = true;
    try {
      await recorder.start();
      if (alive.current) dispatch({ type: 'recordStarted', target });
    } catch {
      if (alive.current) dispatch({ type: 'micUnavailable' });
    } finally {
      starting.current = false;
    }
  };

  const stopRecording = async () => {
    const target = recordingTarget;
    if (!target) return;
    const captured = await recorder.stop();
    if (!alive.current) return;
    if (!captured) {
      dispatch({ type: 'micUnavailable' });
      return;
    }
    dispatch({ type: 'checking' });
    const text = target.kind === 'sentence' ? targetSentence : focusText(target.index);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const assessment = await assessPronunciation({
        audioBlob: captured.blob,
        targetText: text,
        source: 'pronunciation_lab',
        mode: 'scripted',
        signal: controller.signal,
      });
      if (!alive.current) return;
      allowance.refresh();
      if (target.kind === 'sentence') {
        const next = buildLabTake(targetSentence, assessment);
        takeBlobs.current[state.takes.length] = captured.blob;
        dispatch({ type: 'sentenceChecked', take: next });
        recordLabTake(next);
        setSelected(null);
        if (next.refused === null) {
          track({
            name: 'lab_take',
            props: { words_clear: next.counts.clear, words_total: next.counts.total, take_index: state.takes.length + 1 },
          });
        }
      } else {
        const verdict = drillVerdict(buildLabTake(text, assessment));
        dispatch({ type: 'wordChecked', verdict });
        recordLabDrill(state.focus[target.index]?.text ?? text, verdict);
        if (!focusTracked.current.has(target.index)) {
          focusTracked.current.add(target.index);
          track({ name: 'lab_focus_word_used', props: { verdict } });
        }
      }
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

  /** "▶ You" for one word of the latest take, then "▶ Native" for it. */
  const playWord = async (item: LabWordItem) => {
    stopAudio();
    const seq = playSeq.current;
    setSelected(item.tokenIndex);
    const blob = takeBlobs.current[state.takes.length - 1];
    const window = clipWindow(item.source);
    if (blob && window) {
      await playClip(blob, window);
      if (seq !== playSeq.current || !alive.current) return;
    }
    await native(wordPlayTexts(targetSentence, item.tokenIndex));
  };

  /** Whole sentence: you, then native. */
  const playBoth = async () => {
    stopAudio();
    const seq = playSeq.current;
    const blob = takeBlobs.current[state.takes.length - 1];
    if (blob) {
      await playClip(blob);
      if (seq !== playSeq.current || !alive.current) return;
    }
    await native(targetSentence, 1, true);
  };

  const playYourWord = async (tokenIndex: number) => {
    stopAudio();
    const blob = takeBlobs.current[state.takes.length - 1];
    const item = take ? takeWords(take).find((w) => w.tokenIndex === tokenIndex) : undefined;
    const window = item ? clipWindow(item.source) : null;
    if (blob && window) await playClip(blob, window);
  };

  const finish = () => {
    stopAudio();
    abortRef.current?.abort();
    onDone();
  };

  // Space records the sentence (Listen / Say it) or the focus word (Focus); the start handler
  // re-checks busy, allowance and the take limits, so a refused take never reaches the mic.
  const spaceStep = state.step === 'listen' || state.step === 'say' ? 'sentence' : state.step === 'focus' && state.focusIndex < state.focus.length ? 'word' : null;
  useSpaceToRecord({
    enabled: !state.stopped && spaceStep !== null && (recordingTarget !== null || !busy),
    isRecording: recordingTarget !== null,
    onStart: () => void startRecording(spaceStep === 'word' ? { kind: 'word', index: state.focusIndex } : { kind: 'sentence' }),
    onStop: () => void stopRecording(),
  });

  if (state.stopped) {
    return (
      <div className="space-y-3 rounded-card border border-hairline bg-surface-raised p-5">
        {state.stopped === 'consent' ? (
          <GuardianConsentNotice />
        ) : (
          <p className="text-body-s text-ink">Sign in to check how your words sound. You can still listen to the sentence any time.</p>
        )}
        <Button className="w-full" onClick={finish}>
          Continue
        </Button>
      </div>
    );
  }

  const showCompare = state.step === 'compare' && take !== null;
  const focusWord = state.step === 'focus' ? state.focus[state.focusIndex] ?? null : null;
  const focusDone = state.step === 'focus' && state.focusIndex >= state.focus.length;
  const drillsHere = focusWord ? state.drills[state.focusIndex] ?? [] : [];
  const lastVerdict = drillsHere[drillsHere.length - 1] ?? null;
  const lead = focusLead(state.focusEmphasis, state.focus.map((_, i) => focusText(i)));
  const latestBlob = takeBlobs.current[state.takes.length - 1];
  const focusItem = focusWord && take ? takeWords(take).find((w) => w.tokenIndex === focusWord.tokenIndex) : undefined;
  const hasYourWord = Boolean(latestBlob && focusItem && clipWindow(focusItem.source));

  return (
    <motion.section
      variants={reduced ? enterReduced : enter}
      initial="hidden"
      animate="show"
      className="space-y-5 rounded-card border border-hairline bg-surface-raised p-5"
      aria-label="Pronunciation practice"
      data-testid="lab-practice"
    >
      <div className="space-y-3">
        <p className="text-eyebrow uppercase text-action-text">Say it again</p>
        <Stepper step={state.step} reduced={reduced} />
      </div>

      {/* Listen + Say it */}
      {(state.step === 'listen' || state.step === 'say') && (
        <div className="space-y-4">
          <ListenSentence tokens={tokens} underlines={underlines} onWord={(i) => { stopAudio(); void native(wordPlayTexts(targetSentence, i)); }} />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => { stopAudio(); void native(targetSentence, 1, true); }}>
              <Volume2 size={16} aria-hidden="true" /> Listen
            </Button>
            <Button variant="secondary" size="sm" onClick={() => { stopAudio(); void native(targetSentence, 0.75, true); }}>
              <Volume2 size={16} aria-hidden="true" /> Slowly
            </Button>
          </div>
          {underlines.size > 0 && (
            <p className="text-caption text-ink-muted">Dotted letters are sounds to listen for. Tap any word to hear it on its own.</p>
          )}
          <SpeakingConsentGate>
            <RecordControl
              recording={recordingTarget?.kind === 'sentence'}
              checking={checkingTarget?.kind === 'sentence'}
              disabled={busy || outOfChecks || !canRecordSentence(state)}
              label={outOfChecks ? ALLOWANCE_RECORD_LABEL : canRecordSentence(state) ? 'Tap and say the sentence' : 'That’s all the takes for this sentence'}
              onStart={() => void startRecording({ kind: 'sentence' })}
              onStop={() => void stopRecording()}
              level={recorder.micLevel}
            />
          </SpeakingConsentGate>
        </div>
      )}

      {/* Compare */}
      {showCompare && take && (
        <div className="space-y-4">
          {take.refused === null ? (
            <div className="space-y-1">
              <p className="font-numeral text-title text-ink" aria-live="polite">{clearHeadline(take.counts)}</p>
              {comparisonLine(comparison) && <p className="text-body-s text-progress-text">{comparisonLine(comparison)}</p>}
            </div>
          ) : (
            <p className="text-section text-ink">Listen back</p>
          )}
          <CompareSentence
            take={take}
            newlyClear={newlyClear}
            selected={selected}
            reduced={reduced}
            onWord={(item) => void playWord(item)}
          />
          {take.refused === null && <Legend hasExtra={take.counts.extra > 0} />}
          <p className="text-caption text-ink-muted">Tap a word to hear you, then the native speaker.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => void playBoth()}>
              <Play size={16} aria-hidden="true" /> Play both
            </Button>
            {canRecordSentence(state) && (
              <Button variant="secondary" size="sm" onClick={() => dispatch({ type: 'sayAgain' })}>
                <Mic size={16} aria-hidden="true" /> Say it again
              </Button>
            )}
          </div>
          {lead && (
            <div className="space-y-2 rounded-control bg-surface-recessed p-3">
              <p className="text-body-s text-ink">{lead}</p>
              <Button
                variant={state.focusEmphasis === 'suggest' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => dispatch({ type: 'startFocus' })}
              >
                {state.focus.length === 1 ? 'Practise it' : 'Practise these words'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Focus */}
      {focusWord && (
        <div className="space-y-4">
          <p className="text-caption text-ink-muted">
            Word {state.focusIndex + 1} of {state.focus.length}
            {focusWord.family ? ` · ${SOUND_TIPS[focusWord.family].name}` : ''}
          </p>
          <p className="text-display-m text-ink" lang="fr">{focusText(state.focusIndex)}</p>
          <p className="text-body-s text-ink">{tipFor(focusWord.family, focusWord.text)}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => { stopAudio(); void native(focusText(state.focusIndex), 0.75); }}>
              <Volume2 size={16} aria-hidden="true" /> Hear it slowly
            </Button>
            {hasYourWord && (
              <Button variant="secondary" size="sm" onClick={() => void playYourWord(focusWord.tokenIndex)}>
                <Play size={16} aria-hidden="true" /> Your take
              </Button>
            )}
          </div>
          <SpeakingConsentGate>
            <RecordControl
              size="md"
              recording={recordingTarget?.kind === 'word'}
              checking={checkingTarget?.kind === 'word'}
              disabled={busy || outOfChecks || !canRecordWord(state, state.focusIndex)}
              label={outOfChecks ? ALLOWANCE_RECORD_LABEL : canRecordWord(state, state.focusIndex) ? 'Tap and say the word' : 'That’s all the tries for this word'}
              onStart={() => void startRecording({ kind: 'word', index: state.focusIndex })}
              onStop={() => void stopRecording()}
              level={recorder.micLevel}
            />
          </SpeakingConsentGate>
          {lastVerdict && (
            <motion.div
              key={drillsHere.length}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduced ? { duration: 0.2 } : correct.fix(0)}
              className="flex items-center gap-2"
              role="status"
            >
              <span className={`inline-flex items-center gap-1 rounded-control px-2 py-0.5 text-label ${DRILL_VERDICT_DISPLAY[lastVerdict].chip}`}>
                {DRILL_VERDICT_DISPLAY[lastVerdict].glyph && <span aria-hidden="true">{DRILL_VERDICT_DISPLAY[lastVerdict].glyph}</span>}
                {DRILL_VERDICT_DISPLAY[lastVerdict].label}
              </span>
              <span className="text-body-s text-ink-muted">{DRILL_VERDICT_DISPLAY[lastVerdict].line}</span>
            </motion.div>
          )}
          <Button variant={lastVerdict ? 'primary' : 'quiet'} size="sm" disabled={busy} onClick={() => dispatch({ type: 'nextFocus' })}>
            {state.focusIndex + 1 < state.focus.length ? (lastVerdict ? 'Next word' : 'Skip this word') : lastVerdict ? 'Back to the sentence' : 'Skip'}
          </Button>
        </div>
      )}

      {focusDone && (
        <div className="space-y-3">
          <p className="text-body-s text-ink">
            {outOfChecks
              ? 'That’s all the checks for today — nice work. Listen to the sentence again whenever you like.'
              : canRecordSentence(state)
                ? 'Now say the whole sentence again, with those words.'
                : 'That’s all the takes for this sentence — nice work sticking with it.'}
          </p>
          {canRecordSentence(state) && !outOfChecks && (
            <Button size="sm" onClick={() => dispatch({ type: 'sayAgain' })}>
              <Mic size={16} aria-hidden="true" /> Say the whole sentence again
            </Button>
          )}
          {comparisonLine(comparison) && <p className="text-body-s text-progress-text">{comparisonLine(comparison)}</p>}
        </div>
      )}

      {allowanceLine(allowance.remaining) && (
        <p className="text-caption text-ink-muted" data-testid="lab-allowance">{allowanceLine(allowance.remaining)}</p>
      )}
      {state.notice && (
        <p className="rounded-control bg-reward-soft px-3 py-2.5 text-[13px] text-reward-text" role="status">
          {NOTICE_TEXT[state.notice]}
        </p>
      )}
      {nativePreparing && (
        <p className="text-caption text-ink-muted" role="status">{NATIVE_PREPARING}</p>
      )}
      {nativeUnavailable && (
        <p className="text-caption text-ink-muted">{NATIVE_UNAVAILABLE}</p>
      )}

      <Button variant={showCompare && !lead ? 'primary' : 'quiet'} className="w-full" onClick={finish}>
        Done
      </Button>
    </motion.section>
  );
}
