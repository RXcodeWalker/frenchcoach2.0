/**
 * A Junior mission on ONE screen (junior-track §1): no page change and no report
 * between questions. Demo (first time only) → warm-up → question turns →
 * « Et toi ? » → Postcard. The behaviour is `useMission`; this only draws it.
 */
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, X } from 'lucide-react';
import { SpeakingConsentGate } from '../../components/SpeakingConsentGate';
import { WARMUP_PROMPT } from '../../data/junior';
import { JuniorDemo } from '../../features/junior/JuniorDemo';
import { Leo } from '../../features/junior/Leo';
import { LeoLine } from '../../features/junior/LeoLine';
import { MicButton } from '../../features/junior/MicButton';
import { PictureChoices } from '../../features/junior/PictureChoices';
import { PostcardView } from '../../features/junior/PostcardView';
import { SentenceFrame } from '../../features/junior/SentenceFrame';
import { useMission, type UseMission } from '../../features/junior/useMission';
import type { TurnLineText } from '../../domain/junior/turnFlow';

function LineView({ line, voice }: { line: TurnLineText | null; voice: UseMission['voice'] }) {
  if (!line) return null;
  if (line.kind === 'hint') {
    return (
      <p data-testid="junior-hint" role="status" className="flex items-center justify-center gap-2 text-body-l text-ink">
        <span aria-hidden="true">{line.icon}</span> {line.en}
      </p>
    );
  }
  return <LeoLine line={line.line} voice={voice} />;
}

export function MissionPlayer() {
  const { themeId = '' } = useParams();
  const navigate = useNavigate();
  const m = useMission(themeId);
  const { run, capture, voice } = m;

  // Léo stops talking the moment the learner taps the mic, so the mic never hears him.
  const tapMic = () => {
    voice.stop();
    capture.toggle();
  };

  const leave = () => {
    capture.cancel();
    navigate('/junior');
  };

  if (m.status === 'error') {
    return (
      <main data-testid="mission-error" className="mx-auto max-w-md p-6 text-center">
        <Leo state="curious" />
        <p className="mt-4 text-body-l text-ink">That mission isn’t here.</p>
        <Link to="/junior" className="mt-4 inline-block rounded-pill bg-action px-6 py-3 text-label text-action-ink">Back</Link>
      </main>
    );
  }

  if (m.status === 'postcard' && m.result) {
    return (
      <main className="mx-auto max-w-md px-4 py-6">
        <div className="mb-4 flex justify-center"><Leo state="celebrating" accessory={m.look.accessory} /></div>
        <PostcardView
          postcard={m.result.postcard}
          voice={voice}
          blocked={m.blocked}
          recordingUrl={m.recordingUrl}
          linesFor={m.linesFor}
          practiseTry={m.result.practiseTry}
          onDone={() => navigate('/junior')}
        />
      </main>
    );
  }

  if (!run) return null;
  const turn = run.turn;
  const micOn = !run.reacting && (turn.kind !== 'question' || turn.stage === 'ready');

  return (
    <main data-testid="mission-player" data-turn={turn.kind} data-question-id={turn.kind === 'question' ? turn.question.id : undefined} className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-4 py-6">
      <div className="flex items-center justify-between">
        <span className="text-label text-ink-muted" aria-hidden="true">{m.theme?.emoji}</span>
        <button type="button" aria-label="Leave mission" data-testid="mission-leave" onClick={leave} className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline text-ink-muted">
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      {turn.kind === 'demo' ? (
        <JuniorDemo sample={turn.sample} onDone={m.finishDemo} />
      ) : (
        <>
          <div className="flex justify-center">
            <Leo state={capture.listening ? 'listening' : run.leo} accessory={m.look.accessory} />
          </div>

          {turn.kind === 'warmup' && (
            <div className="flex flex-col gap-3">
              <LeoLine line={WARMUP_PROMPT} voice={voice} emphasis />
            </div>
          )}

          {turn.kind === 'etToi' && <LeoLine line={turn.etToi.ask} voice={voice} emphasis />}

          {turn.kind === 'question' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-center gap-2">
                <span aria-hidden="true" className="text-5xl">{turn.question.emoji}</span>
                <LeoLine line={turn.question.prompt} voice={voice} emphasis />
              </div>
              {turn.question.frames.map((frame, i) => {
                const step = turn.steps[i];
                const chosen = frame.slotOptions.find((o) => o.id === turn.picks[i]) ?? null;
                const showFrame = step !== 'free' || turn.helpShown;
                return (
                  <div key={i} data-testid="question-frame" data-step={step} className="flex flex-col gap-3">
                    <PictureChoices
                      options={frame.slotOptions}
                      chosenId={turn.picks[i]}
                      showWords={step !== 'free'}
                      disabled={step === 'free' || run.reacting || capture.listening}
                      onPick={(id) => m.pick(i, id)}
                    />
                    {showFrame && <SentenceFrame frame={frame} chosen={chosen} />}
                  </div>
                );
              })}
              {turn.steps.includes('free') && !turn.helpShown && (
                <button type="button" data-testid="mission-help" onClick={m.showHelp} className="self-center rounded-pill border border-hairline px-5 py-2 text-label text-ink-muted">
                  Help
                </button>
              )}
            </div>
          )}

          <LineView line={run.line} voice={voice} />

          <div className="mt-auto flex flex-col items-center gap-3">
            {run.reacting ? (
              <button type="button" data-testid="mission-next" aria-label="Next" onClick={m.next} className="flex h-14 w-14 items-center justify-center rounded-full bg-action text-action-ink">
                <ChevronRight size={28} aria-hidden="true" />
              </button>
            ) : (
              <SpeakingConsentGate>
                <MicButton listening={capture.listening} busy={capture.busy} disabled={!micOn || m.blocked} onTap={tapMic} />
              </SpeakingConsentGate>
            )}
          </div>
        </>
      )}
    </main>
  );
}
