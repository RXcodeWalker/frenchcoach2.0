/**
 * Marks are structurally unchangeable by pronunciation analysis (plan §3c
 * item 5): the same transcript scores identically whether or not exam audio
 * and pronunciation evidence exist in app/session state, and the /score
 * request body never carries a pronunciation key.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: { access_token: 'test-token' } } }) } },
  supabaseConfigured: true,
}));

import { scoreAttempt, type ScoreAttemptDeps } from '../../../../scripts/scoring/scoreAttempt';
import { createGenericFakeJudge } from '../../../../scripts/scoring/__tests__/fixtures';
import { createFixtureTranscriptStore } from '../../igcse/stt/providers/fixtureTranscriptStore';
import { toSpeakingTranscript } from '../../igcse/stt/project/toSpeakingTranscript';
import type { SessionQuestionSet, SessionTranscript } from '../../igcse/stt/types';
import type { ScoringEnvelope } from '../../igcse/envelope/types';
import { clearAllExamAudio, putTurnAudio } from '../../../services/exam/pronunciation/examAudioStore';
import { buildExamPronunciationReport } from '../buildReport';
import { bad, ev, turn } from './evidenceFixture';

import structGolden from '../../igcse/stt/__tests__/fixtures/structurally-complete.golden.json';
import structQuestions from '../../igcse/stt/__tests__/fixtures/structurally-complete-questions.json';

const SESSION_ID = 'structurally-complete-001';
const questionSet = structQuestions as SessionQuestionSet;
const transcript = structGolden as unknown as SessionTranscript;

function deps(): ScoreAttemptDeps {
  return {
    transcriptStore: createFixtureTranscriptStore({ [SESSION_ID]: structGolden }),
    createJudge: () => {
      const judge = createGenericFakeJudge(() => toSpeakingTranscript(transcript, questionSet));
      return { judge, getLastCallMetadata: () => ({ provider: 'gemini' as const, model: 'fake-model' }) };
    },
  };
}

function markFields(e: ScoringEnvelope) {
  return {
    rolePlayTasks: e.rolePlayTasks.map((t) => ({ taskId: t.taskId, mark: t.mark })),
    communication: { mark: e.communication.mark, band: e.communication.band },
    qualityOfLanguage: { mark: e.qualityOfLanguage.mark, band: e.qualityOfLanguage.band },
    total: e.total,
    criterionAdjustments: e.criterionAdjustments,
    guardrailTriggers: e.guardrailTriggers,
    evidenceProfileSnapshot: e.evidenceProfileSnapshot,
    transcriptSnapshot: e.transcriptSnapshot,
    versions: e.versions,
  };
}

function withPronunciationState() {
  // Every candidate utterance has a recording in memory and stored evidence.
  const candidateTurns = transcript.utterances.filter((u) => u.role === 'candidate');
  candidateTurns.forEach((_, i) => putTurnAudio(SESSION_ID, i + 1, new Blob([new Uint8Array(32)])));
  return buildExamPronunciationReport({
    turns: [{ turnKey: 1, part: 'topic1', questionId: null, transcript: 'Je vais souvent au cinéma' }],
    evidence: [turn(1, [ev('Je'), ev('vais'), bad('souvent', 10), ev('au'), bad('pain', 10)])],
  });
}

afterEach(() => {
  clearAllExamAudio();
  vi.unstubAllEnvs();
});

describe('pronunciation analysis cannot change a mark', () => {
  it('scoreAttempt gives identical marks with and without pronunciation evidence present', async () => {
    const without = await scoreAttempt(deps(), { sessionId: SESSION_ID, questionSet });
    const report = withPronunciationState();
    expect(report.parts[0].reportedWords.length).toBeGreaterThan(0);
    const withEvidence = await scoreAttempt(deps(), { sessionId: SESSION_ID, questionSet });
    expect(markFields(withEvidence)).toEqual(markFields(without));
    expect(JSON.stringify(withEvidence)).not.toMatch(/pronunciation/i);
  });

  it('the /score request body carries no pronunciation key', async () => {
    withPronunciationState();
    vi.resetModules();
    vi.stubEnv('VITE_SCORING_API_URL', 'https://scoring.example');
    const client = await import('../../../services/exam/scoringApiClient');
    const bodies: string[] = [];
    const originalFetch = global.fetch;
    global.fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(String(init?.body));
      return new Response(null, { status: 202 });
    }) as unknown as typeof fetch;
    try {
      await client.submitForScoring(transcript);
    } finally {
      global.fetch = originalFetch;
    }
    expect(bodies).toHaveLength(1);
    expect(JSON.parse(bodies[0])).toEqual(JSON.parse(JSON.stringify(transcript)));
    expect(bodies[0]).not.toMatch(/pronunciation/i);
  });
});
