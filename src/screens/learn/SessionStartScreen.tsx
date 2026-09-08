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
import { DIFFICULTY_CONFIG, AIM_CONFIG } from '../../utils/difficultyConfig';
import type { Aim } from '../../domain/learn/selection/sessionTarget';
import {
  demandScoreToAbilityLevel,
  CONFIDENCE_BAND_HIDDEN_BELOW,
  CONFIDENCE_BAND_APPROXIMATE_BELOW,
} from '../../domain/learn/ability/thresholds';
import type { AbilityResult } from '../../domain/learn/ability/deriveAbility';

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
  /** Shop plan §14.4/§15 Phase 5: owned qty of the Focus Token consumable, 0 if none. */
  focusTokenQty?: number;
  /** True once "Use Focus Token" has been tapped for this sitting — the override then applies to onStart. */
  focusTokenActive?: boolean;
  onUseFocusToken?: () => void;
  /** docs §14 UX #1 — present only when learnAdaptiveDifficulty is live. Absent -> legacy difficulty grid renders instead. */
  ability?: AbilityResult | null;
  aim?: Aim;
  onAimChange?: (aim: Aim) => void;
}

const AIMS: Aim[] = ['comfortable', 'balanced', 'push'];

/** docs §6.3 — confidence-gated level string; never asserts a band it hasn't earned. */
function measuredLevelDisplay(ability: AbilityResult): { band: string | null; caption: string } {
  const answerCaption = `from ${ability.measuredAnswers} answer${ability.measuredAnswers === 1 ? '' : 's'} we could measure`;
  if (ability.overallConfidence < CONFIDENCE_BAND_HIDDEN_BELOW) {
    return { band: null, caption: 'Your coach needs a few more practice sessions before it can estimate your level accurately.' };
  }
  const level = demandScoreToAbilityLevel(ability.abilityScore);
  if (ability.overallConfidence < CONFIDENCE_BAND_APPROXIMATE_BELOW) {
    return { band: `Around ${level}`, caption: answerCaption };
  }
  return { band: level, caption: answerCaption };
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

export function SessionStartScreen({ topic, topicMastery, selectedEngine, onEngineChange, selectedDifficulty, onDifficultyChange, onStart, onSingleQuestion, onBack, coachRecommendation, focusTokenQty = 0, focusTokenActive = false, onUseFocusToken, ability, aim, onAimChange }: Props) {
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
          className="p-2 rounded-xl surface-recessed text-ink-muted hover:text-white transition-colors"
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
          <p className="text-sm text-ink-muted">{topic.labelEn}</p>
        </div>
      </div>

      {/* Progress stats */}
      {questionsAnswered > 0 && (
        <div className="flex gap-3">
          <div className="flex-1 p-3 rounded-xl surface-recessed text-center">
            <p className="text-lg font-black text-white">{questionsAnswered}</p>
            <p className="text-[10px] text-ink-muted uppercase tracking-wide">Questions done</p>
          </div>
          {avgScore != null && (
            <div className="flex-1 p-3 rounded-xl surface-recessed text-center">
              <p className="text-lg font-black text-white">{avgScore.toFixed(1)}</p>
              <p className="text-[10px] text-ink-muted uppercase tracking-wide">Avg score</p>
            </div>
          )}
          {topicMastery?.mastered && (
            <div className="flex-1 p-3 rounded-xl surface-recessed text-center bg-amber-500/5 border-amber-500/20">
              <p className="text-lg font-black text-amber-400">🏆</p>
              <p className="text-[10px] text-amber-500 uppercase tracking-wide">Mastered</p>
            </div>
          )}
        </div>
      )}

      {/* Coach recommendation banner */}
      {coachRecommendation ? (
        <div className="p-4 rounded-2xl surface-recessed border-violet-electric/15 space-y-3">
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
            <p className="text-[11px] text-ink-muted leading-snug">
              <span className="text-ink-muted font-semibold">Because I noticed: </span>
              {coachRecommendation.rationale.evidenceSummary}
            </p>
          )}
        </div>
      ) : topWeaknesses.length > 0 ? (
        <div className="p-4 rounded-2xl surface-recessed border-violet-electric/15 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Target size={14} className="text-violet-400" />
            <p className="text-xs font-bold text-violet-400 uppercase tracking-wide">Your focus today</p>
          </div>
          {topWeaknesses.map(w => (
            <div key={w.skillId} className="flex items-center justify-between">
              <p className="text-sm text-ink-muted">📍 {w.name}</p>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full"
                    style={{ width: `${Math.round(w.mastery * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-ink-muted">{Math.round(w.mastery * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Focus Token (Shop plan §14.4): override today's focus for this sitting only */}
      {focusTokenQty > 0 && (
        <div className={`p-3 rounded-2xl surface-recessed flex items-center justify-between gap-3 ${focusTokenActive ? 'border-emerald-500/30' : 'border-transparent'}`}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg flex-shrink-0">🎯</span>
            <p className="text-xs text-ink-muted leading-snug">
              {focusTokenActive
                ? 'Focus Token active — this session targets your weakest skill.'
                : `Use a Focus Token to override today's focus (${focusTokenQty} owned).`}
            </p>
          </div>
          <motion.button
            onClick={onUseFocusToken}
            disabled={focusTokenActive}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex-shrink-0 transition-colors ${
              focusTokenActive
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-white/5 text-ink-muted hover:bg-white/10 border border-white/10'
            }`}
            whileTap={{ scale: 0.97 }}
          >
            {focusTokenActive ? 'Active' : 'Use'}
          </motion.button>
        </div>
      )}

      {/* AI Engine selector */}
      <ModelSelectorCard
        selected={selectedEngine}
        health={health}
        onChange={onEngineChange}
      />

      {/* docs §14 UX #1 — measured level + Aim (adaptive path) replaces the difficulty grid */}
      {ability && aim && onAimChange ? (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl surface-recessed space-y-1">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wide">Your level</p>
            {(() => {
              const { band, caption } = measuredLevelDisplay(ability);
              return (
                <>
                  <p className="text-2xl font-black text-white">{band ?? 'Still getting to know your level'}</p>
                  <p className="text-[11px] text-ink-muted">{caption}</p>
                </>
              );
            })()}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wide px-1">Today's aim</p>
            <div className="grid grid-cols-3 gap-2">
              {AIMS.map(a => {
                const cfg = AIM_CONFIG[a];
                const isSelected = aim === a;
                return (
                  <motion.button
                    key={a}
                    onClick={() => onAimChange(a)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all duration-200 text-center ${
                      isSelected
                        ? 'bg-violet-electric/10 border-violet-electric/40 ring-1 ring-violet-electric/30'
                        : 'surface-recessed border-transparent hover:border-white/10'
                    }`}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span className="text-xl">{cfg.icon}</span>
                    <p className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-ink-muted'}`}>{cfg.label}</p>
                  </motion.button>
                );
              })}
            </div>
            <p className="text-[11px] text-ink-muted px-1">{AIM_CONFIG[aim].description}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wide px-1">Choose difficulty level</p>
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
                      : 'surface-recessed border-transparent hover:border-white/10'
                  }`}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="text-xl">{cfg.icon}</span>
                  <p className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-ink-muted'}`}>{cfg.label}</p>
                  <p className="text-[10px] text-ink-muted">{cfg.cefr}</p>
                </motion.button>
              );
            })}
          </div>
          <p className="text-[11px] text-ink-muted px-1">{DIFFICULTY_CONFIG[selectedDifficulty].description}</p>
        </div>
      )}

      {/* Mode selection */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-ink-muted uppercase tracking-wide px-1">Choose session length</p>
        {MODES.map(({ mode, icon }) => (
          <motion.button
            key={mode}
            onClick={() => setSelected(mode)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 text-left ${
              selected === mode
                ? 'bg-violet-electric/10 border-violet-electric/40'
                : 'surface-recessed border-transparent hover:border-white/10'
            }`}
            whileTap={{ scale: 0.98 }}
          >
            <span className="text-xl">{icon}</span>
            <div className="flex-1">
              <p className="font-bold text-white text-sm">{SESSION_LABEL[mode]}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock size={10} className="text-ink-subtle" />
                <p className="text-[10px] text-ink-subtle">{SESSION_DURATION[mode]}</p>
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
          className="w-full py-3 rounded-2xl surface-recessed text-ink-muted hover:text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          whileTap={{ scale: 0.97 }}
        >
          <BookOpen size={14} /> Just one question
        </motion.button>
      </div>
    </motion.div>
  );
}
