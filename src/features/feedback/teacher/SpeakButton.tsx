import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { TTS } from '../../../services/tts/ttsService';
import { PlayIconButton } from '../../../components/ui/PlayButton';

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

  if (!TTS.isSupported()) return null;

  // Tapping again pauses (and ↺ restarts) — services/audio/playbackControl.ts.
  const play = async () => {
    await TTS.ensureVoiceReady();
    if (!TTS.hasFrenchVoice()) {
      setNoFrenchVoice(true);
      return;
    }
    await TTS.speak(text);
  };

  return (
    <PlayIconButton
      play={play}
      disabled={noFrenchVoice}
      label={noFrenchVoice ? 'No French voice is available on this device' : label}
      icon={<Volume2 size={12} aria-hidden="true" />}
    />
  );
}
