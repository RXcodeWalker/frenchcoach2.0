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
import { getAccessToken } from '../../lib/authToken';
import { track } from '../telemetry/telemetryService';

// Prod: same-origin '/api/*' proxied to the backend by Vercel (see vercel.json).
// Dev: call the backend directly.
const API_BASE = import.meta.env.PROD
  ? ''
  : ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000');

const ASSESS_TIMEOUT_MS = 25_000;

// Phase 3: /api/pronunciation requires a verified JWT, so this is called on
// every assessment (see httpProvider.ts) and a near-expiry token is refreshed
// rather than sent — src/lib/authToken.ts is the single source for both.
const getAuthToken = getAccessToken;

const provider = createHttpPronunciationProvider(API_BASE, getAuthToken);

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
  /** 'none' (default) or 'full' — see PronunciationAssessmentRequest.coaching. */
  coaching?: 'none' | 'full';
  /** Idempotency key for the coaching quota RPCs. Only meaningful when coaching === 'full'. */
  coachingRequestId?: string;
  /**
   * Reliability plan §2.5: caller-supplied abort signal (e.g. Learn.tsx's
   * pronunciationAbortRef, fired when a new attempt supersedes this one).
   * Previously accepted nowhere in this call chain, so aborting the ref did
   * nothing — this call's own internal ASSESS_TIMEOUT_MS controller was the
   * only thing that could ever cancel the underlying fetch.
   */
  signal?: AbortSignal;
}

export async function assessPronunciation({
  audioBlob,
  targetText,
  source,
  mode = 'scripted',
  coaching = 'none',
  coachingRequestId,
  signal,
}: AssessPronunciationArgs): Promise<PronunciationAssessment> {
  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ASSESS_TIMEOUT_MS);
  // A caller-supplied abort (e.g. a new attempt superseding this one) cancels
  // the same underlying fetch as the internal timeout does.
  const onCallerAbort = () => controller.abort();
  signal?.addEventListener('abort', onCallerAbort);
  if (signal?.aborted) controller.abort();

  try {
    const result = await Promise.race([
      provider({ audioBlob, targetText, languageCode: 'fr-FR', mode, coaching, coachingRequestId, signal: controller.signal }),
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
        coaching,
        coachingGranted: result.coachingQuota?.granted ?? null,
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
    signal?.removeEventListener('abort', onCallerAbort);
  }
}
