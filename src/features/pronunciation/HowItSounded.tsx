import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Play, Volume2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { enter, enterReduced } from '../../components/motion/variants';
import type { PauseStats } from '../../domain/examPronunciation/trim';
import { watchOutFor } from '../../domain/pronunciation/lab/textFeatures';
import { SOUND_TIPS } from '../../domain/pronunciation/lab/tips';
import { measureAnswerPauses } from './audio/answerPauses';
import { playClip, stopClip } from './audio/clipPlayer';
import { playNative, stopNative } from './audio/nativeVoice';
import { NATIVE_PREPARING, NATIVE_UNAVAILABLE, flowLine } from './labCopy';
import { LabPractice } from './LabPractice';

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
 *     in Henri's voice — Stage 4b), with one Slow (0.75×) toggle for both.
 *  2. Flow — one descriptive line from pauses measured in the browser.
 *  3. Watch out for — up to 3 sound features of the corrected sentence, found
 *     by rules on its spelling (never a verdict on the learner); each plays.
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
  /** Called once when the learner opens the Lab from the card (Learn: it is this question's practice step). */
  onPractiseOpened?: () => void;
}

const SLOW = 0.75;

export function HowItSounded({ answerBlob, sentence, onPractiseOpened }: Props) {
  const reduced = useReducedMotion() ?? false;
  const [slow, setSlow] = useState(false);
  const [pauses, setPauses] = useState<PauseStats | null>(null);
  const [practising, setPractising] = useState(false);
  const [nativeUnavailable, setNativeUnavailable] = useState(false);
  const [nativePreparing, setNativePreparing] = useState(false);
  /** Only the latest Native play may clear the "preparing" line (an older one resolves 'stopped' later). */
  const nativeCall = useRef(0);
  const alive = useRef(true);
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

  if (practising) {
    return <LabPractice targetSentence={target} entry="how_it_sounded" onDone={() => setPractising(false)} />;
  }
  if (!answerBlob && !target) return null;

  const speed = slow ? SLOW : 1;
  /** `sentence`: the corrected answer is AI-written, so it is recorded on demand when it has no file (Stage 4b). */
  const native = async (text: string, rate: number, sentence = false) => {
    stopClip();
    const call = ++nativeCall.current;
    const result = await playNative(text, {
      speed: rate,
      synthesize: sentence,
      onPreparing: () => {
        if (alive.current && call === nativeCall.current) setNativePreparing(true);
      },
    });
    if (!alive.current || call !== nativeCall.current) return;
    setNativePreparing(false);
    if (result === 'unavailable') setNativeUnavailable(true);
  };
  const playYours = () => {
    if (!answerBlob) return;
    stopNative();
    void playClip(answerBlob, null, { rate: speed });
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
          {answerBlob && (
            <Button variant="secondary" size="sm" onClick={playYours}>
              <Play size={16} aria-hidden="true" /> Your answer
            </Button>
          )}
          {target && (
            <Button variant="secondary" size="sm" onClick={() => void native(target, speed, true)}>
              <Volume2 size={16} aria-hidden="true" /> Native
            </Button>
          )}
          <button
            type="button"
            onClick={() => setSlow((s) => !s)}
            aria-pressed={slow}
            className={`rounded-pill border px-3 py-1 text-caption transition-colors duration-state ease-smooth ${
              slow ? 'border-action bg-action-soft text-action-text' : 'border-hairline text-ink-muted hover:bg-track'
            }`}
          >
            Slow (0.75×)
          </button>
        </div>
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
