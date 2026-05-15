export type Screen = 'home' | 'learn' | 'exam' | 'progress' | 'profile' | 'explore' | 'shop' | 'about' | 'challenges' | 'rapid-fire' | 'boss-battle' | 'story-mode' | 'survival' | 'speed-speaking' | 'emoji-master' | 'mystery-box' | 'study-groups' | 'pronunciation-lab' | 'roadmap' | 'friend-challenges' | 'rankings' | 'listening-mode' | 'fluency-heatmap' | 'speaking-arena' | 'accent-analyzer' | 'weakness-analysis' | 'sentence-rebuilder' | 'word-drop' | 'daily-news' | 'scenario-architect' | 'mastery';


export type Level = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Beast Mode';

export type League = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Champion';

export interface RankingUser {
  id: string;
  username: string;
  avatar?: string;
  totalXP: number;
  weeklyXP: number;
  currentLeague: League;
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
  score: number;
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
  req: any;
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
  isRecurring?: boolean;
  recurrenceNote?: string;
  patternTemplate?: string;
}

export interface VocabularyEntry {
  basic: string;
  tier: 'weak' | 'decent' | 'advanced' | 'idiomatic' | 'repetitive' | 'anglicism';
  upgrades: { phrase: string; nuance: string; level: 'B1' | 'B2' | 'C1' }[];
  topic?: string;
}

export interface PronunciationIssue {
  word: string;
  ipaExpected: string;
  ipaHeard: string;
  problem: string;
  severity: Severity;
  drill: { hint: string; repeatPhrase: string };
}

export interface ExaminerVerdict {
  oneLiner: string;
  notebook: string;
  predictedBand:
    | 'Foundation-Developing' | 'Foundation-Secure'
    | 'Core-Developing' | 'Core-Secure'
    | 'Extended-Mid' | 'Extended-High';
  marksGuidance: string;
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
  issues?: CoachingIssue[];
  transcriptAnnotations?: TranscriptSpan[];
  vocabularyV2?: VocabularyEntry[];
  pronunciation?: { score: number; issues: PronunciationIssue[] };
  deepAnalysis?: DeepAnalysis;
  schemaVersion?: 2 | 3;
  avoidanceReport?: AvoidanceReportEntry[];
  skillContextUsed?: boolean;
}

// ── Avoidance detection ────────────────────────────────────────────────────────

export interface AvoidanceSignal {
  skillId: string;
  observation: string;
  nudge: string;
}

export type AvoidanceReportEntry = AvoidanceSignal;

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
