/**
 * S10 examiner delivery — optional browser SpeechSynthesis voice (fr-FR,
 * mutable). Degrades silently to text-only if unavailable (04 §6.5 failure
 * handling): never blocks the session.
 *
 * C10: adopts the fr-FR voice-selection cascade proven in `services/tts/ttsService.ts`
 * (prefer a local fr-FR voice, refresh on `voiceschanged`) and a slower 0.9
 * rate for exam-conduct clarity. UI/voice-quality heuristic only — never
 * logged or scored.
 */

const EXAMINER_VOICE_RATE = 0.9;

let muted = false;
let selectedVoice: SpeechSynthesisVoice | null = null;
let primed = false;

/**
 * Bumped by every `stopExaminerVoice()`. A speech request captures the
 * generation it was issued under; anything still queued behind a `wait(...)`
 * or `ensureVoiceReady()` when the generation moves on is dropped instead of
 * speaking into whatever screen the candidate has since moved to.
 */
let generation = 0;

export function isTtsAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function selectVoice(): SpeechSynthesisVoice | null {
  if (!isTtsAvailable()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  return (
    voices.find((v) => v.lang === 'fr-FR' && v.localService) ??
    voices.find((v) => v.lang === 'fr-FR') ??
    voices.find((v) => v.lang.startsWith('fr-')) ??
    voices.find((v) => v.lang.startsWith('fr')) ??
    null
  );
}

function initVoice(): void {
  if (!isTtsAvailable()) return;
  selectedVoice = selectVoice();
  if (!selectedVoice && 'onvoiceschanged' in window.speechSynthesis) {
    // addEventListener, not `onvoiceschanged = ...` — that single-slot
    // property is also assigned by services/tts/ttsService.ts, and whichever
    // module runs its assignment second silently clobbers the other's voice
    // refresh (Phase 4 — Shadowing Mode, review item 9).
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      selectedVoice = selectVoice();
    });
  }
}

if (isTtsAvailable()) {
  initVoice();
}

export function setExaminerVoiceMuted(value: boolean): void {
  muted = value;
  // Muting also invalidates anything queued behind a delay, not just what is
  // audible right now.
  if (value) stopExaminerVoice();
}

export function isExaminerVoiceMuted(): boolean {
  return muted;
}

const VOICE_READY_TIMEOUT_MS = 800;

/**
 * Resolves once a voice is selected (or immediately if one already is / voices
 * are already cached). On a genuinely cold first load, waits on the existing
 * `onvoiceschanged` hook with a timeout guard so it degrades to "speak now
 * anyway" rather than ever blocking indefinitely.
 */
export function ensureVoiceReady(): Promise<void> {
  if (!isTtsAvailable()) return Promise.resolve();
  if (selectedVoice || window.speechSynthesis.getVoices().length) return Promise.resolve();

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const timeoutId = setTimeout(finish, VOICE_READY_TIMEOUT_MS);
    window.speechSynthesis.addEventListener(
      'voiceschanged',
      () => {
        selectedVoice = selectVoice();
        clearTimeout(timeoutId);
        finish();
      },
      { once: true },
    );
  });
}

/** Current speech generation — pass it back to `speakExaminerText` to make a delayed request cancellable. */
export function getExaminerVoiceGeneration(): number {
  return generation;
}

/**
 * Warms the synthesis engine from inside a user gesture. Chrome/Edge boot the
 * TTS engine lazily on the first `speak()` of a page, which is what made the
 * examiner's opening line arrive seconds after the screen did; a zero-volume
 * utterance pays that cost during the click instead. Also clears any queue left
 * paused by the long-standing Chrome pause bug. Safe to call repeatedly.
 */
export function primeExaminerVoice(): void {
  if (!isTtsAvailable() || primed) return;
  primed = true;
  try {
    window.speechSynthesis.cancel();
    if (!selectedVoice) selectedVoice = selectVoice();
    const warmup = new SpeechSynthesisUtterance(' ');
    warmup.lang = 'fr-FR';
    warmup.volume = 0;
    if (selectedVoice) warmup.voice = selectedVoice;
    window.speechSynthesis.speak(warmup);
  } catch {
    // Warm-up is best-effort: never let it break the session.
  }
}

/**
 * Speaks `text` in fr-FR; resolves when speech ends (or immediately if
 * muted/unavailable). Never rejects. Pass `issuedGeneration` (from
 * `getExaminerVoiceGeneration()`) for speech scheduled behind a delay, so a
 * `stopExaminerVoice()` in the meantime drops it rather than letting it play
 * on the next screen.
 */
export async function speakExaminerText(text: string, issuedGeneration?: number): Promise<void> {
  if (muted || !isTtsAvailable() || text.trim().length === 0) {
    return Promise.resolve();
  }
  if (issuedGeneration !== undefined && issuedGeneration !== generation) {
    return Promise.resolve();
  }

  const gen = issuedGeneration ?? generation;
  await ensureVoiceReady();
  if (gen !== generation || muted) return;

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = EXAMINER_VOICE_RATE;
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    // Chrome can leave the queue paused after an idle period; speak() on a
    // paused queue silently never fires.
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  });
}

/** Cancels any in-flight speech and invalidates speech still queued behind a delay. */
export function stopExaminerVoice(): void {
  generation += 1;
  if (isTtsAvailable()) window.speechSynthesis.cancel();
}
