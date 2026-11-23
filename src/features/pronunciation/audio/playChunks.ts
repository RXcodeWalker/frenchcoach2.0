import { practiceChunks } from '../../../domain/pronunciation/lab/practiceChunks';
import { playNative, type NativePlayResult, type PlayNativeOptions } from './nativeVoice';

/**
 * ▶ Native for a corrected answer that may be several sentences long.
 *
 * Each sentence is played (and, when it has no recording, recorded) on its own,
 * in order — the same pieces `practiceChunks` hands the practice flow. That way
 * "hear the whole answer" and "practise it sentence by sentence" share ONE
 * recording per sentence instead of recording the paragraph once and each of its
 * sentences again (text-to-speech is metered by character).
 *
 * Resolves when the last sentence ends, or as soon as one is stopped or can't be
 * played; the result is the last sentence's.
 */
export async function playNativeChunks(text: string, options: PlayNativeOptions = {}): Promise<NativePlayResult> {
  const chunks = practiceChunks(text);
  const parts = chunks.length > 0 ? chunks : [text.trim()];
  let result: NativePlayResult = 'stopped';
  for (const part of parts) {
    result = await playNative(part, options);
    if (result === 'stopped' || result === 'unavailable') break;
  }
  return result;
}
