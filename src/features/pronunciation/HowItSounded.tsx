import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Volume2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { PlayButton } from '../../components/ui/PlayButton';
import { enter, enterReduced } from '../../components/motion/variants';
import type { PauseStats } from '../../domain/examPronunciation/trim';
import type { HeardAsNote } from '../../domain/transcription/misheardExpressions';
import { watchOutFor } from '../../domain/pronunciation/lab/textFeatures';
import { SOUND_TIPS } from '../../domain/pronunciation/lab/tips';
import { measureAnswerPauses } from './audio/answerPauses';
import { playClip, stopClip } from './audio/clipPlayer';
import { playNative, stopNative } from './audio/nativeVoice';
import { playNativeChunks } from './audio/playChunks';
import { NATIVE_PREPARING, NATIVE_UNAVAILABLE, flowLine } from './labCopy';
import { ChunkedPractice } from './ChunkedPractice';
import { ListenSpeedControl, useListenSpeed } from './ListenSpeed';

/**
 * "How it sounded" — the pronunciation card on a Learn answer
 * (pronunciation-lab plan §3.1; replaces AzurePronunciationCard and
 * PronunciationCard while `pronunciationLab` is live).
 *
 * Owner D1: a free answer gets no word verdicts. Azure can't see the word the
 * learner meant on an answer with no fixed target (plan §1.1), so this card
 * makes no pronunciation request at all. It offers:
 *
 *  1. Listen back — ▶ Your answer (the in-memory recording) and ▶ Native (the
 *     corrected sentence; with no recording yet, the backend records it once
 *     in Henri's voice — Stage 4b), with one speed slider (0.5–1×, presets, remembered on the device) for both.
 *  2. Flow — one descriptive line from pauses measured in the browser.
 *  3. Watch out for — up to 3 sound features of the corrected sentence, found
 *     by rules on its spelling (never a verdict on the learner); each plays.
 *  3b. What I heard — a fixed expression the recogniser misheard (« graisse
 *     matinée »). The feedback was given on what the learner meant; the sound
 *     difference is said here, and only here (owner, 2026-11-21).
 *  4. Practise it — opens the Lab on the corrected sentence, in place, where
 *     the target is known and word feedback is honest.
 *
 * No 0–100 ring, no sub-scores, no coloured words. The recording is never
 * stored, synced or sent; it stays a blob owned by Learn. The only request is
 * ▶ Native's, carrying the corrected sentence's text, never audio.
 */

interface Props {
  /** The learner's recording of this answer; null for a typed answer or when nothing was captured. */
  answerBlob: Blob | null;
  /** The corrected answer (`improved_answer`, else `rephrase`). */
  sentence: string;
  /** Misheard fixed expressions in this answer (Learn repaired them before marking). */
  heardAs?: readonly HeardAsNote[];
  /** Called once when the learner opens the Lab from the card (Learn: it is this question's practice step). */
  onPractiseOpened?: () => void;
  /**
   * Opens the practice from outside the card (the "Say it better" card's own button): each new number
   * is one request. The card scrolls itself into view when it opens this way.
   */
  openSignal?: number;
}

export function HowItSounded({ answerBlob, sentence, heardAs = [], onPractiseOpened, openSignal = 0 }: Props) {
  const reduced = useReducedMotion() ?? false;
  const [speed, changeSpeed] = useListenSpeed();
  const [pauses, setPauses] = useState<PauseStats | null>(null);
  const [practising, setPractising] = useState(false);
  const [nativeUnavailable, setNativeUnavailable] = useState(false);
  const [nativePreparing, setNativePreparing] = useState(false);
  /** Only the latest Native play may clear the "preparing" line (an older one resolves 'stopped' later). */
  const nativeCall = useRef(0);
  const alive = useRef(true);
  const rootRef = useRef<HTMLElement | null>(null);
  const setRoot = (el: HTMLElement | null) => {
    rootRef.current = el;
  };
  const handledSignal = useRef(openSignal);
  const target = sentence.trim();
  const features = useMemo(() => (target ? watchOutFor(target) : []), [target]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopClip();
      stopNative();
    };
  }, []);

  useEffect(() => {
    setPauses(null);
    if (!answerBlob) return;
    let cancelled = false;
    void measureAnswerPauses(answerBlob).then((p) => {
      if (!cancelled) setPauses(p);
    });
    return () => {
      cancelled = true;
    };
  }, [answerBlob]);

  useEffect(() => {
    if (openSignal === handledSignal.current) return;
    handledSignal.current = openSignal;
    if (!target) return;
    stopClip();
    stopNative();
    onPractiseOpened?.();
    setPractising(true);
    rootRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    // The callback only reports the open; a new identity must not reopen the practice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSignal, target]);

  if (practising) {
    return (
      <div ref={setRoot}>
        <ChunkedPractice text={target} entry="how_it_sounded" onDone={() => setPractising(false)} />
      </div>
    );
  }
  if (!answerBlob && !target && heardAs.length === 0) return null;

  /** `sentence`: the corrected answer is AI-written, so it is recorded on demand when it has no file (Stage 4b). */
  const native = async (text: string, rate: number, sentence = false) => {
    stopClip();
    const call = ++nativeCall.current;
    const options = {
      speed: rate,
      synthesize: sentence,
      onPreparing: () => {
        if (alive.current && call === nativeCall.current) setNativePreparing(true);
      },
    };
    // A corrected answer is played sentence by sentence — the same recordings the practice uses.
    const result = sentence ? await playNativeChunks(text, options) : await playNative(text, options);
    if (!alive.current || call !== nativeCall.current) return;
    setNativePreparing(false);
    if (result === 'unavailable') setNativeUnavailable(true);
  };
  const playYours = async () => {
    if (!answerBlob) return;
    stopNative();
    await playClip(answerBlob, null, { rate: speed });
  };
  const openLab = () => {
    stopClip();
    stopNative();
    onPractiseOpened?.();
    setPractising(true);
  };
  const flow = flowLine(pauses);

  return (
    <motion.section
      ref={setRoot}
      variants={reduced ? enterReduced : enter}
      initial="hidden"
      animate="show"
      className="space-y-4 rounded-card border border-hairline bg-surface-raised p-5"
      aria-label="How it sounded"
      data-testid="how-it-sounded"
    >
      <p className="text-eyebrow uppercase text-action-text">How it sounded</p>

      <div className="space-y-2">
        <p className="text-label text-ink">Listen back</p>
        <div className="flex flex-wrap items-center gap-2">
          {answerBlob && <PlayButton label="Your answer" play={playYours} />}
          {target && (
            <PlayButton label="Native" icon={<Volume2 size={16} aria-hidden="true" />} play={() => native(target, speed, true)} />
          )}
        </div>
        <ListenSpeedControl speed={speed} onChange={changeSpeed} />
        {nativePreparing && (
          <p className="text-caption text-ink-muted" role="status">
            {NATIVE_PREPARING}
          </p>
        )}
        {nativeUnavailable && <p className="text-caption text-ink-muted">{NATIVE_UNAVAILABLE}</p>}
      </div>

      {flow && (
        <div className="space-y-1">
          <p className="text-label text-ink">Flow</p>
          <p className="text-body-s text-ink-muted">{flow}</p>
        </div>
      )}

      {heardAs.length > 0 && (
        <div className="space-y-2" data-testid="heard-as">
          <p className="text-label text-ink">What I heard</p>
          <ul className="space-y-3">
            {heardAs.map((note) => (
              <li key={note.expressionId} className="space-y-1">
                <p className="text-body-s text-ink">
                  I heard <span lang="fr">« {note.heard} »</span> and marked it as{' '}
                  <span lang="fr" className="font-semibold">« {note.meant} »</span>.
                </p>
                <p className="text-body-s text-ink-muted">{note.tip}</p>
                <button
                  type="button"
                  onClick={() => void native(note.meant, speed)}
                  aria-label={`Hear « ${note.meant} »`}
                  className="inline-flex items-center gap-1.5 rounded-control border border-hairline bg-surface-recessed px-2.5 py-1
                    transition-colors duration-state ease-smooth hover:bg-track"
                >
                  <Volume2 size={14} className="text-action-text" aria-hidden="true" />
                  <span className="text-body-s text-ink" lang="fr">{note.meant}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {features.length > 0 && (
        <div className="space-y-2">
          <p className="text-label text-ink">Watch out for</p>
          <ul className="flex flex-wrap gap-2">
            {features.map((f) => (
              <li key={`${f.family}-${f.tokenIndex}`}>
                <button
                  type="button"
                  onClick={() => void native(f.playText, speed)}
                  aria-label={`Hear « ${f.playText} » — ${SOUND_TIPS[f.family].name}`}
                  className="inline-flex items-center gap-1.5 rounded-control border border-hairline bg-surface-recessed px-2.5 py-1
                    transition-colors duration-state ease-smooth hover:bg-track"
                >
                  <Volume2 size={14} className="text-action-text" aria-hidden="true" />
                  <span className="text-body-s text-ink" lang="fr">{f.playText}</span>
                  <span className="text-caption text-ink-muted">{SOUND_TIPS[f.family].name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {target && (
        <div className="space-y-2">
          <p className="text-caption text-ink-muted">Say the corrected answer and I’ll check it word by word.</p>
          <Button className="w-full" onClick={openLab}>
            Practise it <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </div>
      )}
    </motion.section>
  );
}
