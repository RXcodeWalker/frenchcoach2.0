import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, AudioLines, Ear, Info, Volume2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { PlayButton } from '../../components/ui/PlayButton';
import { enter, enterReduced, fill, stagger } from '../../components/motion/variants';
import { TRIM_CONFIG } from '../../domain/examPronunciation/trim';
import type { HeardAsNote } from '../../domain/transcription/misheardExpressions';
import { tokenizeSentence, watchOutFor, type SoundFeature } from '../../domain/pronunciation/lab/textFeatures';
import { SOUND_TIPS } from '../../domain/pronunciation/lab/tips';
import { measureAnswerFlow, type AnswerFlow, type FlowSpan } from './audio/answerPauses';
import { playClip, stopClip } from './audio/clipPlayer';
import { playNative, stopNative } from './audio/nativeVoice';
import { playNativeChunks } from './audio/playChunks';
import { NATIVE_PREPARING, NATIVE_UNAVAILABLE, flowLine } from './labCopy';
import { ChunkedPractice } from './ChunkedPractice';
import { ListenSpeedControl, useListenSpeed } from './ListenSpeed';

/**
 * "How it sounded" — the pronunciation card on a Learn answer
 * (pronunciation-lab plan §3.1; replaces AzurePronunciationCard and
 * PronunciationCard while `pronunciationLab` is live). Redesigned 2026-11-27.
 *
 * Owner D1: a free answer gets no word verdicts. Azure can't see the word the
 * learner meant on an answer with no fixed target (plan §1.1), so this card
 * makes no pronunciation request at all. It offers:
 *
 *  1. Listen back — ▶ Your answer (the in-memory recording) beside its flow
 *     timeline, and ▶ Native (the corrected sentence; with no recording yet, the
 *     backend records it once in Henri's voice — Stage 4b), with one speed
 *     slider (0.5–1×, remembered on the device) for both.
 *  2. Flow — where the learner spoke and where they paused, drawn from pauses
 *     measured in the browser, with one descriptive line and two plain facts.
 *  3. Sounds to listen for — up to 3 sound features of the corrected sentence,
 *     found by rules on its spelling (never a verdict on the learner), marked in
 *     the sentence itself; each plays and shows how to make the sound.
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
  /** The eyebrow over the listen-back panel's second row (the Examiner style plays "the corrected version"). */
  nativeLabel?: string;
}

/** A gap shorter than this is breath inside a phrase, not a pause worth drawing. */
const DRAWN_PAUSE_S = 0.5;
const LONG_PAUSE_S = TRIM_CONFIG.longPauseMs / 1000;

/** Speech stretches with breath-length gaps closed, so the timeline shows phrases. */
export function phrases(spans: readonly FlowSpan[]): FlowSpan[] {
  const out: FlowSpan[] = [];
  for (const s of spans) {
    const prev = out[out.length - 1];
    if (prev && s.startS - prev.endS < DRAWN_PAUSE_S) prev.endS = s.endS;
    else out.push({ ...s });
  }
  return out;
}

const seconds = (s: number) => `${s < 10 ? s.toFixed(1) : Math.round(s)} s`;

/**
 * The answer as a strip: phrases filled, the pauses between them left open,
 * a long pause marked. It draws left to right with the `fill` motion.
 */
function FlowTimeline({ flow, reduced }: { flow: AnswerFlow; reduced: boolean }) {
  const parts = phrases(flow.spans);
  if (parts.length === 0) return null;
  const t0 = parts[0].startS;
  const total = Math.max(0.01, parts[parts.length - 1].endS - t0);
  const pct = (s: number) => `${((s - t0) / total) * 100}%`;
  const gaps = parts.slice(1).map((p, i) => ({ startS: parts[i].endS, endS: p.startS }));
  const long = flow.pauses.pausesOver2s;
  return (
    <div className="space-y-1.5" data-testid="flow-timeline">
      <motion.div
        role="img"
        aria-label={`Your answer: ${seconds(flow.speechSpanS)} from first word to last, with ${long} ${long === 1 ? 'long pause' : 'long pauses'}.`}
        className="relative h-5 overflow-hidden rounded-pill bg-track"
        initial={reduced ? false : { clipPath: 'inset(0 100% 0 0)' }}
        animate={{ clipPath: 'inset(0 0% 0 0)' }}
        transition={reduced ? { duration: 0 } : fill(0.25)}
      >
        {parts.map((p, i) => (
          <span
            key={`s${i}`}
            className="absolute inset-y-1 rounded-pill bg-action"
            style={{ left: pct(p.startS), width: `calc(${pct(p.endS)} - ${pct(p.startS)})` }}
          />
        ))}
        {gaps
          .filter((g) => g.endS - g.startS >= LONG_PAUSE_S)
          .map((g, i) => (
            <span
              key={`g${i}`}
              className="absolute inset-y-0 border-x-2 border-correction bg-correction-soft"
              style={{ left: pct(g.startS), width: `calc(${pct(g.endS)} - ${pct(g.startS)})` }}
            />
          ))}
      </motion.div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-muted" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-pill bg-action" /> Speaking
        </span>
        {long > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm border border-correction bg-correction-soft" /> Long pause
          </span>
        )}
      </div>
    </div>
  );
}

/** The corrected sentence with each sound to listen for underlined where it is spelled. */
function MarkedSentence({ sentence, features, active }: { sentence: string; features: readonly SoundFeature[]; active: number }) {
  const text = sentence.normalize('NFC');
  const tokens = tokenizeSentence(text);
  const marks = new Map<number, { start: number; end: number; feature: number }[]>();
  features.forEach((f, fi) => {
    for (const h of f.highlights) {
      const list = marks.get(h.tokenIndex) ?? [];
      list.push({ start: h.start, end: h.end, feature: fi });
      marks.set(h.tokenIndex, list);
    }
  });
  const out: ReactNode[] = [];
  let cursor = 0;
  tokens.forEach((tok, ti) => {
    if (tok.start > cursor) out.push(text.slice(cursor, tok.start));
    const ms = (marks.get(ti) ?? []).slice().sort((a, b) => a.start - b.start);
    let c = 0;
    ms.forEach((m, mi) => {
      if (m.start < c) return;
      if (m.start > c) out.push(tok.text.slice(c, m.start));
      out.push(
        <mark
          key={`${ti}-${mi}`}
          className={`rounded-sm px-0.5 text-ink underline decoration-2 underline-offset-4 transition-colors duration-state ${
            m.feature === active ? 'bg-action-soft decoration-action' : 'bg-transparent decoration-hairline-strong'
          }`}
        >
          {tok.text.slice(m.start, m.end)}
        </mark>,
      );
      c = m.end;
    });
    out.push(tok.text.slice(c));
    cursor = tok.end;
  });
  if (cursor < text.length) out.push(text.slice(cursor));
  return (
    <p lang="fr" className="text-body-base leading-loose text-ink">
      {out}
    </p>
  );
}

function SectionLabel({ icon: Icon, children }: { icon: typeof Ear; children: ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-label text-ink">
      <Icon size={14} className="text-action-text" aria-hidden="true" />
      {children}
    </p>
  );
}

export function HowItSounded({ answerBlob, sentence, heardAs = [], onPractiseOpened, openSignal = 0, nativeLabel = 'Native speaker' }: Props) {
  const reduced = useReducedMotion() ?? false;
  const [speed, changeSpeed] = useListenSpeed();
  const [flow, setFlow] = useState<AnswerFlow | null>(null);
  const [practising, setPractising] = useState(false);
  const [nativeUnavailable, setNativeUnavailable] = useState(false);
  const [nativePreparing, setNativePreparing] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
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
    setFlow(null);
    if (!answerBlob) return;
    let cancelled = false;
    void measureAnswerFlow(answerBlob).then((f) => {
      if (!cancelled) setFlow(f);
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
  const line = flowLine(flow?.pauses ?? null);
  const active = Math.min(activeFeature, Math.max(0, features.length - 1));
  const activeTip = features[active] ? SOUND_TIPS[features[active].family] : null;
  const item = reduced ? enterReduced : enter;

  return (
    <motion.section
      ref={setRoot}
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-4 rounded-card border border-hairline bg-surface p-4 sm:p-5"
      aria-label="How it sounded"
      data-testid="how-it-sounded"
    >
      <motion.div variants={item} className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-action-soft text-action-text" aria-hidden="true">
          <AudioLines size={18} />
        </span>
        <span className="min-w-0">
          <span className="block text-section text-ink">How it sounded</span>
          <span className="block text-caption text-ink-muted">Listen back, compare, then say it again</span>
        </span>
      </motion.div>

      {/* 1. Listen back: you, then the native voice, on one speed. */}
      <motion.div variants={item} className="space-y-3 rounded-control surface-recessed p-3">
        {answerBlob && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-eyebrow uppercase text-ink-subtle">You</span>
              <PlayButton label="Your answer" play={playYours} />
            </div>
            {flow && <FlowTimeline flow={flow} reduced={reduced} />}
          </div>
        )}
        {target && (
          <div className={`flex items-center justify-between gap-2 ${answerBlob ? 'border-t border-hairline pt-3' : ''}`}>
            <span className="text-eyebrow uppercase text-ink-subtle">{nativeLabel}</span>
            <PlayButton label="Native" icon={<Volume2 size={16} aria-hidden="true" />} play={() => native(target, speed, true)} />
          </div>
        )}
        <ListenSpeedControl speed={speed} onChange={changeSpeed} />
        {nativePreparing && (
          <p className="text-caption text-ink-muted" role="status">
            {NATIVE_PREPARING}
          </p>
        )}
        {nativeUnavailable && <p className="text-caption text-ink-muted">{NATIVE_UNAVAILABLE}</p>}
      </motion.div>

      {/* 2. Flow: one descriptive line and two plain facts (never a mark). */}
      {line && flow && (
        <motion.div variants={item} className="space-y-2">
          <SectionLabel icon={AudioLines}>Flow</SectionLabel>
          <p className="text-body-s text-ink-muted">{line}</p>
          <ul className="flex flex-wrap gap-1.5" aria-label="About your answer">
            <li className="rounded-pill bg-track px-2.5 py-1 text-caption text-ink">
              Spoke for <span className="font-numeral">{seconds(flow.speechSpanS)}</span>
            </li>
            {flow.pauses.longestPauseS >= DRAWN_PAUSE_S && (
              <li className="rounded-pill bg-track px-2.5 py-1 text-caption text-ink">
                Longest pause <span className="font-numeral">{seconds(flow.pauses.longestPauseS)}</span>
              </li>
            )}
          </ul>
        </motion.div>
      )}

      {/* 3b. A fixed expression the recogniser misheard. */}
      {heardAs.length > 0 && (
        <motion.div variants={item} className="space-y-2" data-testid="heard-as">
          <SectionLabel icon={Info}>What I heard</SectionLabel>
          <ul className="space-y-2">
            {heardAs.map((note) => (
              <li key={note.expressionId} className="space-y-2 rounded-control border border-hairline bg-info-soft p-3">
                <p className="text-body-s text-ink">
                  I heard <span lang="fr">« {note.heard} »</span> and marked it as{' '}
                  <span lang="fr" className="font-semibold">« {note.meant} »</span>.
                </p>
                <p className="text-body-s text-ink-muted">{note.tip}</p>
                <button
                  type="button"
                  onClick={() => void native(note.meant, speed)}
                  aria-label={`Hear « ${note.meant} »`}
                  className="inline-flex items-center gap-1.5 rounded-pill border border-hairline bg-surface px-3 py-1
                    transition-colors duration-state ease-smooth hover:bg-track"
                >
                  <Volume2 size={14} className="text-action-text" aria-hidden="true" />
                  <span className="text-body-s text-ink" lang="fr">{note.meant}</span>
                </button>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* 3. The sounds in the corrected sentence, marked where they are spelled. */}
      {features.length > 0 && (
        <motion.div variants={item} className="space-y-3">
          <SectionLabel icon={Ear}>Sounds to listen for</SectionLabel>
          <div className="rounded-control border border-hairline p-3">
            <MarkedSentence sentence={target} features={features} active={active} />
          </div>
          <ul className="flex flex-wrap gap-2">
            {features.map((f, i) => (
              <li key={`${f.family}-${f.tokenIndex}`}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveFeature(i);
                    void native(f.playText, speed);
                  }}
                  aria-label={`Hear « ${f.playText} » — ${SOUND_TIPS[f.family].name}`}
                  aria-pressed={i === active}
                  className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 transition-colors duration-state ease-smooth ${
                    i === active ? 'border-action bg-action-soft' : 'border-hairline bg-surface hover:bg-track'
                  }`}
                >
                  <Volume2 size={14} className="text-action-text" aria-hidden="true" />
                  <span className="text-body-s text-ink" lang="fr">{f.playText}</span>
                  <span className="text-caption text-ink-muted">{SOUND_TIPS[f.family].name}</span>
                </button>
              </li>
            ))}
          </ul>
          <AnimatePresence mode="wait" initial={false}>
            {activeTip && (
              <motion.div
                key={active}
                variants={item}
                initial="hidden"
                animate="show"
                exit="hidden"
                className="rounded-control surface-recessed p-3"
                data-testid="sound-tip"
              >
                <p className="text-label text-ink">{activeTip.name}</p>
                <p className="mt-0.5 text-body-s text-ink-muted">{activeTip.tip}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {target && (
        <motion.div variants={item} className="space-y-2 border-t border-hairline pt-4">
          <p className="text-caption text-ink-muted">Say the corrected answer and I’ll check it word by word.</p>
          <Button className="w-full" onClick={openLab}>
            Practise it <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </motion.div>
      )}
    </motion.section>
  );
}
