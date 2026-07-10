/**
 * Judge factory with automatic provider failover: Gemini primary, Groq
 * fallback. Preserves the existing Judge port exactly ((req) =>
 * Promise<{raw: string}>) — scoreSpeaking/scoreAttempt are unaware that more
 * than one provider exists.
 *
 * Failover policy: only fall back to Groq when the Gemini call itself throws
 * (network failure, timeout, provider unavailable, rate limit — i.e. the
 * provider SDK call rejected). A response that comes back successfully but
 * fails JudgementValidationError downstream (bad JSON, ungrounded evidence,
 * schema mismatch) is a low-quality response, NOT a request failure — it is
 * NOT retried and NOT a trigger for fallback, because scoreSpeaking calls the
 * judge before parsing, so this composite judge never even sees that error;
 * it only sees provider-call exceptions raised directly by createGeminiJudge's
 * `judge()` fn (network/timeout/4xx/5xx from the SDK).
 *
 * Only one provider scores a given attempt — never both. The provider
 * actually used (and only that one) is recorded via getLastCallMetadata().
 *
 * createJudge() (whichever variant) MUST be called as a fresh factory
 * invocation per attempt, never memoized/shared — same constraint as each
 * individual provider judge, to avoid concurrent-call metadata bleed.
 */

import type { Judge, JudgeRequest, JudgeResponse } from '../../../src/domain/igcse/judgement/types';
import type { LlmProviderName } from '../../../src/domain/igcse/envelope/types';
import { createGeminiJudge } from './geminiJudge';
import type { GeminiJudgeOptions } from './geminiJudge';
import { createGroqJudge } from './groqJudge';
import type { GroqJudgeOptions } from './groqJudge';

export interface JudgeFactoryCallMetadata {
  provider: LlmProviderName;
  model: string;
  responseId?: string;
}

export interface CreateJudgeWithFallbackOptions {
  gemini?: GeminiJudgeOptions;
  groq?: GroqJudgeOptions;
}

/**
 * Fresh-per-attempt factory: Gemini primary, Groq automatic fallback on a
 * genuine request failure. Never share the returned
 * { judge, getLastCallMetadata } pair across concurrent attempts.
 */
export function createJudgeWithFallback(options: CreateJudgeWithFallbackOptions = {}): {
  judge: Judge;
  getLastCallMetadata: () => JudgeFactoryCallMetadata | undefined;
} {
  const gemini = createGeminiJudge(options.gemini);
  const groq = createGroqJudge(options.groq);

  let lastCallMetadata: JudgeFactoryCallMetadata | undefined;

  const judge: Judge = async (req: JudgeRequest): Promise<JudgeResponse> => {
    try {
      const result = await gemini.judge(req);
      const meta = gemini.getLastCallMetadata();
      lastCallMetadata = {
        provider: 'gemini',
        model: meta?.model ?? 'unknown',
        ...(meta?.responseId !== undefined ? { responseId: meta.responseId } : {}),
      };
      return result;
    } catch (geminiError) {
      try {
        const result = await groq.judge(req);
        const meta = groq.getLastCallMetadata();
        lastCallMetadata = {
          provider: 'groq',
          model: meta?.model ?? 'unknown',
          ...(meta?.responseId !== undefined ? { responseId: meta.responseId } : {}),
        };
        return result;
      } catch (groqError) {
        const geminiMsg = geminiError instanceof Error ? geminiError.message : String(geminiError);
        const groqMsg = groqError instanceof Error ? groqError.message : String(groqError);
        throw new Error(
          `Both judge providers failed. Gemini: ${geminiMsg}. Groq fallback: ${groqMsg}`,
        );
      }
    }
  };

  return {
    judge,
    getLastCallMetadata: () => lastCallMetadata,
  };
}
