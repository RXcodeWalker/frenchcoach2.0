import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Crosshair, Flame, RefreshCw, Target, Trophy } from 'lucide-react';
import { EMOJI_QUESTIONS } from '../../data/emojiQuestions';
import { gradeFromStats, RUBRICS, type LetterGrade } from '../../features/minigames';
import { celebrate, enter, enterReduced, fill } from '../../components/motion/variants';
import { CountUp } from '../../components/motion/CountUp';
import { PageShell } from '../../components/layout/PageShell';
import { TopContextBar } from '../../components/TopContextBar';
import { Button } from '../../components/ui/Button';
import { Stat } from '../../components/ui/Stat';
import { getModeBest, shouldUpdatePersonalBest, updatePersonalBest } from './emojiMasterStorage';
import { MODE_META } from './modes';
import { isFixedLengthMode, missedQuestionIds } from './scoring';
import { recordRun, summarizeCollection, type CollectionSummary } from './wordCollection';
import { HearButton } from './ui/HearButton';
import type { SessionCompletion } from './types';

interface EmojiMasterResultsProps {
  completion: SessionCompletion;
  onPlayAgain: () => void;
  /** Starts a retry round with these words (fixed-length modes only). */
  onRetryMisses: (questionIds: string[]) => void;
  onChangeMode: () => void;
  onBackToExplore: () => void;
}

const TITLES: Record<SessionCompletion['endReason'], string> = {
  victory: 'Victory',
  defeat: 'Defeated',
  timeout: "Time's up",
  quit: 'Run ended',
  completed: 'Round complete',
};

const GRADE_NOTE: Record<LetterGrade, string> = {
  S: 'Flawless decoding.',
  A: 'A strong run.',
  B: 'Solid. A few words to firm up.',
  C: 'Getting there. The misses below are your next words.',
  D: 'Every miss is a word you now know. Go again.',
};

function Tile({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-card border border-hairline bg-surface p-4">
      <div className="flex text-ink-muted">{icon}</div>
      <p className="mt-1.5 font-numeral text-num-m text-ink">{children}</p>
      <p className="text-[13px] font-normal text-ink-subtle">{label}</p>
    </div>
  );
}

export function EmojiMasterResults({
  completion,
  onPlayAgain,
  onRetryMisses,
  onChangeMode,
  onBackToExplore,
}: EmojiMasterResultsProps) {
  const reduced = useReducedMotion();
  const item = reduced ? enterReduced : enter;
  const doneRef = useRef(false);
  const [newBest, setNewBest] = useState(false);
  const [collection, setCollection] = useState<{ summary: CollectionSummary; newlyMastered: number } | null>(null);

  const graded = gradeFromStats(
    {
      score: completion.modeScore,
      correctAnswers: completion.correctAnswers,
      totalAnswered: completion.totalAnswered,
      maxStreak: completion.maxStreak,
      accuracy: 0,
    },
    RUBRICS.emojiMaster,
    'emojiMaster'
  );

  // Emoji Master earns no XP for now (see scoring.ts): this only saves the
  // personal best and the word collection, both local to this feature.
  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const result = recordRun(completion.history);
    setCollection({
      summary: summarizeCollection(result.collection, EMOJI_QUESTIONS),
      newlyMastered: result.newlyMastered.length,
    });
    if (completion.endReason !== 'quit' && !completion.isRetry) {
      const beats = shouldUpdatePersonalBest(completion.endReason, completion.modeScore, getModeBest(completion.mode));
      if (beats) {
        updatePersonalBest(completion, graded.grade);
        setNewBest(true);
      }
    }
  }, [completion, graded.grade]);

  const meta = MODE_META[completion.mode];
  const missedIds = missedQuestionIds(completion.history);
  const missed = missedIds
    .map((id) => completion.history.find((h) => h.questionId === id && !h.isCorrect))
    .filter((h): h is NonNullable<typeof h> => !!h);
  const canRetry = missed.length > 0 && isFixedLengthMode(completion.mode);

  return (
    <>
      <TopContextBar title="Emoji Master" subtitle={`${meta.title} · results`} showBack onBack={onBackToExplore} backLabel="Back to Explore" />
      <PageShell maxWidth="md" gap={16}>
        <motion.section variants={item} className="flex flex-col items-center gap-3 rounded-card border border-hairline bg-surface p-6 text-center shadow-card">
          <div
            aria-label={`Rank ${graded.grade}`}
            className="flex h-16 w-16 items-center justify-center rounded-card bg-action-soft font-numeral text-[36px] leading-none text-action-text"
          >
            {graded.grade}
          </div>
          <div>
            <h1 className="text-h2 text-ink">{TITLES[completion.endReason]}</h1>
            <p className="mt-1 text-body-s text-ink-muted">
              {completion.correctAnswers} of {completion.totalAnswered} right. {GRADE_NOTE[graded.grade]}
            </p>
          </div>
          {newBest && (
            <motion.div variants={reduced ? enterReduced : celebrate} initial="hidden" animate="show">
              <Stat role="progress" soft icon={<Trophy size={14} aria-hidden="true" />}>
                New personal best
              </Stat>
            </motion.div>
          )}
          {completion.isRetry && <p className="text-caption text-ink-subtle">Retry rounds don't change your personal best.</p>}
        </motion.section>

        <motion.div variants={item} className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile icon={<Target size={18} aria-hidden="true" />} label={meta.scoreLabel}>
            <CountUp value={completion.modeScore} />
          </Tile>
          <Tile icon={<Flame size={18} aria-hidden="true" className="text-streak-text" />} label="Best combo">
            <CountUp value={completion.maxStreak} />
          </Tile>
          <Tile icon={<Crosshair size={18} aria-hidden="true" />} label="Accuracy">
            <CountUp value={graded.accuracy} />%
          </Tile>
          <Tile icon={<Check size={18} aria-hidden="true" className="text-progress-text" />} label="Words right">
            <CountUp value={completion.correctAnswers} />
            <span className="text-body-s text-ink-subtle"> / {completion.totalAnswered}</span>
          </Tile>
        </motion.div>

        {collection && (
          <motion.section variants={item} aria-label="Your collection" className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-5 shadow-card">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-section text-ink">Your collection</h2>
              <p className="text-body-s text-ink-muted">
                <span className="font-numeral">{collection.summary.mastered}</span> of {collection.summary.total} words mastered
                {collection.newlyMastered > 0 && (
                  <span className="ml-2 font-semibold text-progress-text">+{collection.newlyMastered} new</span>
                )}
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-pill bg-track">
              <motion.div
                className="h-full rounded-pill bg-progress"
                initial={reduced ? false : { width: 0 }}
                animate={{ width: `${(collection.summary.mastered / Math.max(1, collection.summary.total)) * 100}%` }}
                transition={reduced ? { duration: 0.2 } : fill()}
              />
            </div>
          </motion.section>
        )}

        <motion.section variants={item} aria-label="Words to revisit" className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-5 shadow-card">
          <h2 className="text-section text-ink">Words to revisit</h2>
          {missed.length === 0 ? (
            <p className="flex items-center gap-2 text-body-s text-progress-text">
              <Check size={16} aria-hidden="true" />
              {completion.totalAnswered === 0 ? 'No answers this run.' : 'No misses. Every word decoded.'}
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-hairline">
              {missed.map((m) => (
                <li key={m.questionId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span
                    className={`flex h-12 min-w-12 shrink-0 items-center justify-center rounded-control bg-surface-recessed px-2 leading-none ${
                      m.emojis.length > 6 ? 'text-[20px]' : 'text-[28px]'
                    }`}
                  >
                    {m.emojis}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[15px] font-semibold text-ink" lang="fr">
                      {m.french}
                    </span>
                    <span className="text-body-s text-ink-subtle">{m.english}</span>
                    {m.userAnswer && m.userAnswer !== '(no answer)' && (
                      <span className="text-caption text-correction-text line-through" lang={m.promptKind === 'french' ? undefined : 'fr'}>
                        {m.userAnswer}
                      </span>
                    )}
                  </span>
                  <HearButton text={m.french} />
                </li>
              ))}
            </ul>
          )}
        </motion.section>

        <motion.div variants={item} className="flex flex-col gap-2">
          <Button size="lg" onClick={onPlayAgain} className="w-full">
            <RefreshCw size={18} aria-hidden="true" />
            Play again
          </Button>
          {canRetry && (
            <Button size="lg" variant="secondary" onClick={() => onRetryMisses(missedIds)} className="w-full">
              Retry the {missedIds.length} missed {missedIds.length === 1 ? 'word' : 'words'}
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="quiet" onClick={onChangeMode} className="flex-1">
              Change mode
            </Button>
            <Button variant="quiet" onClick={onBackToExplore} className="flex-1">
              Back to Explore
            </Button>
          </div>
        </motion.div>
      </PageShell>
    </>
  );
}
