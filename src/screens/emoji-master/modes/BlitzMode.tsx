import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Timer } from 'lucide-react';
import {
  GameFeedbackOverlay,
  FloatingXPOverlay,
  StreakBadge,
  GameHUD,
  GameTimerBar,
  matchTypedAnswer,
  useFloatingXP,
  useGameTimer,
  shakeAnimation,
  shakeTransition,
  getOverdriveCardClasses,
  getSpeedMultiplier,
} from '../../../features/minigames';
import { BLITZ_SECONDS, FEEDBACK_DWELL_MS } from '../types';
import type { UseEmojiMasterRunResult } from '../useEmojiMasterRun';

interface BlitzModeProps {
  run: UseEmojiMasterRunResult;
  onQuit: () => void;
}

export function BlitzMode({ run, onQuit }: BlitzModeProps) {
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [userInput, setUserInput] = useState('');
  const [shaking, setShaking] = useState(false);
  const lockedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const questionStartedAt = useRef(Date.now());
  const { items: floatingXPs, add: addFloatingXP } = useFloatingXP();

  const q = run.currentQuestion;

  const timer = useGameTimer({
    mode: 'global',
    initialSeconds: BLITZ_SECONDS,
    active: run.phase === 'playing',
    onExpire: () => {
      if (!lockedRef.current) {
        run.endRun('timeout');
      }
    },
  });

  useEffect(() => {
    if (run.phase === 'playing') {
      timer.reset(BLITZ_SECONDS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.phase]);

  useEffect(() => {
    lockedRef.current = false;
    setFeedback(null);
    setUserInput('');
    setShaking(false);
    questionStartedAt.current = Date.now();
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, [q?.id]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lockedRef.current || !q || !userInput.trim() || timer.isExpired) return;
    lockedRef.current = true;

    const latencyMs = Date.now() - questionStartedAt.current;
    const isCorrect = matchTypedAnswer(userInput, q.french);

    let scoreDelta = 0;
    if (isCorrect) {
      const speed = getSpeedMultiplier(latencyMs / 1000);
      scoreDelta = 1;
      addFloatingXP({
        amount: Math.round(10 * speed.multiplier),
        x: Math.random() * 40 - 20,
      });
    }

    run.recordAnswer({
      userAnswer: userInput,
      correctAnswer: q.french,
      isCorrect,
      promptKind: 'emoji',
      scoreDelta,
      latencyMs,
    });

    if (isCorrect) {
      setFeedback('correct');
      window.setTimeout(() => {
        lockedRef.current = false;
        if (timer.isExpired) {
          run.endRun('timeout');
          return;
        }
        run.advanceQuestion();
      }, FEEDBACK_DWELL_MS.correct);
    } else {
      setFeedback('incorrect');
      setShaking(true);
      window.setTimeout(() => setShaking(false), 500);
      window.setTimeout(() => {
        lockedRef.current = false;
        if (timer.isExpired) {
          run.endRun('timeout');
          return;
        }
        run.advanceQuestion();
      }, FEEDBACK_DWELL_MS.incorrect);
    }
  }

  if (!q) return null;

  return (
    <div className="space-y-6">
      <GameHUD
        left={
          <button
            type="button"
            onClick={onQuit}
            className="text-xs font-bold text-slate-500 hover:text-white"
          >
            Quit
          </button>
        }
        center={
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border font-mono font-bold ${
              timer.isCritical
                ? 'border-red-500/50 text-red-400 bg-red-500/10'
                : 'border-white/10 text-slate-300'
            }`}
          >
            <Timer size={14} />
            {Math.ceil(timer.timeLeft)}s
          </div>
        }
        right={
          <>
            <StreakBadge streak={run.streak} isOverdrive={run.isOverdrive} />
            <div className="glass-elevated px-3 py-1.5 rounded-full text-sm font-black text-white">
              {run.score}
            </div>
          </>
        }
      />

      <GameTimerBar
        timeLeft={timer.timeLeft}
        maxTime={timer.maxTime}
        isCritical={timer.isCritical}
        isOverdrive={run.isOverdrive}
        accentColor="red"
        showLabel={false}
      />

      <motion.div
        key={q.id}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={
          shaking
            ? { ...shakeAnimation, scale: 1, opacity: 1 }
            : { scale: 1, opacity: 1, x: 0 }
        }
        transition={shaking ? shakeTransition : { type: 'spring', damping: 14 }}
        className={`glass-elevated p-8 rounded-3xl text-center relative ${getOverdriveCardClasses(run.isOverdrive)}`}
      >
        <FloatingXPOverlay items={floatingXPs} />
        <div className="text-8xl md:text-9xl leading-none">{q.emojis}</div>
        <p className="mt-4 text-slate-400 font-bold">Speed Blitz — type fast!</p>
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
          disabled={!!feedback || timer.isExpired}
          placeholder="Type your answer..."
          className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-5 text-2xl font-bold text-white text-center focus:border-red-500 outline-none transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!!feedback || !userInput.trim() || timer.isExpired}
          className="w-full py-4 bg-red-600 text-white font-black rounded-xl hover:bg-red-500 transition-all disabled:opacity-50"
        >
          GO
        </button>
      </form>
    </div>
  );
}
