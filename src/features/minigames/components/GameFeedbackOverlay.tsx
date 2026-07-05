import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';

export type GameFeedbackType = 'correct' | 'incorrect' | 'timeout';

interface GameFeedbackOverlayProps {
  feedback: GameFeedbackType | null;
  correctAnswer?: string;
  correctLabel?: string;
  incorrectLabel?: string;
  timeoutLabel?: string;
  variant?: 'card' | 'toast';
  className?: string;
}

export function GameFeedbackOverlay({
  feedback,
  correctAnswer,
  correctLabel = 'Correct Answer:',
  incorrectLabel,
  timeoutLabel = 'Time is up!',
  variant = 'card',
  className = '',
}: GameFeedbackOverlayProps) {
  if (variant === 'toast') {
    return (
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`fixed bottom-12 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl font-black text-xl shadow-2xl z-50 ${
              feedback === 'correct'
                ? 'bg-emerald-500 text-white'
                : 'bg-red-500 text-white'
            } ${className}`}
          >
            {feedback === 'correct' ? (
              <div className="flex items-center gap-3">
                <CheckCircle2 />
                EXCELLENT!
              </div>
            ) : (
              incorrectLabel ?? 'OUPS!'
            )}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {feedback && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`absolute inset-0 flex flex-col items-center justify-center z-10 p-6 text-center ${
            feedback === 'correct'
              ? 'bg-emerald-500/30 backdrop-blur-sm'
              : 'bg-red-500/30 backdrop-blur-sm'
          } ${className}`}
        >
          {feedback === 'correct' ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10 }}
            >
              <CheckCircle2
                size={100}
                className="text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]"
              />
            </motion.div>
          ) : feedback === 'timeout' ? (
            <div className="space-y-4">
              <motion.div
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
              >
                <TimerIcon />
              </motion.div>
              <p className="text-2xl font-black text-white uppercase tracking-widest">
                {timeoutLabel}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <motion.div
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
              >
                <XCircle
                  size={80}
                  className="text-red-400 mx-auto drop-shadow-[0_0_15px_rgba(248,113,113,0.5)]"
                />
              </motion.div>
              {correctAnswer && (
                <div className="space-y-2">
                  <p className="text-red-300 font-bold uppercase text-[10px] tracking-[0.2em]">
                    {correctLabel}
                  </p>
                  <p className="text-2xl font-black text-white">{correctAnswer}</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TimerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="80"
      height="80"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-red-400 mx-auto"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
