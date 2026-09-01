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
      create: (params: { model: string; messages: Array<{ role: 'user'; content: string }> }) => Promise<{
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

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

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
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: req.prompt }],
    });

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
