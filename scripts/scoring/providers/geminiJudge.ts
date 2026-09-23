/**
 * Judge implementation wrapping the Google Gemini SDK (@google/genai).
 * Primary production provider (see groqJudge.ts for the automatic-fallback
 * provider and judgeFactory.ts for the failover policy — the original
 * rationale for choosing Gemini as primary was never recorded anywhere
 * that survives). Does NOT widen the Judge port
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
    generateContent: (params: {
      model: string;
      contents: string;
      config?: { maxOutputTokens?: number; responseMimeType?: string; httpOptions?: { timeout?: number } };
    }) => Promise<{
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

const DEFAULT_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash-lite';

/**
 * Reliability plan §2.5: sized near gemini-2.5-flash-lite's actual maximum
 * safe output ceiling (published as 65536), not "expected" response length —
 * JudgeResponse.raw is a full multi-KB structured JSON payload and a
 * schema-validation failure from truncation gets only scoreAttempt.ts's one
 * retry, and is terminal after that (see judgeFactory.ts). Re-verify this ceiling against Gemini's current docs
 * if the model id in GEMINI_MODEL ever changes.
 */
const MAX_OUTPUT_TOKENS = 65536;

/** Request timeout, ms — leaves headroom under submitForScoring's 90s client ceiling. */
const REQUEST_TIMEOUT_MS = 60_000;

/**
 * JSON mode: without it the model may wrap its reply in a ```json fence,
 * which scoreSpeaking's JSON.parse rejected as a terminal
 * JudgementValidationError. scoreSpeaking also strips one fence as a second
 * line of defence (Groq has no equivalent knob on this call).
 */
const RESPONSE_MIME_TYPE = 'application/json';

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
      config: {
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        responseMimeType: RESPONSE_MIME_TYPE,
        httpOptions: { timeout: REQUEST_TIMEOUT_MS },
      },
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
