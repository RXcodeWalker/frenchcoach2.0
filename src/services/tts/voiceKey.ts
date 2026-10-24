/**
 * voiceKey.ts — where a recorded French line lives (recorded-voices plan §3, §4.1).
 *
 * The recording script (`scripts/tts/recordVoices.ts`) and the app's playback
 * both build an MP3's path from the line's text with this one module. If they
 * ever disagreed, every recording would be silently unused (a 404 falls back
 * to the browser voice and nothing errors), so the format is pinned by a test
 * vector in `__tests__/voiceKey.test.ts`.
 *
 * Pure: no DOM, no `import.meta.env`, so the Node script can import it.
 * Hashing uses `globalThis.crypto.subtle`, which exists in browsers and in
 * Node ≥ 20, so there is one code path.
 */

/** Part of every path and of the hashed input. Bump it ⇒ every line is re-recorded. */
export const VOICE_KEY_VERSION = 'v2';

/**
 * The Azure Neural voices that are recorded. Henri only, by owner decision
 * (2026-10-24: Denise sounded slow and rough). Adding a voice here means a
 * "Record voices" run before the app can play it.
 */
export const RECORDED_VOICES = { henri: 'fr-FR-HenriNeural' } as const;
export type RecordedVoiceId = keyof typeof RECORDED_VOICES;

/** Public Supabase Storage bucket holding `<VOICE_KEY_VERSION>/<voice>/<hash>.mp3`. */
export const TTS_BUCKET = 'tts-audio';

/**
 * The text a key is computed from: NFC, every run of whitespace (tabs,
 * newlines, NBSP, narrow NBSP — JS `\s` covers all of them) as one space,
 * trimmed. Apostrophes and punctuation are deliberately left alone — they
 * change what Azure says, so two lines that differ only there are two
 * recordings.
 */
export function normalizeSpokenText(text: string): string {
  return text.normalize('NFC').replace(/\s+/g, ' ').trim();
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The object path inside `TTS_BUCKET` for this line in this voice. */
export async function voiceObjectPath(text: string, voice: RecordedVoiceId): Promise<string> {
  const hash = await sha256Hex(`${VOICE_KEY_VERSION}|${voice}|${normalizeSpokenText(text)}`);
  return `${VOICE_KEY_VERSION}/${voice}/${hash.slice(0, 32)}.mp3`;
}

/** The public URL of an object path (no auth needed: the bucket is public). */
export function recordedVoiceUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${TTS_BUCKET}/${path}`;
}
