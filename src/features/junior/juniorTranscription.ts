/**
 * The Junior Whisper path (junior-track §2, Batch 4): one recorded turn to
 * /api/transcribe with `purpose: 'junior'` (its own `junior_transcribe` quota).
 *
 * No prompt is sent. Learn passes the question as context; Junior does not,
 * because the kid built the answer from pictures on screen and any context
 * nudges Whisper toward the expected sentence — a dishonest "got it".
 *
 * Any failure (sign-in limit, consent, quota, timeout, provider down) or a
 * suspect result (Whisper inventing text on silence, looping) returns null and
 * the caller keeps Web Speech's transcript: a recogniser problem never blocks a
 * turn, and the turn flow already handles "nothing heard".
 */
import { suspectTranscription } from '../../domain/transcription/suspectTranscription';
import { transcribeAudio, type TranscribeAudioResult } from '../../services/api/apiClient';

/**
 * A kid won't wait long after speaking. UNVALIDATED: a starting point, tuned at
 * the playtest with the other Junior mic constants.
 */
export const JUNIOR_TRANSCRIBE_TIMEOUT_MS = 6000;

export type JuniorTranscribe = (
  audio: Blob,
  language: string,
  options: Parameters<typeof transcribeAudio>[2],
) => Promise<TranscribeAudioResult>;

/** Whisper's reading of one turn, or null when it gave nothing usable. */
export async function transcribeJuniorTurn(audio: Blob | null, transcribe: JuniorTranscribe = transcribeAudio): Promise<string | null> {
  if (!audio) return null;
  let result: TranscribeAudioResult;
  try {
    result = await transcribe(audio, 'fr', { purpose: 'junior', timeoutMs: JUNIOR_TRANSCRIBE_TIMEOUT_MS });
  } catch {
    return null;
  }
  if (result.source === 'transcription-unavailable') return null;
  const text = result.text.trim();
  if (!text || suspectTranscription(text, result.segments)) return null;
  return text;
}
