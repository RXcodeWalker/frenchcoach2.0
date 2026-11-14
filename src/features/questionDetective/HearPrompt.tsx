import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { TTS } from '../../services/tts/ttsService';

/** Reads one French prompt. Only a real French voice is used. */
export function HearPrompt({ text, label = 'Hear the question' }: { text: string; label?: string }) {
  const [noVoice, setNoVoice] = useState(false);
  if (!TTS.isSupported()) return null;

  const play = async () => {
    TTS.stop();
    await TTS.ensureVoiceReady();
    if (!TTS.hasFrenchVoice()) {
      setNoVoice(true);
      return;
    }
    try {
      await TTS.speak(text);
    } catch {
      // a missing voice is silence
    }
  };

  const reason = 'No French voice is available on this device';
  return (
    <button
      type="button"
      onClick={() => void play()}
      disabled={noVoice}
      aria-label={noVoice ? reason : label}
      title={noVoice ? reason : label}
      className="inline-flex h-11 items-center gap-2 rounded-control px-3 text-[14px] font-semibold text-action-text transition-colors duration-state ease-smooth hover:bg-track disabled:text-ink-subtle"
    >
      <Volume2 size={16} aria-hidden="true" />
      <span>{noVoice ? 'No French voice' : 'Hear it'}</span>
    </button>
  );
}
