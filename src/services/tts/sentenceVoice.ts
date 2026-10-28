/**
 * sentenceVoice.ts — asks the backend to record an AI-corrected sentence
 * (Pronunciation Lab Stage 4b, owner decision D2; plan §4.2).
 *
 * Only static authored French is recorded ahead of time (`scripts/tts/`), so a
 * sentence the AI wrote has no file. `POST /api/native-voice` synthesises it
 * once with Azure into the same public bucket, at the path `voiceKey.ts`
 * computes from the same text (the backend's `lib/voice_key.py` is a port,
 * pinned by shared vectors) — so after a `true` here, `playRecorded(text)`
 * finds the file like any other recording. The backend answers at once, with
 * no charge, when the file already exists.
 *
 * Never throws and never blocks a screen: `false` means "no recording", and
 * the caller falls back to the browser's French voice.
 *  - A refused text (invalid, too long, failed) is not asked for again this
 *    page load.
 *  - The daily allowance, the monthly cap or an unavailable service stop all
 *    asks for the rest of the page load (asking again would only be refused).
 *  - Azure's own per-minute limit (`native_voice_busy`) refuses this ask only.
 * Nothing about the text is logged or sent anywhere else.
 */
import { getAccessToken } from '../../lib/authToken';

// Prod: same-origin '/api/*' proxied to the backend by Vercel. Dev: the backend directly.
const API_BASE = import.meta.env.PROD
  ? ''
  : ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000');

/** Azure synthesis + upload is ~1–3 s; past this the learner hears the browser voice instead. */
export const SENTENCE_VOICE_TIMEOUT_MS = 10_000;

/** Matches the backend's `MAX_CHARACTERS`: longer text is never sent. */
export const SENTENCE_VOICE_MAX_CHARACTERS = 600;

const refused = new Set<string>();
const inFlight = new Map<string, Promise<boolean>>();
let suspended = false;

async function errorCode(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { detail?: { error?: unknown } };
    return typeof body?.detail?.error === 'string' ? body.detail.error : null;
  } catch {
    return null;
  }
}

async function ask(text: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SENTENCE_VOICE_TIMEOUT_MS);
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/api/native-voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    if (res.ok) {
      const data = (await res.json().catch(() => null)) as { status?: unknown } | null;
      return data?.status === 'ready';
    }
    const code = await errorCode(res);
    if (res.status === 429 && code === 'native_voice_busy') return false;
    if (res.status === 429 || res.status === 503 || res.status === 403) suspended = true;
    else refused.add(text);
    return false;
  } catch {
    // Timeout or network: the backend may still finish and store it; the next tap finds the file.
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Makes sure `text` has a recording in the bucket. Resolves `true` when it
 * does (it was there, or the backend just made it), `false` otherwise.
 */
export function requestSentenceRecording(text: string): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > SENTENCE_VOICE_MAX_CHARACTERS || suspended || refused.has(trimmed)) {
    return Promise.resolve(false);
  }
  const pending = inFlight.get(trimmed);
  if (pending) return pending;
  const request = ask(trimmed).finally(() => inFlight.delete(trimmed));
  inFlight.set(trimmed, request);
  return request;
}

/** Test seam: forget refusals and suspension. */
export function resetSentenceVoiceForTests(): void {
  refused.clear();
  inFlight.clear();
  suspended = false;
}
