import { Mic } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SpeakingConsentGate } from '../../components/SpeakingConsentGate';
import { Button } from '../../components/ui/Button';
import { useRecording } from '../recording/useRecording';
import { useSpaceToRecord } from '../../lib/useSpaceToRecord';
import { useMicSilence } from '../../services/sound/useSfx';

/**
 * The say-rung record control (question-detective §2). Chrome captions only —
 * no backend, no pronunciation mark. Consent-gated because Grade 6–7 learners
 * are often under 13.
 */
export function SpeakControl({
  onHeard,
  disabled = false,
}: {
  onHeard: (text: string) => void;
  disabled?: boolean;
}) {
  const { consentStatus } = useAuth();
  const blocked = consentStatus === 'pending';
  const rec = useRecording(blocked);
  useMicSilence(rec.isRecording);

  useSpaceToRecord({
    enabled: !disabled && rec.sttSupported && !blocked,
    isRecording: rec.isRecording,
    onStart: rec.start,
    onStop: () => {
      void rec.stop().then(text => onHeard(text.trim()));
    },
  });

  if (!rec.sttSupported) {
    return (
      <p className="text-label text-ink-muted" data-testid="detective-no-stt">
        This browser cannot hear you, so type the answer instead.
      </p>
    );
  }

  const toggle = () => {
    if (rec.isRecording) void rec.stop().then(text => onHeard(text.trim()));
    else rec.start();
  };

  return (
    <SpeakingConsentGate>
      <div className="flex flex-col items-center gap-2">
        <Button
          type="button"
          variant={rec.isRecording ? 'destructive' : 'primary'}
          size="lg"
          disabled={disabled || blocked}
          onClick={toggle}
          data-testid="detective-mic"
          aria-pressed={rec.isRecording}
        >
          <Mic size={18} aria-hidden="true" />
          {rec.isRecording ? 'Stop' : 'Say it'}
        </Button>
        <p className="text-label text-ink-muted">{rec.isRecording ? 'Listening…' : 'Space starts and stops'}</p>
      </div>
    </SpeakingConsentGate>
  );
}
