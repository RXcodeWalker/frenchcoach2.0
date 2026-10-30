import { Volume2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { TTS } from '../../../services/tts/ttsService';
import { useFrenchVoice } from '../useRoundHelpers';

/**
 * Plays a French word in the browser's French voice. Hidden when there is no
 * French voice (never an English voice reading French). The words are static
 * authored vocabulary, so this stays on the plain browser voice rather than
 * the recorded-voice catalogue.
 */
export function HearButton({ text, size = 'sm' }: { text: string; size?: 'sm' | 'md' }) {
  const available = useFrenchVoice();
  if (!available) return null;
  return (
    <Button
      variant="quiet"
      size={size}
      aria-label={`Hear ${text}`}
      onClick={() => {
        TTS.speak(text).catch(() => undefined);
      }}
    >
      <Volume2 size={16} aria-hidden="true" />
      Hear it
    </Button>
  );
}
