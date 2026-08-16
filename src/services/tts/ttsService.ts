/**
 * ttsService.ts — Text-to-Speech wrapper (Web Speech Synthesis API)
 */

export const TTS = (() => {
  let _voice: SpeechSynthesisVoice | null = null;
  let _isSpeaking = false;
  let _onStartCb: (() => void) | null = null;
  let _onEndCb: (() => void) | null = null;

  const CONFIG = {
    lang: "fr-FR",
    rate: 0.9,
    pitch: 1.0,
    volume: 1.0,
  };

  function selectVoice() {
    if (typeof window === 'undefined') return null;
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return null;

    let v = voices.find((v) => v.lang === "fr-FR" && v.localService);
    if (!v) v = voices.find((v) => v.lang === "fr-FR");
    if (!v) v = voices.find((v) => v.lang.startsWith("fr-"));
    if (!v) v = voices.find((v) => v.lang.startsWith("fr"));
    return v || null;
  }

  function initVoice() {
    if (typeof window === 'undefined') return;
    _voice = selectVoice();
    if (!_voice && 'onvoiceschanged' in speechSynthesis) {
      // addEventListener, not `onvoiceschanged = ...` — that single-slot
      // property is also assigned by services/exam/examinerVoice.ts, and
      // whichever module runs its assignment second silently clobbers the
      // other's voice refresh (Phase 4 — Shadowing Mode, review item 9).
      speechSynthesis.addEventListener('voiceschanged', () => {
        _voice = selectVoice();
      });
    }
  }

  function isSupported() {
    return typeof window !== 'undefined' && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  }

  const VOICE_READY_TIMEOUT_MS = 800;

  /**
   * Resolves once a voice is selected (or immediately if one already is /
   * voices are already cached). On a genuinely cold first load, waits on
   * `voiceschanged` with a timeout guard so it degrades to "ready anyway"
   * rather than ever blocking indefinitely. Mirrors
   * services/exam/examinerVoice.ts's ensureVoiceReady().
   */
  function ensureVoiceReady(): Promise<void> {
    if (!isSupported()) return Promise.resolve();
    if (_voice || speechSynthesis.getVoices().length) return Promise.resolve();

    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      const timeoutId = setTimeout(finish, VOICE_READY_TIMEOUT_MS);
      speechSynthesis.addEventListener(
        'voiceschanged',
        () => {
          _voice = selectVoice();
          clearTimeout(timeoutId);
          finish();
        },
        { once: true },
      );
    });
  }

  /** True once a real fr-FR/fr-* voice has been selected — false means the
   * platform default voice would be used instead, which on some platforms
   * reads French with an English voice (Phase 4 — Shadowing Mode, review
   * item 9). Callers that would actively teach wrong pronunciation on a
   * fallback voice should gate playback on this. */
  function hasFrenchVoice(): boolean {
    return _voice !== null;
  }

  function speak(text: string, options: { rate?: number; pitch?: number; volume?: number } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!isSupported()) {
        reject(new Error("Speech synthesis not supported"));
        return;
      }

      stop();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = CONFIG.lang;
      utterance.rate = options.rate ?? CONFIG.rate;
      utterance.pitch = options.pitch ?? CONFIG.pitch;
      utterance.volume = options.volume ?? CONFIG.volume;

      if (_voice) utterance.voice = _voice;

      utterance.onstart = () => {
        _isSpeaking = true;
        _onStartCb?.();
      };

      utterance.onend = () => {
        _isSpeaking = false;
        _onEndCb?.();
        resolve();
      };

      utterance.onerror = (e) => {
        _isSpeaking = false;
        if (e.error === "interrupted" || e.error === "canceled") {
          resolve();
        } else {
          reject(new Error(`TTS error: ${e.error}`));
        }
      };

      speechSynthesis.speak(utterance);
    });
  }

  function stop() {
    if (!isSupported()) return;
    if (speechSynthesis.speaking || speechSynthesis.pending) {
      speechSynthesis.cancel();
    }
    _isSpeaking = false;
    _onEndCb?.();
  }

  function onStateChange(callbacks: { onStart?: () => void; onEnd?: () => void }) {
    _onStartCb = callbacks.onStart || null;
    _onEndCb = callbacks.onEnd || null;
  }

  if (isSupported()) {
    initVoice();
  }

  return { speak, stop, onStateChange, isSupported, isSpeaking: () => _isSpeaking, ensureVoiceReady, hasFrenchVoice };
})();
