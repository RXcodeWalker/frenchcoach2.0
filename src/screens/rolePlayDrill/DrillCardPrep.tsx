import { motion, useReducedMotion } from 'framer-motion';
import { Ear, Play } from 'lucide-react';
import { PageShell } from '../../components/layout/PageShell';
import { TopContextBar } from '../../components/TopContextBar';
import { Button } from '../../components/ui/Button';
import { Toggle } from '../../components/ui/SettingToggle';
import { SpeakingConsentGate } from '../../components/SpeakingConsentGate';
import { enter, enterReduced } from '../../components/motion/variants';
import { hasEnglishInstructions, type StoryCard } from '../../data/storyCards';
import type { CardProgress } from '../../features/rolePlayDrill/drillProgress';

interface Props {
  card: StoryCard;
  progress?: CardProgress;
  showText: boolean;
  onShowTextChange: (on: boolean) => void;
  /** A French voice is available and the examiner isn't muted, so listen-only practice is possible. */
  canHear: boolean;
  onStart: () => void;
  onBack: () => void;
}

/** The card itself, read before starting — the "preparation" moment of the real role play. */
export function DrillCardPrep({ card, progress, showText, onShowTextChange, canHear, onStart, onBack }: Props) {
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  const guided = hasEnglishInstructions(card);
  const listenOnly = canHear && !showText;

  return (
    <>
      <TopContextBar title={card.title} subtitle="Role-play card" showBack onBack={onBack} backLabel="Back to the cards" />
      <PageShell maxWidth="md" gap={16}>
        <motion.article variants={item} aria-labelledby="drill-card-title" className="flex flex-col gap-5 rounded-card surface p-6">
          <div className="flex flex-col gap-2">
            <span className="text-eyebrow uppercase text-ink-subtle">Role-play card</span>
            <h1 id="drill-card-title" lang="fr" className="exam-serif text-title text-ink">{card.title}</h1>
          </div>
          <p lang={card.paperId ? 'fr' : 'en'} className="exam-serif text-body-l text-ink">{card.scenario}</p>
          <p className="text-body-s text-ink-muted">
            The examiner plays <span lang="fr" className="font-semibold text-ink">{card.npc.nameFr}</span>.
            {progress && progress.answered > 0 && (
              <> You've answered <span className="font-numeral">{progress.answered}</span> of <span className="font-numeral">{progress.total}</span> exchanges on this card before.</>
            )}
          </p>

          {guided ? (
            <section aria-labelledby="drill-tasks" className="flex flex-col gap-3 border-t border-hairline pt-5">
              <h2 id="drill-tasks" className="text-section text-ink">Your tasks</h2>
              <ol className="flex flex-col gap-2.5">
                {card.tasks.map((task, i) => (
                  <li key={task.taskId} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border border-hairline-strong font-numeral text-caption text-ink-muted">
                      {i + 1}
                    </span>
                    <span className="text-body-base text-ink">{task.promptEn}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : (
            <p className="border-t border-hairline pt-5 text-body-s text-ink-muted">
              There are <span className="font-numeral">{card.tasks.length}</span> exchanges. Like the real card,
              you only find out each question when the examiner asks it, so listen carefully and answer it.
            </p>
          )}
        </motion.article>

        <motion.section variants={item} aria-label="How to answer" className="flex flex-col gap-1 rounded-card surface-recessed p-4">
          <p className="text-label text-ink">How to do well</p>
          <p className="text-body-s text-ink-muted">
            Answer every part of each question in one or two full sentences, using the verb from the question.
            Short and complete beats long and off-topic.
          </p>
        </motion.section>

        <motion.div variants={item}>
          <button
            type="button"
            role="switch"
            aria-checked={listenOnly}
            disabled={!canHear}
            onClick={() => onShowTextChange(!showText)}
            className="flex w-full items-center gap-4 rounded-card surface p-4 text-left disabled:cursor-not-allowed"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-surface-recessed text-ink-muted" aria-hidden="true">
              <Ear size={16} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-label text-ink">Listen only</span>
              <span className="text-body-s text-ink-muted">
                {canHear
                  ? "Hide the examiner's words, like the real exam. You can still show any line."
                  : "No French voice is available on this device, so the examiner's words are shown."}
              </span>
            </span>
            <Toggle on={listenOnly} />
          </button>
        </motion.div>

        <motion.div variants={item} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SpeakingConsentGate>
            <Button size="lg" onClick={onStart} data-testid="drill-start">
              <Play size={16} aria-hidden="true" /> Start role play
            </Button>
          </SpeakingConsentGate>
          <Button variant="quiet" onClick={onBack}>Choose another card</Button>
        </motion.div>
      </PageShell>
    </>
  );
}
