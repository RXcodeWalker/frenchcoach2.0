import type { FeedbackV2, Question, SkillContext, GeneratedScenario, AIEngine, EngineMetadata, DifficultyTier, UnscoredReason } from '../../types';
import { track } from '../telemetry/telemetryService';
import { evaluate as offlineEvaluate } from '../coaching/coachService';
import { DIFFICULTY_CONFIG, DEFAULT_DIFFICULTY } from '../../utils/difficultyConfig';
import {
  buildSkillContext,
  hasJustification,
  hasOpinion,
  hasConnectors,
  hasPerspective,
  hasSubjunctive,
  hasConditional,
  hasPastOrFuture,
} from '../coaching/diagnosticEngine';
import { wordCount as demandWordCount } from '../../domain/learn/demand/textCues';
import { demandsVersion as LEARN_DEMANDS_VERSION } from '../../data/learn/demandsManifest';
import { classifyTier, buildTier0Result, buildTier1LocalResult } from '../coaching/responseTier';
import { applyQualityGate } from '../coaching/qualityGate';
import { validateBackendFeedback, SchemaValidationError } from './feedbackSchema';
import { getGroundedExaminerFeedback, type ExaminerFeedback } from '../coaching/examinerFeedback';
import type { NewsSnippet } from '../../data/mocks/mockNews';

// Prod: same-origin '/api/*' proxied to the backend by Vercel (see vercel.json)
// to avoid CORS. Dev: call the backend directly.
const API_BASE = import.meta.env.PROD
  ? ''
  : ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000');

// Budgets must exceed the backend's own per-provider latency, or a provider that
// is working perfectly still reads as "timed out" here and gets skipped forever.
// Measured against prod: Gemini ~23s end-to-end (gemini-3.5-flash thinks before
// its first token), Groq ~2-5s.
const ENGINE_TIMEOUT_MS: Record<AIEngine, number> = {
  gemini: 35000,
  groq: 15000,
  offline: 0,
};

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

/**
 * docs §9.1 trust boundary: the client sends only questionId + demandsVersion
 * (never the demand fields it has locally) so the backend resolves demands
 * against its own copy of the corpus — the client cannot declare its own
 * demands. Returns {} for a question with no demands, so requestBody stays
 * unchanged for legacy/un-inferred questions.
 */
function buildDemandIdentity(question: Question): { questionId?: string; demandsVersion?: string } {
  if (!question.demands) return {};
  return { questionId: question.id, demandsVersion: LEARN_DEMANDS_VERSION };
}

/**
 * Client-computed L1 marker readout for the prompt's DETERMINISTIC SIGNALS
 * section (docs §9.2) — same detectors evaluateDemandSatisfaction uses for L1
 * evidence (docs §9.3), read-only here: this never feeds evidence itself,
 * only what the backend renders as "already measured — do not contradict".
 */
function buildDemandSignals(transcript: string, question: Question): Record<string, unknown> | undefined {
  if (!question.demands) return undefined;
  return {
    cognitiveDemand: question.demands.cognitiveDemand,
    wordCount: demandWordCount(transcript),
    hasJustification: hasJustification(transcript),
    hasOpinion: hasOpinion(transcript),
    hasConnectors: hasConnectors(transcript),
    hasPerspective: hasPerspective(transcript),
    hasSubjunctive: hasSubjunctive(transcript),
    hasConditional: hasConditional(transcript),
    hasPastOrFuture: hasPastOrFuture(transcript),
  };
}

export async function generateScenario(description: string): Promise<GeneratedScenario> {
  return post<GeneratedScenario>('/api/generate-scenario', { description });
}

export interface RoleplayTurnResponse {
  reply: string;
  is_done: boolean;
  hint: string | null;
}

export async function roleplayTurn(
  scenarioId: string,
  turnHistory: { speaker: 'examiner' | 'student'; text: string }[],
  transcript: string,
  customScenario?: GeneratedScenario
): Promise<RoleplayTurnResponse> {
  return post<RoleplayTurnResponse>('/api/roleplay/turn', {
    scenario_id: scenarioId,
    turn_history: turnHistory,
    student_transcript: transcript,
    custom_scenario: customScenario
  });
}


// Shape returned by the old Python backend /api/feedback
interface BackendFeedback {
  fluency?: number;
  scores?: { overall?: number; comm?: number; know?: number; acc?: number };
  grammar?: { critical?: unknown[]; polish?: unknown[] } | unknown[];
  vocabulary?: { basic?: string; upgrade?: string }[];
  style?: { label?: string; suggestion?: string }[];
  fillers?: { word?: string; count?: number }[];
  wordCount?: number;
  cefrLevel?: string;
  /** "offline_fallback" | "malformed_response" mark a response that was never really graded — see mapBackendFeedback. */
  providerStatus?: string;
}

// Shape returned by /api/feedback/v2 or /api/feedback/v3 — superset of BackendFeedback
type BackendFeedbackV2 = BackendFeedback & Partial<FeedbackV2> & {
  provider?: string;
  providerAttempts?: { provider: string; success: boolean; error?: string }[];
  // Backend's per-provider failure detail when it fell back internally
  // (e.g. Gemini 429 quota → Groq). Without surfacing this a silent
  // Gemini→Groq fallback looks like "Gemini never works" with no reason.
  providerErrors?: { provider: string; type: string; message?: string }[];
};

function logProviderAttempts(raw: BackendFeedbackV2, endpoint: string): void {
  // Surface any provider the backend tried and abandoned before the winner,
  // so a server-side Gemini→Groq fallback isn't invisible on the client.
  (raw.providerErrors ?? []).forEach(err => {
    console.warn(`[AI Feedback] ${err.provider} did not give a response — ${err.type}${err.message ? `: ${err.message}` : ''} (${endpoint})`);
  });

  const attempts = raw.providerAttempts;
  if (attempts && attempts.length > 0) {
    attempts.forEach(attempt => {
      if (attempt.success) {
        console.log(`[AI Feedback] ${attempt.provider} gave response (${endpoint})`);
      } else {
        console.warn(`[AI Feedback] ${attempt.provider} did not give a response — reason: ${attempt.error ?? 'unknown error'}`);
      }
    });
  } else {
    // Backend doesn't send providerAttempts yet — just log the winner
    console.log(`[AI Feedback] ${raw.provider ?? 'Unknown provider'} gave response (${endpoint})`);
  }
}

/** E2: a response with no real score anywhere is invalid input, not a "5" — callers must treat this as a failure and let the fallback chain run. */
export class NoScoreInFeedbackError extends Error {
  constructor() {
    super('Backend feedback contained no usable score');
    this.name = 'NoScoreInFeedbackError';
  }
}

// Backend markers for "this attempt was never actually graded" — checked
// before and independently of scores/fluency, since a malformed response can
// still carry a real `fluency` number alongside missing `scores` (see
// Slice 7 plan: fluency and scores are supplied independently by the
// provider, nothing enforces consistency between them).
const UNSCORED_PROVIDER_STATUS: Record<string, UnscoredReason> = {
  offline_fallback: 'backend_offline_fallback',
  malformed_response: 'backend_malformed_response',
};

export function mapBackendFeedback(raw: BackendFeedback): FeedbackV2 {
  const unscoredReason = raw.providerStatus ? UNSCORED_PROVIDER_STATUS[raw.providerStatus] : undefined;

  const grammar  = Array.isArray(raw.grammar)
    ? { critical: raw.grammar as FeedbackV2['grammar']['critical'], polish: [] }
    : { critical: (raw.grammar?.critical ?? []) as FeedbackV2['grammar']['critical'], polish: (raw.grammar?.polish ?? []) as FeedbackV2['grammar']['polish'] };

  if (unscoredReason) {
    return {
      scores: { overall: 0, communication: 0, language: 0, fluency: 0 },
      unscored: unscoredReason,
      grammar,
      vocabulary: (raw.vocabulary ?? []).map(v => ({ basic: v.basic ?? '', upgrade: v.upgrade ?? '' })),
      style:      (raw.style      ?? []).map(s => ({ label: s.label ?? '', suggestion: s.suggestion ?? '' })),
      fillers:    (raw.fillers    ?? []).map(f => ({ word: f.word ?? '', count: f.count ?? 0 })),
      wordCount:  raw.wordCount ?? 0,
      cefrLevel:  raw.cefrLevel ?? 'A2',
      pronunciation: { score: null, issues: [] },
    };
  }

  const overall = raw.scores?.overall ?? raw.fluency;
  if (overall === undefined) {
    throw new NoScoreInFeedbackError();
  }

  return {
    scores: {
      overall,
      communication: raw.scores?.comm    ?? overall,
      language:      raw.scores?.know    ?? overall,
      fluency:       raw.scores?.acc     ?? overall,
    },
    grammar,
    vocabulary: (raw.vocabulary ?? []).map(v => ({ basic: v.basic ?? '', upgrade: v.upgrade ?? '' })),
    style:      (raw.style      ?? []).map(s => ({ label: s.label ?? '', suggestion: s.suggestion ?? '' })),
    fillers:    (raw.fillers    ?? []).map(f => ({ word: f.word ?? '', count: f.count ?? 0 })),
    wordCount:  raw.wordCount ?? 0,
    cefrLevel:  raw.cefrLevel ?? 'A2',
    pronunciation: { score: null, issues: [] },
  };
}

function mergeV2Fields(base: FeedbackV2, raw: BackendFeedbackV2): FeedbackV2 {
  // Accept schemaVersion 2 or 3 (>= 2)
  if ((raw.schemaVersion ?? 0) >= 2) {
    return {
      ...base,
      schemaVersion: raw.schemaVersion,
      examiner: raw.examiner,
      topPriorityIssueId: raw.topPriorityIssueId,
      strongestMomentSpan: raw.strongestMomentSpan,
      strongestMomentExplanation: raw.strongestMomentExplanation,
      // New coaching fields from redesigned backend
      best_moment: raw.best_moment,
      biggest_opportunity: raw.biggest_opportunity,
      improved_answer: raw.improved_answer,
      rephrase: raw.rephrase,
      advanced_answer: raw.advanced_answer,
      expansion_ideas: raw.expansion_ideas,
      formatted_transcript: raw.formatted_transcript,
      issues: raw.issues,
      transcriptAnnotations: raw.transcriptAnnotations,
      vocabularyV2: raw.vocabularyV2,
      pronunciation: raw.pronunciation ?? base.pronunciation,
      deepAnalysis: raw.deepAnalysis,
      avoidanceReport: raw.avoidanceReport,
      skillContextUsed: raw.skillContextUsed,
      responseTier: raw.responseTier,
      expansionLevels: raw.expansionLevels,
      coachingLayer: raw.coachingLayer,
      confidence: raw.confidence,
    };
  }
  return base;
}

async function fetchWithTimeout<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await fetcher(controller.signal);
    clearTimeout(timer);
    return result;
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error).name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw err;
  }
}

async function tryNetworkFeedback(
  requestBody: Record<string, unknown>,
  audioBlob: Blob | undefined,
  engine: AIEngine,
  startTime: number,
): Promise<{ result: FeedbackV2; actualEngine: AIEngine } | null> {
  const timeoutMs = ENGINE_TIMEOUT_MS[engine];
  const engineParam = engine === 'offline' ? undefined : engine;

  const bodyWithEngine = engineParam ? { ...requestBody, enginePreference: engineParam } : requestBody;

  console.log(`[AI Feedback] Attempting ${engine} (timeout: ${timeoutMs}ms)`);
  try {
    let raw: BackendFeedbackV2;
    if (audioBlob) {
      const formData = new FormData();
      const questionText = (requestBody.question as Record<string, unknown> | null)?.text ?? '';
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('question', String(questionText));
      formData.append('data', JSON.stringify(bodyWithEngine));
      raw = await fetchWithTimeout(
        (signal) => postMultipartWithSignal<BackendFeedbackV2>('/api/feedback/v3', formData, signal),
        timeoutMs,
      );
    } else {
      raw = await fetchWithTimeout(
        (signal) => postWithSignal<BackendFeedbackV2>('/api/feedback/v3', bodyWithEngine, signal),
        timeoutMs,
      );
    }
    logProviderAttempts(raw, 'v3');
    // Validate the response shape before trusting it — schema failures fall
    // through to the next engine in the chain just like network errors do.
    try {
      validateBackendFeedback(raw, `${engine}/v3`);
    } catch (validationErr) {
      if (validationErr instanceof SchemaValidationError) {
        console.warn(`[AI Feedback] ${engine} returned invalid schema — treating as failed`);
        return null;
      }
    }
    const result = mergeV2Fields(mapBackendFeedback(raw), raw);
    result.provider = raw.provider;
    result.providerAttempts = raw.providerAttempts;
    result.engineMeta = {
      requestedEngine: engine,
      actualEngine: (raw.provider as AIEngine | undefined) ?? engine,
      fallbackUsed: false,
      latencyMs: Date.now() - startTime,
      evaluatedAt: new Date().toISOString(),
    };
    return { result, actualEngine: result.engineMeta.actualEngine };
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'Request timed out') {
      console.warn(`[AI Feedback] ${engine} timed out after ${ENGINE_TIMEOUT_MS[engine]}ms`);
    } else {
      console.warn(`[AI Feedback] ${engine} failed — ${msg}`);
    }
    return null;
  }
}

async function postWithSignal<T>(path: string, body: unknown, signal: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[API] ${path} → ${res.status}`, text.slice(0, 300));
    throw new Error(`API ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function postMultipartWithSignal<T>(path: string, formData: FormData, signal: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    body: formData,
    signal,
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

/**
 * Get AI feedback for a transcript.
 * Tier 0 (empty): immediate local result, no score.
 * Tier 1 (1-3 words): immediate local result — too short for AI to add value.
 * Tier 2-3: full AI evaluation (Gemini → Groq → Offline fallback chain).
 */
export async function getAIFeedback(
  transcript: string,
  question: Question,
  skillContext?: SkillContext,
  audioBlob?: Blob,
  enginePreference: AIEngine = 'groq',
  difficulty: DifficultyTier = DEFAULT_DIFFICULTY,
): Promise<FeedbackV2> {
  const startTime = Date.now();
  const cfg = DIFFICULTY_CONFIG[difficulty];
  const tier = classifyTier(transcript);

  // Tier 0: no response at all — skip everything
  if (tier === 0) {
    const result = buildTier0Result();
    result.engineMeta = {
      requestedEngine: enginePreference,
      actualEngine: 'offline',
      fallbackUsed: false,
      latencyMs: 0,
      evaluatedAt: new Date().toISOString(),
    };
    return result;
  }

  // Offline: skip network entirely for all tiers
  if (enginePreference === 'offline') {
    const result = offlineEvaluate(transcript, question);
    result.engineMeta = {
      requestedEngine: 'offline',
      actualEngine: 'offline',
      fallbackUsed: false,
      latencyMs: Date.now() - startTime,
      evaluatedAt: new Date().toISOString(),
    };
    return result;
  }

  // Tier 1: very short answer (1-3 words) — return local result immediately.
  // No network round-trip: a 1-3 word answer cannot earn Communication marks
  // regardless of which engine evaluates it.
  if (tier === 1) {
    const localResult = buildTier1LocalResult(transcript);
    localResult.engineMeta = {
      requestedEngine: enginePreference,
      actualEngine: 'offline',
      fallbackUsed: false,
      latencyMs: Date.now() - startTime,
      evaluatedAt: new Date().toISOString(),
    };
    return localResult;
  }

  const ctx = skillContext ?? buildSkillContext();

  const requestBody = {
    transcript,
    question: {
      id: question.id,
      text: question.text,
      topicKey: question.topicKey,
      difficulty: question.difficulty,
      modelAnswer: question.modelAnswer,
      keyVocab: question.keyVocab,
    },
    skillContext: ctx,
    difficultyContext: {
      tier: cfg.tier,
      label: cfg.label,
      cefrTarget: cfg.cefrTarget,
      coachingTone: cfg.coachingTone,
      coachingRubric: cfg.coachingRubric,
    },
    ...buildDemandIdentity(question),
    demandSignals: buildDemandSignals(transcript, question),
  };

  // Build fallback chain based on preference
  console.log(`[AI Feedback] Engine preference received: ${enginePreference}`);
  const fallbackChain: AIEngine[] = enginePreference === 'gemini'
    ? ['gemini', 'groq']
    : ['groq'];

  let failoverReason: string | undefined;
  let fallbackUsed = false;

  for (let i = 0; i < fallbackChain.length; i++) {
    const engine = fallbackChain[i];
    const attempt = await tryNetworkFeedback(requestBody, audioBlob, engine, startTime);
    if (attempt) {
      if (fallbackUsed && attempt.result.engineMeta) {
        attempt.result.engineMeta.fallbackUsed = true;
        attempt.result.engineMeta.failoverReason = failoverReason;
        attempt.result.engineMeta.requestedEngine = enginePreference;
      }
      // Tag tier and apply quality gate to network result
      attempt.result.responseTier = tier;
      return applyQualityGate(attempt.result, transcript);
    }
    // This engine failed — note the reason and try next
    failoverReason = `${engine.charAt(0).toUpperCase() + engine.slice(1)} timed out or was unavailable`;
    fallbackUsed = true;
    if (i < fallbackChain.length - 1) {
      track({ name: 'ai_failover', props: { requested_engine: enginePreference, actual_engine: fallbackChain[i + 1], reason: failoverReason, latency_ms: Date.now() - startTime } });
    }
  }

  // All network options exhausted → offline (already tier-aware and quality-gated in coachService)
  console.log('[AI Feedback] All network engines failed — using offline evaluation');
  track({ name: 'ai_failover', props: { requested_engine: enginePreference, actual_engine: 'offline', reason: failoverReason ?? 'unknown', latency_ms: Date.now() - startTime } });
  const result = offlineEvaluate(transcript, question);
  result.engineMeta = {
    requestedEngine: enginePreference,
    actualEngine: 'offline',
    fallbackUsed: true,
    failoverReason,
    latencyMs: Date.now() - startTime,
    evaluatedAt: new Date().toISOString(),
  };
  return result;
}

export type { EngineMetadata };

// ── Examiner-mode feedback ──────────────────────────────────────────────────
//
// Deliberately routed through the same /api/feedback/v3 endpoint (Gemini→Groq
// chain) with a `feedbackMode: 'examiner'` flag — not a separate endpoint, and
// NOT /api/feedback/igcse (that is the legacy invented scorer, unrelated to
// the audited src/domain/igcse engine or to this examiner-voice practice
// commentary). The response shape is ExaminerFeedback, never merged into
// FeedbackV2 — that type always carries a numeric `scores`, and examiner mode
// must never fabricate one.
//
// The rubric-sourced prompt (buildExaminerPrompt) is built HERE, client-side,
// from src/domain/igcse/rubric.ts — the only place the sourced 0520 descriptor
// text lives. The backend has no Python copy of the rubric; it only relays
// whatever prompt this client sends to the LLM and returns raw JSON. Grounding
// and the one-retry rule (getGroundedExaminerFeedback) also run client-side so
// every quote is checked against the exact transcript this client holds.

export class ExaminerFeedbackUnavailableError extends Error {
  constructor() {
    super('Could not get examiner feedback for that answer. Check your connection and try again.');
    this.name = 'ExaminerFeedbackUnavailableError';
  }
}

async function callExaminerModel(prompt: string, signal: AbortSignal): Promise<ExaminerFeedback> {
  const raw = await postWithSignal<Partial<ExaminerFeedback>>(
    '/api/feedback/v3',
    { feedbackMode: 'examiner' as const, prompt },
    signal,
  );
  return {
    currentDescriptorCommentary: raw.currentDescriptorCommentary ?? [],
    improvementCommentary: raw.improvementCommentary ?? [],
  };
}

export async function getExaminerFeedback(
  transcript: string,
  question: Question,
  signal: AbortSignal,
): Promise<ExaminerFeedback> {
  try {
    return await getGroundedExaminerFeedback(question.text, transcript, (prompt) =>
      callExaminerModel(prompt, signal),
    );
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    if (err instanceof Error && err.name === 'ExaminerGroundingFailedError') throw err;
    // E1 parity: examiner mode has no offline fallback voice — a total
    // network failure must surface an honest error, never coach-voice
    // offline output silently substituted in.
    throw new ExaminerFeedbackUnavailableError();
  }
}

// ── Streaming feedback ────────────────────────────────────────────────────────

export type StreamPhase = 'transcribing' | 'generating' | 'complete';

export interface StreamFeedbackCallbacks {
  onStatus?: (phase: StreamPhase) => void;
  onTranscript?: (text: string) => void;
  onSection?: (type: string, data: Partial<FeedbackV2>) => void;
  onComplete: (feedback: FeedbackV2) => void;
  onError?: (message: string) => void;
}

function mergeSection(acc: Partial<FeedbackV2>, type: string, data: Record<string, unknown>): Partial<FeedbackV2> {
  switch (type) {
    case 'snapshot': {
      const raw = data as { scores?: { comm?: number; know?: number; acc?: number; overall?: number }; fluency?: number; cefrLevel?: string; wordCount?: number };
      const overall = raw.scores?.overall ?? raw.fluency;
      return {
        ...acc,
        // E2: this is a live preview (partialFeedback), never the recorded score — omit
        // scores entirely rather than fabricating an "overall: 5" placeholder when the
        // snapshot doesn't carry a real one yet. The 'complete' event supplies the real score.
        ...(overall !== undefined
          ? {
              scores: {
                overall,
                communication: raw.scores?.comm ?? overall,
                language: raw.scores?.know ?? overall,
                fluency: raw.scores?.acc ?? overall,
              },
            }
          : {}),
        cefrLevel: raw.cefrLevel ?? acc.cefrLevel,
        wordCount: raw.wordCount ?? acc.wordCount,
      };
    }
    case 'strongest_moment':
      return { ...acc, best_moment: (data as { best_moment?: string }).best_moment };
    case 'opportunity':
      return { ...acc, biggest_opportunity: (data as { biggest_opportunity?: string }).biggest_opportunity };
    case 'grammar': {
      const raw = data as { grammar?: FeedbackV2['grammar'] };
      return { ...acc, grammar: raw.grammar };
    }
    case 'vocabulary': {
      const raw = data as { vocabulary?: FeedbackV2['vocabulary'] };
      return { ...acc, vocabulary: raw.vocabulary };
    }
    case 'pronunciation': {
      const raw = data as { pronunciation?: FeedbackV2['pronunciation'] };
      return { ...acc, pronunciation: raw.pronunciation };
    }
    default:
      return acc;
  }
}

export async function streamFeedback(
  transcript: string,
  question: Question,
  skillContext: import('../../types').SkillContext | undefined,
  audioBlob: Blob | undefined,
  enginePreference: AIEngine,
  difficulty: import('../../types').DifficultyTier,
  signal: AbortSignal,
  callbacks: StreamFeedbackCallbacks,
): Promise<void> {
  const cfg = DIFFICULTY_CONFIG[difficulty];
  const ctx = skillContext ?? buildSkillContext();

  const requestBody = {
    transcript,
    question: {
      id: question.id,
      text: question.text,
      topicKey: question.topicKey,
      difficulty: question.difficulty,
      modelAnswer: question.modelAnswer,
      keyVocab: question.keyVocab,
    },
    skillContext: ctx,
    difficultyContext: {
      tier: cfg.tier,
      label: cfg.label,
      cefrTarget: cfg.cefrTarget,
      coachingTone: cfg.coachingTone,
      coachingRubric: cfg.coachingRubric,
    },
    // Bug fix (docs §3.12/§9.2): this was never sent, so the backend's
    // _parse_feedback_request fell through to its "groq" default regardless
    // of what the user selected — the engine selector was inert on this path.
    enginePreference,
    ...buildDemandIdentity(question),
    demandSignals: buildDemandSignals(transcript, question),
  };

  let res: Response;
  if (audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('question', question.text);
    formData.append('data', JSON.stringify(requestBody));
    res = await fetch(`${API_BASE}/api/feedback/stream`, {
      method: 'POST',
      body: formData,
      signal,
    });
  } else {
    res = await fetch(`${API_BASE}/api/feedback/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal,
    });
  }

  if (!res.ok) {
    throw new Error(`API /api/feedback/stream → ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let lineBuffer = '';
  let partial: Partial<FeedbackV2> = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    lineBuffer += decoder.decode(value, { stream: true });
    const lines = lineBuffer.split('\n');
    lineBuffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let msg: { type: string; data: unknown };
      try {
        msg = JSON.parse(trimmed) as { type: string; data: unknown };
      } catch {
        continue;
      }

      const { type, data } = msg;

      if (type === 'status') {
        callbacks.onStatus?.((data as { phase: StreamPhase }).phase);
      } else if (type === 'transcript') {
        callbacks.onTranscript?.((data as { text: string }).text);
      } else if (type === 'error') {
        callbacks.onError?.((data as { message: string }).message);
      } else if (type === 'complete') {
        const raw = data as BackendFeedbackV2;
        logProviderAttempts(raw, 'stream');
        const base = mergeV2Fields(mapBackendFeedback(raw), raw);
        base.provider = raw.provider;
        base.providerAttempts = raw.providerAttempts;
        base.engineMeta = {
          requestedEngine: enginePreference,
          actualEngine: (raw.provider as AIEngine | undefined) ?? enginePreference,
          fallbackUsed: false,
          latencyMs: 0,
          evaluatedAt: new Date().toISOString(),
        };
        base.responseTier = base.responseTier ?? 2;
        const final = applyQualityGate(base, transcript);
        callbacks.onComplete(final);
      } else {
        // section event
        partial = mergeSection(partial, type, data as Record<string, unknown>);
        callbacks.onSection?.(type, { ...partial });
      }
    }
  }
}

export async function getRandomQuestionFromBackend(topicKey?: string): Promise<Question | null> {
  try {
    const path = topicKey ? `/api/questions/random?topic=${topicKey}` : '/api/questions/random';
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) return null;
    return res.json() as Promise<Question>;
  } catch { return null; }
}

export async function getDailyNews(): Promise<NewsSnippet> {
  try {
    const res = await fetch(`${API_BASE}/api/news/daily`);
    if (!res.ok) throw new Error(`API news → ${res.status}`);
    return res.json() as Promise<NewsSnippet>;
  } catch (error) {
    console.error("Failed to fetch daily news:", error);
    throw error;
  }
}

export interface VocabPrepData {
  vocab: { fr: string; en: string; type: string }[];
  phrases: { fr: string; en: string; type: string }[];
}

export async function fetchScenarioVocab(topic: string): Promise<VocabPrepData> {
  const res = await fetch(`${API_BASE}/api/vocab-prep?topic=${encodeURIComponent(topic)}`);
  if (!res.ok) throw new Error(`API vocab-prep → ${res.status}`);
  return res.json() as Promise<VocabPrepData>;
}

export interface RoleplayTurnRequest {
  scenario_id: string;
  turn_history: { speaker: 'examiner' | 'student'; text: string }[];
  student_transcript: string;
  is_final_turn?: boolean;
}

export interface RoleplayTurnResponse {
  reply: string;
  is_done: boolean;
  hint: string | null;
}

export async function getRoleplayTurn(req: RoleplayTurnRequest): Promise<RoleplayTurnResponse> {
  return post<RoleplayTurnResponse>('/api/roleplay/turn', req);
}

