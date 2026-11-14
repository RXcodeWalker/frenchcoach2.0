import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Languages, RotateCcw } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { SpeakingConsentGate } from '../../../../components/SpeakingConsentGate';
import { useRecording } from '../../../recording/useRecording';
import { RecordingPanel } from '../../../../screens/learn/RecordingPanel';
import { Button } from '../../../../components/ui/Button';
import { PlayIconButton } from '../../../../components/ui/PlayButton';
import { TTS } from '../../../../services/tts/ttsService';

export interface TurnPrompt {
  key: string;
  /** "Question 1 of 3", "For", "Against"… */
  eyebrow: string;
  fr: string;
  en: string;
  starters: readonly string[];
  /** Henri reads the prompt aloud (static authored French, recorded). */
  speak: boolean;
}

export interface TurnAnswer {
  text: string;
  seconds: number;
  blob: Blob | null;
}

interface Props {
  prompts: readonly TurnPrompt[];
  onDone: (answers: TurnAnswer[]) => void;
}

/**
 * The shared speaking loop of a news segment (daily-news §7): one prompt at a
 * time, the learner records, hears back what was caught, then says it again or
 * moves on. Modelled on the role-play drill's turn loop, without per-turn AI
 * calls — the segment makes one feedback call at the end (segmentFeedback.ts).
 */
export function SegmentTurns({ prompts, onDone }: Props) {
  const { consentStatus } = useAuth();
  const recording = useRecording(consentStatus === 'pending');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<TurnAnswer[]>([]);
  const [pending, setPending] = useState<TurnAnswer | null>(null);
  const [showEnglish, setShowEnglish] = useState(false);
  const prompt = prompts[index];
  const last = index === prompts.length - 1;
  const spokeRef = useRef<string | null>(null);

  // Henri asks each prompt once as it appears; ▶ asks it again.
  useEffect(() => {
    if (!prompt.speak || spokeRef.current === prompt.key) return;
    spokeRef.current = prompt.key;
    void TTS.speak(prompt.fr, { recorded: true, rate: 0.9 });
  }, [prompt]);

  // The mic never records over Henri's voice.
  useEffect(() => {
    if (recording.isRecording) TTS.stop();
  }, [recording.isRecording]);

  useEffect(() => () => TTS.stop(), []);

  const handleStop = async () => {
    const seconds = recording.elapsedTime;
    const text = await recording.stop();
    const blob = await recording.audioBlobPromise().catch(() => null);
    setPending({ text: text.trim(), seconds, blob });
  };

  const commit = (answer: TurnAnswer) => {
    const next = [...answers, answer];
    setPending(null);
    setShowEnglish(false);
    if (last) {
      onDone(next);
      return;
    }
    setAnswers(next);
    setIndex(i => i + 1);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-card border border-hairline bg-surface p-5 md:p-8">
        <p className="text-eyebrow uppercase text-ink-subtle">{prompt.eyebrow}</p>
        <div className="mt-2 flex items-start gap-2">
          {prompt.speak && (
            <PlayIconButton
              key={prompt.key}
              play={() => TTS.speak(prompt.fr, { recorded: true, rate: 0.9 })}
              label="Hear the question again"
              size={16}
              className="mt-1"
            />
          )}
          <h3 lang="fr" className="min-w-0 flex-1 text-section text-ink" data-testid="news-turn-prompt">{prompt.fr}</h3>
        </div>
        <button
          type="button"
          onClick={() => setShowEnglish(v => !v)}
          aria-expanded={showEnglish}
          className="mt-2 inline-flex items-center gap-1.5 text-label text-ink-muted underline underline-offset-4 hover:text-ink"
        >
          <Languages size={14} aria-hidden="true" /> {showEnglish ? prompt.en : 'Show in English'}
        </button>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Ways to start">
          {prompt.starters.map(s => (
            <li key={s} lang="fr" className="inline-flex min-h-8 items-center rounded-pill border border-hairline-strong px-3 text-label text-ink-muted">{s}</li>
          ))}
        </ul>
      </div>

      {pending ? (
        <div className="rounded-card border border-hairline bg-surface p-5 md:p-6" role="status">
          <p className="text-eyebrow uppercase text-ink-subtle">We heard</p>
          {pending.text ? (
            <p lang="fr" className="mt-1 text-body-s text-ink">« {pending.text} »</p>
          ) : (
            <p className="mt-1 text-body-s text-ink-muted">Nothing came through. Try saying it again, a little louder.</p>
          )}
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" size="md" onClick={() => setPending(null)} data-testid="news-turn-again">
              <RotateCcw size={16} aria-hidden="true" /> Say it again
            </Button>
            {pending.text && (
              <Button size="md" onClick={() => commit(pending)} data-testid="news-turn-next">
                {last ? 'Finish' : 'Next'} <ChevronRight size={16} aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        <SpeakingConsentGate>
          <RecordingPanel isActive={true} recording={recording} onStop={handleStop} hint="Tap and answer in French" lengthMeter={false} />
        </SpeakingConsentGate>
      )}

      <div className="flex justify-center">
        <Button
          variant="quiet"
          size="md"
          disabled={recording.isRecording}
          onClick={() => commit({ text: '', seconds: 0, blob: null })}
          data-testid="news-turn-skip"
        >
          {last ? 'Skip and finish' : 'Skip this one'}
        </Button>
      </div>

      <p className="text-center text-caption text-ink-subtle" aria-live="polite">
        <span className="font-numeral">{index + 1}</span> of <span className="font-numeral">{prompts.length}</span>
      </p>
    </div>
  );
}
