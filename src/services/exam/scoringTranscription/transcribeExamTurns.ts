/**
 * Exam marks from batch ASR — the background transcriber (Phase 4).
 *
 * Chrome's live captions still run the exam (turn-taking, relevance, the
 * ConductLog). In parallel, each spoken answer's recording is sent to
 * /api/transcribe (Whisper) with the question as context, and the result becomes
 * the answer's `recognition` record on the SessionTranscript — what the marker
 * reads, with the live captions kept as the second opinion. When Whisper can't
 * be used the live captions stand and the reason is recorded, never hidden.
 *
 * - At most MAX_IN_FLIGHT requests at once; a 429 that carries Retry-After pauses
 *   the whole queue for that long (capped), then retries; a 429 without one is a
 *   spent daily allowance ('quota').
 * - `settle()` is called by finishSession: it waits for everything for up to
 *   ~45 s, then gives up on what's left ('asr-timeout') and aborts it.
 * - Nothing here touches the examiner flow, the ConductLog, or any mark rule.
 *
 * The thresholds in `assessBatchReading` are UNVALIDATED — Whisper's own
 * published silence heuristic — and are to be set from the STT benchmark.
 */

import { canonicalizeForMatch } from '../../../domain/igcse/text/normalize';
import { EXAM_ASR_PROMPT_VERSION } from '../../../domain/igcse/session/recognition';
import type {
  RecognitionFallbackReason,
  RecognitionSegment,
  UtteranceRecognition,
} from '../../../domain/igcse/stt/types';
import { isAuthRequiredError } from '../../../lib/authToken';
import { isConsentRequiredError } from '../../../lib/consentRequired';
import {
  TranscribeHttpError,
  TranscribeTimeoutError,
  transcribeAudio,
  type TranscribeAudioResult,
} from '../../api/apiClient';

export const EXAM_ASR_MAX_IN_FLIGHT = 2;
/** finishSession waits this long for the batch results before falling back. */
export const EXAM_ASR_SETTLE_TIMEOUT_MS = 45_000;
/** A 429's Retry-After is honoured up to this many seconds per wait. */
export const EXAM_ASR_MAX_RETRY_WAIT_S = 20;
/** Total tries for one answer (the first plus 429-with-Retry-After retries). */
export const EXAM_ASR_MAX_ATTEMPTS = 3;

/** UNVALIDATED (Whisper's own no-speech heuristic; set from the benchmark). */
export const ASR_REJECT_NO_SPEECH_PROB = 0.6;
/** UNVALIDATED. */
export const ASR_REJECT_AVG_LOGPROB = -1;
/** An echoed prompt is at least this many words (a one-word overlap is just a student using the question's word). UNVALIDATED. */
export const ASR_ECHO_MIN_WORDS = 3;
/** Share of Whisper's words the live captions must also contain to count as "the student really said it". UNVALIDATED. */
export const ASR_ECHO_CORROBORATION = 0.5;

/** Kill switch: VITE_EXAM_BATCH_ASR=0 (or false/off) marks from the live captions exactly as before. Default on. */
export function isBatchAsrEnabled(): boolean {
  const raw = (import.meta.env.VITE_EXAM_BATCH_ASR as string | undefined)?.trim().toLowerCase();
  return !(raw === '0' || raw === 'false' || raw === 'off');
}

function tokens(text: string): string[] {
  return canonicalizeForMatch(text)
    .replace(/[.,;:!?…"«»()\-–—]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function containsRun(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    if (needle.every((t, k) => haystack[i + k] === t)) return true;
  }
  return false;
}

/**
 * Is Whisper's reading unusable? Returns 'asr-rejected' or null (usable).
 *  - nothing came back although the live captions heard words;
 *  - every segment looks like silence (high noSpeechProb and low avgLogprob);
 *  - the text is the context prompt echoed back (a known Whisper failure on
 *    near-silence) and the live captions don't corroborate it.
 */
export function assessBatchReading(
  result: Pick<TranscribeAudioResult, 'text' | 'segments'>,
  prompt: string,
  liveText: string,
): 'asr-rejected' | null {
  const text = result.text.trim();
  if (text.length === 0) return liveText.trim().length > 0 ? 'asr-rejected' : null;

  const segs: RecognitionSegment[] = result.segments;
  if (
    segs.length > 0 &&
    segs.every(
      (s) =>
        s.noSpeechProb !== null &&
        s.noSpeechProb >= ASR_REJECT_NO_SPEECH_PROB &&
        s.avgLogprob !== null &&
        s.avgLogprob <= ASR_REJECT_AVG_LOGPROB,
    )
  ) {
    return 'asr-rejected';
  }

  const heard = tokens(text);
  if (heard.length >= ASR_ECHO_MIN_WORDS && containsRun(tokens(prompt), heard)) {
    const live = new Set(tokens(liveText));
    const corroborated = heard.filter((t) => live.has(t)).length / heard.length;
    if (corroborated < ASR_ECHO_CORROBORATION) return 'asr-rejected';
  }
  return null;
}

/** Whisper's text as it will be marked: whitespace collapsed so the utterance's words and text agree. */
function cleanReadingText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

export function classifyTranscribeError(err: unknown): RecognitionFallbackReason {
  if (isConsentRequiredError(err)) return 'consent';
  if (err instanceof TranscribeTimeoutError) return 'asr-timeout';
  if (err instanceof TranscribeHttpError && err.status === 429) return 'quota';
  if (isAuthRequiredError(err)) return 'asr-failed';
  return 'asr-failed';
}

async function sha256Hex(text: string): Promise<string> {
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // No Web Crypto (an insecure LAN origin): a non-cryptographic stand-in, clearly labelled.
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return `fnv1a-${h.toString(16).padStart(8, '0')}`;
  }
}

/**
 * The transcriber for one exam attempt, or null when there is nothing to compare: the kill switch
 * is off, or this browser has no Web Speech (the answer text is then already Whisper's reading, so
 * a second batch pass would add nothing — and a transcriber with no jobs would wrongly label every
 * answer a 'no-audio' live-captions fallback). null means "mark the text exactly as captured".
 */
export function createExamTurnTranscriberFor(
  browser: { webSpeechAvailable: boolean },
  deps?: ExamTurnTranscriberDeps,
): ExamTurnTranscriber | null {
  if (!isBatchAsrEnabled() || !browser.webSpeechAvailable) return null;
  return createExamTurnTranscriber(deps);
}

export interface ExamTurnJob {
  /** The candidate ConductLog entry's `seq`. */
  turnKey: number;
  blob: Blob;
  /** Context only: the question the examiner just asked. */
  prompt: string;
  /** The live captions for this answer (the second opinion / the fallback text). */
  liveText: string;
}

export interface SettleOptions {
  timeoutMs?: number;
  /** Work that may still add jobs (e.g. the last turn's audio capture); awaited within the same deadline. */
  alsoWait?: Promise<unknown>;
}

export interface ExamTurnTranscriber {
  enqueue(job: ExamTurnJob): void;
  /** Resolves with a record per enqueued turn once all finish, or at the deadline with the rest as 'asr-timeout'. Idempotent. */
  settle(options?: SettleOptions): Promise<ReadonlyMap<number, UtteranceRecognition>>;
  /** Drops queued work and aborts in-flight requests (retake, leaving the exam). */
  cancel(): void;
}

export interface ExamTurnTranscriberDeps {
  transcribe?: typeof transcribeAudio;
  hashPrompt?: (prompt: string) => Promise<string>;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  maxInFlight?: number;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createExamTurnTranscriber(deps: ExamTurnTranscriberDeps = {}): ExamTurnTranscriber {
  const transcribe = deps.transcribe ?? transcribeAudio;
  const hashPrompt = deps.hashPrompt ?? sha256Hex;
  const sleep = deps.sleep ?? defaultSleep;
  const now = deps.now ?? Date.now;
  const maxInFlight = deps.maxInFlight ?? EXAM_ASR_MAX_IN_FLIGHT;

  const results = new Map<number, UtteranceRecognition>();
  const jobs = new Map<number, ExamTurnJob>();
  const queue: ExamTurnJob[] = [];
  const running = new Set<Promise<void>>();
  const controller = new AbortController();
  let inFlight = 0;
  let pausedUntil = 0;
  let closed = false;
  let idleWaiters: Array<() => void> = [];

  const fallback = (job: ExamTurnJob, reason: RecognitionFallbackReason): UtteranceRecognition => ({
    secondary: { source: 'web-speech-live', text: job.liveText },
    selected: 'secondary',
    fallbackReason: reason,
  });

  const record = (job: ExamTurnJob, value: UtteranceRecognition) => {
    // First answer wins; a late result after settle/cancel is dropped.
    if (closed || results.has(job.turnKey)) return;
    results.set(job.turnKey, value);
  };

  const notifyIdle = () => {
    if (queue.length === 0 && inFlight === 0) {
      const waiters = idleWaiters;
      idleWaiters = [];
      for (const w of waiters) w();
    }
  };

  async function runJob(job: ExamTurnJob): Promise<void> {
    const promptHash = await hashPrompt(job.prompt);
    for (let attempt = 1; ; attempt++) {
      if (closed) return;
      const wait = pausedUntil - now();
      if (wait > 0) await sleep(wait);
      if (closed) return;
      try {
        const out = await transcribe(job.blob, 'fr', {
          prompt: job.prompt,
          purpose: 'exam_turn',
          signal: controller.signal,
        });
        if (out.source === 'transcription-unavailable') {
          record(job, fallback(job, 'asr-failed'));
          return;
        }
        const rejected = assessBatchReading(out, job.prompt, job.liveText);
        if (rejected) {
          record(job, fallback(job, rejected));
          return;
        }
        record(job, {
          primary: {
            text: cleanReadingText(out.text),
            model: out.model ?? 'unknown',
            promptHash,
            promptVersion: EXAM_ASR_PROMPT_VERSION,
            segments: out.segments,
          },
          secondary: { source: 'web-speech-live', text: job.liveText },
          selected: 'primary',
          fallbackReason: null,
        });
        return;
      } catch (err) {
        if (closed) return;
        if (err instanceof TranscribeHttpError && err.status === 429 && err.retryAfterS !== null && attempt < EXAM_ASR_MAX_ATTEMPTS) {
          // A rate limit, not the daily cap: the whole queue backs off, then this answer retries.
          const waitMs = Math.min(err.retryAfterS, EXAM_ASR_MAX_RETRY_WAIT_S) * 1000;
          pausedUntil = Math.max(pausedUntil, now() + waitMs);
          continue;
        }
        record(job, fallback(job, classifyTranscribeError(err)));
        return;
      }
    }
  }

  function pump(): void {
    while (!closed && inFlight < maxInFlight && queue.length > 0) {
      const job = queue.shift() as ExamTurnJob;
      inFlight += 1;
      const p: Promise<void> = runJob(job)
        .catch(() => record(job, fallback(job, 'asr-failed')))
        .finally(() => {
          inFlight -= 1;
          running.delete(p);
          pump();
          notifyIdle();
        });
      running.add(p);
    }
  }

  function finalize(): ReadonlyMap<number, UtteranceRecognition> {
    if (!closed) {
      // Anything still queued or in flight at the deadline falls back.
      for (const job of jobs.values()) {
        if (!results.has(job.turnKey)) results.set(job.turnKey, fallback(job, 'asr-timeout'));
      }
      closed = true;
      queue.length = 0;
      controller.abort();
    }
    return results;
  }

  let settled: Promise<ReadonlyMap<number, UtteranceRecognition>> | null = null;

  return {
    enqueue(job) {
      if (closed || jobs.has(job.turnKey)) return;
      jobs.set(job.turnKey, job);
      queue.push(job);
      pump();
    },

    settle(options = {}) {
      if (settled) return settled;
      const timeoutMs = options.timeoutMs ?? EXAM_ASR_SETTLE_TIMEOUT_MS;
      settled = (async () => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const deadline = new Promise<'deadline'>((resolve) => {
          timer = setTimeout(() => resolve('deadline'), timeoutMs);
        });
        const drained = (async () => {
          // A pending capture may enqueue one more job; wait for it first, then for the queue.
          if (options.alsoWait) await options.alsoWait.catch(() => undefined);
          if (queue.length === 0 && inFlight === 0) return;
          await new Promise<void>((resolve) => idleWaiters.push(resolve));
        })();
        await Promise.race([drained, deadline]);
        if (timer !== undefined) clearTimeout(timer);
        return finalize();
      })();
      return settled;
    },

    cancel() {
      closed = true;
      queue.length = 0;
      controller.abort();
    },
  };
}
