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

/**
 * The session header + segmented position bar (Component Kit §06): one 4px
 * segment per question in --action, the current one outlined rather than
 * pulsing. Completed segments keep an honest score tint — a real band colour,
 * or neutral --ink-subtle when every attempt on that question was unscored
 * (never a fabricated red/amber from a placeholder 0; see CLAUDE.md).
 */
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
          <span className="text-xs font-semibold text-ink-muted truncate">{topicLabel}</span>
          <span className="text-ink-subtle">·</span>
          <span className="font-numeral text-xs text-ink tabular-nums whitespace-nowrap">
            Q{questionNumber}/{targetCount}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {avgScore !== null && (
            <span className="font-numeral text-xs text-ink-muted tabular-nums whitespace-nowrap">
              avg {avgScore.toFixed(1)}
            </span>
          )}
          {answerStreak >= 3 && (
            <span className="font-numeral text-xs text-streak-text tabular-nums whitespace-nowrap">
              🔥 {answerStreak}
            </span>
          )}
          {xpAccumulated > 0 && (
            <span className="font-numeral text-[10px] text-reward-text tabular-nums whitespace-nowrap">
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
            className="p-1.5 rounded-control surface-recessed text-ink-subtle hover:text-ink transition-colors duration-state ease-smooth"
            title="End session early"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Segmented position bar — one 4px segment per question */}
      <div className="flex gap-1 items-center h-1">
        {Array.from({ length: targetCount }, (_, i) => {
          const q = session.questions[i];
          const isCompleted = q?.status === 'completed';
          const isActive = i === currentIndex;
          const score = q?.bestScore ?? null;

          let segClass = 'bg-track';
          if (isCompleted) {
            segClass =
              score == null
                ? 'bg-ink-subtle'
                : score >= 8
                  ? 'bg-progress'
                  : score >= 6
                    ? 'bg-reward'
                    : 'bg-correction';
          } else if (isActive) {
            // outlined, not filled or pulsing
            segClass = 'bg-transparent ring-1 ring-inset ring-action';
          }

          return (
            <div
              key={i}
              className={`h-1 rounded-full transition-colors duration-state ease-smooth ${segClass}`}
              style={{ flex: 1 }}
            />
          );
        })}
      </div>
    </div>
  );
}
