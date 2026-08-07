import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
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
} from '../../../features/minigames';
import {
  FEEDBACK_DWELL_MS,
  HARDCORE_SECONDS_BY_DIFFICULTY,
} from '../types';
import type { UseEmojiMasterRunResult } from '../useEmojiMasterRun';

interface HardcoreModeProps {
  run: UseEmojiMasterRunResult;
  onQuit: () => void;
}

export function HardcoreMode({ run, onQuit }: HardcoreModeProps) {
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | 'timeout' | null>(null);
  const [userInput, setUserInput] = useState('');
  const [shaking, setShaking] = useState(false);
  const lockedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { items: floatingXPs, add: addFloatingXP } = useFloatingXP();

  const q = run.currentQuestion;
  const initialSeconds = q
    ? HARDCORE_SECONDS_BY_DIFFICULTY[q.difficulty]
    : 8;

  const timer = useGameTimer({
    mode: 'perQuestion',
    initialSeconds,
    active: run.phase === 'playing' && !feedback,
    onExpire: () => handleMiss('timeout'),
  });

  useEffect(() => {
    lockedRef.current = false;
    setFeedback(null);
    setUserInput('');
    setShaking(false);
    if (q) {
      timer.reset(HARDCORE_SECONDS_BY_DIFFICULTY[q.difficulty]);
    }
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on question change
  }, [q?.id]);

  function finishAfterFeedback(isCorrect: boolean) {
    const dwell = isCorrect ? FEEDBACK_DWELL_MS.correct : FEEDBACK_DWELL_MS.incorrect;
    window.setTimeout(() => {
      const advanced = run.advanceQuestion();
      if (!advanced) run.endRun('completed');
    }, dwell);
  }

  function handleMiss(kind: 'incorrect' | 'timeout') {
    if (lockedRef.current || !q) return;
    lockedRef.current = true;
    setFeedback(kind);
    setShaking(true);
    window.setTimeout(() => setShaking(false), 500);
    run.recordAnswer({
      userAnswer: userInput || '(timeout)',
      correctAnswer: q.french,
      isCorrect: false,
      promptKind: 'emoji',
      scoreDelta: 0,
    });
    finishAfterFeedback(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lockedRef.current || !q || !userInput.trim()) return;
    lockedRef.current = true;

    const isCorrect = matchTypedAnswer(userInput, q.french);
    run.recordAnswer({
      userAnswer: userInput,
      correctAnswer: q.french,
      isCorrect,
      promptKind: 'emoji',
      scoreDelta: isCorrect ? 1 : 0,
    });

    if (isCorrect) {
      setFeedback('correct');
      addFloatingXP({ amount: 15, x: Math.random() * 40 - 20 });
      finishAfterFeedback(true);
    } else {
      setFeedback('incorrect');
      setShaking(true);
      window.setTimeout(() => setShaking(false), 500);
      finishAfterFeedback(false);
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
          <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">
            {run.questionIndex + 1} / {run.deckLength} · Hardcore
          </span>
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
        accentColor="purple"
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
        <p className="mt-4 text-slate-400 font-bold">Type the French word</p>
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
          placeholder="Type your answer..."
          className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-5 text-2xl font-bold text-white text-center focus:border-purple-500 outline-none transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!!feedback || !userInput.trim()}
          className="w-full py-4 bg-purple-600 text-white font-black rounded-xl hover:bg-purple-500 transition-all disabled:opacity-50"
        >
          SUBMIT
        </button>
      </form>
    </div>
  );
}
