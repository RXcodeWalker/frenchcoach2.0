/**
 * Judge implementation wrapping the Groq SDK (groq-sdk). Automatic fallback
 * provider — only invoked when the primary Gemini judge fails on a genuine
 * request failure (network, timeout, provider unavailable, rate limit). See
 * judgeFactory.ts for the failover policy. (The rationale for the Gemini/Groq
 * provider split was never recorded in verification-log.md despite an old
 * comment here claiming otherwise — this is the only surviving documentation
 * of the split.)
 *
 * Model: a Groq-hosted Llama model (see DEFAULT_MODEL). No effort/thinking
 * knobs — Anthropic-specific concepts with no Groq equivalent, so
 * LlmProvenance leaves them undefined rather than fabricating a value.
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
        params: { model: string; messages: Array<{ role: 'user'; content: string }>; max_completion_tokens?: number },
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

const DEFAULT_MODEL = process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile';

/**
 * Reliability plan §2.5: sized near llama-3.3-70b-versatile's actual maximum
 * safe output ceiling on Groq (published as 32768), not "expected" response
 * length — JudgeResponse.raw is a full multi-KB structured JSON payload and a
 * schema-validation failure from truncation is a terminal, non-retried error
 * (see judgeFactory.ts). Re-verify this ceiling against Groq's current docs
 * if the model id in GROQ_MODEL ever changes.
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
        max_completion_tokens: MAX_COMPLETION_TOKENS,
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
