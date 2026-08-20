/**
 * Real PronunciationAssessor implementation. `createXProvider(options): PortType`
 * is the established factory shape in this codebase (see
 * createWhisperXProvider in scripts/stt/whisperXProvider.ts) — not a new
 * pattern being introduced here.
 *
 * Never calls Azure directly — the Azure key stays server-side. This POSTs
 * to the backend's /api/pronunciation, which owns the Azure/Whisper-heuristic
 * fallback chain.
 *
 * Normalizes the recorded blob to 16kHz mono WAV before upload (fixes
 * defect #1 — Azure's REST endpoint rejects webm/opus and mp4/aac, which is
 * what MediaRecorder actually produces in Chrome/Safari). A too-short clip
 * (AudioTooShortError) throws immediately — no Azure call is worth spending
 * on audio the normalizer itself judged unassessable. Any other
 * normalization failure (decode failure, AudioTooLongError — chunking is
 * not implemented until accent-analyzer plan Phase 1) degrades to uploading
 * the original blob unchanged rather than blocking the request; the
 * backend's Content-Type-by-extension mapping still applies, just without
 * the guaranteed-WAV fix. This mirrors the codebase's established "never
 * hard-fail on a best-effort step" pattern (see
 * services/pronunciation/fallback.py).
 *
 * The one exception to that degrade rule is audio Azure cannot actually read
 * (see AZURE_ASSESSABLE_MIME below): there, uploading anyway is not a
 * best-effort fallback but a way to manufacture a wrong result, so the
 * assessment is reported as unavailable instead.
 *
 * `getAuthToken` (Phase 4 — Shadowing Mode) is called ONLY when
 * `coaching === 'full'`, so the fast (drill/Learn/SayItAgainCard) path gains
 * zero extra awaits. A null token is not an error — the backend degrades to
 * an 'unauthenticated' coachingQuota rather than failing the assessment.
 */

import { normalizeToWav16kMono, AudioTooShortError } from '../audioNormalizer';
import { PronunciationAssessmentSchema } from '../../../services/pronunciation/pronunciationSchema';
import type { PronunciationAssessor } from '../ports';
import type { PronunciationAssessment } from '../types';

/**
 * Content-Types Azure's REST short-audio endpoint actually accepts, mirroring
 * azure_client.py's _CONTENT_TYPE_BY_EXTENSION. Everything else — notably the
 * audio/webm;codecs=opus Chrome records — is not merely suboptimal: Azure
 * parses it just far enough to return a confident, wrong assessment, marking
 * correctly-spoken words as mispronounced and reporting a low score for them.
 * A wrong assessment is worse than no assessment for a learner, so raw audio
 * in any other format is never uploaded.
 */
const AZURE_ASSESSABLE_MIME = new Set(['audio/wav', 'audio/wave', 'audio/x-wav', 'audio/ogg']);

/** The type without its codecs/rate parameters, e.g. 'audio/ogg;codecs=opus' -> 'audio/ogg'. */
function mimeEssence(blob: Blob): string {
  return blob.type.split(';')[0].trim().toLowerCase();
}

function isAzureAssessable(blob: Blob): boolean {
  return AZURE_ASSESSABLE_MIME.has(mimeEssence(blob));
}

/** Extension the backend maps back to an Azure-accepted Content-Type (azure_client.py). */
function uploadFilenameFor(blob: Blob): string {
  return mimeEssence(blob) === 'audio/ogg' ? 'recording.ogg' : 'recording.wav';
}

export function createHttpPronunciationProvider(
  apiBase: string,
  getAuthToken?: () => Promise<string | null>,
): PronunciationAssessor {
  return async ({ audioBlob, targetText, mode = 'scripted', coaching = 'none', coachingRequestId }) => {
    let uploadBlob = audioBlob;
    let uploadFilename = 'recording.wav';
    try {
      const normalized = await normalizeToWav16kMono(audioBlob);
      uploadBlob = normalized.blob;
      uploadFilename = 'recording.wav';
    } catch (err) {
      if (err instanceof AudioTooShortError) throw err;
      // Degrading to the original blob is only safe when Azure can read it.
      // For anything else (the usual webm/opus) the request would come back
      // scored — and wrong — so fail instead and let the caller report the
      // assessment as unavailable.
      if (!isAzureAssessable(audioBlob)) throw err;
      console.warn('Audio normalization failed, uploading original blob:', err);
      uploadFilename = uploadFilenameFor(audioBlob);
    }

    const formData = new FormData();
    formData.append('audio', uploadBlob, uploadFilename);
    formData.append('target_text', targetText);
    formData.append('mode', mode);
    formData.append('coaching', coaching);
    if (coachingRequestId) formData.append('coaching_request_id', coachingRequestId);

    const headers: Record<string, string> = {};
    if (coaching === 'full' && getAuthToken) {
      const token = await getAuthToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${apiBase}/api/pronunciation`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) throw new Error(`API pronunciation → ${res.status}`);

    const raw: unknown = await res.json();
    const parsed = PronunciationAssessmentSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Pronunciation assessment response failed validation: ${parsed.error.message}`);
    }
    return parsed.data as PronunciationAssessment;
  };
}
