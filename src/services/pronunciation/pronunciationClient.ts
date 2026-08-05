/**
 * The one function every screen calls for pronunciation assessment. Wraps
 * the HTTP provider with a timeout and telemetry.
 *
 * On failure, THROWS — never fabricates a score, consistent with this
 * codebase's "never invent a number" rule (NoScoreInFeedbackError precedent
 * in apiClient.ts).
 *
 * No client-side multi-engine fallback chain here (unlike getAIFeedback's
 * gemini->groq->offline): the Azure->Whisper-heuristic fallback already
 * happens inside the one backend call, so there's only one client-visible
 * tier — building ENGINE_TIMEOUT_MS-style machinery would be unused
 * complexity for a single call site.
 */

import { createHttpPronunciationProvider } from '../../domain/pronunciation/providers/httpProvider';
import type { PronunciationAssessment } from '../../domain/pronunciation/types';
import { track } from '../telemetry/telemetryService';

// Prod: same-origin '/api/*' proxied to the backend by Vercel (see vercel.json).
// Dev: call the backend directly.
const API_BASE = import.meta.env.PROD
  ? ''
  : ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000');

const ASSESS_TIMEOUT_MS = 25_000;

const provider = createHttpPronunciationProvider(API_BASE);

export interface AssessPronunciationArgs {
  audioBlob: Blob;
  targetText: string;
  /** Screen identifier for telemetry, e.g. 'pronunciation_lab' | 'accent_analyzer'. */
  source: string;
  /**
   * 'scripted' (default): targetText is a real reference sentence (drills,
   * Say-It-Again). 'freeform': open-ended answers with no fixed target —
   * the backend substitutes its own transcript as the reference. See
   * PronunciationAssessmentRequest.mode for the full contract.
   */
  mode?: 'scripted' | 'freeform';
}

export async function assessPronunciation({
  audioBlob,
  targetText,
  source,
  mode = 'scripted',
}: AssessPronunciationArgs): Promise<PronunciationAssessment> {
  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ASSESS_TIMEOUT_MS);

  try {
    const result = await Promise.race([
      provider({ audioBlob, targetText, languageCode: 'fr-FR', mode }),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () =>
          reject(new Error('Pronunciation assessment timed out')),
        );
      }),
    ]);

    track({
      name: 'pronunciation_assessed',
      props: {
        source,
        provider: result.provider,
        score: result.score,
        couldNotAssess: result.couldNotAssess,
        latency_ms: Math.round(performance.now() - start),
      },
    });

    return result;
  } catch (err) {
    track({
      name: 'pronunciation_assessment_failed',
      props: { source, reason: err instanceof Error ? err.message : String(err) },
    });
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
