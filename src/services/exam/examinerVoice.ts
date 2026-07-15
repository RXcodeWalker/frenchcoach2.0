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
  if (!selectedVoice && window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {
      selectedVoice = selectVoice();
    };
  }
}

if (isTtsAvailable()) {
  initVoice();
}

export function setExaminerVoiceMuted(value: boolean): void {
  muted = value;
  if (value && isTtsAvailable()) window.speechSynthesis.cancel();
}

export function isExaminerVoiceMuted(): boolean {
  return muted;
}

/** Speaks `text` in fr-FR; resolves when speech ends (or immediately if muted/unavailable). Never rejects. */
export function speakExaminerText(text: string): Promise<void> {
  if (muted || !isTtsAvailable() || text.trim().length === 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = EXAMINER_VOICE_RATE;
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export function stopExaminerVoice(): void {
  if (isTtsAvailable()) window.speechSynthesis.cancel();
}
