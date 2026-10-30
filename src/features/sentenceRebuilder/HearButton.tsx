import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { TTS } from '../../services/tts/ttsService';

/**
 * Reads one French sentence aloud. Only French is ever spoken, and only with a
 * real French voice — an English voice reading French would teach the wrong
 * sound — so the button goes quiet, with a reason, where the device has none.
 * `showLabel` turns the icon button into a labelled one for the answer panel.
 */
export function HearButton({ text, label, showLabel = false }: { text: string; label: string; showLabel?: boolean }) {
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
      className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-control text-[14px] font-semibold text-action-text
        transition-colors duration-state ease-smooth hover:bg-track active:scale-[.97] disabled:text-ink-subtle disabled:hover:bg-transparent
        ${showLabel ? 'px-3' : 'w-11'}`}
    >
      <Volume2 size={16} aria-hidden="true" />
      {showLabel && <span>{noVoice ? 'No French voice' : 'Hear it'}</span>}
    </button>
  );
}
