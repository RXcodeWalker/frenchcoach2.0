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
 */

import { normalizeToWav16kMono, AudioTooShortError } from '../audioNormalizer';
import { PronunciationAssessmentSchema } from '../../../services/pronunciation/pronunciationSchema';
import type { PronunciationAssessor } from '../ports';
import type { PronunciationAssessment } from '../types';

export function createHttpPronunciationProvider(apiBase: string): PronunciationAssessor {
  return async ({ audioBlob, targetText, mode = 'scripted' }) => {
    let uploadBlob = audioBlob;
    let uploadFilename = 'recording.webm';
    try {
      const normalized = await normalizeToWav16kMono(audioBlob);
      uploadBlob = normalized.blob;
      uploadFilename = 'recording.wav';
    } catch (err) {
      if (err instanceof AudioTooShortError) throw err;
      console.warn('Audio normalization failed, uploading original blob:', err);
    }

    const formData = new FormData();
    formData.append('audio', uploadBlob, uploadFilename);
    formData.append('target_text', targetText);
    formData.append('mode', mode);

    const res = await fetch(`${apiBase}/api/pronunciation`, {
      method: 'POST',
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
