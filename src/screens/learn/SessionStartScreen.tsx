import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Zap, ChevronRight, Clock } from 'lucide-react';
import type { CoachRecommendation } from '../../types/coach';
import type { Topic, SessionMode, TopicMasteryEntry, FeedbackMode } from '../../types';
import { SESSION_DURATION } from '../../utils/sessionBuilder';
import { AIM_CONFIG } from '../../utils/difficultyConfig';
import type { Aim } from '../../domain/learn/selection/sessionTarget';
import { GRAMMAR_FOCI, type GrammarFocus, type LearnFilters } from '../../domain/learn/selection/filters';
import { measuredLevelDisplay } from '../../domain/learn/ability/levelLabel';
import type { AbilityResult } from '../../domain/learn/ability/deriveAbility';
import {
  SETUP_LENGTHS,
  clampLength,
  isLengthAvailable,
  previewText,
  type SessionPreview,
} from '../../features/learn/sessionSetup';

interface Props {
  topic: Topic;
  topicMastery: TopicMasteryEntry | null;
  onStart: (mode: SessionMode) => void;
  onBack: () => void;
  coachRecommendation?: CoachRecommendation | null;
  /** Shop plan §14.4/§15 Phase 5: owned qty of the Focus Token consumable, 0 if none. */
  focusTokenQty?: number;
  /** True once "Use Focus Token" has been tapped for this sitting — the override then applies to onStart. */
  focusTokenActive?: boolean;
  onUseFocusToken?: () => void;
  /** docs §14 UX #1 — present only when learnAdaptiveDifficulty is live. Aim is the one difficulty control (Batch 1e). */
  ability?: AbilityResult | null;
  aim?: Aim;
  onAimChange?: (aim: Aim) => void;
  /** Batch 2 — setup filters (docs §8.5). Not persisted: Learn holds them as setup state. */
  filters: LearnFilters;
  onFiltersChange: (filters: LearnFilters) => void;
  /** Focus chips worth offering for this topic. Absent on the legacy path, which hides the Focus section. */
  focusOptions?: GrammarFocus[];
  /** How many questions in this topic match `filters`. */
  matchCount: number;
  /** Dry-run of the session the current choices would build — drives the preview line. */
  getPreview?: (mode: SessionMode, aim: Aim) => SessionPreview | null;
  feedbackMode: FeedbackMode;
  onFeedbackModeChange: (mode: FeedbackMode) => void;
}

const AIMS: Aim[] = ['comfortable', 'balanced', 'push'];

const FEEDBACK_STYLES: { mode: FeedbackMode; label: string; note: string }[] = [
  { mode: 'coach', label: 'Coach', note: 'Tips and a score' },
  { mode: 'examiner', label: 'Examiner', note: 'Cambridge-style comments, no score' },
];

const SECTION_LABEL = 'text-xs font-bold text-ink-muted uppercase tracking-wide px-1';

export function SessionStartScreen({
  topic, topicMastery, onStart, onBack, coachRecommendation,
  focusTokenQty = 0, focusTokenActive = false, onUseFocusToken,
  ability, aim, onAimChange,
  filters, onFiltersChange, focusOptions, matchCount, getPreview,
  feedbackMode, onFeedbackModeChange,
}: Props) {
  // The learner's choice is kept as picked; what is used is that choice clamped
  // to the questions that match (so clearing a filter restores the pick).
  const [chosen, setChosen] = useState<SessionMode>('standard');
  const { mode: effectiveMode, clamped } = clampLength(chosen, matchCount);
  const questionsAnswered = topicMastery?.uniqueQuestionsAnswered.length ?? 0;
  const avgScore = topicMastery?.averageScore;

  const activeFocus = filters.grammar ? GRAMMAR_FOCI.find((f) => f.id === filters.grammar) ?? null : null;
  const preview = effectiveMode && ability && aim && getPreview ? getPreview(effectiveMode, aim) : null;

  const coachPick = coachRecommendation?.rationale.primaryReason ?? null;
  const showCoachLine = coachPick !== null || focusTokenQty > 0;

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
          aria-label="Back to topics"
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
            <p className="text-eyebrow text-ink-muted uppercase">Questions done</p>
          </div>
          {/* Batch 1c — "—" until a scored session exists; never a fabricated 0.0. */}
          <div className="flex-1 p-3 rounded-xl surface-recessed text-center">
            <p className="text-lg font-black text-white">{avgScore != null ? avgScore.toFixed(1) : '—'}</p>
            <p className="text-eyebrow text-ink-muted uppercase">Avg score</p>
            {avgScore == null && (
              <p className="text-[10px] text-ink-muted mt-1">No scored answers yet. Examiner style isn&apos;t scored.</p>
            )}
          </div>
          {topicMastery?.mastered && (
            <div className="flex-1 p-3 rounded-xl surface-recessed text-center bg-amber-500/5 border-amber-500/20">
              <p className="text-lg font-black text-reward-text">🏆</p>
              <p className="text-eyebrow text-reward-text uppercase">Mastered</p>
            </div>
          )}
        </div>
      )}

      {/* Coach's pick — the coach recommendation and the Focus Token, folded into one line */}
      {showCoachLine && (
        <div className="p-4 rounded-2xl surface-recessed border-violet-electric/15 space-y-2">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-action-text" />
            <p className="text-xs font-bold text-action-text uppercase tracking-wide">Coach&apos;s pick</p>
          </div>
          {coachPick && <p className="text-sm text-white font-medium leading-snug">{coachPick}</p>}
          {focusTokenQty > 0 && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-ink-muted leading-snug">
                {focusTokenActive
                  ? 'Focus Token active — this session targets your weakest skill.'
                  : `Use a Focus Token to override today's focus (${focusTokenQty} owned).`}
              </p>
              <motion.button
                onClick={onUseFocusToken}
                disabled={focusTokenActive}
                className={`px-3 py-1.5 rounded-lg text-eyebrow uppercase flex-shrink-0 transition-colors ${
                  focusTokenActive
                    ? 'bg-emerald-500/20 text-progress-text border border-emerald-500/30'
                    : 'bg-white/5 text-ink-muted hover:bg-white/10 border border-white/10'
                }`}
                whileTap={{ scale: 0.97 }}
              >
                {focusTokenActive ? 'Active' : 'Use'}
              </motion.button>
            </div>
          )}
        </div>
      )}

      {/* Focus (optional) — adaptive path only, and only where the topic has enough tagged questions */}
      {focusOptions && focusOptions.length > 0 && (
        <div className="space-y-2">
          <p className={SECTION_LABEL}>Focus <span className="normal-case font-medium">(optional)</span></p>
          <div className="flex flex-wrap gap-2">
            {GRAMMAR_FOCI.filter((f) => focusOptions.includes(f.id)).map((f) => {
              const on = filters.grammar === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onFiltersChange({ ...filters, grammar: on ? null : f.id })}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    on
                      ? 'bg-violet-electric/10 border-violet-electric/40 text-white'
                      : 'surface-recessed border-transparent text-ink-muted hover:border-white/10'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Questions (length) */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className={SECTION_LABEL}>Questions</p>
          {focusOptions && (
            <p className="text-[11px] text-ink-muted">{matchCount} {matchCount === 1 ? 'question matches' : 'questions match'}</p>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {SETUP_LENGTHS.map(({ mode, count }) => {
            const available = isLengthAvailable(mode, matchCount);
            const selected = effectiveMode === mode;
            return (
              <motion.button
                key={mode}
                type="button"
                disabled={!available}
                aria-pressed={selected}
                aria-label={count === 1 ? '1 question' : `${count} questions`}
                onClick={() => setChosen(mode)}
                title={available ? undefined : `Only ${matchCount} ${matchCount === 1 ? 'question matches' : 'questions match'}`}
                className={`flex flex-col items-center gap-0.5 py-3 rounded-2xl border transition-all duration-200 ${
                  selected
                    ? 'bg-violet-electric/10 border-violet-electric/40 ring-1 ring-violet-electric/30'
                    : 'surface-recessed border-transparent hover:border-white/10'
                } ${available ? '' : 'opacity-40 cursor-not-allowed'}`}
                whileTap={available ? { scale: 0.97 } : undefined}
              >
                <span className={`text-lg font-black ${selected ? 'text-white' : 'text-ink-muted'}`}>{count}</span>
                <span className="flex items-center gap-1 text-[10px] text-ink-subtle">
                  <Clock size={9} />{SESSION_DURATION[mode].replace('~', '')}
                </span>
              </motion.button>
            );
          })}
        </div>
        {clamped && matchCount > 0 && (
          <p className="text-[11px] text-ink-muted px-1">
            Only {matchCount} {matchCount === 1 ? 'question matches' : 'questions match'}, so this session is set to {effectiveMode ? SETUP_LENGTHS.find((l) => l.mode === effectiveMode)?.count : 0}.
          </p>
        )}
        {matchCount === 0 && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl surface-recessed">
            <p className="text-xs text-ink-muted">No questions match this focus yet.</p>
            {activeFocus && (
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, grammar: null })}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white/5 text-white hover:bg-white/10 border border-white/10 flex-shrink-0"
              >
                Clear {activeFocus.label} filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Difficulty — measured level + the one Aim control + a live preview (docs §14 UX #1) */}
      {ability && aim && onAimChange ? (
        <div className="space-y-3">
          <p className={SECTION_LABEL}>Difficulty</p>
          <div className="p-4 rounded-2xl surface-recessed space-y-1">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wide">Your level</p>
            {(() => {
              const { band, caption } = measuredLevelDisplay(ability);
              return (
                <>
                  <p className="text-2xl font-black text-white">{band}</p>
                  <p className="text-[11px] text-ink-muted">{caption}</p>
                </>
              );
            })()}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {AIMS.map((a) => {
              const cfg = AIM_CONFIG[a];
              const isSelected = aim === a;
              return (
                <motion.button
                  key={a}
                  type="button"
                  aria-pressed={isSelected}
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
          {preview && <p className="text-[11px] text-white px-1">{previewText(preview)}</p>}
        </div>
      ) : null}

      {/* Feedback style (was the in-question Coach/Examiner toggle) */}
      <div className="space-y-2">
        <p className={SECTION_LABEL}>Feedback style</p>
        <div className="grid grid-cols-2 gap-2">
          {FEEDBACK_STYLES.map(({ mode, label, note }) => {
            const isSelected = feedbackMode === mode;
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onFeedbackModeChange(mode)}
                className={`flex flex-col items-start gap-0.5 p-3 rounded-2xl border transition-all duration-200 text-left ${
                  isSelected
                    ? 'bg-violet-electric/10 border-violet-electric/40 ring-1 ring-violet-electric/30'
                    : 'surface-recessed border-transparent hover:border-white/10'
                }`}
              >
                <span className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-ink-muted'}`}>{label}</span>
                <span className="text-[11px] text-ink-muted">{note}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Start */}
      <div className="pt-2">
        <motion.button
          type="button"
          onClick={() => effectiveMode && onStart(effectiveMode)}
          disabled={effectiveMode === null}
          className={`w-full btn-primary py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 ${
            effectiveMode === null ? 'opacity-40 cursor-not-allowed' : ''
          }`}
          whileHover={effectiveMode === null ? undefined : { scale: 1.02 }}
          whileTap={effectiveMode === null ? undefined : { scale: 0.97 }}
        >
          <Zap size={18} /> Start Session
        </motion.button>
      </div>
    </motion.div>
  );
}
