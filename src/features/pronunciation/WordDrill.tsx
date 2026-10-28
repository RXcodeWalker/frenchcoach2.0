import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Play, Volume2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { GuardianConsentNotice } from '../../components/GuardianConsentNotice';
import { SpeakingConsentGate } from '../../components/SpeakingConsentGate';
import { correct, enter, enterReduced } from '../../components/motion/variants';
import { SCORED_FAMILIES, stableWordFamilies } from '../../domain/pronunciation/lab/soundFamilies';
import { SOUND_TIPS, tipFor } from '../../domain/pronunciation/lab/tips';
import type { SoundFamilyId } from '../../domain/pronunciation/lab/types';
import { buildLabTake, drillVerdict, type DrillVerdict } from '../../domain/pronunciation/lab/wordStates';
import { trickyKey } from '../../domain/pronunciation/lab/trickyWords';
import { assessPronunciation } from '../../services/pronunciation/pronunciationClient';
import { useAudioBlobRecorder } from '../recording/useAudioBlobRecorder';
import { failureOf } from './checkFailure';
import { DRILL_VERDICT_DISPLAY, NATIVE_UNAVAILABLE, NOTICE_TEXT } from './labCopy';
import { MAX_WORD_TAKES } from './labPracticeState';
import { loadLabHistory, recordLabDrill } from './labStore';
import { RecordControl } from './RecordControl';
import { TRICKY_DRILL_FULL, trickyProgressLine } from './soundsCopy';
import { useNativePlayer } from './useNativePlayer';
import { playClip, stopClip } from './audio/clipPlayer';

/**
 * One card of the tricky-words deck: hear the word, see a tip, say it alone,
 * get Clear / Almost / Try again (pronunciation-lab plan §3.3). The same
 * scripted one-word check as the Lab's focus-word drill, so the verdict is as
 * honest as it is there (the target is known). Each try is recorded in the
 * Lab history (`recordLabDrill`), which is what moves a word along the deck.
 *
 * Never a trap: a refused check (no microphone, too short, failed) is a notice
 * and the card stays usable; consent and sign-in show why and offer nothing
 * more to do here. At most `MAX_WORD_TAKES` tries per word per sitting (each
 * one spends Azure seconds). No XP, Session, mastery or evidence.
 */

interface Props {
  word: string;
  onClose: () => void;
}

/**
 * The scored family a word is in, or null when it can't be named (the general
 * tip is used). A silent last letter is background in most words ("tout" is
 * about the ou, not the t), so it only names the word when nothing else does.
 */
function familyOf(word: string): SoundFamilyId | null {
  const scored = stableWordFamilies(word).filter((f) => (SCORED_FAMILIES as readonly SoundFamilyId[]).includes(f));
  const foreground = scored.filter((f) => f !== 'silentFinal');
  if (foreground.length === 1) return foreground[0];
  return scored.length === 1 ? scored[0] : null;
}

export function WordDrill({ word, onClose }: Props) {
  const reduced = useReducedMotion() ?? false;
  const recorder = useAudioBlobRecorder();
  const native = useNativePlayer();
  const family = familyOf(word);
  const [verdicts, setVerdicts] = useState<DrillVerdict[]>([]);
  const [activity, setActivity] = useState<'idle' | 'recording' | 'checking'>('idle');
  const [notice, setNotice] = useState<keyof typeof NOTICE_TEXT | null>(null);
  const [stopped, setStopped] = useState<'consent' | 'sign-in' | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const blob = useRef<Blob | null>(null);
  const alive = useRef(true);
  const starting = useRef(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      abort.current?.abort();
      stopClip();
    };
  }, []);

  const canTry = verdicts.length < MAX_WORD_TAKES;
  const last = verdicts[verdicts.length - 1] ?? null;

  const start = async () => {
    if (activity !== 'idle' || starting.current || !canTry) return;
    native.stop();
    stopClip();
    starting.current = true;
    try {
      await recorder.start();
      if (alive.current) {
        setNotice(null);
        setActivity('recording');
      }
    } catch {
      if (alive.current) setNotice('mic-unavailable');
    } finally {
      starting.current = false;
    }
  };

  const stop = async () => {
    const captured = await recorder.stop();
    if (!alive.current) return;
    if (!captured) {
      setActivity('idle');
      setNotice('mic-unavailable');
      return;
    }
    setActivity('checking');
    const controller = new AbortController();
    abort.current = controller;
    try {
      const assessment = await assessPronunciation({
        audioBlob: captured.blob,
        targetText: word,
        source: 'pronunciation_lab',
        mode: 'scripted',
        signal: controller.signal,
      });
      if (!alive.current) return;
      const take = buildLabTake(word, assessment);
      const verdict = drillVerdict(take);
      if (take.refused) {
        setNotice('no-word-check');
      } else {
        blob.current = captured.blob;
        setVerdicts((v) => [...v, verdict]);
        recordLabDrill(word, verdict);
        const entry = loadLabHistory().words[trickyKey(word)];
        setProgress(trickyProgressLine(verdict, { status: entry?.status ?? 'absent', clearRun: entry?.clearRun ?? 0 }));
        setNotice(null);
      }
      setActivity('idle');
    } catch (err) {
      if (!alive.current) return;
      setActivity('idle');
      const reason = failureOf(err);
      if (reason === 'consent' || reason === 'sign-in') setStopped(reason);
      else setNotice(reason === 'too-short' ? 'too-short' : 'check-failed');
    } finally {
      if (abort.current === controller) abort.current = null;
    }
  };

  if (stopped) {
    return (
      <div className="flex flex-col gap-3 rounded-card border border-hairline bg-surface-raised p-5">
        {stopped === 'consent' ? (
          <GuardianConsentNotice />
        ) : (
          <p className="text-body-s text-ink">Sign in to check how your words sound. You can still listen to each word any time.</p>
        )}
        <Button className="w-full" onClick={onClose}>Continue</Button>
      </div>
    );
  }

  return (
    <motion.div
      variants={reduced ? enterReduced : enter}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-4 rounded-card border border-hairline bg-surface-raised p-5"
      data-testid="word-drill"
    >
      <p className="text-caption text-ink-muted">{family ? SOUND_TIPS[family].name : 'Tricky word'}</p>
      <p className="text-display-m text-ink" lang="fr">{word}</p>
      <p className="text-body-s text-ink">{tipFor(family, word)}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => void native.play(word)}>
          <Volume2 size={16} aria-hidden="true" /> Hear it
        </Button>
        <Button variant="secondary" size="sm" onClick={() => void native.play(word, 0.75)}>
          <Volume2 size={16} aria-hidden="true" /> Hear it slowly
        </Button>
        {blob.current && (
          <Button variant="secondary" size="sm" onClick={() => { native.stop(); if (blob.current) void playClip(blob.current); }}>
            <Play size={16} aria-hidden="true" /> Your take
          </Button>
        )}
      </div>
      <SpeakingConsentGate>
        <RecordControl
          size="md"
          recording={activity === 'recording'}
          checking={activity === 'checking'}
          disabled={activity !== 'idle' || !canTry}
          label={canTry ? 'Tap and say the word' : 'That’s all the tries for this word'}
          onStart={() => void start()}
          onStop={() => void stop()}
          level={recorder.micLevel}
        />
      </SpeakingConsentGate>
      {last && (
        <motion.div
          key={verdicts.length}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0.2 } : correct.fix(0)}
          className="flex flex-col gap-2"
          role="status"
        >
          <span className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-control px-2 py-0.5 text-label ${DRILL_VERDICT_DISPLAY[last].chip}`}>
              {DRILL_VERDICT_DISPLAY[last].glyph && <span aria-hidden="true">{DRILL_VERDICT_DISPLAY[last].glyph}</span>}
              {DRILL_VERDICT_DISPLAY[last].label}
            </span>
            <span className="text-body-s text-ink-muted">{DRILL_VERDICT_DISPLAY[last].line}</span>
          </span>
          {progress && <p className="text-body-s text-progress-text">{progress}</p>}
        </motion.div>
      )}
      {!canTry && <p className="text-body-s text-ink-muted">{TRICKY_DRILL_FULL}</p>}
      {notice && (
        <p className="rounded-control bg-reward-soft px-3 py-2.5 text-[13px] text-reward-text" role="status">{NOTICE_TEXT[notice]}</p>
      )}
      {native.unavailable && <p className="text-caption text-ink-muted">{NATIVE_UNAVAILABLE}</p>}
      <Button variant={last ? 'primary' : 'quiet'} size="sm" disabled={activity !== 'idle'} onClick={onClose}>
        {last ? 'Done with this word' : 'Not now'}
      </Button>
    </motion.div>
  );
}
