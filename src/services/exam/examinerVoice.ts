/**
 * S10 examiner delivery — optional browser SpeechSynthesis voice (fr-FR,
 * mutable). Degrades silently to text-only if unavailable (04 §6.5 failure
 * handling): never blocks the session.
 */

let muted = false;

export function isTtsAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
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
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export function stopExaminerVoice(): void {
  if (isTtsAvailable()) window.speechSynthesis.cancel();
}
