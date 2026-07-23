/**
 * Understanding-only utterance interpreter (plan Change A). The LLM's *only*
 * authoritative role is boosting live conduct-routing recall — helping the engine
 * notice a clarification/repeat/dont_know on messy STT that the deterministic
 * `classifyUtteranceIntent` regex missed. It returns FACTS ONLY:
 *
 *   - no policy      — it never decides examiner behaviour (extension/partial
 *                      probing stays engine-owned, see conductEngine.decideExtension).
 *   - no `partial`   — partiality is a deterministic wordCount/duration judgement,
 *                      not an interpreter fact.
 *   - no `entities`  — conversational-memory content is derived deterministically
 *                      from the transcript (conductEngine, Change C), so callbacks
 *                      stay provider-independent. The interpreter emits no text
 *                      that could ever reach examiner speech.
 *
 * Determinism boundary: the returned `UtteranceObservation` is a throwaway routing
 * hint consumed only inside simulationSession — it is NEVER written to the
 * ConductLog, the SessionTranscript, `CandidateTurnResult`, or any scoring module.
 * Blanking authority stays the deterministic classifier (buildSessionTranscript
 * reads only `ConductLogCandidateEntry.intent`, set from classifyUtteranceIntent).
 * An import-boundary test enforces that this module is unreachable from the scored
 * pipeline.
 *
 * Reliability: any of {timeout, non-JSON/schema-invalid body, unknown speechAct,
 * ambiguous/conflicting signal, confidence < CONFIDENCE_FLOOR} falls back
 * IMMEDIATELY to a deterministic observation derived from classifyUtteranceIntent,
 * so the exam runs fully offline with zero added latency and predictable behaviour.
 */

import { classifyUtteranceIntent, type UtteranceIntent } from '../../domain/igcse/session/utteranceIntents';

export type SpeechAct =
  | 'substantive_answer'
  | 'affirmation'
  | 'dont_know'
  | 'repeat_request'
  | 'clarification_request'
  | 'off_language'
  | 'silence';

export interface UtteranceObservation {
  speechAct: SpeechAct;
  /** Observation-only; may feed a non-scored debug/analytics sink, never a conduct decision or the ConductLog. */
  hesitation: boolean;
  /** 0..1. Below CONFIDENCE_FLOOR the observation is discarded for the deterministic fallback. */
  confidence: number;
  /** True when this observation came from the deterministic fallback rather than the LLM (debug only). */
  fallback: boolean;
}

/** Below this LLM-reported confidence, the observation is discarded in favour of the deterministic fallback. */
export const CONFIDENCE_FLOOR = 0.55;

/** Request budget: past this the interpreter aborts and falls back deterministically. Keeps worst-case per-turn latency bounded. */
export const INTERPRET_TIMEOUT_MS = 1000;

const VALID_SPEECH_ACTS: ReadonlySet<string> = new Set<SpeechAct>([
  'substantive_answer',
  'affirmation',
  'dont_know',
  'repeat_request',
  'clarification_request',
  'off_language',
  'silence',
]);

// Prod: same-origin '/api/*' proxied to the backend by Vercel (see vercel.json).
// Dev: call the backend directly. Mirrors apiClient.ts's API_BASE convention.
const API_BASE = import.meta.env.PROD
  ? ''
  : ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000');

export interface InterpretContext {
  /** Which exam part the turn belongs to — passed through for the model's routing prompt only. */
  part: 'rolePlay' | 'topic1' | 'topic2';
}

/**
 * Session-scoped circuit breaker. When the interpret endpoint is genuinely absent
 * (HTTP 404 — e.g. the deployed backend predates this route), every subsequent
 * turn would otherwise pay a doomed round-trip and log a fresh 404 to the console.
 * The deterministic classifier is a complete substitute, so once we see a 404 we
 * stop calling the endpoint entirely for the rest of the session. Reset on full
 * page reload (module re-init) — and on demand in tests. Only a definitive 404
 * trips it: 5xx/timeout/network failures may be transient cold-start hiccups and
 * must keep retrying on later turns.
 */
let interpretEndpointGone = false;

/** Test-only: clear the 404 circuit breaker so cases don't leak state across each other. */
export function __resetInterpretCircuitForTests(): void {
  interpretEndpointGone = false;
}

/**
 * Deterministic mapping from the whole-utterance intent classifier to an
 * observation. This IS the fallback, and it is the sole source of truth whenever
 * the LLM is unavailable/untrusted — so its behaviour is identical offline.
 */
export function deriveObservationFromIntent(transcript: string): UtteranceObservation {
  const intent: UtteranceIntent = classifyUtteranceIntent(transcript);
  const empty = transcript.trim().length === 0;

  let speechAct: SpeechAct;
  switch (intent) {
    case 'dont_know':
      speechAct = 'dont_know';
      break;
    case 'repeat_request':
      speechAct = 'repeat_request';
      break;
    case 'clarification_request':
      speechAct = 'clarification_request';
      break;
    case 'non_french':
      speechAct = 'off_language';
      break;
    default:
      // 'answer' — an empty transcript is silence, otherwise a substantive answer.
      speechAct = empty ? 'silence' : 'substantive_answer';
      break;
  }

  return { speechAct, hesitation: false, confidence: 1, fallback: true };
}

/** Runtime validation of the LLM's JSON body. Returns null on any schema violation (caller falls back). */
function parseObservationBody(body: unknown): UtteranceObservation | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;

  const speechAct = b.speechAct;
  if (typeof speechAct !== 'string' || !VALID_SPEECH_ACTS.has(speechAct)) return null;

  const confidence = b.confidence;
  if (typeof confidence !== 'number' || Number.isNaN(confidence) || confidence < 0 || confidence > 1) return null;

  const hesitation = typeof b.hesitation === 'boolean' ? b.hesitation : false;

  return { speechAct: speechAct as SpeechAct, hesitation, confidence, fallback: false };
}

/**
 * Interprets one candidate utterance. On ANY failure mode — timeout, network
 * error, non-JSON/schema-invalid body, unknown speechAct, or confidence below
 * CONFIDENCE_FLOOR — returns the deterministic fallback derived from
 * classifyUtteranceIntent. Never throws.
 */
export async function interpretUtterance(
  transcript: string,
  ctx: InterpretContext,
): Promise<UtteranceObservation> {
  // An empty transcript needs no round-trip — the deterministic answer is exact.
  if (transcript.trim().length === 0) {
    return deriveObservationFromIntent(transcript);
  }

  // Endpoint already known-absent this session — skip the doomed round-trip.
  if (interpretEndpointGone) {
    return deriveObservationFromIntent(transcript);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), INTERPRET_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}/api/exam/interpret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, part: ctx.part }),
      signal: controller.signal,
    });

    if (!res.ok) {
      // A 404 means the route isn't deployed — trip the breaker so later turns
      // don't repeat it. Other statuses may be transient; keep trying next turn.
      if (res.status === 404) interpretEndpointGone = true;
      return deriveObservationFromIntent(transcript);
    }

    let body: unknown;
    try {
      body = await res.json();
    } catch {
      return deriveObservationFromIntent(transcript);
    }

    const parsed = parseObservationBody(body);
    // Schema-invalid, unknown label, or low confidence → deterministic fallback.
    if (parsed === null || parsed.confidence < CONFIDENCE_FLOOR) {
      return deriveObservationFromIntent(transcript);
    }
    return parsed;
  } catch {
    // Timeout (AbortError) or network failure → deterministic fallback, no added latency beyond the budget.
    return deriveObservationFromIntent(transcript);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fire-and-forget warm-up ping for the interpret endpoint, mirroring
 * pingScoringServiceHealth. Doubles as an early probe: a 404 here trips the
 * circuit breaker before the first turn, so a backend without this route never
 * produces per-turn 404 noise. Never throws.
 */
export function pingInterpretServiceHealth(): void {
  void fetch(`${API_BASE}/api/exam/interpret/health`)
    .then((res) => {
      if (res.status === 404) interpretEndpointGone = true;
    })
    .catch(() => undefined);
}
