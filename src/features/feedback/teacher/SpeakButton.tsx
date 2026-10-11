import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { TTS } from '../../../services/tts/ttsService';

/**
 * "Hear it": the correction read aloud in French (Learn feedback Batch 6b).
 * Only the French is ever spoken — the teacher's English talk stays text.
 *
 * It is hidden where the browser has no speech synthesis, and goes quiet
 * (disabled, with a reason) where there is no French voice: reading French with
 * an English voice would teach the wrong pronunciation (ttsService.ts).
 */
export function SpeakButton({ text, label = 'Hear the correction' }: { text: string; label?: string }) {
  const [noFrenchVoice, setNoFrenchVoice] = useState(false);
  const [playing, setPlaying] = useState(false);

  if (!TTS.isSupported()) return null;

  const play = async () => {
    if (playing) {
      TTS.stop();
      setPlaying(false);
      return;
    }
    await TTS.ensureVoiceReady();
    if (!TTS.hasFrenchVoice()) {
      setNoFrenchVoice(true);
      return;
    }
    setPlaying(true);
    try {
      await TTS.speak(text);
    } catch {
      // a voice that fails to speak is just silent
    }
    setPlaying(false);
  };

  return (
    <button
      type="button"
      onClick={play}
      disabled={noFrenchVoice}
      aria-label={noFrenchVoice ? 'No French voice is available on this device' : label}
      title={noFrenchVoice ? 'No French voice is available on this device' : label}
      className="inline-flex items-center justify-center rounded-full surface-recessed p-1 text-action-text disabled:opacity-40"
    >
      <Volume2 size={12} aria-hidden="true" />
    </button>
  );
}
