import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Zap, BookOpen, ChevronRight, Clock } from 'lucide-react';
import { buildSkillContext } from '../../services/coaching/diagnosticEngine';
import { ModelSelectorCard } from './ModelSelectorCard';
import { useEngineHealth } from '../../hooks/useEngineHealth';
import { getSkillLabel } from '../../services/coach/skillGraph';
import type { CoachRecommendation } from '../../types/coach';
import type { Topic, SessionMode, TopicMasteryEntry, AIEngine, DifficultyTier } from '../../types';
import { SESSION_LABEL, SESSION_DURATION } from '../../utils/sessionBuilder';
import { DIFFICULTY_CONFIG } from '../../utils/difficultyConfig';

interface Props {
  topic: Topic;
  topicMastery: TopicMasteryEntry | null;
  selectedEngine: AIEngine;
  onEngineChange: (engine: AIEngine) => void;
  selectedDifficulty: DifficultyTier;
  onDifficultyChange: (tier: DifficultyTier) => void;
  onStart: (mode: SessionMode) => void;
  onSingleQuestion: () => void;
  onBack: () => void;
  coachRecommendation?: CoachRecommendation | null;
}

const MODES: { mode: SessionMode; icon: string }[] = [
  { mode: 'quick', icon: '⚡' },
  { mode: 'standard', icon: '📚' },
  { mode: 'deep_dive', icon: '🎯' },
];

const DIFFICULTY_TIERS: DifficultyTier[] = ['beginner', 'intermediate', 'advanced', 'expert'];

const TIER_COLORS: Record<DifficultyTier, string> = {
  beginner:     'emerald',
  intermediate: 'blue',
  advanced:     'violet',
  expert:       'amber',
};

export function SessionStartScreen({ topic, topicMastery, selectedEngine, onEngineChange, selectedDifficulty, onDifficultyChange, onStart, onSingleQuestion, onBack, coachRecommendation }: Props) {
  const [selected, setSelected] = useState<SessionMode>('standard');
  const health = useEngineHealth();
  const skillContext = buildSkillContext();
  const topWeaknesses = skillContext.weaknesses.slice(0, 2);
  const questionsAnswered = topicMastery?.uniqueQuestionsAnswered.length ?? 0;
  const avgScore = topicMastery?.averageScore;

  return (
    <motion.div
      className="max-w-lg mx-auto px-4 py-6 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Topic header */}
      <div className="flex items-center gap-4">
        <motion.button
          onClick={onBack}
          className="p-2 rounded-xl glass-subtle text-slate-400 hover:text-white transition-colors"
          whileTap={{ scale: 0.95 }}
        >
          <ChevronRight size={18} className="rotate-180" />
        </motion.button>
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${topic.color}25, ${topic.color}10)`, border: `1px solid ${topic.color}30` }}
        >
          {topic.icon}
        </div>
        <div>
          <h1 className="text-xl font-black text-white">{topic.label}</h1>
          <p className="text-sm text-slate-500">{topic.labelEn}</p>
        </div>
      </div>

      {/* Progress stats */}
      {questionsAnswered > 0 && (
        <div className="flex gap-3">
          <div className="flex-1 p-3 rounded-xl glass-subtle text-center">
            <p className="text-lg font-black text-white">{questionsAnswered}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Questions done</p>
          </div>
          {avgScore != null && (
            <div className="flex-1 p-3 rounded-xl glass-subtle text-center">
              <p className="text-lg font-black text-white">{avgScore.toFixed(1)}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Avg score</p>
            </div>
          )}
          {topicMastery?.mastered && (
            <div className="flex-1 p-3 rounded-xl glass-subtle text-center bg-amber-500/5 border-amber-500/20">
              <p className="text-lg font-black text-amber-400">🏆</p>
              <p className="text-[10px] text-amber-500 uppercase tracking-wide">Mastered</p>
            </div>
          )}
        </div>
      )}

      {/* Coach recommendation banner */}
      {coachRecommendation ? (
        <div className="p-4 rounded-2xl glass-subtle border-violet-electric/15 space-y-3">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-violet-400" />
            <p className="text-xs font-bold text-violet-400 uppercase tracking-wide">Coach recommendation</p>
          </div>
          <p className="text-sm text-white font-medium leading-snug">
            {coachRecommendation.rationale.primaryReason}
          </p>
          {coachRecommendation.targetSkillIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {coachRecommendation.targetSkillIds.map(id => (
                <span
                  key={id}
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 uppercase tracking-wide"
                >
                  {getSkillLabel(id)}
                </span>
              ))}
            </div>
          )}
          {coachRecommendation.rationale.evidenceSummary && (
            <p className="text-[11px] text-slate-400 leading-snug">
              <span className="text-slate-500 font-semibold">Because I noticed: </span>
              {coachRecommendation.rationale.evidenceSummary}
            </p>
          )}
        </div>
      ) : topWeaknesses.length > 0 ? (
        <div className="p-4 rounded-2xl glass-subtle border-violet-electric/15 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Target size={14} className="text-violet-400" />
            <p className="text-xs font-bold text-violet-400 uppercase tracking-wide">Your focus today</p>
          </div>
          {topWeaknesses.map(w => (
            <div key={w.skillId} className="flex items-center justify-between">
              <p className="text-sm text-slate-300">📍 {w.name}</p>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full"
                    style={{ width: `${Math.round(w.mastery * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500">{Math.round(w.mastery * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* AI Engine selector */}
      <ModelSelectorCard
        selected={selectedEngine}
        health={health}
        onChange={onEngineChange}
      />

      {/* Difficulty selector */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">Choose difficulty level</p>
        <div className="grid grid-cols-2 gap-2">
          {DIFFICULTY_TIERS.map(tier => {
            const cfg = DIFFICULTY_CONFIG[tier];
            const color = TIER_COLORS[tier];
            const isSelected = selectedDifficulty === tier;
            return (
              <motion.button
                key={tier}
                onClick={() => onDifficultyChange(tier)}
                className={`flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all duration-200 text-center ${
                  isSelected
                    ? `bg-${color}-500/10 border-${color}-500/40 ring-1 ring-${color}-500/30`
                    : 'glass-subtle border-transparent hover:border-white/10'
                }`}
                whileTap={{ scale: 0.97 }}
              >
                <span className="text-xl">{cfg.icon}</span>
                <p className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-slate-300'}`}>{cfg.label}</p>
                <p className="text-[10px] text-slate-500">{cfg.cefr}</p>
              </motion.button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-500 px-1">{DIFFICULTY_CONFIG[selectedDifficulty].description}</p>
      </div>

      {/* Mode selection */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">Choose session length</p>
        {MODES.map(({ mode, icon }) => (
          <motion.button
            key={mode}
            onClick={() => setSelected(mode)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 text-left ${
              selected === mode
                ? 'bg-violet-electric/10 border-violet-electric/40'
                : 'glass-subtle border-transparent hover:border-white/10'
            }`}
            whileTap={{ scale: 0.98 }}
          >
            <span className="text-xl">{icon}</span>
            <div className="flex-1">
              <p className="font-bold text-white text-sm">{SESSION_LABEL[mode]}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock size={10} className="text-slate-600" />
                <p className="text-[10px] text-slate-600">{SESSION_DURATION[mode]}</p>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              selected === mode ? 'border-violet-electric bg-violet-electric' : 'border-white/20'
            }`}>
              {selected === mode && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="space-y-3 pt-2">
        <motion.button
          onClick={() => onStart(selected)}
          className="w-full btn-primary py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <Zap size={18} /> Start Session
        </motion.button>
        <motion.button
          onClick={onSingleQuestion}
          className="w-full py-3 rounded-2xl glass-subtle text-slate-400 hover:text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          whileTap={{ scale: 0.97 }}
        >
          <BookOpen size={14} /> Just one question
        </motion.button>
      </div>
    </motion.div>
  );
}
