/**
 * Exam-mode pronunciation analysis — the client (exam-pronunciation plan
 * §3b, Batch 5). Feedback only; it never touches the transcript, the
 * ConductLog, the /score request or any mark.
 *
 * One turn per request, sequentially: each candidate speech turn's in-memory
 * recording is normalised to 16 kHz mono WAV, silence-trimmed (pause stats
 * measured first, on the untrimmed audio), and POSTed to
 * /api/exam/pronunciation with a 60 s timeout and one retry (the free-plan
 * cold start). Stored turns come back free (the evidence row is the cache),
 * so a Retry after a mid-part failure only re-sends the missing turns.
 *
 * Nothing is analysed automatically: the UI calls `analysePart` on the
 * candidate's tap. Guests are excluded — with no Supabase session the call
 * resolves `signed_out` without a request.
 */

import { segmentSpeechTurns, type SpeechTurn } from '../../../domain/examPronunciation/segment';
import { trimSilence, type TrimSegment } from '../../../domain/examPronunciation/trim';
import type { ExamPronunciationTurnEvidence } from '../../../domain/examPronunciation/types';
import { EXAM_PRONUNCIATION_VERSION } from '../../../domain/examPronunciation/version';
import type { ConductLogEntry } from '../../../domain/igcse/session/types';
import type { SessionPart } from '../../../domain/igcse/stt/types';
import {
  AudioTooLongError,
  AudioTooShortError,
  encodePcm16Wav,
  normalizeToWav16kMono,
} from '../../../domain/pronunciation/audioNormalizer';
import { isAuthRequiredError, requireAuthHeader } from '../../../lib/authToken';
import { isConsentRequiredBody } from '../../../lib/consentRequired';
import { getTurnAudio } from './examAudioStore';
import { EXAM_TURN_MAX_SECONDS, readWavPcm16Mono } from './measureExamAudio';

// Prod: same-origin '/api/*' proxied to the backend by Vercel (see vercel.json).
const API_BASE = import.meta.env.PROD
  ? ''
  : ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000');

export const EXAM_PRONUNCIATION_TIMEOUT_MS = 60_000;
/** A sample at or beyond this magnitude counts as clipped. */
const CLIP_LEVEL = 0.999;

/** Every state the UI has a sentence for (plan §2). */
export type ExamPronunciationState =
  | 'idle'
  | 'running'
  | 'done'
  | 'failed'
  | 'budget_exhausted'
  | 'daily_cap'
  | 'consent_required'
  | 'no_audio'
  | 'signed_out'
  | 'not_enabled';

/** Which recogniser produced the exam transcript: Web Speech, or Whisper (no Web Speech, e.g. Firefox). */
export type ExamRecognizer = 'webspeech' | 'whisper';

export type TurnStatus = 'done' | 'no_audio' | 'no_speech' | 'too_short' | 'too_long' | 'decode_failed';

export interface TurnOutcome {
  turnKey: number;
  status: TurnStatus;
  evidence?: ExamPronunciationTurnEvidence;
  /** Trim map for "you" playback; only while the recording is in memory. */
  segments?: TrimSegment[];
}

export interface PartAnalysis {
  part: SessionPart;
  state: Exclude<ExamPronunciationState, 'idle' | 'running'>;
  turns: TurnOutcome[];
}

export interface PreparedTurnAudio {
  wav: Blob;
  rawS: number;
  segments: TrimSegment[];
  pausesOver2s: number;
  longestPauseS: number;
  clippedRatio: number;
}

export type PrepareResult = PreparedTurnAudio | Exclude<TurnStatus, 'done' | 'no_audio'>;

/** Decode → 16 kHz mono → trim (pauses measured before trimming). */
export async function prepareTurnAudio(blob: Blob): Promise<PrepareResult> {
  try {
    const normalized = await normalizeToWav16kMono(blob, { maxSeconds: EXAM_TURN_MAX_SECONDS });
    const { samples, sampleRate } = await readWavPcm16Mono(normalized.blob);
    let clipped = 0;
    for (let i = 0; i < samples.length; i++) if (Math.abs(samples[i]) >= CLIP_LEVEL) clipped += 1;
    const trimmed = trimSilence(samples, sampleRate);
    if (!trimmed.hasSpeech) return 'no_speech';
    return {
      wav: encodePcm16Wav(trimmed.samples, sampleRate),
      rawS: Math.round(trimmed.rawS * 1000) / 1000,
      segments: trimmed.segments,
      pausesOver2s: trimmed.pauses.pausesOver2s,
      longestPauseS: Math.round(trimmed.pauses.longestPauseS * 1000) / 1000,
      clippedRatio: samples.length > 0 ? Math.round((clipped / samples.length) * 10_000) / 10_000 : 0,
    };
  } catch (err) {
    if (err instanceof AudioTooShortError) return 'too_short';
    if (err instanceof AudioTooLongError) return 'too_long';
    return 'decode_failed';
  }
}

export interface ClientDeps {
  fetchImpl: typeof fetch;
  prepare: (blob: Blob) => Promise<PrepareResult>;
  authHeader: () => Promise<Record<string, string>>;
  getAudio: (sessionId: string, turnKey: number) => Blob | undefined;
}

const defaultDeps = (): ClientDeps => ({
  fetchImpl: (...args) => fetch(...args),
  prepare: prepareTurnAudio,
  authHeader: requireAuthHeader,
  getAudio: getTurnAudio,
});

type Terminal = Exclude<PartAnalysis['state'], 'done' | 'no_audio'>;
type PostResult = { kind: 'done'; evidence: ExamPronunciationTurnEvidence } | { kind: 'stop'; state: Terminal };

/** A 200 with a status, or the HTTP error the plan names a state for. */
async function interpret(res: Response): Promise<PostResult | 'retry'> {
  const body: unknown = await res.json().catch(() => null);
  if (res.ok) {
    const status = (body as { status?: unknown } | null)?.status;
    const turn = (body as { turn?: ExamPronunciationTurnEvidence | null } | null)?.turn;
    if (status === 'done' && turn) return { kind: 'done', evidence: turn };
    if (status === 'budget_exhausted') return { kind: 'stop', state: 'budget_exhausted' };
    return { kind: 'stop', state: 'failed' };
  }
  if (res.status === 401) return { kind: 'stop', state: 'signed_out' };
  if (res.status === 403) {
    const detail = (body as { detail?: { status?: unknown } } | null)?.detail;
    if (detail?.status === 'not_enabled') return { kind: 'stop', state: 'not_enabled' };
    if (isConsentRequiredBody(body)) return { kind: 'stop', state: 'consent_required' };
    return { kind: 'stop', state: 'failed' };
  }
  if (res.status === 429) return { kind: 'stop', state: 'daily_cap' };
  if (res.status >= 500) return 'retry';
  return { kind: 'stop', state: 'failed' };
}

async function postOnce(
  deps: ClientDeps,
  form: FormData,
  headers: Record<string, string>,
  signal: AbortSignal | undefined,
): Promise<PostResult | 'retry'> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EXAM_PRONUNCIATION_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  if (signal?.aborted) controller.abort();
  try {
    const res = await deps.fetchImpl(`${API_BASE}/api/exam/pronunciation`, {
      method: 'POST',
      headers,
      body: form,
      signal: controller.signal,
    });
    return await interpret(res);
  } catch {
    return 'retry'; // network error or timeout
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onAbort);
  }
}

function turnForm(sessionId: string, turn: SpeechTurn, audio: PreparedTurnAudio, recognizer: ExamRecognizer): FormData {
  const form = new FormData();
  form.append('audio', audio.wav, 'turn.wav');
  form.append('session_id', sessionId);
  form.append('part', turn.part);
  form.append('turn_key', String(turn.turnKey));
  form.append('exam_transcript', turn.transcript);
  form.append('fairness_version', EXAM_PRONUNCIATION_VERSION);
  form.append('recognizer', recognizer);
  form.append('raw_s', String(audio.rawS));
  form.append('pauses_over_2s', String(audio.pausesOver2s));
  form.append('longest_pause_s', String(audio.longestPauseS));
  form.append('clipped_ratio', String(audio.clippedRatio));
  return form;
}

export interface AnalysePartArgs {
  sessionId: string;
  part: SessionPart;
  /** The ConductLog entries so far; this part's candidate speech turns are taken from them. */
  entries: readonly ConductLogEntry[];
  recognizer: ExamRecognizer;
  signal?: AbortSignal;
  /** Called as each turn resolves, so the UI can fill in progressively. */
  onTurn?: (outcome: TurnOutcome) => void;
}

/**
 * Analyses one part, turn by turn. Resolves (never rejects, except on the
 * caller's own abort) with the part's state and every turn resolved so far.
 */
export async function analysePart(args: AnalysePartArgs, deps: ClientDeps = defaultDeps()): Promise<PartAnalysis> {
  const { sessionId, part, entries, recognizer, signal, onTurn } = args;
  const turns = segmentSpeechTurns(entries)[part];
  const outcomes: TurnOutcome[] = [];
  const done = (state: PartAnalysis['state']): PartAnalysis => ({ part, state, turns: outcomes });
  const record = (o: TurnOutcome) => {
    outcomes.push(o);
    onTurn?.(o);
  };

  if (!turns.some((t) => deps.getAudio(sessionId, t.turnKey))) return done('no_audio');

  let headers: Record<string, string>;
  try {
    headers = await deps.authHeader();
  } catch (err) {
    if (isAuthRequiredError(err)) return done('signed_out');
    throw err;
  }
  if (!headers.Authorization) return done('signed_out'); // guests are excluded

  for (const turn of turns) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const blob = deps.getAudio(sessionId, turn.turnKey);
    if (!blob) {
      record({ turnKey: turn.turnKey, status: 'no_audio' });
      continue;
    }
    const prepared = await deps.prepare(blob);
    if (typeof prepared === 'string') {
      record({ turnKey: turn.turnKey, status: prepared });
      continue;
    }

    let result = await postOnce(deps, turnForm(sessionId, turn, prepared, recognizer), headers, signal);
    if (result === 'retry' && !signal?.aborted) {
      result = await postOnce(deps, turnForm(sessionId, turn, prepared, recognizer), headers, signal);
    }
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (result === 'retry') return done('failed');
    if (result.kind === 'stop') return done(result.state);
    record({ turnKey: turn.turnKey, status: 'done', evidence: result.evidence, segments: prepared.segments });
  }
  return done('done');
}

export interface StoredEvidence {
  state: Extract<ExamPronunciationState, 'done' | 'failed' | 'signed_out' | 'not_enabled'>;
  evidence: ExamPronunciationTurnEvidence[];
}

/** Reads the stored turns for a session (report reopen). Never analyses, never charges. */
export async function fetchStoredEvidence(
  sessionId: string,
  signal?: AbortSignal,
  deps: Pick<ClientDeps, 'fetchImpl' | 'authHeader'> = defaultDeps(),
): Promise<StoredEvidence> {
  let headers: Record<string, string>;
  try {
    headers = await deps.authHeader();
  } catch (err) {
    if (isAuthRequiredError(err)) return { state: 'signed_out', evidence: [] };
    throw err;
  }
  if (!headers.Authorization) return { state: 'signed_out', evidence: [] };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EXAM_PRONUNCIATION_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await deps.fetchImpl(
      `${API_BASE}/api/exam/pronunciation?session_id=${encodeURIComponent(sessionId)}`,
      { headers, signal: controller.signal },
    );
    const body: unknown = await res.json().catch(() => null);
    if (res.ok) {
      const turns = (body as { turns?: ExamPronunciationTurnEvidence[] } | null)?.turns;
      return { state: 'done', evidence: Array.isArray(turns) ? turns : [] };
    }
    if (res.status === 401) return { state: 'signed_out', evidence: [] };
    if (res.status === 403 && (body as { detail?: { status?: unknown } } | null)?.detail?.status === 'not_enabled') {
      return { state: 'not_enabled', evidence: [] };
    }
    return { state: 'failed', evidence: [] };
  } catch {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return { state: 'failed', evidence: [] };
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onAbort);
  }
}
