import type { QuestionDemands } from '../domain/learn/demand/types';
import type { DemandBand, SelectionReason, SlotType } from '../domain/learn/selection/types';
import type { DemandBelief } from './beliefs';

export type Screen = 'home' | 'learn' | 'exam' | 'progress' | 'profile' | 'explore' | 'shop' | 'about' | 'challenges' | 'rapid-fire' | 'boss-battle' | 'story-mode' | 'survival' | 'speed-speaking' | 'emoji-master' | 'mystery-box' | 'study-groups' | 'pronunciation-lab' | 'roadmap' | 'friend-challenges' | 'rankings' | 'listening-mode' | 'fluency-heatmap' | 'speaking-arena' | 'accent-analyzer' | 'weakness-analysis' | 'sentence-rebuilder' | 'word-drop' | 'daily-news' | 'scenario-architect' | 'mastery';


export type Level = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Beast Mode';

export interface RankingUser {
  id: string;
  username: string;
  avatar?: string;
  equippedFrame?: string | null;
  equippedNameplate?: string | null;
  totalXP: number;
  weeklyXP: number;
  streak: number;
  isCurrentUser?: boolean;
  rank?: number;
}


export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  memberCount: number;
  maxMembers: number;
  totalXP: number;
  weeklyXPGoal: number;
  weeklyXPProgress: number;
  level: number;
  isPrivate: boolean;
  tags: string[];
}

export interface StudyGroupMember {
  id: string;
  username: string;
  avatar?: string;
  role: 'admin' | 'member';
  joinedAt: string;
  xpContributed: number;
}

export interface UserProfile {
  id: string;
  username: string | null;
  total_xp: number;
  gems: number;
  current_level: Level;
  streak_days: number;
  longest_streak: number;
  last_session_date: string | null;
  sessions_count: number;
  total_words_spoken: number;
  inventory: Record<string, number>;
  activeBoosters: { id: string; expiresAt: string; multiplier: number }[];
  equipped: { avatar: string | null; frame: string | null; nameplate: string | null };
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  unlocked: boolean;
  unlockedAt?: string;
  category: 'streak' | 'practice' | 'skill' | 'exam' | 'social';
}

export interface Topic {
  key: string;
  label: string;
  labelEn: string;
  icon: string;
  color: string;
  description: string;
  questionsCount: number;
  locked?: boolean;
  isAdvanced?: boolean;
}

export interface Question {
  id: string;
  topicKey: string;
  text: string;
  hint: string;
  difficulty: 1 | 2 | 3;
  followUps: string[];
  modelAnswer: string;
  keyVocab: { fr: string; en: string }[];
  isPastPaper?: boolean;
  year?: number;
  paperCode?: string;
  demands?: QuestionDemands;
}

export interface RebuildQuestion {
  id: string;
  english: string;
  french: string;
  fragments: string[];
  explanation: string;
  theme: string;
  difficulty: 1 | 2 | 3;
}

export interface FeedbackScore {
  communication: number;
  language: number;
  fluency: number;
  overall: number;
}

export interface GrammarError {
  theme: string;
  severity: 'major' | 'minor';
  msg: string;
  diagnostic: string;
  correction: string;
}

export interface Feedback {
  scores: FeedbackScore;
  grammar: {
    critical: GrammarError[];
    polish: GrammarError[];
  };
  vocabulary: { basic: string; upgrade: string }[];
  style: { label: string; suggestion: string }[];
  fillers: { word: string; count: number }[];
  wordCount: number;
  cefrLevel: string;
}

export interface Session {
  id: string;
  mode: 'practice' | 'exam' | 'challenge' | 'roleplay' | 'rapid_fire' | 'boss_battle' | 'story' | 'survival' | 'speed_speaking' | 'emoji_master' | 'word_drop' | 'daily_news';
  topicKey?: string;
  questionText?: string;
  transcript?: string;
  wordCount: number;
  /** null when no real assessed score exists (e.g. exam scoring failed/unavailable) — never a fabricated placeholder. */
  score: number | null;
  xpEarned: number;
  durationSec: number;
  feedback?: Feedback;
  createdAt: string;
}

export interface SkillData {
  label: string;
  value: number;
  color: string;
}

export interface ExamQuestion {
  id: string;
  text: string;
  timeLimit: number;
  answer?: string;
  score?: number;
  feedback?: string;
}

export interface XPAnimation {
  id: string;
  amount: number;
  x: number;
  y: number;
}

export interface GemAnimation {
  id: string;
  amount: number;
  x: number;
  y: number;
}

export interface Friend {
  id: string;
  username: string;
  avatar?: string;
  total_xp: number;
  level: Level;
  streak: number;
  isOnline: boolean;
  synergyLevel?: number;
  skills?: {
    grammar: number;
    fluency: number;
    vocabulary: number;
    pronunciation: number;
    listening: number;
  };
  achievementsCount?: number;
  weeklyXPData?: number[];
  h2hRecord?: {
    wins: number;
    losses: number;
    draws: number;
  };
}

export interface FriendChallenge {
  id: string;
  friendId: string;
  type: 'xp_race' | 'streak_war' | 'accuracy_duel' | 'co_op_xp' | 'skill_duel' | 'daily_quest' | 'boss_raid';
  skillTarget?: 'grammar' | 'fluency' | 'vocabulary' | 'pronunciation' | 'listening';
  wagerGems?: number;
  status: 'pending' | 'active' | 'completed';
  durationDays: number;
  expiresAt: string;
  userProgress: number;
  friendProgress: number;
  targetGoal?: number;
  rewardXP: number;
  rewardType?: 'xp' | 'loot_box' | 'cosmetic';
}

export interface ActivityFeedItem {
  id: string;
  friendId: string;
  type: 'achievement' | 'challenge_won' | 'level_up' | 'milestone';
  content: string;
  timestamp: string;
  reactions: Record<string, number>;
}

export type RoadmapNodeType = 
  | 'sessions' | 'maxWords' | 'challenges' | 'topics' 
  | 'avgSkill' | 'skill' | 'vault' | 'igcse' 
  | 'igcseScore' | 'roleplay' | 'allSkills';

export interface RoadmapNode {
  id: string;
  title: string;
  desc: string;
  type: RoadmapNodeType;
  req: number | { skill: string; val: number };
  isGate?: boolean;
}

export interface RoadmapLevel {
  id: string;
  name: string;
  icon: string;
  color: string;
  colorPale: string;
  colorDark: string;
  description: string;
  gate: {
    avgSkill: number;
    minSessions: number;
    fluency?: number;
    grammar?: number;
    vocabulary?: number;
    examResponse?: number;
  } | null;
  nodes: RoadmapNode[];
}

export interface RoadmapData {
  skills: {
    pronunciation: number;
    fluency: number;
    grammar: number;
    vocabulary: number;
    examResponse: number;
  };
  levelIndex: number;
  completedNodes: string[];
  lastEvalDate: string | null;
}

export interface MistakeLog {
  skillId: string;
  transcript: string;
  corrected: string;
  timestamp: string;
}

export interface SkillEntry {
  name: string;
  score: number;
  lastSeen: number;
  feedbackCount: number;
  mastery: 'unknown' | 'learning' | 'practiced' | 'mastered';
  recentScores?: number[];
  mistakes?: MistakeLog[];
}

export interface SkillProfile {
  [skillId: string]: SkillEntry;
}

export interface RoleplayTask {
  task_id: number;
  prompt_fr: string;
  prompt_en: string;
}

export interface RoleplayCard {
  id: string;
  title: string;
  setting: string;
  tasks: RoleplayTask[];
}

export interface OfflineScenario {
  id: string;
  emoji: string;
  title: string;
  description: string;
  turns: number;
  data: Record<string, OfflineScenarioState>;
}

export interface OfflineScenarioState {
  prompt: string[];
  intents?: Record<string, string>;
  next?: string;
  capture?: string;
  memory?: Record<string, unknown>;
}

export interface RoleplayScenario {
  id: string;
  title: string;
  icon: string;
  description: string;
  difficulty: 1 | 2 | 3;
}

export interface GeneratedScenario {
  title: string;
  scenario: string;
  npc_name: string;
  npc_personality: string;
  objectives: string[];
  key_vocab: { fr: string; en: string }[];
  opening_line: string;
}

export interface ScenarioState {
  prompt: string | string[];
  intents?: Record<string, string>;
  conditionalPrompts?: { condition: string; prompt: string | string[] }[];
  memory?: Record<string, unknown>;
  next?: string;
}

// ── Response Tier System ──────────────────────────────────────────────────────

/** 0=no answer, 1=1-3 words, 2=4-25 words, 3=26+ words */
export type ResponseTier = 0 | 1 | 2 | 3;

export interface ExpansionLevel {
  level: 1 | 2 | 3;
  sentence: string;
  addedWhat: string;
}

/** Three-layer coaching feedback: what was communicated, how the examiner sees it, how to improve */
export interface CoachingLayer {
  teacher: string;
  examiner: string;
  coach: string;
}

// ── AI Engine Selection ────────────────────────────────────────────────────────

export type AIEngine = 'gemini' | 'groq' | 'offline';

// ── Feedback Voice ───────────────────────────────────────────────────────────
// 'coach' = free-form Gemini/Groq coaching (existing FeedbackV2 scores).
// 'examiner' = Cambridge 0520 descriptor-language commentary on structures/vocabulary
// only, no mark/band/total — see src/services/coaching/examinerFeedback.ts.
export type FeedbackMode = 'coach' | 'examiner';

// ── Learner Difficulty / Proficiency Tier ────────────────────────────────────

export type DifficultyTier = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface DifficultyEvalExpectations {
  wordCountTier1: number;
  wordCountTier2: number;
  wordCountTier3: number;
  requireConnectors: boolean;
  requirePastTense: boolean;
  requireSubjunctive: boolean;
  requireMultiplePerspectives: boolean;
  requireDetailedJustification: boolean;
}

export interface DifficultyConfig {
  tier: DifficultyTier;
  label: string;
  cefr: string;
  cefrTarget: string;
  icon: string;
  color: string;
  description: string;
  preferredQuestionDifficulty: (1 | 2 | 3)[];
  expectations: DifficultyEvalExpectations;
  coachingTone: string;
  coachingRubric: string;
}

export type EngineHealth = 'healthy' | 'degraded' | 'unavailable' | 'checking';

export type EngineConfidence = 'high' | 'medium_high' | 'limited';

export interface EngineMetadata {
  requestedEngine: AIEngine;
  actualEngine: AIEngine;
  fallbackUsed: boolean;
  failoverReason?: string;
  latencyMs: number;
  evaluatedAt: string;
}

export interface EngineResult {
  engine: AIEngine;
  feedback: FeedbackV2;
  meta: EngineMetadata;
}

// ── FeedbackV2 — extended schema (all fields optional for back-compat) ─────────

export type Severity = 'major' | 'minor' | 'polish' | 'strong' | 'anglicism';

export type IssueCategory =
  | 'grammar' | 'tense' | 'gender' | 'agreement' | 'preposition'
  | 'elision' | 'auxiliary' | 'subjunctive' | 'anglicism'
  | 'vocabulary' | 'connectors' | 'pronunciation' | 'rhythm' | 'fluency';

export interface TranscriptSpan {
  start: number;
  end: number;
  severity: Severity;
  category: IssueCategory;
  issueId?: string;
}

export interface TeachMe {
  rule: string;
  why: string;
  mnemonic?: string;
  examples: { fr: string; en: string }[];
  advanced?: string;
  examinerNote?: string;
}

export interface MiniLesson {
  title: string;
  rule: string;
  examples: string[];
  common_mistake: string;
  practice: string;
}

export interface CoachingIssue {
  id: string;
  category: IssueCategory;
  severity: Severity;
  quote: string;
  span?: TranscriptSpan;
  diagnostic: string;
  correction: string;
  stronger?: string;
  marksImpact: 0 | 1 | 2 | 3;
  teachMe?: TeachMe;
  mini_lesson?: MiniLesson;
  themeLabel?: string;
  themeDesc?: string;
  masterTip?: string;
  isRecurring?: boolean;
  recurrenceNote?: string;
  patternTemplate?: string;
  evidence?: string;
  sourceWords?: string[];
  confidence?: number;
}

export interface VocabularyEntry {
  basic: string;
  tier: 'weak' | 'decent' | 'advanced' | 'idiomatic' | 'repetitive' | 'anglicism';
  upgrades: { phrase: string; nuance: string; level: 'B1' | 'B2' | 'C1' }[];
  topic?: string;
  evidence?: string;
  sourceWords?: string[];
  confidence?: number;
}

export interface PronunciationIssue {
  word: string;
  ipaExpected: string;
  ipaHeard: string;
  problem: string;
  severity: Severity;
  drill: { hint: string; repeatPhrase: string };
  // Orthographic fallback populated by Whisper-alignment scorer (no phoneme model yet)
  expected?: string;
  heard?: string;
}

export interface ExaminerVerdict {
  oneLiner: string;
  notebook: string;
  predictedBand:
    | 'Foundation-Developing' | 'Foundation-Secure'
    | 'Core-Developing' | 'Core-Secure'
    | 'Extended-Mid' | 'Extended-High';
  marksGuidance: string;
  examinerInsight?: string;
}

export interface DeepAnalysis {
  sentences: {
    text: string;
    span: { start: number; end: number };
    critique: string;
    complexity: 'simple' | 'compound' | 'complex' | 'sophisticated';
    issues: string[];
  }[];
  rhythm: { score: number; comment: string };
  fillerAnalysis: { word: string; count: number; impact: string }[];
  modelAnswer: { text: string; whyItScores: string };
  pushToTopMarks: string[];
}

export interface FeedbackV2 extends Feedback {
  examiner?: ExaminerVerdict;
  topPriorityIssueId?: string;
  strongestMomentSpan?: TranscriptSpan;
  strongestMomentExplanation?: string;
  best_moment?: string;
  biggest_opportunity?: string;
  improved_answer?: string;
  rephrase?: string;
  advanced_answer?: string;
  expansion_ideas?: string[];
  formatted_transcript?: string;
  issues?: CoachingIssue[];
  transcriptAnnotations?: TranscriptSpan[];
  vocabularyV2?: VocabularyEntry[];
  pronunciation?: { score: number | null; issues: PronunciationIssue[] };
  deepAnalysis?: DeepAnalysis;
  schemaVersion?: 2 | 3;
  avoidanceReport?: AvoidanceReportEntry[];
  skillContextUsed?: boolean;
  provider?: string;
  providerAttempts?: { provider: string; success: boolean; error?: string }[];
  engineMeta?: EngineMetadata;
  responseTier?: ResponseTier;
  expansionLevels?: ExpansionLevel[];
  coachingLayer?: CoachingLayer;
  confidence?: number;
  /** Set when this attempt was never actually graded — `scores` is a placeholder, not a real assessment. */
  unscored?: UnscoredReason;
  // Learn adaptive-difficulty (docs §9.2/§9.3/§14 Stage 8b) — optional; only
  // meaningful when the backend resolved demands server-side. Telemetry/L2
  // gap-fill source only, never rendered as a verdict on their own — the
  // learner sees exactly one verdict per demand, and it is L1's (docs §14 #5).
  answered_the_question?: boolean;
  demands_met?: string[];
  demands_missed?: string[];
  difficulty_fit?: 'too easy' | 'right level' | 'too hard';
  /** True only when the backend resolved question demands by questionId + demandsVersion (docs §9.1); absent/false -> buildDemandEvidence's L2 gap-fill must not run. */
  demandsResolved?: boolean;
}

/**
 * Every path that produces a FeedbackV2 with no real assessment must tag
 * *why*, so isUnscored()/displayScore() can render "not graded" instead of a
 * fabricated score (A4). `no_llm_offline` — offline fallback, no LLM judged
 * it. `below_assessable_length` — too short to assess (tier 0/1, online or
 * offline). `evaluation_failed` — the evaluation call itself failed.
 * `backend_offline_fallback` — backend's own offline heuristic answered
 * (providerStatus: "offline_fallback"). `backend_malformed_response` — a
 * live provider responded but omitted scores (providerStatus:
 * "malformed_response").
 */
export type UnscoredReason =
  | 'no_llm_offline'
  | 'below_assessable_length'
  | 'evaluation_failed'
  | 'backend_offline_fallback'
  | 'backend_malformed_response';

// ── Avoidance detection ────────────────────────────────────────────────────────

export interface AvoidanceSignal {
  skillId: string;
  observation: string;
  nudge: string;
  evidence?: string;
  sourceWords?: string[];
  confidence?: number;
}

export type AvoidanceReportEntry = AvoidanceSignal;

// ── Practice Session Architecture ────────────────────────────────────────────

export type SessionMode = 'single' | 'quick' | 'standard' | 'deep_dive' | 'full_topic';

export interface QuestionAttempt {
  transcript: string;
  /** null when this attempt was never graded (offline fallback) — never a fabricated placeholder. */
  score: number | null;
  xpEarned: number;
  feedback: FeedbackV2;
  durationSec: number;
  attemptIndex: number;
  /** Absent treated as 'main'. Set to 'followup' for a follow-up-turn attempt (Phase 3). */
  kind?: 'main' | 'followup';
  /** Set only when kind === 'followup' — the follow-up prompt text shown for this attempt. */
  promptText?: string;
}

export interface SessionQuestion {
  question: Question;
  status: 'pending' | 'active' | 'completed' | 'skipped';
  attempts: QuestionAttempt[];
  /** Best real score across attempts; null until a graded attempt exists. */
  bestScore: number | null;
  savedVocab: string[];
  /** True when this question was spliced in as a spaced-review re-exposure of a previously-failed question. */
  isReview?: boolean;
  /** docs §8.4 — the slot this question was selected for, so midSessionAdjust can tell stretch from target. Absent for legacy-path (non-adaptive) sessions and the review slot. */
  slotType?: SlotType;
  /** docs §8.4 — the band this question was selected under, so a 'target' slot's band can be shifted by -1.0 on ease. Absent/null when the slot's band was ignored (e.g. review) or the question came from the legacy path. */
  slotBand?: DemandBand | null;
  /** docs §14 UX #2 "why this question" — present on the initial adaptive-path build; absent after a midSessionAdjust replacement or on the legacy path. */
  selectionReason?: SelectionReason;
}

export interface ActiveSession {
  id: string;
  topicKey: string;
  mode: SessionMode;
  targetCount: number;
  questions: SessionQuestion[];
  currentIndex: number;
  questionsCompleted: number;
  answerStreak: number;
  bestStreak: number;
  xpAccumulated: number;
  gemsAccumulated: number;
  totalWords: number;
  startedAt: string;
  skillSnapshot: SkillProfile;
  /** docs §14 UX #4 — demand:* beliefs at session start, for SessionSummary's demand-delta readout. Present only on the adaptive path (learnAdaptiveDifficulty live); absent on the legacy path. */
  demandSnapshot?: Record<string, DemandBelief>;
}

export interface TopicMasteryEntry {
  topicKey: string;
  sessionsCompleted: number;
  /** Sessions that contributed a real score to averageScore — the correct weight for its running mean. Defaults to sessionsCompleted on read for entries written before this field existed. */
  scoredSessionsCompleted?: number;
  uniqueQuestionsAnswered: string[];
  averageScore: number;
  lastSessionAt: string;
  mastered: boolean;
  masteredAt?: string;
  badge?: 'bronze' | 'silver' | 'gold';
}

// ── Cross-session skill context (sent to backend) ─────────────────────────────

export interface SkillWeaknessContext {
  skillId: string;
  name: string;
  mastery: number;
  trend: 'improving' | 'declining' | 'stagnating' | 'new';
  recurrenceCount: number;
  recentMistake?: string;
}

export interface SkillContext {
  weaknesses: SkillWeaknessContext[];
  strengths: { skillId: string; name: string }[];
  sessionsAnalyzed: number;
  avoidanceFlags?: string[];
}
