/**
 * Judge implementation wrapping the Google Gemini SDK (@google/genai).
 * Primary production provider as of the Gemini swap — see
 * docs/architecture/verification-log.md. Does NOT widen the Judge port
 * ((req) => Promise<{raw: string}>) — captures per-call metadata (model,
 * responseId) in a closure exposed via getLastCallMetadata(), read by
 * scoreAttempt after scoreSpeaking resolves.
 *
 * Model: gemini-2.5-flash-lite. No effort/thinking knobs — those are
 * Anthropic-specific concepts with no Gemini equivalent, so LlmProvenance
 * leaves them undefined rather than fabricating a value.
 *
 * createGeminiJudge() MUST be called as a fresh factory invocation per
 * attempt, never memoized/shared across attempts — mirrors the prior
 * anthropicJudge.ts constraint to avoid concurrent-call metadata bleed.
 */

import { GoogleGenAI } from '@google/genai';
import type { Judge, JudgeRequest, JudgeResponse } from '../../../src/domain/igcse/judgement/types';

export interface GeminiJudgeCallMetadata {
  model: string;
  responseId?: string;
}

export interface GeminiClientLike {
  models: {
    generateContent: (params: { model: string; contents: string }) => Promise<{
      text?: string;
      responseId?: string;
    }>;
  };
}

export interface GeminiJudgeOptions {
  apiKey?: string;
  model?: string;
  client?: GeminiClientLike;
}

const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

/**
 * Fresh-per-attempt factory. Call once per scoring attempt; never share the
 * returned { judge, getLastCallMetadata } pair across concurrent attempts.
 */
export function createGeminiJudge(options: GeminiJudgeOptions = {}): {
  judge: Judge;
  getLastCallMetadata: () => GeminiJudgeCallMetadata | undefined;
} {
  const model = options.model ?? DEFAULT_MODEL;
  const client: GeminiClientLike = options.client ?? new GoogleGenAI({ apiKey: options.apiKey });

  let lastCallMetadata: GeminiJudgeCallMetadata | undefined;

  const judge: Judge = async (req: JudgeRequest): Promise<JudgeResponse> => {
    const response = await client.models.generateContent({
      model,
      contents: req.prompt,
    });

    lastCallMetadata = {
      model,
      ...(response.responseId !== undefined ? { responseId: response.responseId } : {}),
    };

    if (!response.text) {
      throw new Error('GeminiJudge: response contained no text');
    }

    return { raw: response.text };
  };

  return {
    judge,
    getLastCallMetadata: () => lastCallMetadata,
  };
}
