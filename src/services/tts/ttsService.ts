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
    if (!_voice && speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => {
        _voice = selectVoice();
      };
    }
  }

  function isSupported() {
    return typeof window !== 'undefined' && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
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

  return { speak, stop, onStateChange, isSupported, isSpeaking: () => _isSpeaking };
})();
