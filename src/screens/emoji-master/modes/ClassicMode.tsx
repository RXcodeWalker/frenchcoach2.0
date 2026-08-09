import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import { EMOJI_QUESTIONS, type EmojiQuestion } from '../../../data/emojiQuestions';
import {
  GameFeedbackOverlay,
  FloatingXPOverlay,
  StreakBadge,
  GameHUD,
  shakeAnimation,
  shakeTransition,
  getOverdriveCardClasses,
  useFloatingXP,
} from '../../../features/minigames';
import { FEEDBACK_DWELL_MS } from '../types';
import type { UseEmojiMasterRunResult } from '../useEmojiMasterRun';

interface McqModeProps {
  run: UseEmojiMasterRunResult;
  reverse?: boolean;
  onQuit: () => void;
}

function resolveReverseChoices(question: EmojiQuestion): string[] {
  return question.options.map((frenchOpt) => {
    if (frenchOpt === question.french) return question.emojis;
    const found = EMOJI_QUESTIONS.find((x) => x.french === frenchOpt);
    return found?.emojis ?? '❓';
  });
}

export function ClassicMode({ run, reverse = false, onQuit }: McqModeProps) {
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const lockedRef = useRef(false);
  const { items: floatingXPs, add: addFloatingXP } = useFloatingXP();

  const q = run.currentQuestion;

  useEffect(() => {
    lockedRef.current = false;
    setFeedback(null);
    setSelected(null);
    setShaking(false);
  }, [q?.id]);

  if (!q) return null;

  const choices = reverse ? resolveReverseChoices(q) : q.options;
  const correctAnswer = reverse ? q.emojis : q.french;

  const handleSelect = (option: string) => {
    if (lockedRef.current || feedback) return;
    lockedRef.current = true;
    setSelected(option);
    const isCorrect = option === correctAnswer;

    run.recordAnswer({
      userAnswer: option,
      correctAnswer,
      isCorrect,
      promptKind: reverse ? 'french' : 'emoji',
      scoreDelta: isCorrect ? 1 : 0,
    });

    if (isCorrect) {
      setFeedback('correct');
      addFloatingXP({ amount: 10, x: Math.random() * 40 - 20 });
      window.setTimeout(() => {
        const advanced = run.advanceQuestion();
        if (!advanced) run.endRun('completed');
      }, FEEDBACK_DWELL_MS.correct);
    } else {
      setFeedback('incorrect');
      setShaking(true);
      window.setTimeout(() => setShaking(false), 500);
      window.setTimeout(() => {
        const advanced = run.advanceQuestion();
        if (!advanced) run.endRun('completed');
      }, FEEDBACK_DWELL_MS.incorrect);
    }
  };

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
          <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500">
            {run.questionIndex + 1} / {run.deckLength}
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
        {reverse ? (
          <h2 className="text-4xl md:text-5xl font-black text-white">{q.french}</h2>
        ) : (
          <div className="text-8xl md:text-9xl leading-none">{q.emojis}</div>
        )}
        <p className="mt-4 text-slate-400 font-bold">
          {reverse ? 'Choose the correct emoji' : 'What is this in French?'}
        </p>
        <GameFeedbackOverlay
          feedback={feedback}
          correctAnswer={correctAnswer}
          variant="card"
        />
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {choices.map((option, i) => {
          const isCorrect = option === correctAnswer;
          const isSelected = selected === option;
          let status =
            'border-white/10 hover:border-white/20 hover:bg-white/5';
          if (feedback) {
            if (isCorrect) status = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400';
            else if (isSelected) status = 'border-red-500/50 bg-red-500/10 text-red-400';
            else status = 'opacity-40 border-white/5';
          }

          return (
            <motion.button
              key={`${option}-${i}`}
              type="button"
              disabled={!!feedback}
              onClick={() => handleSelect(option)}
              className={`glass-elevated p-5 rounded-2xl text-lg font-bold transition-all text-center relative ${status}`}
              whileHover={!feedback ? { y: -2, scale: 1.02 } : {}}
              whileTap={!feedback ? { scale: 0.98 } : {}}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <span className={reverse ? 'text-4xl' : ''}>{option}</span>
              {feedback && isCorrect && (
                <CheckCircle2
                  size={18}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500"
                />
              )}
              {feedback && isSelected && !isCorrect && (
                <XCircle
                  size={18}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export function ReverseMode(props: Omit<McqModeProps, 'reverse'>) {
  return <ClassicMode {...props} reverse />;
}
