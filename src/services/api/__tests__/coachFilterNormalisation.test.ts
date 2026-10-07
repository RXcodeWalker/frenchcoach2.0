// @vitest-environment jsdom
//
// Learn Batch 4 (D9): the coach filters run at normalisation, so an error the
// filter drops never reaches belief evidence — not just the cards. Drives the
// real getAIFeedback → normalizeBackendFeedback path with a mocked /v3 reply,
// then projects evidence with the same bridge Learn uses.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn(), refreshSession: vi.fn() } },
  supabaseConfigured: true,
}));

import { supabase } from '../../../lib/supabase';
import { getAIFeedback } from '../apiClient';
import { buildEvidence } from '../../coach/evidenceProjection';
import type { Question } from '../../../types';

const QUESTION = {
  id: 'q-filter',
  text: 'Qu’as-tu fait le week-end dernier ?',
  topicKey: 'hobbies',
  difficulty: 'intermediate',
  modelAnswer: '',
  keyVocab: [],
} as unknown as Question;

const TRANSCRIPT = "Samedi je suis allé au cinéma avec mes amis et j'ai acheté des chose. Mon mère était contente.";

function backendReply(transcriptEcho: string) {
  const corrections = [
    { id: 'gender', severity: 'major', quote: 'Mon mère', correction: 'Ma mère', explanation: 'Mère is feminine.' },
    // Spelling only: "des chose" and "des choses" sound the same.
    { id: 'plural', severity: 'minor', quote: 'des chose', correction: 'des choses', explanation: 'Plural.' },
    // Not in the transcript at all.
    { id: 'ghost', severity: 'major', quote: 'je suis allée', correction: 'je suis allé', explanation: 'x' },
  ];
  return {
    schemaVersion: 2,
    transcript: transcriptEcho,
    scores: { comm: 6, know: 6, acc: 5 },
    fluency: 6,
    cefrLevel: 'A2',
    grammar: { critical: [], polish: [] },
    corrections,
    quoteSpans: [],
    best_moment: 'Your « avec mes amis » says who you were with.',
    improved_answer: 'Samedi, je suis allé au cinéma avec mes amis et j’ai acheté des choses. Ma mère était contente.',
    advanced_answer: '',
    wordCount: 17,
  };
}

function mockBackend(reply: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => reply }));
}

describe('coach filters at normalisation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as never);
  });

  it('a spoken Learn answer keeps the real error and drops the spelling-only and ungrounded ones', async () => {
    mockBackend(backendReply(TRANSCRIPT));
    const fb = await getAIFeedback(TRANSCRIPT, QUESTION, undefined, undefined, 'groq', 'intermediate', 'speech');
    expect(fb.engineMeta?.actualEngine).not.toBe('offline');
    expect(fb.issues?.map((i) => i.id)).toEqual(['gender']);
    expect(fb.best_moment).toContain('avec mes amis');
  });

  it('a dropped error never reaches belief evidence', async () => {
    mockBackend(backendReply(TRANSCRIPT));
    const fb = await getAIFeedback(TRANSCRIPT, QUESTION, undefined, undefined, 'groq', 'intermediate', 'speech');
    const events = buildEvidence({
      sessionId: 's1', question: QUESTION, feedback: fb, avoidanceSignals: [],
      transcript: TRANSCRIPT, finalScore: fb.scores.overall, mode: 'learn', topicKey: 'hobbies',
    });
    const language = events.find((e) => e.evidenceType === 'language')!;
    expect(language.observation.issueIds).toEqual(['gender']);
    expect(language.result.issueCount).toBe(1);
  });

  it('an unknown input mode keeps the spelling-only error (other screens)', async () => {
    mockBackend(backendReply(TRANSCRIPT));
    const fb = await getAIFeedback(TRANSCRIPT, QUESTION, undefined, undefined, 'groq', 'intermediate');
    expect(fb.issues?.map((i) => i.id)).toEqual(['gender', 'plural']);
  });

  it('grounds against the transcript the backend graded, not only the one sent', async () => {
    // Audio requests are transcribed server-side: the backend echoes what it graded.
    const serverTranscript = 'Samedi je suis allée au cinéma avec mes amis.';
    const reply = {
      ...backendReply(serverTranscript),
      corrections: [],
      grammar: {
        critical: [{ id: 'agr', themeLabel: 'Agreement', msg: '« je suis allée »', correction: 'je suis allé', severity: 'major', quote: 'je suis allée' }],
        polish: [],
      },
    };
    mockBackend(reply);
    const fb = await getAIFeedback(TRANSCRIPT, QUESTION, undefined, undefined, 'groq', 'intermediate', 'speech');
    expect(fb.grammar.critical).toHaveLength(1);
  });
});
