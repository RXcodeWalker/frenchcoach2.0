import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Eye, Volume2 } from 'lucide-react';
import { PageShell } from '../../components/layout/PageShell';
import { TopContextBar } from '../../components/TopContextBar';
import { Button } from '../../components/ui/Button';
import { SpeakingConsentGate } from '../../components/SpeakingConsentGate';
import { LiveFeedbackPanel, type PanelEntry } from '../../components/ui/LiveFeedbackPanel';
import { enter, enterReduced, fill } from '../../components/motion/variants';
import { useIsDesktop } from '../../components/layout/useIsDesktop';
import { RecordingPanel } from '../learn/RecordingPanel';
import type { RecordingState } from '../../features/recording/useRecording';
import type { StoryCard } from '../../data/storyCards';

export interface DrillMessage {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  /** On a user message: the exchange it answers, so a redo replaces it in place. */
  stepIndex?: number;
}

interface Props {
  card: StoryCard;
  messages: DrillMessage[];
  currentStep: number;
  isTyping: boolean;
  finished: boolean;
  /** False in listen-only practice: examiner lines stay hidden until revealed. */
  showText: boolean;
  recording: RecordingState;
  onStopRecording: () => void;
  panelEntries: PanelEntry[];
  canRedo: (step: number) => boolean;
  redosLeft: (step: number) => number;
  onRedo: (step: number) => void;
  onReplay: (text: string) => void;
  onExit: () => void;
  onAgain: () => void;
  onNext: () => void;
}

/**
 * The role play itself (Design System v2): progress through the exchanges,
 * the conversation (examiner lines in the exam serif, with replay and — in
 * listen-only practice — reveal), the current English task when the card has
 * one, the shared recorder, and coaching per answer beside it (below on mobile).
 */
export function DrillConversation({
  card,
  messages,
  currentStep,
  isTyping,
  finished,
  showText,
  recording,
  onStopRecording,
  panelEntries,
  canRedo,
  redosLeft,
  onRedo,
  onReplay,
  onExit,
  onAgain,
  onNext,
}: Props) {
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  const desktop = useIsDesktop();
  const endRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const total = card.tasks.length;
  const answered = Math.min(currentStep, total);
  const shownStep = Math.min(currentStep + 1, total);
  const task = card.tasks[currentStep];
  // The mic opens only once the examiner's line has landed and the exchange is still open.
  const awaitingAnswer = !finished && !isTyping && task !== undefined && messages.some((m) => m.sender === 'ai');
  const showRecorder = awaitingAnswer || recording.isRecording;

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
  }, [messages.length, isTyping, finished, reduced]);

  const feedback = (
    <aside aria-label="Coaching on your answers" className="flex flex-col gap-3">
      <h2 className="text-section text-ink">Coaching</h2>
      <LiveFeedbackPanel entries={panelEntries} canRedo={canRedo} redosLeft={redosLeft} onRedo={onRedo} />
    </aside>
  );

  return (
    <>
      <TopContextBar
        title={card.title}
        subtitle={finished ? 'Role play finished' : `Exchange ${shownStep} of ${total}`}
        showBack
        onBack={onExit}
        backLabel="Leave the role play"
      />
      <PageShell maxWidth="xl" gap={16}>
        <div className="flex flex-col gap-1.5">
          <span className="block h-1 overflow-hidden rounded-pill bg-track" aria-hidden="true">
            <motion.span
              className="block h-full rounded-pill bg-progress"
              initial={false}
              animate={{ width: `${total > 0 ? (answered / total) * 100 : 0}%` }}
              transition={fill(0)}
            />
          </span>
          <span className="text-caption text-ink-subtle">
            <span className="font-numeral">{answered}</span> of <span className="font-numeral">{total}</span> answered
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex w-full flex-col gap-4">
            <ol aria-live="polite" aria-label="Conversation" className="flex flex-col gap-3">
              {messages.map((msg) => {
                const isExaminer = msg.sender === 'ai';
                const hidden = isExaminer && !showText && !revealed.has(msg.id);
                return (
                  <motion.li
                    key={msg.id}
                    variants={item}
                    initial="hidden"
                    animate="show"
                    className={`flex flex-col gap-1 ${isExaminer ? 'items-start' : 'items-end'}`}
                  >
                    <span className="text-eyebrow uppercase text-ink-subtle">
                      {isExaminer ? card.npc.nameFr : 'You'}
                    </span>
                    {isExaminer ? (
                      <div className="flex max-w-[85%] flex-col gap-2 rounded-card border border-hairline bg-surface px-4 py-3">
                        {hidden ? (
                          <p className="text-body-s text-ink-muted">Listen, then answer.</p>
                        ) : (
                          <p lang="fr" className="exam-serif text-body-l text-ink">{msg.text}</p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          <Button variant="quiet" size="sm" onClick={() => onReplay(msg.text)} disabled={recording.isRecording}>
                            <Volume2 size={14} aria-hidden="true" /> Listen again
                          </Button>
                          {hidden && (
                            <Button
                              variant="quiet"
                              size="sm"
                              onClick={() => setRevealed((prev) => new Set(prev).add(msg.id))}
                            >
                              <Eye size={14} aria-hidden="true" /> Show words
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p lang="fr" className="max-w-[85%] rounded-card bg-action-soft px-4 py-3 text-body-base text-ink">
                        {msg.text || <span className="text-ink-subtle">(nothing heard)</span>}
                      </p>
                    )}
                  </motion.li>
                );
              })}
              {isTyping && (
                <li role="status" className="text-body-s text-ink-subtle">
                  <span lang="fr">{card.npc.nameFr}</span> is speaking…
                </li>
              )}
            </ol>

            {awaitingAnswer && task?.promptEn && !recording.isRecording && (
              <motion.div variants={item} initial="hidden" animate="show" className="flex flex-col gap-1 rounded-card surface-recessed p-4">
                <span className="text-eyebrow uppercase text-ink-subtle">Your task</span>
                <p className="text-body-base text-ink">{task.promptEn}</p>
              </motion.div>
            )}

            {showRecorder && (
              <SpeakingConsentGate>
                <RecordingPanel
                  isActive
                  recording={recording}
                  onStop={onStopRecording}
                  compact={!desktop}
                  hint="Answer in one or two full sentences"
                  lengthMeter={false}
                />
              </SpeakingConsentGate>
            )}

            {finished && !recording.isRecording && (
              <motion.section
                variants={item}
                initial="hidden"
                animate="show"
                aria-labelledby="drill-finished"
                className="flex flex-col gap-4 rounded-card surface p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-progress text-action-ink" aria-hidden="true">
                    <Check size={16} strokeWidth={3} />
                  </span>
                  <div className="flex flex-col gap-1">
                    <h2 id="drill-finished" className="text-section text-ink">Role play finished</h2>
                    <p className="text-body-s text-ink-muted">
                      You answered all <span className="font-numeral">{total}</span> exchanges. Read the coaching on each
                      answer, redo the ones you'd say differently, then try another card.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button size="lg" onClick={onNext} data-testid="drill-next">Next card</Button>
                  <Button variant="secondary" size="lg" onClick={onAgain}>Try this card again</Button>
                  <Button variant="quiet" size="lg" onClick={onExit}>All cards</Button>
                </div>
              </motion.section>
            )}
            <div ref={endRef} />
          </div>

          {feedback}
        </div>
      </PageShell>
    </>
  );
}
