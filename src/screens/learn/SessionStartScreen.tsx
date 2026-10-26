import { motion } from 'framer-motion';
import { Clock, Mic, Target, Trophy, Zap } from 'lucide-react';
import type { CoachRecommendation } from '../../types/coach';
import type { Topic, SessionMode, TopicMasteryEntry, FeedbackMode } from '../../types';
import { SESSION_TARGET } from '../../utils/sessionBuilder';
import { LEARN_ANSWERS_PER_DAY, LEARN_DAILY_LIMIT_MESSAGE, dailySessionLength } from '../../features/learn/dailyAllowance';
import { AIM_CONFIG } from '../../utils/difficultyConfig';
import type { Aim } from '../../domain/learn/selection/sessionTarget';
import { MARKING_LEVELS, markingLevelEarnsBonus, type MarkingLevel } from '../../domain/learn/marking/markingLevel';
import { GRAMMAR_FOCI, type GrammarFocus, type LearnFilters } from '../../domain/learn/selection/filters';
import { measuredLevelDisplay } from '../../domain/learn/ability/levelLabel';
import type { AbilityResult } from '../../domain/learn/ability/deriveAbility';
import { computeXPGain } from '../../domain/xp';
import { clampLength, previewText, type SessionPreview } from '../../features/learn/sessionSetup';
import { fadeUp, stagger } from '../../components/motion/variants';
import { Button } from '../../components/ui/Button';
import { Segmented } from '../../components/ui/Segmented';
import { TopicChip } from '../../components/ui/TopicChip';

interface Props {
  topic: Topic;
  topicMastery: TopicMasteryEntry | null;
  onStart: (mode: SessionMode) => void;
  /** Kept for callers; the way back is the top bar's back button. */
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
  /**
   * learn-marking §8 — the marking dial; both present only while
   * `learnMarkingLevels` is live. Stays on this device (AppContext); it only
   * picks which precomputed score the learner sees and earns.
   */
  markingLevel?: MarkingLevel;
  onMarkingLevelChange?: (level: MarkingLevel) => void;
  /** AI-marked Learn answers left today (GET /api/learn/allowance); null while unknown. 0 disables Start. */
  answersLeft?: number | null;
  /** Current day streak, for the "up to +N XP" summary. */
  streakDays?: number;
}

/** The mode a session is built with; Learn then trims it to the answers left today. */
export const DAILY_SESSION_MODE: SessionMode = 'quick';

const AIMS: Aim[] = ['comfortable', 'balanced', 'push'];

const FEEDBACK_STYLES: { id: FeedbackMode; label: string; note: string }[] = [
  { id: 'coach', label: 'Coach', note: 'Tips and a score' },
  { id: 'examiner', label: 'Examiner', note: 'Cambridge-style comments, no score' },
];

const MARKING_LABELS: Record<MarkingLevel, string> = { A1: 'A1', A2: 'A2', exam: 'Exam', B1: 'B1', B2: 'B2' };

/** About four minutes per question: think, answer, read the feedback. */
const MINUTES_PER_QUESTION = 4;

const EYEBROW = 'text-eyebrow uppercase text-ink-subtle';

/**
 * Learn session setup (Design System v2): the topic, its stats, the coach's
 * reason, optional focus chips, today's allowance, then three segmented
 * choices (difficulty, feedback style, marking level), a one-line summary and
 * the screen's one primary — Start session.
 */
export function SessionStartScreen({
  topic, topicMastery, onStart, coachRecommendation,
  focusTokenQty = 0, focusTokenActive = false, onUseFocusToken,
  ability, aim, onAimChange,
  filters, onFiltersChange, focusOptions, matchCount, getPreview,
  feedbackMode, onFeedbackModeChange,
  markingLevel, onMarkingLevelChange,
  answersLeft = null, streakDays = 0,
}: Props) {
  // No length picker (launch limit): a session is built as 'quick' and Learn keeps as many
  // questions as the learner has AI-marked answers left today (dailySessionLength).
  const { mode: builtMode } = clampLength(DAILY_SESSION_MODE, matchCount);
  const sessionLength = builtMode ? dailySessionLength(answersLeft, SESSION_TARGET[builtMode]) : 0;
  const effectiveMode = builtMode && sessionLength > 0 ? builtMode : null;
  const questionsAnswered = topicMastery?.uniqueQuestionsAnswered.length ?? 0;
  const avgScore = topicMastery?.averageScore;

  const activeFocus = filters.grammar ? GRAMMAR_FOCI.find((f) => f.id === filters.grammar) ?? null : null;
  const preview = effectiveMode && ability && aim && getPreview ? getPreview(effectiveMode, aim) : null;

  const coachPick = coachRecommendation?.rationale.primaryReason ?? null;
  const showCoachLine = coachPick !== null || focusTokenQty > 0;
  // Below Exam standard a marked answer earns participation XP only (learn-marking §8.2).
  const scoreCounts = markingLevel ? markingLevelEarnsBonus(markingLevel) : true;
  const xpUpTo = sessionLength * computeXPGain(10, streakDays, { scoreCounts }).gain;

  return (
    <motion.div className="mx-auto flex max-w-[600px] flex-col gap-6" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="flex items-center gap-4">
        <TopicChip topicKey={topic.key} size={40} />
        <div className="flex flex-col">
          <h1 className="text-h2 text-ink">{topic.label}</h1>
          <p className="text-body-s text-ink-muted">{topic.labelEn}</p>
        </div>
      </motion.div>

      {questionsAnswered > 0 && (
        <motion.div variants={fadeUp} className={`grid gap-3 ${topicMastery?.mastered ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <div className="flex flex-col gap-1 rounded-card border border-hairline bg-surface-recessed p-4">
            <span className="text-caption text-ink-subtle">Questions done</span>
            <span className="font-numeral text-[22px] leading-tight text-ink">{questionsAnswered}</span>
          </div>
          {/* Batch 1c — "—" until a scored session exists; never a fabricated 0.0. */}
          <div className="flex flex-col gap-1 rounded-card border border-hairline bg-surface-recessed p-4">
            <span className="text-caption text-ink-subtle">Avg score</span>
            <span className="font-numeral text-[22px] leading-tight text-ink">{avgScore != null ? avgScore.toFixed(1) : '—'}</span>
            {avgScore == null && (
              <span className="text-caption text-ink-subtle">No scored answers yet. Examiner style isn&apos;t scored.</span>
            )}
          </div>
          {topicMastery?.mastered && (
            <div className="flex flex-col gap-1 rounded-card border border-hairline bg-reward-soft p-4">
              <span className="text-caption text-reward-text">Topic</span>
              <span className="inline-flex items-center gap-1.5 text-[16px] font-semibold leading-tight text-reward-text">
                <Trophy size={16} aria-hidden="true" />Mastered
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* Coach's pick — the coach recommendation and the Focus Token, folded into one block */}
      {showCoachLine && (
        <motion.div variants={fadeUp} className="flex flex-col gap-1.5 rounded-card border border-hairline bg-surface-recessed p-4">
          <span className="flex items-center gap-2 text-eyebrow uppercase text-action-text">
            <Target size={14} aria-hidden="true" />Coach&apos;s pick
          </span>
          {coachPick && <p className="text-body-s text-ink">{coachPick}</p>}
          {focusTokenQty > 0 && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] text-ink-muted">
                {focusTokenActive
                  ? 'Focus Token active — this session targets your weakest skill.'
                  : `Use a Focus Token to override today's focus (${focusTokenQty} owned).`}
              </p>
              <Button variant="secondary" size="sm" onClick={onUseFocusToken} disabled={focusTokenActive}>
                {focusTokenActive ? 'Active' : 'Use'}
              </Button>
            </div>
          )}
        </motion.div>
      )}

      {/* Focus (optional) — adaptive path only, and only where the topic has enough tagged questions */}
      {focusOptions && focusOptions.length > 0 && (
        <motion.div variants={fadeUp} className="flex flex-col gap-2">
          <p className={EYEBROW}>Focus <span className="text-caption normal-case tracking-normal">(optional)</span></p>
          <div className="flex flex-wrap gap-2">
            {GRAMMAR_FOCI.filter((f) => focusOptions.includes(f.id)).map((f) => {
              const on = filters.grammar === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onFiltersChange({ ...filters, grammar: on ? null : f.id })}
                  className={`h-11 rounded-control border px-3.5 text-[13px] font-semibold transition-colors duration-state ease-smooth
                    ${on ? 'border-action bg-action-soft text-action-text' : 'border-hairline-strong text-ink-muted hover:text-ink'}`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Today's AI-marked answers (launch limit: 3 a day) — replaces the length picker */}
      <motion.div variants={fadeUp} className="flex flex-col gap-2">
        <p className={EYEBROW}>Today</p>
        <div className="rounded-card border border-hairline bg-surface-recessed px-4 py-3 text-body-s text-ink-muted">
          {answersLeft === 0 ? (
            LEARN_DAILY_LIMIT_MESSAGE
          ) : (
            <>
              {answersLeft === null
                ? `${LEARN_ANSWERS_PER_DAY} AI-marked answers a day.`
                : `${answersLeft} of ${LEARN_ANSWERS_PER_DAY} AI-marked answers left today.`}
              {' '}This session has {sessionLength} {sessionLength === 1 ? 'question' : 'questions'}.
            </>
          )}
        </div>
        {matchCount === 0 && (
          <div className="flex items-center justify-between gap-3 rounded-card border border-hairline bg-surface-recessed px-4 py-3">
            <p className="text-[13px] text-ink-muted">No questions match this focus yet.</p>
            {activeFocus && (
              <Button variant="secondary" size="sm" onClick={() => onFiltersChange({ ...filters, grammar: null })}>
                Clear {activeFocus.label} filter
              </Button>
            )}
          </div>
        )}
      </motion.div>

      {/* Difficulty — measured level + the one Aim control + a live preview (docs §14 UX #1) */}
      {ability && aim && onAimChange ? (
        <motion.div variants={fadeUp} className="flex flex-col gap-2">
          <p className={EYEBROW}>Difficulty</p>
          {(() => {
            const { band, caption } = measuredLevelDisplay(ability);
            return (
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-1">
                <span className="text-[13px] text-ink-subtle">Your level</span>
                <span className="text-subtitle text-ink">{band}</span>
                <span className="text-[13px] text-ink-subtle">{caption}</span>
              </div>
            );
          })()}
          <Segmented
            label="Difficulty"
            value={aim}
            onChange={onAimChange}
            options={AIMS.map((a) => ({ id: a, label: AIM_CONFIG[a].label }))}
          />
          <p className="px-1 text-[13px] text-ink-muted">{AIM_CONFIG[aim].description}</p>
          {preview && <p className="px-1 text-[13px] text-ink">{previewText(preview)}</p>}
        </motion.div>
      ) : null}

      {/* Feedback style (was the in-question Coach/Examiner toggle) */}
      <motion.div variants={fadeUp} className="flex flex-col gap-2">
        <p className={EYEBROW}>Feedback style</p>
        <Segmented
          label="Feedback style"
          value={feedbackMode}
          onChange={onFeedbackModeChange}
          height={60}
          options={FEEDBACK_STYLES.map((f) => ({ id: f.id, label: f.label, note: f.note }))}
        />
      </motion.div>

      {/* Marking level (learn-marking §8) — Coach style only: the Examiner style shows no score. */}
      {markingLevel && onMarkingLevelChange && feedbackMode === 'coach' ? (
        <motion.div variants={fadeUp} className="flex flex-col gap-2">
          <p className={EYEBROW}>Marking level</p>
          <Segmented
            label="Marking level"
            value={markingLevel}
            onChange={onMarkingLevelChange}
            options={MARKING_LEVELS.map((level) => ({ id: level, label: MARKING_LABELS[level] }))}
          />
        </motion.div>
      ) : null}

      {effectiveMode !== null && (
        <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-muted" data-testid="setup-summary">
          <span className="inline-flex items-center gap-1.5">
            <Mic size={14} aria-hidden="true" />{sessionLength} {sessionLength === 1 ? 'question' : 'questions'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={14} aria-hidden="true" />about {sessionLength * MINUTES_PER_QUESTION} min
          </span>
          {feedbackMode === 'coach' && (
            <span className="inline-flex items-center gap-1.5 font-medium text-reward-text">
              <Zap size={14} aria-hidden="true" />up to +{xpUpTo} XP
            </span>
          )}
        </motion.div>
      )}

      <motion.div variants={fadeUp} className="pt-2">
        <Button
          size="lg"
          className="w-full"
          onClick={() => effectiveMode && onStart(effectiveMode)}
          disabled={effectiveMode === null}
        >
          <Mic size={16} aria-hidden="true" />Start session
        </Button>
      </motion.div>
    </motion.div>
  );
}
