import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, Swords } from 'lucide-react';
import { enter, enterReduced, fill } from '../../../components/motion/variants';
import { Stat } from '../../../components/ui/Stat';
import { matchTypedAnswer } from '../../../features/minigames';
import { FEEDBACK_DWELL_MS } from '../types';
import type { UseEmojiMasterRunResult } from '../useEmojiMasterRun';
import { acceptableAnswers } from '../answers';
import { SPIRIT_BY_CATEGORY } from '../modes';
import { useLater, useTypedRound } from '../useRoundHelpers';
import { AnswerReveal } from '../ui/AnswerReveal';
import { EmojiStage } from '../ui/EmojiStage';
import { ComboChip, Hearts, HudRow, ScoreChip } from '../ui/Hud';
import { TypedAnswer } from '../ui/TypedAnswer';
import {
  applyBossDamage,
  applyHeartLoss,
  BOSS_HP,
  computeArenaDamage,
  isArenaDefeat,
  isArenaVictory,
  isOverdriveActive,
  PLAYER_HEARTS,
} from './arenaCombat';

// What the spirit says when you land a hit, and when you miss. The French is
// short and the meaning obvious from the moment.
const HIT_LINES = ['Aïe ! (Ouch!)', 'Touché !', 'Bien joué ! (Well played!)', 'Ça fait mal ! (That hurt!)'];
const MISS_LINES = [
  'Decode me if you can!',
  'Is that all you know?',
  'Encore ! (Again!)',
  'Try harder, élève!',
];

const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

export function ArenaMode({ run }: { run: UseEmojiMasterRunResult }) {
  const [bossHp, setBossHp] = useState(BOSS_HP);
  const [hearts, setHearts] = useState(PLAYER_HEARTS);
  const [lastHit, setLastHit] = useState<number | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const later = useLater();

  const q = run.currentQuestion;
  const { value, setValue, reveal, setReveal, lockedRef, inputRef } = useTypedRound(q?.id);
  const overdrive = isOverdriveActive(run.streak);

  /** Ends the fight if it's decided, otherwise draws the next word. */
  function proceed(nextBossHp: number, nextHearts: number) {
    if (isArenaVictory(nextBossHp, nextHearts)) {
      run.endRun('victory');
    } else if (isArenaDefeat(nextHearts)) {
      run.endRun('defeat');
    } else {
      setLastHit(null);
      run.advanceQuestion({ bossHpRatio: nextBossHp / BOSS_HP });
    }
  }

  function submit() {
    if (lockedRef.current || !q || !value.trim()) return;
    lockedRef.current = true;

    if (matchTypedAnswer(value, acceptableAnswers(q))) {
      const damage = computeArenaDamage(run.streak + 1, q.difficulty);
      const nextBossHp = applyBossDamage(bossHp, damage);
      run.recordAnswer({
        userAnswer: value,
        correctAnswer: q.french,
        isCorrect: true,
        promptKind: 'emoji',
        scoreDelta: damage,
      });
      setBossHp(nextBossHp);
      setLastHit(damage);
      setLine(pick(HIT_LINES));
      setReveal({ kind: 'correct' });
      later(() => proceed(nextBossHp, hearts), FEEDBACK_DWELL_MS.correct);
    } else {
      const nextHearts = applyHeartLoss(hearts);
      run.recordAnswer({
        userAnswer: value,
        correctAnswer: q.french,
        isCorrect: false,
        promptKind: 'emoji',
        scoreDelta: 0,
      });
      setHearts(nextHearts);
      setLine(pick(MISS_LINES));
      setReveal({ kind: 'miss', userAnswer: value.trim() });
    }
  }

  if (!q) return null;

  const hpPct = (bossHp / BOSS_HP) * 100;
  const enraged = bossHp <= BOSS_HP * 0.5;
  const fightOver = isArenaDefeat(hearts);

  return (
    <div className="flex flex-col gap-4">
      <HudRow
        left={<Hearts left={hearts} total={PLAYER_HEARTS} />}
        right={
          <>
            <ComboChip streak={run.streak} />
            <ScoreChip label="Damage" value={run.score} icon={<Swords size={14} aria-hidden="true" />} />
          </>
        }
      />

      <motion.section
        aria-label="Your opponent"
        variants={reduced ? enterReduced : enter}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4 shadow-card"
      >
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-card border border-hairline bg-surface-recessed text-[32px] leading-none"
          >
            {SPIRIT_BY_CATEGORY[run.runConfig?.category ?? 'all']}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-eyebrow uppercase text-ink-subtle">Emoji Spirit</p>
            <p className={`text-[15px] font-semibold ${enraged ? 'text-correction-text' : 'text-ink'}`}>
              {enraged ? 'Enraged' : 'Ready to duel'}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <p className="font-numeral text-num-m text-ink">
              {bossHp}
              <span className="text-body-s text-ink-subtle"> / {BOSS_HP}</span>
            </p>
            {lastHit !== null && (
              <motion.p
                key={`${run.questionIndex}-${lastHit}`}
                variants={reduced ? enterReduced : enter}
                initial="hidden"
                animate="show"
                className="font-numeral text-label text-action-text"
              >
                −{lastHit}
              </motion.p>
            )}
          </div>
        </div>
        <div
          role="progressbar"
          aria-label="Spirit health"
          aria-valuemin={0}
          aria-valuemax={BOSS_HP}
          aria-valuenow={bossHp}
          className="h-2 overflow-hidden rounded-pill bg-track"
        >
          <motion.div
            className="h-full rounded-pill bg-action"
            initial={false}
            animate={{ width: `${hpPct}%` }}
            transition={reduced ? { duration: 0.2 } : fill(0)}
          />
        </div>
        <p aria-live="polite" className="min-h-5 text-body-s text-ink-muted">
          {line ?? 'Decode the emoji to strike.'}
        </p>
      </motion.section>

      <EmojiStage
        questionKey={`${run.questionIndex}-${q.id}`}
        prompt={q.emojis}
        promptKind="emoji"
        small={q.category === 'sentences'}
        caption="Strike with the French word"
        outcome={!reveal ? null : reveal.kind === 'correct' ? 'correct' : 'incorrect'}
        badge={
          overdrive ? (
            <Stat role="streak" title="Overdrive" icon={<Sparkles size={14} aria-hidden="true" />}>
              Double damage
            </Stat>
          ) : undefined
        }
        reveal={reveal ? <AnswerReveal kind={reveal.kind} question={q} userAnswer={reveal.userAnswer} /> : undefined}
      />

      <TypedAnswer
        value={value}
        onChange={setValue}
        onSubmit={submit}
        inputRef={inputRef}
        locked={!!reveal}
        onNext={reveal && reveal.kind !== 'correct' ? () => proceed(bossHp, hearts) : undefined}
        nextLabel={fightOver ? 'See results' : 'Next'}
        submitLabel="Attack"
        placeholder="Type to attack"
        hint={q.category === 'sentences' ? undefined : "Include le, la, l' or les"}
      />
    </div>
  );
}
