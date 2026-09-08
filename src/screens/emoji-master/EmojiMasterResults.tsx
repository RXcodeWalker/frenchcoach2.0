import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Eye, RefreshCw, XCircle } from 'lucide-react';
import {
  GameResultsCard,
  gradeFromStats,
  RUBRICS,
  completeMinigameSession,
} from '../../features/minigames';
import { useApp } from '../../context/AppContext';
import { updatePersonalBest } from './emojiMasterStorage';
import type { SessionCompletion } from './types';

interface EmojiMasterResultsProps {
  completion: SessionCompletion;
  onPlayAgain: () => void;
  onChangeMode: () => void;
  onBackToExplore: () => void;
}

export function EmojiMasterResults({
  completion,
  onPlayAgain,
  onChangeMode,
  onBackToExplore,
}: EmojiMasterResultsProps) {
  const { dispatch } = useApp();
  const [showReview, setShowReview] = useState(false);
  const awardedRef = useRef(false);

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

  useEffect(() => {
    if (awardedRef.current) return;
    awardedRef.current = true;
    completeMinigameSession({ dispatch, score: completion.xpAwarded });
    if (completion.endReason !== 'quit') {
      updatePersonalBest(completion, graded.grade);
    }
  }, [completion, dispatch, graded.grade]);

  const title =
    completion.endReason === 'victory'
      ? 'Victory!'
      : completion.endReason === 'defeat'
        ? 'Defeated'
        : completion.endReason === 'timeout'
          ? 'Time!'
          : completion.endReason === 'quit'
            ? 'Run Ended'
            : 'Results!';

  const mistakes = completion.history.filter((h) => !h.isCorrect);

  if (showReview) {
    const rows = mistakes.length > 0 ? mistakes : completion.history;
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-white italic">
            {mistakes.length > 0 ? 'MISTAKE REVIEW' : 'SESSION REVIEW'}
          </h2>
          <button
            type="button"
            onClick={() => setShowReview(false)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white hover:bg-white/10"
          >
            Back to Results
          </button>
        </div>
        <div className="space-y-3">
          {rows.map((item, idx) => (
            <motion.div
              key={`${item.questionId}-${idx}`}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={`surface-raised p-4 rounded-xl border-l-4 ${
                item.isCorrect ? 'border-l-emerald-500' : 'border-l-red-500'
              }`}
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-3xl mb-1">
                    {item.promptKind === 'french' ? item.french : item.emojis}
                  </p>
                  <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-1">
                    {item.english}
                  </p>
                  <p className="text-lg font-bold text-white">{item.correctAnswer}</p>
                  {!item.isCorrect && (
                    <p className="text-sm text-red-400 mt-2 font-medium">
                      Your answer: {item.userAnswer}
                    </p>
                  )}
                </div>
                {item.isCorrect ? (
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                ) : (
                  <XCircle size={18} className="text-red-500 shrink-0" />
                )}
              </div>
            </motion.div>
          ))}
          {rows.length === 0 && (
            <p className="text-center text-ink-muted py-8">No answers recorded.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <GameResultsCard
      grade={graded.grade}
      gradeColor={graded.gradeColor}
      title={title}
      subtitle={
        graded.message ?? (
          <>
            <span className={`font-bold ${graded.gradeColor}`}>{graded.grade}</span> rank ·{' '}
            {completion.endReason}
          </>
        )
      }
      stats={[
        { label: 'Mode Score', value: completion.modeScore, valueClassName: 'text-3xl' },
        {
          label: 'Max Streak',
          value: completion.maxStreak,
          valueClassName: 'text-3xl text-orange-400',
        },
        {
          label: 'Accuracy',
          value: `${graded.accuracy}%`,
          valueClassName: 'text-blue-400',
        },
        {
          label: 'XP',
          value: `+${completion.xpAwarded}`,
          valueClassName: 'text-yellow-400',
        },
      ]}
      borderClassName="border-yellow-500/20"
      actions={
        <>
          <motion.button
            type="button"
            onClick={() => setShowReview(true)}
            className="w-full py-3 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Eye size={16} />
            REVIEW
          </motion.button>
          <motion.button
            type="button"
            onClick={onPlayAgain}
            className="w-full py-4 bg-white text-slate-950 font-black rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw size={18} />
            PLAY AGAIN
          </motion.button>
          <button
            type="button"
            onClick={onChangeMode}
            className="w-full py-3 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10"
          >
            CHANGE MODE
          </button>
          <button
            type="button"
            onClick={onBackToExplore}
            className="text-xs font-bold text-ink-muted hover:text-white transition-colors py-2"
          >
            Back to Explore
          </button>
        </>
      }
    />
  );
}
