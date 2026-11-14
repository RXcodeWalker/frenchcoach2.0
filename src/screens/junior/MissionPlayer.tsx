/**
 * A Junior mission on ONE screen (junior-track §1): no page change and no report
 * between questions. Demo (first time only) → warm-up → question turns →
 * « Et toi ? » → Postcard. The behaviour is `useMission`; this only draws it
 * on the Design System v2 tokens: the Junior top bar, flat cards, one primary
 * action, and the mic as a docked control at the bottom of the screen.
 */
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Lightbulb, Mic } from 'lucide-react';
import { SpeakingConsentGate } from '../../components/SpeakingConsentGate';
import { useHideDock } from '../../components/layout/shellChrome';
import { Button } from '../../components/ui/Button';
import { WARMUP_PROMPT } from '../../data/junior';
import { JuniorArt } from '../../features/junior/art/JuniorArt';
import { JuniorDemo } from '../../features/junior/JuniorDemo';
import { JuniorTopBar } from '../../features/junior/JuniorTopBar';
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
      <p data-testid="junior-hint" role="status" className="flex items-center justify-center gap-2 rounded-card bg-info-soft px-4 py-3 text-body-l text-info-text">
        <Mic size={18} aria-hidden="true" /> {line.en}
      </p>
    );
  }
  return (
    <div className="rounded-card bg-action-soft px-4 py-3">
      <LeoLine line={line.line} voice={voice} />
    </div>
  );
}

/** One bar per turn of the mission — no numbers, so a child who cannot read still sees how far along they are. */
function MissionProgress({ done, total }: { done: number; total: number }) {
  if (total <= 0) return null;
  return (
    <div role="progressbar" aria-label="Mission progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(done, total)} className="flex gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-pill transition-colors duration-fill ease-smooth-out ${i < done ? 'bg-action' : 'bg-track'}`} />
      ))}
    </div>
  );
}

export function MissionPlayer() {
  const { themeId = '' } = useParams();
  const navigate = useNavigate();
  const m = useMission(themeId);
  const { run, capture, voice } = m;

  // The mobile dock gets out of the way while a mission is running, as it does for a Learn session.
  useHideDock(m.status === 'running');

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
      <>
        <JuniorTopBar title="Junior" onBack={() => navigate('/junior')} backLabel="Back to Junior" />
        <main data-testid="mission-error" className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 pt-10 text-center">
          <Leo state="curious" />
          <p className="text-body-l text-ink">That mission isn’t here.</p>
          <Button type="button" size="lg" onClick={() => navigate('/junior')}>Back</Button>
        </main>
      </>
    );
  }

  if (m.status === 'postcard' && m.result) {
    return (
      <>
        <JuniorTopBar title="Your postcard" subtitle="Nice talking with you" onBack={() => navigate('/junior')} backLabel="Back to Junior" />
        <main className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 pb-10 pt-6">
          <Leo state="celebrating" accessory={m.look.accessory} />
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
      </>
    );
  }

  if (!run) return null;
  const turn = run.turn;
  const micOn = !run.reacting && (turn.kind !== 'question' || turn.stage === 'ready');

  return (
    <>
      <JuniorTopBar
        title={m.theme?.title.fr ?? 'Mission'}
        titleLang={m.theme ? 'fr' : undefined}
        subtitle={m.theme?.title.en}
        onBack={leave}
        backLabel="Leave mission"
        backTestId="mission-leave"
      />
      <main
        data-testid="mission-player"
        data-turn={turn.kind}
        data-question-id={turn.kind === 'question' ? turn.question.id : undefined}
        className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-md flex-col gap-5 px-4 pt-5"
      >
        {turn.kind !== 'demo' && <MissionProgress done={run.index + (run.reacting ? 1 : 0)} total={m.turnCount} />}

        {turn.kind === 'demo' ? (
          <JuniorDemo sample={turn.sample} onDone={m.finishDemo} />
        ) : (
          <>
            <div className="flex justify-center">
              <Leo state={capture.listening ? 'listening' : run.leo} accessory={m.look.accessory} />
            </div>

            {turn.kind === 'warmup' && <LeoLine line={WARMUP_PROMPT} voice={voice} emphasis />}

            {turn.kind === 'etToi' && <LeoLine line={turn.etToi.ask} voice={voice} emphasis />}

            {turn.kind === 'question' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col items-center gap-3 rounded-card border border-hairline bg-surface px-4 py-5">
                  <JuniorArt picture={turn.question.emoji} size={72} />
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
                  <Button type="button" variant="secondary" size="sm" data-testid="mission-help" onClick={m.showHelp} className="self-center">
                    <Lightbulb size={16} aria-hidden="true" /> Help
                  </Button>
                )}
              </div>
            )}

            <LineView line={run.line} voice={voice} />

            <div className="sticky bottom-0 z-10 mt-auto flex flex-col items-center gap-3 bg-bg pb-5 pt-3">
              {run.reacting ? (
                <Button type="button" size="lg" data-testid="mission-next" aria-label="Next" onClick={m.next} className="min-w-[160px]">
                  Next <ChevronRight size={18} aria-hidden="true" />
                </Button>
              ) : (
                <SpeakingConsentGate>
                  <MicButton listening={capture.listening} busy={capture.busy} disabled={!micOn || m.blocked} onTap={tapMic} level={capture.micLevel} />
                </SpeakingConsentGate>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}
