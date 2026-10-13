import type { RecognitionSummary } from '../../domain/igcse/stt/quality/summariseRecognition';
import { liveCaptionsReasons, liveCaptionsSentence } from './recognitionCopy';

interface Props {
  summary: RecognitionSummary;
  /** 'review' = before marking; 'results' = after. */
  when: 'review' | 'results';
}

/**
 * Says so when some answers are marked from the browser's live captions instead
 * of the sharper recording-based transcript. Renders nothing otherwise.
 */
export function RecognitionNotice({ summary, when }: Props) {
  const sentence = liveCaptionsSentence(summary, when === 'results' ? 'was' : 'will be');
  if (!sentence) return null;
  const reasons = liveCaptionsReasons(summary);
  return (
    <div role="status" data-testid="live-captions-notice" className="rounded-card surface p-3 border border-hairline">
      <p className="text-body-s font-semibold text-ink">{sentence}</p>
      <p className="text-body-s text-ink-muted mt-0.5">
        Live captions can mishear fast or unclear speech, so those answers may read less accurately than the others.
        {reasons.length > 0 ? ` (${reasons.join('; ')}.)` : ''}
      </p>
    </div>
  );
}
