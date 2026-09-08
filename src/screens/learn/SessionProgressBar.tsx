import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { EngineIndicatorPill } from './EngineIndicatorPill';
import { averageRealScores } from '../../domain/scoring';
import type { ActiveSession, AIEngine } from '../../types';

interface Props {
  session: ActiveSession;
  topicLabel: string;
  topicIcon: string;
  selectedEngine: AIEngine;
  isEvaluating: boolean;
  onEngineSwitch: (engine: AIEngine) => void;
  onEndSession: () => void;
}

export function SessionProgressBar({ session, topicLabel, topicIcon, selectedEngine, isEvaluating, onEngineSwitch, onEndSession }: Props) {
  const { currentIndex, targetCount, answerStreak, xpAccumulated } = session;
  const questionNumber = Math.min(currentIndex + 1, targetCount);

  const completedScores = session.questions
    .filter(q => q.status === 'completed')
    .map(q => q.bestScore);
  const avgScore = averageRealScores(completedScores);

  return (
    <div className="w-full space-y-2">
      {/* Top row: topic + question counter + engine pill + XP + end button */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm">{topicIcon}</span>
          <span className="text-xs font-bold text-ink-muted truncate">{topicLabel}</span>
          <span className="text-ink-subtle">·</span>
          <span className="text-xs font-black text-white whitespace-nowrap">
            Q{questionNumber}/{targetCount}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {avgScore !== null && (
            <span className="text-xs font-bold text-ink-muted whitespace-nowrap">
              avg {avgScore.toFixed(1)}
            </span>
          )}
          {answerStreak >= 3 && (
            <motion.span
              className="text-xs font-black text-orange-400 whitespace-nowrap"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              key={answerStreak}
            >
              🔥 {answerStreak}
            </motion.span>
          )}
          {xpAccumulated > 0 && (
            <span className="text-[10px] font-bold text-emerald-400 whitespace-nowrap">
              +{xpAccumulated} XP
            </span>
          )}

          <EngineIndicatorPill
            engine={selectedEngine}
            disabled={isEvaluating}
            onSwitch={onEngineSwitch}
          />

          <button
            onClick={onEndSession}
            className="p-1.5 rounded-lg glass-subtle text-ink-subtle hover:text-white hover:bg-white/5 transition-colors"
            title="End session early"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1 items-center">
        {Array.from({ length: targetCount }, (_, i) => {
          const q = session.questions[i];
          const isCompleted = q?.status === 'completed';
          const isActive = i === currentIndex;
          const score = q?.bestScore ?? null;

          let dotColor = 'bg-white/10';
          if (isCompleted) {
            // null = every attempt on this question was unscored (offline) —
            // neutral color, never fabricated red/amber from a placeholder 0.
            dotColor = score == null ? 'bg-slate-500' : score >= 8 ? 'bg-emerald-500' : score >= 6 ? 'bg-amber-500' : 'bg-rose-500';
          } else if (isActive) {
            dotColor = 'bg-violet-500 animate-pulse';
          }

          return (
            <motion.div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${dotColor}`}
              style={{ flex: 1 }}
              initial={false}
              animate={{ opacity: isActive ? 1 : isCompleted ? 0.9 : 0.4 }}
            />
          );
        })}
      </div>
    </div>
  );
}
