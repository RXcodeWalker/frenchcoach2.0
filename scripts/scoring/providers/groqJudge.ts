/**
 * Judge implementation wrapping the Groq SDK (groq-sdk). Automatic fallback
 * provider — only invoked when the primary Gemini judge fails on a genuine
 * request failure (network, timeout, provider unavailable, rate limit). See
 * judgeFactory.ts for the failover policy. (The rationale for the Gemini/Groq
 * provider split was never recorded in verification-log.md despite an old
 * comment here claiming otherwise — this is the only surviving documentation
 * of the split.)
 *
 * Model: openai/gpt-oss-120b by default (see DEFAULT_MODEL), a reasoning
 * model — hence reasoning_effort + a token reserve below, mirroring
 * french-coach-backend's main.py. LlmProvenance still leaves effort/thinking
 * undefined; those fields describe the envelope's provenance, not this knob.
 *
 * createGroqJudge() MUST be called as a fresh factory invocation per attempt,
 * never memoized/shared across attempts — mirrors the prior anthropicJudge.ts
 * constraint to avoid concurrent-call metadata bleed.
 */

import Groq from 'groq-sdk';
import type { Judge, JudgeRequest, JudgeResponse } from '../../../src/domain/igcse/judgement/types';

export interface GroqJudgeCallMetadata {
  model: string;
  responseId?: string;
}

export interface GroqClientLike {
  chat: {
    completions: {
      create: (
        params: {
          model: string;
          messages: Array<{ role: 'user'; content: string }>;
          max_completion_tokens?: number;
          reasoning_effort?: 'low' | 'medium' | 'high';
        },
        options?: { timeout?: number },
      ) => Promise<{
        id?: string;
        choices: Array<{ message: { content: string | null } }>;
      }>;
    };
  };
}

export interface GroqJudgeOptions {
  apiKey?: string;
  model?: string;
  client?: GroqClientLike;
}

/**
 * Groq retired the Llama chat line: llama-3.3-70b-versatile now 404s with
 * model_not_found (french-coach-backend main.py records the same), which
 * silently killed this fallback wherever GROQ_MODEL was unset.
 * openai/gpt-oss-120b is the current general-purpose chat model — keep this
 * literal in step with server/index.ts's /health default and main.py's.
 */
const DEFAULT_MODEL = process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b';

/**
 * gpt-oss is a reasoning model: it spends completion tokens thinking before it
 * answers. "low" keeps that short; its reasoning arrives in a separate field,
 * so `content` stays pure JSON. Set GROQ_REASONING_EFFORT="" if GROQ_MODEL is
 * pointed at a non-reasoning model, which would reject the parameter.
 */
const REASONING_EFFORT_RAW = (process.env.GROQ_REASONING_EFFORT ?? 'low').trim();
const REASONING_EFFORT: 'low' | 'medium' | 'high' | undefined =
  REASONING_EFFORT_RAW === 'low' || REASONING_EFFORT_RAW === 'medium' || REASONING_EFFORT_RAW === 'high'
    ? REASONING_EFFORT_RAW
    : undefined;

/**
 * Reasoning tokens come out of the same max_completion_tokens budget as the
 * answer, so the answer budget is topped up by this much whenever a reasoning
 * effort is sent. Same default (512) and env name as main.py.
 */
const REASONING_TOKEN_RESERVE = Number(process.env.GROQ_REASONING_TOKEN_RESERVE ?? '512') || 0;

/**
 * Reliability plan §2.5: the answer budget, not "expected" response length —
 * JudgeResponse.raw is a full multi-KB structured JSON payload and a
 * truncated reply fails JudgementValidationError. Originally sized to
 * llama-3.3-70b-versatile's 32768 ceiling; openai/gpt-oss-120b's published
 * ceiling (65536) comfortably holds this plus the reasoning reserve.
 * Re-verify against Groq's current docs if GROQ_MODEL ever changes.
 */
const MAX_COMPLETION_TOKENS = 32768;

/** Request timeout, ms — leaves headroom under submitForScoring's 90s client ceiling. */
const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Fresh-per-attempt factory. Call once per scoring attempt; never share the
 * returned { judge, getLastCallMetadata } pair across concurrent attempts.
 */
export function createGroqJudge(options: GroqJudgeOptions = {}): {
  judge: Judge;
  getLastCallMetadata: () => GroqJudgeCallMetadata | undefined;
} {
  const model = options.model ?? DEFAULT_MODEL;
  const client: GroqClientLike = options.client ?? new Groq({ apiKey: options.apiKey });

  let lastCallMetadata: GroqJudgeCallMetadata | undefined;

  const judge: Judge = async (req: JudgeRequest): Promise<JudgeResponse> => {
    const response = await client.chat.completions.create(
      {
        model,
        messages: [{ role: 'user', content: req.prompt }],
        max_completion_tokens: MAX_COMPLETION_TOKENS + (REASONING_EFFORT ? REASONING_TOKEN_RESERVE : 0),
        ...(REASONING_EFFORT ? { reasoning_effort: REASONING_EFFORT } : {}),
      },
      { timeout: REQUEST_TIMEOUT_MS },
    );

    lastCallMetadata = {
      model,
      ...(response.id !== undefined ? { responseId: response.id } : {}),
    };

    const content = response.choices[0]?.message.content;
    if (!content) {
      throw new Error('GroqJudge: response contained no message content');
    }

    return { raw: content };
  };

  return {
    judge,
    getLastCallMetadata: () => lastCallMetadata,
  };
}
