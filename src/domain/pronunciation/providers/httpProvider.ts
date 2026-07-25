/**
 * Real PronunciationAssessor implementation. `createXProvider(options): PortType`
 * is the established factory shape in this codebase (see
 * createWhisperXProvider in scripts/stt/whisperXProvider.ts) — not a new
 * pattern being introduced here.
 *
 * Never calls Azure directly — the Azure key stays server-side. This POSTs
 * to the backend's /api/pronunciation, which owns the Azure/Whisper-heuristic
 * fallback chain.
 */

import { PronunciationAssessmentSchema } from '../../../services/pronunciation/pronunciationSchema';
import type { PronunciationAssessor } from '../ports';
import type { PronunciationAssessment } from '../types';

export function createHttpPronunciationProvider(apiBase: string): PronunciationAssessor {
  return async ({ audioBlob, targetText }) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('target_text', targetText);

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
