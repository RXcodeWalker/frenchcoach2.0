import { ScrollingWaveform } from '../../features/recording/ScrollingWaveform';
import { Button } from '../../components/ui/Button';
import type { RecordingState } from '../../features/recording/useRecording';

interface Props {
  recording: RecordingState;
  greetingText: string;
  onContinue: () => void;
}

/**
 * Non-assessed French greeting (C5). The candidate's reply is never submitted
 * to the session and never logged — it exists only to warm up the mic/voice
 * before the assessed role play begins. Renders in either exam voice (the
 * warm-paper "Claire" framing, or the core token theme).
 */
export function ExamGreeting({ recording, greetingText, onContinue }: Props) {
  const rec = recording.isRecording;

  return (
    <div data-hatch="immersive" className="fixed inset-0 bg-bg flex flex-col z-40">
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 max-w-2xl mx-auto w-full">
        <div className="mb-6 flex items-center gap-3 self-start">
          <div className="w-10 h-10 rounded-pill bg-action text-action-ink flex items-center justify-center exam-serif text-body-l">
            C
          </div>
          <div>
            <div className="exam-serif text-subtitle text-ink leading-tight">Claire</div>
            <div className="text-body-s text-ink-subtle">your examiner tonight</div>
          </div>
          <span className="ml-auto font-numeral text-body-s text-ink-subtle tabular-nums">
            Not assessed
          </span>
        </div>

        <div className="w-full rounded-card surface p-5 mb-5">
          <p className="text-eyebrow uppercase text-ink-subtle mb-2">Examiner</p>
          <p className="exam-serif text-display-m text-ink leading-snug">{greetingText}</p>
        </div>

        <div className="w-full space-y-4">
          <ScrollingWaveform isRecording={rec} source={recording.micLevel} />

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={rec ? undefined : recording.start}
              disabled={rec}
              aria-label="Start recording"
              className="w-[60px] h-[60px] rounded-pill bg-action hover:bg-action-hover
                flex items-center justify-center transition-colors duration-state ease-smooth
                disabled:opacity-60"
            >
              <span className="w-4 h-4 rounded-pill bg-action-ink" />
            </button>

            <Button variant="secondary" size="sm" onClick={onContinue}>
              Start exam
            </Button>
          </div>

          <p className="text-center text-body-s text-ink-subtle">
            This is a quick warm-up — your reply here isn&rsquo;t recorded or scored.
          </p>
        </div>
      </div>
    </div>
  );
}
