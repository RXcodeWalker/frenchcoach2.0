import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles } from 'lucide-react';
import {
  GameFeedbackOverlay,
  FloatingXPOverlay,
  StreakBadge,
  GameHUD,
  matchTypedAnswer,
  useFloatingXP,
  shakeAnimation,
  shakeTransition,
  getOverdriveCardClasses,
} from '../../../features/minigames';
import { FEEDBACK_DWELL_MS } from '../types';
import type { UseEmojiMasterRunResult } from '../useEmojiMasterRun';
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

const TAUNTS = [
  'Decode me if you can!',
  'Your vocabulary is weak!',
  'Is that all you know?',
  'French power!',
  'Try harder, élève!',
];

interface ArenaModeProps {
  run: UseEmojiMasterRunResult;
  onQuit: () => void;
}

interface DamageFloat {
  id: number;
  value: number;
  x: number;
}

export function ArenaMode({ run, onQuit }: ArenaModeProps) {
  const [bossHp, setBossHp] = useState(BOSS_HP);
  const [hearts, setHearts] = useState(PLAYER_HEARTS);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [userInput, setUserInput] = useState('');
  const [shaking, setShaking] = useState(false);
  const [bossShake, setBossShake] = useState(false);
  const [taunt, setTaunt] = useState<string | null>(null);
  const [damageFloats, setDamageFloats] = useState<DamageFloat[]>([]);
  const lockedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextFloatId = useRef(0);
  const { items: floatingXPs, add: addFloatingXP } = useFloatingXP();

  const q = run.currentQuestion;
  const overdrive = isOverdriveActive(run.streak);

  useEffect(() => {
    lockedRef.current = false;
    setFeedback(null);
    setUserInput('');
    setShaking(false);
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, [q?.id]);

  function spawnDamage(value: number) {
    const id = nextFloatId.current++;
    const x = Math.random() * 60 - 30;
    setDamageFloats((prev) => [...prev, { id, value, x }]);
    window.setTimeout(() => {
      setDamageFloats((prev) => prev.filter((d) => d.id !== id));
    }, 900);
  }

  function showTaunt() {
    const t = TAUNTS[Math.floor(Math.random() * TAUNTS.length)];
    setTaunt(t);
    window.setTimeout(() => setTaunt(null), 2200);
  }

  function afterHit(
    nextBossHp: number,
    nextHearts: number,
    dwellMs: number
  ) {
    window.setTimeout(() => {
      if (isArenaVictory(nextBossHp, nextHearts)) {
        run.endRun('victory');
        return;
      }
      if (isArenaDefeat(nextHearts)) {
        run.endRun('defeat');
        return;
      }
      run.advanceQuestion({ bossHpRatio: nextBossHp / BOSS_HP });
    }, dwellMs);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lockedRef.current || !q || !userInput.trim()) return;
    lockedRef.current = true;

    const isCorrect = matchTypedAnswer(userInput, q.french);

    if (isCorrect) {
      const nextStreak = run.streak + 1;
      const damage = computeArenaDamage(nextStreak, q.difficulty);
      const nextBossHp = applyBossDamage(bossHp, damage);

      run.recordAnswer({
        userAnswer: userInput,
        correctAnswer: q.french,
        isCorrect: true,
        promptKind: 'emoji',
        scoreDelta: damage,
      });

      setBossHp(nextBossHp);
      setFeedback('correct');
      spawnDamage(damage);
      setBossShake(true);
      window.setTimeout(() => setBossShake(false), 400);
      addFloatingXP({ amount: Math.min(damage, 40), x: Math.random() * 40 - 20 });
      afterHit(nextBossHp, hearts, FEEDBACK_DWELL_MS.correct);
    } else {
      const nextHearts = applyHeartLoss(hearts);
      run.recordAnswer({
        userAnswer: userInput,
        correctAnswer: q.french,
        isCorrect: false,
        promptKind: 'emoji',
        scoreDelta: 0,
      });
      setHearts(nextHearts);
      setFeedback('incorrect');
      setShaking(true);
      window.setTimeout(() => setShaking(false), 500);
      showTaunt();
      afterHit(bossHp, nextHearts, FEEDBACK_DWELL_MS.incorrect);
    }
  }

  if (!q) return null;

  const hpPct = (bossHp / BOSS_HP) * 100;
  const spiritEmoji =
    run.runConfig?.category === 'animals'
      ? '🐯'
      : run.runConfig?.category === 'food'
        ? '🥐'
        : run.runConfig?.category === 'nature'
          ? '🌲'
          : run.runConfig?.category === 'objects'
            ? '📦'
            : run.runConfig?.category === 'sentences'
              ? '💬'
              : '🎨';

  return (
    <div className="space-y-5">
      <GameHUD
        left={
          <button
            type="button"
            onClick={onQuit}
            className="text-xs font-bold text-ink-muted hover:text-white"
          >
            Quit
          </button>
        }
        center={
          <div className="flex items-center gap-1">
            {Array.from({ length: PLAYER_HEARTS }).map((_, i) => (
              <Heart
                key={i}
                size={18}
                className={
                  i < hearts
                    ? 'text-red-500 fill-red-500'
                    : 'text-ink-subtle fill-slate-800'
                }
              />
            ))}
          </div>
        }
        right={
          <>
            <StreakBadge streak={run.streak} isOverdrive={overdrive} />
            <div className="glass-elevated px-3 py-1.5 rounded-full text-sm font-black text-amber-300">
              DMG {run.score}
            </div>
          </>
        }
      />

      {/* Boss spirit */}
      <div className="relative glass-elevated p-5 rounded-3xl border border-yellow-500/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{spiritEmoji}</span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500">
                Emoji Spirit
              </p>
              <p className="text-sm font-bold text-white">
                {bossHp <= BOSS_HP * 0.5 ? 'Enraged!' : 'Challenging you'}
              </p>
            </div>
          </div>
          <span className="font-mono text-sm font-bold text-ink-muted">
            {bossHp}/{BOSS_HP}
          </span>
        </div>
        <div className="h-3 rounded-full bg-white/5 overflow-hidden border border-white/10">
          <motion.div
            className={`h-full ${
              bossHp <= BOSS_HP * 0.5 ? 'bg-red-500' : 'bg-amber-400'
            }`}
            animate={{ width: `${hpPct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          />
        </div>

        <AnimatePresence>
          {taunt && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-white whitespace-nowrap z-10"
            >
              {taunt}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {damageFloats.map((d) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: -40 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 right-10 text-2xl font-black text-amber-400 pointer-events-none"
              style={{ marginLeft: d.x }}
            >
              -{d.value}
            </motion.div>
          ))}
        </AnimatePresence>

        <motion.div
          animate={bossShake ? { x: [-6, 6, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.35 }}
          className="absolute inset-0 pointer-events-none rounded-3xl"
        />
      </div>

      <motion.div
        key={q.id}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={
          shaking
            ? { ...shakeAnimation, scale: 1, opacity: 1 }
            : { scale: 1, opacity: 1, x: 0 }
        }
        transition={shaking ? shakeTransition : { type: 'spring', damping: 14 }}
        className={`glass-elevated p-8 rounded-3xl text-center relative ${getOverdriveCardClasses(overdrive)}`}
      >
        <FloatingXPOverlay items={floatingXPs} />
        {overdrive && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-400">
            <Sparkles size={12} /> Overdrive ×2
          </div>
        )}
        <div className="text-8xl md:text-9xl leading-none">{q.emojis}</div>
        <p className="mt-4 text-ink-muted font-bold">Strike with the French word!</p>
        <GameFeedbackOverlay
          feedback={feedback}
          correctAnswer={q.french}
          variant="card"
        />
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          ref={inputRef}
          autoFocus
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          disabled={!!feedback}
          placeholder="Type to attack..."
          className="w-full bg-white/5 border-2 border-yellow-500/20 rounded-2xl p-5 text-2xl font-bold text-white text-center focus:border-yellow-400 outline-none transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!!feedback || !userInput.trim()}
          className="w-full py-4 bg-yellow-400 text-slate-950 font-black rounded-xl hover:bg-yellow-300 transition-all disabled:opacity-50"
        >
          ATTACK
        </button>
      </form>
    </div>
  );
}
