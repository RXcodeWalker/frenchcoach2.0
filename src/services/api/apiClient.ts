import type { FeedbackV2, Question, Session, SkillContext, GeneratedScenario } from '../../types';
import { evaluate as offlineEvaluate } from '../coaching/coachService';
import { buildSkillContext } from '../coaching/diagnosticEngine';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';

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

async function postMultipart<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
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
type BackendFeedbackV2 = BackendFeedback & Partial<FeedbackV2>;

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
      issues: raw.issues,
      transcriptAnnotations: raw.transcriptAnnotations,
      vocabularyV2: raw.vocabularyV2,
      pronunciation: raw.pronunciation ?? base.pronunciation,
      deepAnalysis: raw.deepAnalysis,
      avoidanceReport: raw.avoidanceReport,
      skillContextUsed: raw.skillContextUsed,
    };
  }
  return base;
}

/**
 * Get AI feedback for a transcript.
 * Automatically injects the current skill context for personalization.
 * Falls back gracefully: v3 → v2 → v1 → offline.
 */
export async function getAIFeedback(
  transcript: string,
  question: Question,
  skillContext?: SkillContext,
  audioBlob?: Blob,
): Promise<FeedbackV2> {
  // Build skill context if not provided
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
    options: {
      deepAnalysis: false,
      cefrTarget: 'B1' as const,
      examBoard: 'IGCSE' as const,
    },
  };

  // Try v3 endpoint (with optional audio for pronunciation)
  try {
    if (audioBlob) {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('data', JSON.stringify(requestBody));
      const raw = await postMultipart<BackendFeedbackV2>('/api/feedback/v3', formData);
      return mergeV2Fields(mapBackendFeedback(raw), raw);
    } else {
      const raw = await post<BackendFeedbackV2>('/api/feedback/v3', requestBody);
      return mergeV2Fields(mapBackendFeedback(raw), raw);
    }
  } catch {
    // Fall back to v2 endpoint
    try {
      const raw = await post<BackendFeedbackV2>('/api/feedback/v2', {
        question: question.text,
        transcript,
        questionObj: question,
        skillContext: ctx,
        options: { deepAnalysis: false },
      });
      return mergeV2Fields(mapBackendFeedback(raw), raw);
    } catch {
      // Fall back to v1 endpoint
      try {
        const raw = await post<BackendFeedback>('/api/feedback', {
          question: question.text,
          transcript,
          questionObj: question,
        });
        return mapBackendFeedback(raw);
      } catch {
        // Graceful offline fallback
        return offlineEvaluate(transcript, question);
      }
    }
  }
}

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

