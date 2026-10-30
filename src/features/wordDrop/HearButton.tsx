import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { TTS } from '../../services/tts/ttsService';

/**
 * Reads one French word aloud. Only French is ever spoken, and only with a real
 * French voice — an English voice reading French would teach the wrong sound —
 * so the button goes quiet, with a reason, where the device has none.
 */
export function HearButton({ text, label }: { text: string; label: string }) {
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
      // a voice that fails to speak is just silent
    }
  };

  const reason = 'No French voice is available on this device';
  return (
    <button
      type="button"
      onClick={play}
      disabled={noVoice}
      aria-label={noVoice ? reason : label}
      title={noVoice ? reason : label}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-action-text
        transition-colors duration-state ease-smooth hover:bg-track active:scale-[.97] disabled:text-ink-subtle disabled:hover:bg-transparent"
    >
      <Volume2 size={16} aria-hidden="true" />
    </button>
  );
}
