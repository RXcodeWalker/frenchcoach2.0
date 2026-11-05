import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { enter } from '../../components/motion/variants';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SpeakingConsentGate } from '../../components/SpeakingConsentGate';
import { swappedWords, type RecogniserAlignment } from '../../domain/transcription/alignRecognisers';
import { resolveObviousHearings } from '../../domain/transcription/obviousHearing';
import { matchCase, tokenize } from '../../domain/igcse/stt/homophones/text';
import type { AnswerTranscription, WordRetakeResult } from '../../features/learn/answerTranscription';
import { RecordControl } from '../../features/pronunciation/RecordControl';
import { useAudioBlobRecorder } from '../../features/recording/useAudioBlobRecorder';
import { useSpaceToRecord } from '../../lib/useSpaceToRecord';

export interface TranscriptConfirmation {
  /** The text feedback will be about: the primary transcript with any swaps the student chose. */
  text: string;
  /** The student swapped at least one word for the other recogniser's reading. */
  edited: boolean;
  source: AnswerTranscription['source'];
}

interface Props {
  /** The recording is still being double-checked; nothing to confirm yet. */
  checking: boolean;
  transcription: AnswerTranscription | null;
  onConfirm: (confirmation: TranscriptConfirmation) => void;
  /** Throws the whole answer away and records it again (asked "Are you sure?" first). */
  onRerecord: () => void;
  /**
   * Re-hears one underlined word the student re-recorded on its own. Without it
   * the word choice offers only the other reading (never a whole-answer re-record).
   */
  transcribeWord?: (audio: Blob) => Promise<WordRetakeResult>;
}

/**
 * The text feedback will be about: the primary transcript with, per span, the
 * student's own re-recorded words if they re-said it, else the other reading
 * if they chose it, else the primary words. Punctuation around a span and the
 * first word's capitalisation are kept.
 */
function composeConfirmedText(
  alignment: RecogniserAlignment,
  chosen: ReadonlySet<number>,
  retaken: ReadonlyMap<number, string>,
): string {
  const tokens = tokenize(alignment.primaryText);
  const out: string[] = [];
  let at = 0;
  alignment.spans.forEach((span, index) => {
    const replacement = spanWords(alignment, index, chosen, retaken, tokens);
    if (replacement === null) return;
    for (; at < span.start; at++) out.push(tokens[at].raw);
    out.push(replacement);
    at = span.end;
  });
  for (; at < tokens.length; at++) out.push(tokens[at].raw);
  return out.join(' ');
}

/** A span's words with the student's choice applied; null when it reads as the primary transcript did. */
function spanWords(
  alignment: RecogniserAlignment,
  index: number,
  chosen: ReadonlySet<number>,
  retaken: ReadonlyMap<number, string>,
  tokens = tokenize(alignment.primaryText),
): string | null {
  const span = alignment.spans[index];
  if (!span) return null;
  const said = retaken.get(index);
  if (said !== undefined && span.end > span.start) {
    const first = tokens[span.start];
    const last = tokens[span.end - 1];
    return `${first.lead}${matchCase(first.core, said)}${last.trail}`;
  }
  return chosen.has(index) ? swappedWords(alignment, index) : null;
}

type RetakeStatus = 'idle' | 'recording' | 'checking' | 'failed';

/**
 * Re-records ONE underlined word or phrase: the rest of the answer is kept and
 * only this span is replaced by what was heard. Mounted only while open, so the
 * microphone is never armed by the confirm screen itself.
 */
function WordRetake({
  words,
  transcribeWord,
  onHeard,
  onCancel,
}: {
  words: string;
  transcribeWord: (audio: Blob) => Promise<WordRetakeResult>;
  onHeard: (text: string) => void;
  onCancel: () => void;
}) {
  const recorder = useAudioBlobRecorder();
  const [status, setStatus] = useState<RetakeStatus>('idle');
  const [micFailed, setMicFailed] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const start = async () => {
    if (status === 'recording' || status === 'checking') return;
    setMicFailed(false);
    try {
      await recorder.start();
      if (alive.current) setStatus('recording');
    } catch {
      if (alive.current) setMicFailed(true);
    }
  };

  const stop = async () => {
    if (status !== 'recording') return;
    const captured = await recorder.stop();
    if (!alive.current) return;
    if (!captured) {
      setStatus('idle');
      setMicFailed(true);
      return;
    }
    setStatus('checking');
    const result = await transcribeWord(captured.blob);
    if (!alive.current) return;
    if (result.ok) onHeard(result.text);
    else setStatus('failed');
  };

  useSpaceToRecord({
    enabled: status !== 'checking',
    isRecording: status === 'recording',
    onStart: () => void start(),
    onStop: () => void stop(),
  });

  return (
    <div className="flex flex-col gap-3" data-testid="word-retake">
      <p className="text-[13px] text-ink">
        Say just <span lang="fr" className="font-semibold">« {words} »</span> again. The rest of your answer stays as it is.
      </p>
      <SpeakingConsentGate>
        <RecordControl
          size="md"
          recording={status === 'recording'}
          checking={status === 'checking'}
          disabled={status === 'checking'}
          label="Tap and say the word"
          onStart={() => void start()}
          onStop={() => void stop()}
          level={recorder.micLevel}
        />
      </SpeakingConsentGate>
      {status === 'failed' && (
        <p className="text-[13px] text-ink-muted" role="status">
          I couldn’t catch that. Try the word again, or pick one of the readings.
        </p>
      )}
      {micFailed && (
        <p className="text-[13px] text-ink-muted" role="status">The microphone isn’t available right now.</p>
      )}
      <Button variant="quiet" size="sm" disabled={status === 'recording' || status === 'checking'} onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

const CARD = 'flex flex-col gap-4 rounded-card border border-hairline bg-surface p-5';

/**
 * "Did we hear you right?" (transcription-accuracy plan, Phase 3). Shows the
 * primary transcript with the words the two recognisers disagreed on
 * underlined. A same-sound reading the sentence already settles
 * (« m'encourage » / « mon courage », « de » / « des ») is filled in first
 * and is not underlined. Tapping one that remains offers the other reading
 * or saying just that word again (only that span is replaced; the rest of the
 * answer is kept). Re-recording the whole answer asks "Are you sure?" first.
 * There is no free-text editing: the text is only ever what a recogniser heard.
 */
export function TranscriptConfirmPanel({ checking, transcription, onConfirm, onRerecord, transcribeWord }: Props) {
  const alignment = useMemo(
    () => (transcription ? resolveObviousHearings(transcription.primaryText, transcription.secondaryText) : null),
    [transcription],
  );
  const [chosen, setChosen] = useState<ReadonlySet<number>>(new Set());
  const [open, setOpen] = useState<number | null>(null);
  /** Spans the student re-said on their own: span index → what was heard. */
  const [retaken, setRetaken] = useState<ReadonlyMap<number, string>>(new Map());
  /** The span whose word is being re-recorded (the word choice is open on it). */
  const [retaking, setRetaking] = useState<number | null>(null);
  const [confirmRerecord, setConfirmRerecord] = useState(false);

  if (checking || !transcription || !alignment) {
    return (
      <motion.div variants={enter} initial="hidden" animate="show" className={CARD}>
        <p role="status" className="text-body-s text-ink-muted">Double-checking what we heard…</p>
      </motion.div>
    );
  }

  const tokens = tokenize(alignment.primaryText).map((t) => t.raw);
  const underlined = alignment.spans.map((span, index) => ({ span, index })).filter(({ span }) => span.swappable);
  const spanStartingAt = new Map(underlined.map((u) => [u.span.start, u]));
  const hasText = alignment.primaryText.trim().length > 0;
  const liveCaptionsOnly = transcription.source === 'live-captions' && transcription.fallbackReason !== 'no-audio';

  const toggleChoice = (index: number) => {
    setRetaken((prev) => {
      if (!prev.has(index)) return prev;
      const next = new Map(prev);
      next.delete(index);
      return next;
    });
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
    setOpen(null);
    setRetaking(null);
  };

  const applyRetake = (index: number, text: string) => {
    setRetaken((prev) => new Map(prev).set(index, text));
    setChosen((prev) => {
      if (!prev.has(index)) return prev;
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
    setRetaking(null);
    setOpen(null);
  };

  const body: React.ReactNode[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const hit = spanStartingAt.get(i);
    if (!hit) {
      body.push(<Fragment key={i}>{i > 0 ? ' ' : ''}{tokens[i]}</Fragment>);
      continue;
    }
    const said = retaken.get(hit.index);
    const words = spanWords(alignment, hit.index, chosen, retaken) ?? hit.span.primaryWords;
    body.push(
      <Fragment key={i}>
        {i > 0 ? ' ' : ''}
        <button
          type="button"
          data-testid="uncertain-word"
          aria-expanded={open === hit.index}
          data-retaken={said !== undefined ? 'true' : undefined}
          onClick={() => {
            setRetaking(null);
            setOpen(open === hit.index ? null : hit.index);
          }}
          className={
            said !== undefined
              ? 'text-progress-text underline decoration-progress-text decoration-solid decoration-2 underline-offset-4 font-semibold'
              : 'text-reward-text underline decoration-reward-text decoration-dotted decoration-2 underline-offset-4 font-semibold'
          }
        >
          {words}
        </button>
      </Fragment>,
    );
    i = hit.span.end - 1;
  }

  const openSpan = open !== null ? alignment.spans[open] : null;

  return (
    <motion.div variants={enter} initial="hidden" animate="show" className={CARD}>
      <div>
        <p className="mb-1.5 text-eyebrow uppercase text-ink-subtle">We heard</p>
        {hasText ? (
          <p lang="fr" className="text-body-base text-ink" data-testid="heard-text">{body}</p>
        ) : (
          <p className="text-body-s italic text-ink-muted">Nothing was transcribed.</p>
        )}
      </div>

      {underlined.length > 0 && (
        <p className="text-[13px] text-ink-muted">Underlined words are ones we weren’t sure about. Tap one to check it.</p>
      )}
      {liveCaptionsOnly && (
        <p className="text-[13px] text-ink-muted" data-testid="live-captions-note">
          We couldn’t double-check this answer, so this is the live caption as it was.
        </p>
      )}

      {openSpan && open !== null && retaking === open && transcribeWord && (
        <div className="flex flex-col gap-2 rounded-control bg-reward-soft p-3" data-testid="word-choice">
          <WordRetake
            words={spanWords(alignment, open, chosen, retaken) ?? openSpan.primaryWords}
            transcribeWord={transcribeWord}
            onHeard={(text) => applyRetake(open, text)}
            onCancel={() => setRetaking(null)}
          />
        </div>
      )}

      {openSpan && open !== null && retaking !== open && (
        <div className="flex flex-col gap-2 rounded-control bg-reward-soft p-3" data-testid="word-choice">
          <p className="text-[13px] text-ink">
            {retaken.has(open)
              ? 'This is what we heard when you said it again.'
              : openSpan.kind === 'nearHomophone'
                ? 'These sound alike, so it could have been either. Say it clearly if you can.'
                : 'We heard this word two different ways.'}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => toggleChoice(open)}>
              {chosen.has(open) || retaken.has(open) ? `Use “${openSpan.primaryWords}”` : `Use “${openSpan.secondaryWords}”`}
            </Button>
            {transcribeWord && (
              <Button variant="quiet" size="sm" className="flex-1" onClick={() => setRetaking(open)}>
                Say this word again
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" size="lg" onClick={() => setConfirmRerecord(true)}>
          Re-record answer
        </Button>
        <Button
          size="lg"
          className="flex-1"
          disabled={retaking !== null}
          onClick={() =>
            onConfirm({
              text: composeConfirmedText(alignment, chosen, retaken),
              edited: chosen.size > 0 || retaken.size > 0,
              source: transcription.source,
            })
          }
        >
          Use this
        </Button>
      </div>

      <Modal
        open={confirmRerecord}
        onClose={() => setConfirmRerecord(false)}
        title="Are you sure you want to re-record?"
        footer={
          <>
            <Button variant="primary" onClick={() => setConfirmRerecord(false)}>Keep this answer</Button>
            <Button
              variant="quiet"
              onClick={() => {
                setConfirmRerecord(false);
                onRerecord();
              }}
            >
              Yes, re-record
            </Button>
          </>
        }
      >
        <p className="text-[15px] leading-snug text-ink-muted">
          Your whole answer will be deleted and you’ll record it again from the start. To fix one word, tap it instead.
        </p>
      </Modal>
    </motion.div>
  );
}
