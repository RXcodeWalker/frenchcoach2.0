import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Languages, RotateCcw } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { SpeakingConsentGate } from '../../../../components/SpeakingConsentGate';
import { useRecording } from '../../../recording/useRecording';
import { RecordingPanel } from '../../../../screens/learn/RecordingPanel';
import { Button } from '../../../../components/ui/Button';
import { PlayIconButton } from '../../../../components/ui/PlayButton';
import { TTS } from '../../../../services/tts/ttsService';
import type { TurnResponse } from '../journalistReply';

export interface TurnPrompt {
  key: string;
  /** "Question 1 of 3", "For", "Against"… */
  eyebrow: string;
  /** An English goal shown instead of a French prompt (Le journaliste: the learner asks, Henri answers). */
  goal?: string;
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
  /**
   * Optional reaction to what was heard, before the learner moves on: Henri's
   * reply, or a nudge to ask again (Le journaliste, daily-news §7).
   */
  respond?: (index: number, text: string) => TurnResponse | null;
}

interface Pending {
  answer: TurnAnswer;
  response: TurnResponse | null;
}

/**
 * The shared speaking loop of a news segment (daily-news §7): one prompt at a
 * time, the learner records, hears back what was caught, then says it again or
 * moves on. Modelled on the role-play drill's turn loop, without per-turn AI
 * calls — the segment makes one feedback call at the end (segmentFeedback.ts).
 */
export function SegmentTurns({ prompts, onDone, respond }: Props) {
  const { consentStatus } = useAuth();
  const recording = useRecording(consentStatus === 'pending');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<TurnAnswer[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
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

  // Henri answers a question once, as his reply appears (static authored French, recorded).
  const reply = pending?.response?.kind === 'reply' ? pending.response : null;
  useEffect(() => {
    if (reply) void TTS.speak(reply.fr, { recorded: true, rate: 0.9 });
  }, [reply]);

  // The mic never records over Henri's voice.
  useEffect(() => {
    if (recording.isRecording) TTS.stop();
  }, [recording.isRecording]);

  useEffect(() => () => TTS.stop(), []);

  const handleStop = async () => {
    const seconds = recording.elapsedTime;
    const text = await recording.stop();
    const blob = await recording.audioBlobPromise().catch(() => null);
    const answer = { text: text.trim(), seconds, blob };
    setPending({ answer, response: answer.text && respond ? respond(index, answer.text) : null });
  };

  const commit = (answer: TurnAnswer) => {
    TTS.stop();
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
        {prompt.goal ? (
          <>
            <h3 className="mt-2 text-section text-ink" data-testid="news-turn-prompt">{prompt.goal}</h3>
            <p className="mt-2 text-body-s text-ink-muted">Ask Henri in French. Choose your question word carefully.</p>
          </>
        ) : (
          <>
            <div className="mt-2 flex items-center gap-3">
              {prompt.speak && (
                <PlayIconButton
                  key={prompt.key}
                  play={() => TTS.speak(prompt.fr, { recorded: true, rate: 0.9 })}
                  label="Hear the question again"
                  size={18}
                  prominent
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
          </>
        )}
        {prompt.starters.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Ways to start">
            {prompt.starters.map(s => (
              <li key={s} lang="fr" className="inline-flex min-h-8 items-center rounded-pill border border-hairline-strong px-3 text-label text-ink-muted">{s}</li>
            ))}
          </ul>
        )}
      </div>

      {pending ? (
        <div className="rounded-card border border-hairline bg-surface p-5 md:p-6" role="status">
          <p className="text-eyebrow uppercase text-ink-subtle">{prompt.goal ? 'You asked' : 'We heard'}</p>
          {pending.answer.text ? (
            <p lang="fr" className="mt-1 text-body-s text-ink">« {pending.answer.text} »</p>
          ) : (
            <p className="mt-1 text-body-s text-ink-muted">Nothing came through. Try saying it again, a little louder.</p>
          )}
          {reply && (
            <div className="mt-4 rounded-control bg-progress-soft p-4" data-testid="news-turn-reply">
              <p className="text-label text-progress-text">{reply.lead} Henri answers:</p>
              <div className="mt-2 flex items-center gap-3">
                <PlayIconButton play={() => TTS.speak(reply.fr, { recorded: true, rate: 0.9 })} label="Hear Henri's answer again" size={18} prominent />
                <div className="min-w-0">
                  <p lang="fr" className="text-body-s text-ink">{reply.fr}</p>
                  <p className="mt-0.5 text-caption text-ink-muted">{reply.en}</p>
                </div>
              </div>
            </div>
          )}
          {pending.response?.kind === 'nudge' && (
            <p className="mt-4 rounded-control bg-info-soft px-4 py-3 text-body-s text-info-text" data-testid="news-turn-nudge">
              {pending.response.message}
            </p>
          )}
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {pending.response?.kind === 'nudge' ? (
              <>
                <Button variant="quiet" size="md" onClick={() => commit(pending.answer)} data-testid="news-turn-next">
                  {last ? 'Finish anyway' : 'Move on'}
                </Button>
                <Button size="md" onClick={() => setPending(null)} data-testid="news-turn-again">
                  <RotateCcw size={16} aria-hidden="true" /> Ask again
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" size="md" onClick={() => setPending(null)} data-testid="news-turn-again">
                  <RotateCcw size={16} aria-hidden="true" /> Say it again
                </Button>
                {pending.answer.text && (
                  <Button size="md" onClick={() => commit(pending.answer)} data-testid="news-turn-next">
                    {last ? 'Finish' : 'Next'} <ChevronRight size={16} aria-hidden="true" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <SpeakingConsentGate>
          <RecordingPanel isActive={true} recording={recording} onStop={handleStop} hint={prompt.goal ? 'Tap and ask your question in French' : 'Tap and answer in French'} lengthMeter={false} />
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
