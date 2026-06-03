import type { FeedbackV2, Question, Session, SkillContext, GeneratedScenario, AIEngine, EngineMetadata, DifficultyTier } from '../../types';
import { evaluate as offlineEvaluate } from '../coaching/coachService';
import { DIFFICULTY_CONFIG, DEFAULT_DIFFICULTY } from '../../utils/difficultyConfig';
import { buildSkillContext } from '../coaching/diagnosticEngine';
import { classifyTier, buildTier0Result, buildTier1LocalResult } from '../coaching/responseTier';
import { applyQualityGate } from '../coaching/qualityGate';
import { validateBackendFeedback, SchemaValidationError } from './feedbackSchema';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';

const ENGINE_TIMEOUT_MS: Record<AIEngine, number> = {
  gemini: 18000,
  groq: 8000,
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
}

// Shape returned by /api/feedback/v2 or /api/feedback/v3 — superset of BackendFeedback
type BackendFeedbackV2 = BackendFeedback & Partial<FeedbackV2> & {
  provider?: string;
  providerAttempts?: { provider: string; success: boolean; error?: string }[];
};

function logProviderAttempts(raw: BackendFeedbackV2, endpoint: string): void {
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

function mapBackendFeedback(raw: BackendFeedback): FeedbackV2 {
  const overall  = raw.scores?.overall ?? raw.fluency ?? 5;
  const grammar  = Array.isArray(raw.grammar)
    ? { critical: raw.grammar as FeedbackV2['grammar']['critical'], polish: [] }
    : { critical: (raw.grammar?.critical ?? []) as FeedbackV2['grammar']['critical'], polish: (raw.grammar?.polish ?? []) as FeedbackV2['grammar']['polish'] };

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
    pronunciation: { score: 7, issues: [] },
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
    const result = offlineEvaluate(transcript, question, difficulty);
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
  }

  // All network options exhausted → offline (already tier-aware and quality-gated in coachService)
  console.log('[AI Feedback] All network engines failed — using offline evaluation');
  const result = offlineEvaluate(transcript, question, difficulty);
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

export async function saveSessionToBackend(session: Session): Promise<void> {
  try {
    await post('/api/sessions', session);
  } catch {
    // Non-critical — local storage is the source of truth
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

export async function getDailyNews(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/api/news/daily`);
    if (!res.ok) throw new Error(`API news → ${res.status}`);
    return res.json();
  } catch (error) {
    console.error("Failed to fetch daily news:", error);
    throw error;
  }
}

export async function evaluatePronunciationAudio(audioBlob: Blob, targetText: string): Promise<FeedbackV2> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  formData.append('transcript', targetText);

  const res = await fetch(`${API_BASE}/api/evaluate`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error(`API evaluate → ${res.status}`);
  const raw = await res.json() as BackendFeedbackV2;
  return mergeV2Fields(mapBackendFeedback(raw), raw);
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

