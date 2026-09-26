/**
 * E2E-only fake scoring service. Mirrors server/index.ts's HTTP contract
 * (GET /health, POST /score, GET /score?sessionId=) so the frontend's
 * scoringApiClient.ts talks to it unmodified, but:
 *   - skips auth entirely (accepts any/no bearer token) — no Supabase needed
 *   - stores transcripts/envelopes in memory, not Supabase
 *   - injects a fake Judge (via the same createJudge seam scoreAttempt.ts
 *     already takes as a dependency) that returns a fixed, schema-valid
 *     top-band assessment instead of calling Gemini/Groq
 *
 * Runs the REAL production pipeline otherwise: parseSessionTranscript ->
 * resolveAndVerifyQuestionSet -> scoreAttempt (evidence -> judge -> guardrails
 * -> envelope) -> buildEnvelopeView. Only the judge and the persistence/auth
 * layers are faked. Never imported by server/index.ts or referenced by
 * render.yaml — start it directly (`tsx scripts/e2e/fakeScoringServer.ts`)
 * for local/E2E use only.
 */

import cors from 'cors';
import express from 'express';
import type { Request, Response } from 'express';

import { parseSessionTranscript, SessionTranscriptValidationError } from '../../src/domain/igcse/stt/schema';
import type { SessionTranscript } from '../../src/domain/igcse/stt/types';
import type { TranscriptStore } from '../../src/domain/igcse/stt/ports';
import { toSpeakingTranscript } from '../../src/domain/igcse/stt/project/toSpeakingTranscript';
import type { SpeakingTranscript } from '../../src/domain/igcse/judgement/types';
import type { JudgeOutput } from '../../src/domain/igcse/judgement/schema';
import { buildRolePlayTaskCorpora } from '../../src/domain/igcse/judgement/schema';
import { RP_MARK_2, COMM_13_15, QOL_13_15 } from '../../src/domain/igcse/canonical';
import { buildEnvelopeView } from '../../src/domain/igcse/envelope/envelopeView';
import type { ScoringEnvelope } from '../../src/domain/igcse/envelope/types';
import { scoreAttempt } from '../../scripts/scoring/scoreAttempt';
import { resolveAndVerifyQuestionSet, QuestionSetNotFoundError, QuestionSetHashMismatchError } from '../../server/resolveQuestionSet';

const PORT = process.env.FAKE_SCORING_PORT ? Number(process.env.FAKE_SCORING_PORT) : 4100;

// ── In-memory stores (test-only) ──────────────────────────────────────────────

const transcripts = new Map<string, SessionTranscript>();
const envelopes = new Map<string, ScoringEnvelope>();

const transcriptStore: TranscriptStore = {
  async save(t) {
    transcripts.set(t.sessionId, t);
  },
  async load(sessionId) {
    const t = transcripts.get(sessionId);
    if (!t) throw new Error(`fakeScoringServer: no transcript stored for session "${sessionId}"`);
    return t;
  },
  async list() {
    return [...transcripts.keys()];
  },
};

/** First `n` whitespace-delimited words of `text`, trimmed — a safe, always-grounded quote. */
function firstWords(text: string, n: number): string {
  return text.trim().split(/\s+/).filter(Boolean).slice(0, n).join(' ');
}

/**
 * Fixed valid top-band JudgeOutput, built from the REAL transcript's task ids
 * and candidate text so every evidence span is genuinely grounded (never
 * fabricated quotes) — only the *marks* are fixed, not the traceability.
 * A silent role-play task (no words at all) is scored 0 with no spans, since
 * the schema forbids a non-zero mark with an empty evidenceSpans.
 */
function buildFixedJudgeOutput(transcript: SpeakingTranscript): JudgeOutput {
  const taskCorpora = buildRolePlayTaskCorpora(transcript);

  const tasks = transcript.rolePlay.map((t) => {
    const corpus = taskCorpora.get(t.taskId) ?? '';
    const quote = firstWords(corpus, 4);
    if (quote.length === 0) {
      return { taskId: t.taskId, mark: 0 as const, descriptorApplied: 'No creditable response.', evidenceSpans: [] };
    }
    return {
      taskId: t.taskId,
      mark: 2 as const,
      descriptorApplied: RP_MARK_2[0],
      evidenceSpans: [{ source: 'rolePlay' as const, quote }],
    };
  });

  const topic1 = transcript.topicConversations.find((c) => c.conversationId === 'topic1')!;
  const topic2 = transcript.topicConversations.find((c) => c.conversationId === 'topic2')!;
  const topic1Quote = firstWords(topic1.turns.find((t) => t.candidateResponse.trim())?.candidateResponse ?? '', 5);
  const topic2Quote = firstWords(topic2.turns.find((t) => t.candidateResponse.trim())?.candidateResponse ?? '', 5);
  const evidenceSpans = [
    ...(topic1Quote ? [{ source: 'topic1' as const, quote: topic1Quote }] : []),
    ...(topic2Quote ? [{ source: 'topic2' as const, quote: topic2Quote }] : []),
  ];
  // Schema requires at least one grounded span per band — fall back to a role
  // play quote on an all-silent topic conversation (shouldn't happen in the
  // E2E script, but keeps this generator total rather than throwing).
  const safeSpans = evidenceSpans.length > 0 ? evidenceSpans : [{ source: 'rolePlay' as const, quote: firstWords(transcript.rolePlay[0].candidateResponse, 2) }];

  const band = { min: 13, max: 15, label: 'Very good' as const };
  return {
    rolePlay: { tasks },
    communication: {
      mark: 15,
      band,
      bestFitPlacement: 'convincingly',
      descriptorsApplied: [...COMM_13_15],
      justification: '[fake-fixed-judge] Fixed top-band mark for E2E verification — not a real assessment.',
      evidenceSpans: safeSpans,
    },
    qualityOfLanguage: {
      mark: 15,
      band,
      bestFitPlacement: 'convincingly',
      descriptorsApplied: [...QOL_13_15],
      justification: '[fake-fixed-judge] Fixed top-band mark for E2E verification — not a real assessment.',
      evidenceSpans: safeSpans,
    },
  };
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '5mb' }));

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, providers: { gemini: 'not_configured', groq: 'not_configured' }, fake: true });
});

app.post('/score', async (req: Request, res: Response) => {
  let transcript: SessionTranscript;
  try {
    transcript = parseSessionTranscript(req.body);
  } catch (err) {
    const message = err instanceof SessionTranscriptValidationError ? err.message : 'invalid transcript';
    res.status(400).json({ error: message });
    return;
  }

  if (transcript.contentProvenance !== 'original-practice') {
    res.status(403).json({ error: 'contentProvenance must be original-practice' });
    return;
  }

  const existing = envelopes.get(transcript.sessionId);
  if (existing) {
    res.status(200).json(buildEnvelopeView(existing));
    return;
  }

  let questionSet;
  try {
    questionSet = await resolveAndVerifyQuestionSet(transcript.questionSetId, transcript.questionSetHash);
  } catch (err) {
    if (err instanceof QuestionSetHashMismatchError) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err instanceof QuestionSetNotFoundError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }

  try {
    await transcriptStore.save(transcript);
    const speaking = toSpeakingTranscript(transcript, questionSet);
    const fixedOutput = buildFixedJudgeOutput(speaking);

    const envelope = await scoreAttempt(
      {
        transcriptStore,
        createJudge: () => ({
          judge: async () => ({ raw: JSON.stringify(fixedOutput) }),
          getLastCallMetadata: () => ({ provider: 'gemini', model: 'e2e-fake-fixed-judge' }),
        }),
      },
      { sessionId: transcript.sessionId, questionSet },
    );

    envelopes.set(transcript.sessionId, envelope);
    res.status(200).json(buildEnvelopeView(envelope));
  } catch (err) {
    console.error('[fakeScoringServer] /score failed:', err instanceof Error ? err.stack ?? err.message : err);
    res.status(500).json({ error: 'scoring failed', code: 'internal' });
  }
});

app.get('/score', (req: Request, res: Response) => {
  const sessionId = req.query.sessionId;
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    res.status(400).json({ error: 'sessionId query param is required' });
    return;
  }
  const envelope = envelopes.get(sessionId);
  if (envelope) {
    res.status(200).json(buildEnvelopeView(envelope));
    return;
  }
  res.status(404).json({ error: 'no envelope for this sessionId' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[fakeScoringServer] listening on http://127.0.0.1:${PORT} (E2E only, fixed fake judge, no auth)`);
});
