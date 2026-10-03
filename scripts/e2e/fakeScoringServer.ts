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
 * layers are faked.
 *
 * Phase 3 Batch A: also mirrors POST/GET /feedback (server/feedbackRoute.ts).
 * The REAL generateExamFeedback + validation run against the stored envelope;
 * only the model reply is faked (built from the envelope's own transcript, so
 * every quote is grounded). The fake judge lists one grounded QoL error so the
 * report has a mistake to classify — fake only, never in the real judge. Never imported by server/index.ts or referenced by
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
import type { QualityOfLanguageOutput, RolePlayCommunicationOutput } from '../../src/domain/igcse/judgement/schema';
import { buildRolePlayTaskCorpora } from '../../src/domain/igcse/judgement/schema';
import { RP_MARK_2, COMM_13_15, QOL_13_15 } from '../../src/domain/igcse/canonical';
import { buildEnvelopeView } from '../../src/domain/igcse/envelope/envelopeView';
import type { ScoringEnvelope } from '../../src/domain/igcse/envelope/types';
import { scoreAttempt } from '../../scripts/scoring/scoreAttempt';
import { resolveAndVerifyQuestionSet, QuestionSetNotFoundError, QuestionSetHashMismatchError } from '../../server/resolveQuestionSet';
import { generateExamFeedback } from '../../src/domain/examFeedback/generate';
import { buildTurnCorpora, targetDescriptorsFor } from '../../src/domain/examFeedback/prompt';
import type { ExamFeedbackReport } from '../../src/domain/examFeedback/types';

const PORT = process.env.FAKE_SCORING_PORT ? Number(process.env.FAKE_SCORING_PORT) : 4100;

// ── In-memory stores (test-only) ──────────────────────────────────────────────

const transcripts = new Map<string, SessionTranscript>();
const envelopes = new Map<string, ScoringEnvelope>();
const feedbackReports = new Map<string, ExamFeedbackReport>();

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

/** Last `n` whitespace-delimited words of `text` — grounded, and clear of a firstWords() quote on a long answer. */
function lastWords(text: string, n: number): string {
  return text.trim().split(/\s+/).filter(Boolean).slice(-n).join(' ');
}

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/**
 * Fixed valid top-band replies to both L2 calls (scoring-prompt-v0.6), built from the REAL transcript's task ids
 * and candidate text so every evidence span is genuinely grounded (never
 * fabricated quotes) — only the *marks* are fixed, not the traceability.
 * A silent role-play task (no words at all) is scored 0 with no spans, since
 * the schema forbids a non-zero mark with an empty evidenceSpans.
 */
function buildFixedJudgeOutputs(transcript: SpeakingTranscript): {
  main: RolePlayCommunicationOutput;
  qualityOfLanguage: QualityOfLanguageOutput;
} {
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

  // Phase 3 Batch A (fake only): one grounded QoL error on the longest topic
  // answer, so the post-marking report has a mistake to classify.
  const longestTurn = transcript.topicConversations
    .flatMap((c) => c.turns.map((t) => ({ source: c.conversationId, turn: t })))
    .filter((x) => wordCount(x.turn.candidateResponse) >= 4)
    .sort((a, b) => wordCount(b.turn.candidateResponse) - wordCount(a.turn.candidateResponse))[0];
  const qolErrors = longestTurn
    ? [
        {
          source: longestTurn.source,
          turnId: longestTurn.turn.turnId,
          quote: firstWords(longestTurn.turn.candidateResponse, 3),
          kind: 'grammar' as const,
          correction: `${firstWords(longestTurn.turn.candidateResponse, 3)} [fake correction]`,
        },
      ]
    : [];

  const band = { min: 13, max: 15, label: 'Very good' as const };
  return {
    main: {
      rolePlay: { tasks },
      communication: {
        mark: 15,
        band,
        bestFitPlacement: 'convincingly',
        descriptorsApplied: [...COMM_13_15],
        justification: '[fake-fixed-judge] Fixed top-band mark for E2E verification — not a real assessment.',
        evidenceSpans: safeSpans,
      },
    },
    // QoL may cite topic conversations only, so it gets no role-play fallback:
    // an all-silent topic section cannot validate here (nor with a real judge).
    qualityOfLanguage: {
      errors: qolErrors,
      errorFrequency: qolErrors.length > 0 ? 'occasional errors' : 'no errors',
      mark: 15,
      band,
      bestFitPlacement: 'convincingly',
      descriptorsApplied: [...QOL_13_15],
      justification: '[fake-fixed-judge] Fixed top-band mark for E2E verification — not a real assessment.',
      evidenceSpans,
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
    const fixedOutputs = buildFixedJudgeOutputs(speaking);

    const envelope = await scoreAttempt(
      {
        transcriptStore,
        createJudge: () => ({
          judge: async (req) => ({
            raw: JSON.stringify(req.kind === 'qualityOfLanguage' ? fixedOutputs.qualityOfLanguage : fixedOutputs.main),
          }),
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

/**
 * A fixed, valid model reply for the post-marking report, built from the
 * envelope's own transcript so the real validator accepts it: a task-specific
 * reason per role-play task, one strength per criterion, every QoL error
 * classified, and a next step aimed at the first allowed descriptor.
 */
function buildFakeFeedbackReply(envelope: ScoringEnvelope): string {
  const corpora = buildTurnCorpora(envelope);
  const targets = targetDescriptorsFor(envelope);
  const topicRefs = [...corpora.keys()].filter((ref) => ref.startsWith('topic') && wordCount(corpora.get(ref) ?? '') >= 6);
  const quoteFor = (ref: string) => {
    const text = corpora.get(ref) ?? '';
    return wordCount(text) >= 3 ? lastWords(text, 3) : text.trim();
  };
  const tasks = envelope.rolePlayTasks.map((t) => {
    const text = corpora.get(t.taskId) ?? '';
    return {
      taskId: t.taskId,
      reason: `[fake] For task ${t.taskId} your answer said what the situation needed.`,
      quote: text.trim() === '' ? null : quoteFor(t.taskId),
      error: null,
    };
  });
  const firstSpokenTask = envelope.rolePlayTasks.find((t) => (corpora.get(t.taskId) ?? '').trim() !== '');
  const topicStrength = topicRefs[0]
    ? [{ claim: '[fake] You finished this answer with a complete idea.', quote: quoteFor(topicRefs[0]), ref: topicRefs[0] }]
    : [];
  return JSON.stringify({
    rolePlay: {
      tasks,
      strengths: firstSpokenTask
        ? [{ claim: '[fake] You kept your requests short and clear.', quote: quoteFor(firstSpokenTask.taskId), ref: firstSpokenTask.taskId }]
        : [],
      nextStep: { claim: '[fake] Check every verb in your requests.', quote: null, ref: null, targetDescriptorId: targets.rolePlay[0].id },
    },
    communication: {
      strengths: topicStrength,
      nextStep: { claim: '[fake] Add an example after each opinion.', quote: null, ref: null, targetDescriptorId: targets.communication[0].id },
    },
    qualityOfLanguage: {
      strengths: topicStrength,
      errorCategories: (envelope.qualityOfLanguage.errors ?? []).map((_, errorIndex) => ({ errorIndex, category: 'verb_form' })),
      nextStep: { claim: '[fake] Try one sentence in the future tense.', quote: null, ref: null, targetDescriptorId: targets.qualityOfLanguage[0].id },
    },
  });
}

app.post('/feedback', async (req: Request, res: Response) => {
  const sessionId = (req.body as { sessionId?: unknown } | undefined)?.sessionId;
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }
  const envelope = envelopes.get(sessionId);
  if (!envelope) {
    res.status(404).json({ error: 'no envelope for this sessionId' });
    return;
  }
  const stored = feedbackReports.get(envelope.attemptId);
  if (stored) {
    res.status(200).json({ report: stored });
    return;
  }
  try {
    const report = await generateExamFeedback(envelope, async () => buildFakeFeedbackReply(envelope));
    feedbackReports.set(envelope.attemptId, report);
    res.status(200).json({ report });
  } catch (err) {
    console.error('[fakeScoringServer] /feedback failed:', err instanceof Error ? err.stack ?? err.message : err);
    res.status(500).json({ error: 'feedback failed', code: 'feedback_failed' });
  }
});

app.get('/feedback', (req: Request, res: Response) => {
  const sessionId = req.query.sessionId;
  const envelope = typeof sessionId === 'string' ? envelopes.get(sessionId) : undefined;
  const stored = envelope ? feedbackReports.get(envelope.attemptId) : undefined;
  if (!stored) {
    res.status(404).json({ error: 'no feedback for this sessionId' });
    return;
  }
  res.status(200).json({ report: stored });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[fakeScoringServer] listening on http://127.0.0.1:${PORT} (E2E only, fixed fake judge, no auth)`);
});
