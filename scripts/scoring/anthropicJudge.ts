/**
 * S4 first-ever concrete Judge implementation — wraps the Anthropic SDK.
 * Does NOT widen the Judge port ((req) => Promise<{raw: string}>) — captures
 * per-call metadata (model, effort, responseId) in a closure exposed via
 * getLastCallMetadata(), read by the orchestrator after scoreSpeaking resolves.
 *
 * Model: claude-opus-4-8, thinking: {type: 'adaptive'}, output_config.effort
 * (default 'high'). No temperature/top_p/top_k — current models reject
 * sampling params outright (400); no seed param has ever existed in the
 * Messages API (see verification-log.md S4 entry).
 *
 * createAnthropicJudge() MUST be called as a fresh factory invocation per
 * attempt, never memoized/shared across attempts — a single shared instance
 * across a batch run would let concurrent judge() calls overwrite each
 * other's captured metadata.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Judge, JudgeRequest, JudgeResponse } from '../../src/domain/igcse/judgement/types';

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface AnthropicJudgeCallMetadata {
  model: string;
  effort: Effort;
  responseId?: string;
}

export interface AnthropicJudgeOptions {
  apiKey?: string;
  model?: string;
  effort?: Effort;
  client?: Pick<Anthropic, 'messages'>;
}

const DEFAULT_MODEL = 'claude-opus-4-8';
const DEFAULT_EFFORT: Effort = 'high';

/**
 * Fresh-per-attempt factory. Call once per scoring attempt; never share the
 * returned { judge, getLastCallMetadata } pair across concurrent attempts.
 */
export function createAnthropicJudge(options: AnthropicJudgeOptions = {}): {
  judge: Judge;
  getLastCallMetadata: () => AnthropicJudgeCallMetadata | undefined;
} {
  const model = options.model ?? DEFAULT_MODEL;
  const effort = options.effort ?? DEFAULT_EFFORT;
  const client = options.client ?? new Anthropic({ apiKey: options.apiKey });

  let lastCallMetadata: AnthropicJudgeCallMetadata | undefined;

  const judge: Judge = async (req: JudgeRequest): Promise<JudgeResponse> => {
    const response = await client.messages.create({
      model,
      max_tokens: 8192,
      thinking: { type: 'adaptive' },
      output_config: { effort },
      messages: [{ role: 'user', content: req.prompt }],
    });

    lastCallMetadata = { model, effort, responseId: response.id };

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    if (!textBlock) {
      throw new Error('AnthropicJudge: response contained no text block');
    }

    return { raw: textBlock.text };
  };

  return {
    judge,
    getLastCallMetadata: () => lastCallMetadata,
  };
}
