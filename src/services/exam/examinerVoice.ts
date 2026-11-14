/**
 * S10 examiner delivery — optional browser SpeechSynthesis voice (fr-FR,
 * mutable). Degrades silently to text-only if unavailable (04 §6.5 failure
 * handling): never blocks the session.
 *
 * C10: adopts the fr-FR voice-selection cascade proven in `services/tts/ttsService.ts`
 * (prefer a local fr-FR voice, refresh on `voiceschanged`) and a slower 0.9
 * rate for exam-conduct clarity. UI/voice-quality heuristic only — never
 * logged or scored.
 *
 * Recorded voices (plan §6.3): a caller passing `{ recorded: true }` (static
 * authored lines only) hears the pre-recorded voice when `VITE_RECORDED_VOICES`
 * is on. Without a recording it falls back to the browser voice only when that
 * voice is French; the non-recorded path below is unchanged.
 */

import { playRecorded, primeRecordedAudio, recordedVoicesEnabled, stopRecorded } from '../tts/recordedVoice';

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

/**
 * The recorded line playing or queued last. Recorded lines wait their turn,
 * like `speechSynthesis.speak` queues utterances: a replay tapped mid-line
 * plays after it instead of cutting it off, so the line's caller (and the
 * turn-taking behind it) never resumes early.
 */
let recordedQueue: Promise<void> = Promise.resolve();

export function isTtsAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** True once a real fr-FR/fr-* voice has been selected — false means no
 * installed voice matched, so speaking would teach English-accented French
 * rather than staying silent. Mirrors `services/tts/ttsService.ts`'s
 * `hasFrenchVoice()` (kept separate per the one-voice-service-per-surface rule). */
export function hasFrenchVoice(): boolean {
  return selectedVoice !== null;
}

/** True when the examiner can be heard in French: a French browser voice, or (for a `recorded` caller) the recordings. */
export function canSpeakFrench(recorded = false): boolean {
  return hasFrenchVoice() || (recorded && recordedVoicesEnabled());
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
  if (recordedVoicesEnabled()) primeRecordedAudio();
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
 * on the next screen. `recorded: true` plays the line's recording (see above).
 * `onStart` fires when the line actually starts sounding (recording or browser
 * voice), so a caller can show its text at that moment; it never fires for a
 * line that is muted, stale or silent, so a caller must not rely on it alone.
 */
export async function speakExaminerText(
  text: string,
  issuedGeneration?: number,
  opts: { recorded?: boolean; onStart?: () => void } = {},
): Promise<void> {
  if (muted || text.trim().length === 0) return;
  if (issuedGeneration !== undefined && issuedGeneration !== generation) return;

  const gen = issuedGeneration ?? generation;
  if (opts.recorded && recordedVoicesEnabled()) {
    const turn = recordedQueue.then(() => speakRecorded(text, gen, opts.onStart)).catch(() => {});
    recordedQueue = turn;
    return turn;
  }
  if (!isTtsAvailable()) return;
  return speakBrowser(text, gen, opts.onStart);
}

async function speakRecorded(text: string, gen: number, onStart?: () => void): Promise<void> {
  if (gen !== generation || muted) return;
  let result;
  try {
    result = await playRecorded(text, { onStart });
  } catch {
    result = 'missing' as const;
  }
  // A stopped or stale line never falls back: only a missing file does, and only to a French voice.
  if (gen !== generation || muted || result !== 'missing') return;
  if (!isTtsAvailable()) return;
  await ensureVoiceReady();
  if (!hasFrenchVoice()) return;
  return speakBrowser(text, gen, onStart);
}

/**
 * A line that never starts within this long is Chrome staying silent (headless
 * Chromium does this: the API exists, but no `onstart`/`onend`). Waiting on it
 * leaves the mic disabled for the rest of the exam.
 */
const BROWSER_SPEECH_START_MS = 400;
/**
 * Slower than the examiner's rate, so a line that really plays still finishes
 * through `onend`. This only releases a line that started and then never ended.
 */
const BROWSER_SPEECH_MS_PER_CHAR = 120;
const BROWSER_SPEECH_MIN_MS = 4_000;
const BROWSER_SPEECH_MAX_MS = 20_000;

function browserSpeechCapMs(text: string): number {
  return Math.min(BROWSER_SPEECH_MAX_MS, Math.max(BROWSER_SPEECH_MIN_MS, text.length * BROWSER_SPEECH_MS_PER_CHAR));
}

async function speakBrowser(text: string, gen: number, onStart?: () => void): Promise<void> {
  await ensureVoiceReady();
  // Stay text-only when nothing will actually be heard. Headless Chromium
  // (Playwright sets `navigator.webdriver`) still has the API, and a speak()
  // that never fires onend freezes the page's timers, so the mic would stay
  // disabled for the rest of the exam. A missing French voice is the same
  // outcome for a real browser: text only, rather than an English voice.
  selectedVoice = selectedVoice ?? selectVoice();
  const automated = typeof navigator !== 'undefined' && navigator.webdriver === true;
  if (gen !== generation || muted || !selectedVoice || automated) return;

  return new Promise((resolve) => {
    let settled = false;
    let started = false;
    let startWatch = 0;
    let endWatch = 0;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(startWatch);
      clearTimeout(endWatch);
      resolve();
    };
    const giveUp = () => {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // The cap still releases the turn.
      }
      finish();
    };
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = EXAMINER_VOICE_RATE;
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.onstart = () => {
      started = true;
      onStart?.();
    };
    utterance.onend = () => finish();
    utterance.onerror = () => finish();
    // Chrome can leave the queue paused after an idle period; speak() on a
    // paused queue silently never fires. Cancel so the next line is not stuck
    // behind this one.
    startWatch = setTimeout(() => {
      if (!started) giveUp();
    }, BROWSER_SPEECH_START_MS);
    endWatch = setTimeout(giveUp, browserSpeechCapMs(text));
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  });
}

/** Cancels any in-flight speech and invalidates speech still queued behind a delay. */
export function stopExaminerVoice(): void {
  generation += 1;
  // Everything still queued is stale now; don't make the next line wait on it
  // (a fallback utterance that never fires onend would otherwise block every
  // later recorded line for the rest of the page's life).
  recordedQueue = Promise.resolve();
  stopRecorded();
  if (isTtsAvailable()) window.speechSynthesis.cancel();
}
