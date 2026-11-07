import type { EvidenceBeliefSnapshot } from '../types/beliefs';
import type { LearningProblem, Intervention } from '../types/intervention';

// ── Display data (no logic) ────────────────────────────────────────────────────
/**
 * Design rules for this list live in docs/systems/achievements.md. In short:
 * early wins come quickly, habits never punish a break, the big ones reward
 * the learner beating their own past (never only an absolute score), every
 * description says exactly what to do, and nothing claims a level (CEFR,
 * grade) the app cannot measure.
 */
export type AchievementCategory = 'start' | 'habit' | 'speaking' | 'growth' | 'exam' | 'explore' | 'levels';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  category: AchievementCategory;
  /** Off the list until unlocked — a surprise, not a goal to chase. */
  hidden?: boolean;
  /**
   * No longer awarded. Kept so a learner who already earned it still sees it
   * (taking a badge away feels like a loss); shown only when unlocked.
   */
  retired?: boolean;
}

// ── Immutable snapshot assembled once after session completion ─────────────────
export interface AchievementContext {
  /** null when the session has no real assessed score — score-gated achievements must not fire on it. */
  score: number | null;
  streak: number;
  totalSessions: number;
  topicsUsed: string[];
  beliefSnapshot: EvidenceBeliefSnapshot | null;
  problems: LearningProblem[];
  interventions: Intervention[];
  xp: number;
  roleplayCount: number;
  examCompleted: boolean;
  examType: 'igcse' | 'practice' | null;
  /** Distinct local days with a spoken answer — breaks never reset it. */
  daysPractised: number;
  /** Words in the longest single answer (Learn, role play, news — never a whole exam). */
  longestAnswerWords: number;
  /** A question answered again scored at least 2 points above its first try. */
  improvedOnRepeat: boolean;
  /** A counted Exam Sim total beat the counted one before it. */
  examImproved: boolean;
  /** This answer repaired a slip mid-sentence (the feedback credited a self-correction). */
  selfCorrected: boolean;
  /** Today's practice came after 7 or more days away. */
  returnedAfterBreak: boolean;
}

type Predicate = (ctx: AchievementContext) => boolean;

interface AchievementRule {
  id: string;
  condition: Predicate;
  requires?: string[];
}

// ── Helper predicates ──────────────────────────────────────────────────────────
const minSessions  = (n: number): Predicate => ctx => ctx.totalSessions >= n;
const minStreak    = (n: number): Predicate => ctx => ctx.streak >= n;
const minDays      = (n: number): Predicate => ctx => ctx.daysPractised >= n;
const minScore     = (n: number): Predicate => ctx => ctx.score != null && ctx.score >= n;
const minXP        = (n: number): Predicate => ctx => ctx.xp >= n;
const topicsCover  = (n: number): Predicate => ctx => ctx.topicsUsed.length >= n;
const minRolePlays = (n: number): Predicate => ctx => ctx.roleplayCount >= n;

const anySkillMastery = (min: number): Predicate => ctx => {
  if (!ctx.beliefSnapshot) return false;
  return Object.values(ctx.beliefSnapshot.skills).some(s => s.mastery >= min);
};

const avgSkillMastery = (min: number): Predicate => ctx => {
  if (!ctx.beliefSnapshot) return false;
  const skills = Object.values(ctx.beliefSnapshot.skills);
  if (skills.length === 0) return false;
  return skills.reduce((sum, s) => sum + s.mastery, 0) / skills.length >= min;
};

const hasProblemStatus = (status: LearningProblem['status']): Predicate =>
  ctx => ctx.problems.some(p => p.status === status);

const minInterventions = (n: number): Predicate => ctx => ctx.interventions.length >= n;

/** Words in an answer that counts as "developed" — about 20–30 seconds of A2 speech. */
export const DEVELOPED_ANSWER_WORDS = 40;
/** How much higher a repeat must score to count as real improvement, not marking noise. */
export const REPEAT_IMPROVEMENT_POINTS = 2;
/** Days away before coming back counts as a return. */
export const RETURN_AFTER_DAYS = 7;

// ── Achievement definitions (display only — no logic) ─────────────────────────
// Ids are permanent: shop items are gated on them server-side
// (shop_items.requirement, docs/systems/shop-economy.md §6), and learners'
// unlocked ids are synced. Change a name, description or rule; never an id.
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Getting started — two quick, certain wins
  { id: 'premier_pas',         name: 'Premier pas',         description: 'Record your first answer in French',                 icon: '🎯', xpReward: 50,   category: 'start' },
  { id: 'curieux',             name: 'Curieux',             description: 'Practise 3 different Learn topics',                  icon: '🔬', xpReward: 75,   category: 'start' },

  // Habit — streaks for momentum, day counts that a missed day never resets
  { id: 'triple_jour',         name: 'Triple jour',         description: 'Practise 3 days in a row',                           icon: '⚡', xpReward: 75,   category: 'habit' },
  { id: 'semaine_parfaite',    name: 'Semaine parfaite',    description: 'Practise 7 days in a row',                           icon: '🔥', xpReward: 200,  category: 'habit' },
  { id: 'regulier',            name: 'Régulier',            description: 'Practise on 10 different days — a missed day never resets this', icon: '📅', xpReward: 150, category: 'habit' },
  { id: 'fidele',              name: 'Fidèle',              description: 'Practise on 30 different days',                      icon: '🗓️', xpReward: 300,  category: 'habit' },
  { id: 'dix_sessions',        name: 'Habitué',             description: 'Record 10 answers',                                  icon: '🗓️', xpReward: 100,  category: 'habit' },
  { id: 'marathonien',         name: 'Marathonien',         description: 'Record 50 answers',                                  icon: '🏃', xpReward: 250,  category: 'habit' },

  // Speaking — what examiners reward
  { id: 'developpe',           name: 'Développé',           description: `Give a ${DEVELOPED_ANSWER_WORDS}-word answer — examiners reward answers you develop`, icon: '🗣️', xpReward: 100, category: 'speaking' },
  { id: 'fluent',              name: 'Très bien',           description: 'Score 8/10 or more on an answer',                    icon: '🌟', xpReward: 100,  category: 'speaking' },
  { id: 'perfectionniste',     name: 'Perfectionniste',     description: 'Score a perfect 10/10',                              icon: '💎', xpReward: 300,  category: 'speaking', hidden: true },
  { id: 'autocorrection',      name: 'Je me reprends',      description: 'Fix your own slip mid-answer, like a fluent speaker', icon: '🔁', xpReward: 100, category: 'speaking', hidden: true },

  // Growth — beating your own past
  { id: 'en_progres',          name: 'En progrès',          description: `Score ${REPEAT_IMPROVEMENT_POINTS}+ points higher on a question you answered before`, icon: '📈', xpReward: 150, category: 'growth' },
  { id: 'probleme_resolu',     name: 'Problème résolu',     description: 'Stop making a mistake the coach saw you repeat',     icon: '🔧', xpReward: 150,  category: 'growth' },
  { id: 'drill_master',        name: 'Drill master',        description: 'Take 5 grammar drills the coach offers you',         icon: '🎯', xpReward: 125,  category: 'growth' },
  { id: 'grammaire_maitrisee', name: 'Grammaire maîtrisée', description: 'Get one grammar point to 80% mastery',               icon: '✅', xpReward: 150,  category: 'growth' },
  { id: 'niveau_b2',           name: 'Bases solides',       description: 'Get your average grammar mastery to 60%',            icon: '🏅', xpReward: 300,  category: 'growth' },
  { id: 'le_retour',           name: 'Le retour',           description: 'Come back after a week away — welcome back',         icon: '👋', xpReward: 50,  category: 'growth', hidden: true },

  // Exam — the goal itself
  { id: 'examinateur',         name: 'Examinateur',         description: 'Sit your first speaking exam (any mode)',            icon: '📝', xpReward: 100,  category: 'exam' },
  { id: 'grand_oral',          name: 'Grand oral',          description: 'Complete an Exam Sim under real exam conditions',    icon: '🎓', xpReward: 150,  category: 'exam' },
  { id: 'remontee',            name: 'Remontée',            description: 'Beat your previous Exam Sim total',                  icon: '📊', xpReward: 200,  category: 'exam' },

  // Explore — breadth across the exam's topics and the role play
  { id: 'explorateur',         name: 'Explorateur',         description: 'Answer your first role play',                        icon: '🧭', xpReward: 50,   category: 'explore' },
  { id: 'causeur',             name: 'Causeur',             description: 'Practise 5 different role plays',                    icon: '💬', xpReward: 125,  category: 'explore' },
  { id: 'polyglotte',          name: 'Polyglotte',          description: 'Practise 8 different Learn topics',                  icon: '🗺️', xpReward: 200,  category: 'explore' },

  // Levels — XP milestones; the level bar on Profile already shows progress
  { id: 'expert',              name: 'Expert',              description: 'Reach the Advanced level (1,500 XP)',                icon: '🏆', xpReward: 500,  category: 'levels' },
  { id: 'bete_de_mode',        name: 'Bête de mode',        description: 'Reach Beast Mode (7,000 XP)',                        icon: '👹', xpReward: 1000, category: 'levels' },

  // Retired — kept only for learners who already earned them
  { id: 'cinq_sessions',       name: 'Assidu',              description: 'Record 5 answers',                                   icon: '📅', xpReward: 75,   category: 'habit', retired: true },
];

// ── Achievement rules (logic only — no display data) ──────────────────────────
// A rule must come after the rules it requires (one pass unlocks a chain).
export const ACHIEVEMENT_RULES: AchievementRule[] = [
  { id: 'premier_pas',         condition: minSessions(1) },
  { id: 'curieux',             condition: topicsCover(3) },
  { id: 'triple_jour',         condition: minStreak(3) },
  { id: 'semaine_parfaite',    condition: minStreak(7),      requires: ['triple_jour'] },
  { id: 'regulier',            condition: minDays(10) },
  { id: 'fidele',              condition: minDays(30),       requires: ['regulier'] },
  { id: 'dix_sessions',        condition: minSessions(10),   requires: ['premier_pas'] },
  { id: 'marathonien',         condition: minSessions(50),   requires: ['dix_sessions'] },
  { id: 'expert',              condition: minXP(1500) },
  { id: 'bete_de_mode',        condition: minXP(7000),       requires: ['expert'] },
  { id: 'developpe',           condition: ctx => ctx.longestAnswerWords >= DEVELOPED_ANSWER_WORDS },
  { id: 'fluent',              condition: minScore(8) },
  { id: 'perfectionniste',     condition: minScore(10),      requires: ['fluent'] },
  { id: 'autocorrection',      condition: ctx => ctx.selfCorrected },
  { id: 'en_progres',          condition: ctx => ctx.improvedOnRepeat },
  { id: 'probleme_resolu',     condition: hasProblemStatus('resolved') },
  { id: 'drill_master',        condition: minInterventions(5) },
  { id: 'grammaire_maitrisee', condition: anySkillMastery(0.8) },
  { id: 'niveau_b2',           condition: avgSkillMastery(0.6) },
  { id: 'le_retour',           condition: ctx => ctx.returnedAfterBreak },
  { id: 'examinateur',         condition: ctx => ctx.examCompleted && ctx.examType !== null },
  { id: 'grand_oral',          condition: ctx => ctx.examCompleted && ctx.examType === 'igcse', requires: ['examinateur'] },
  { id: 'remontee',            condition: ctx => ctx.examImproved,                               requires: ['grand_oral'] },
  { id: 'explorateur',         condition: minRolePlays(1) },
  { id: 'causeur',             condition: minRolePlays(5),   requires: ['explorateur'] },
  { id: 'polyglotte',          condition: topicsCover(8),    requires: ['curieux'] },
];

/**
 * Pure: returns IDs of the not-yet-unlocked rules whose prerequisites are met
 * (already, or earlier in this pass) and whose condition passes. No storage side effects.
 */
export function evaluateAchievements(
  ctx: AchievementContext,
  alreadyUnlocked: ReadonlySet<string>,
): string[] {
  // Prerequisites may be met in the same pass (rules are ordered after the
  // ones they require), so a first counted Exam Sim unlocks both Examinateur
  // and Grand Oral, and a returning learner's backlog unlocks in one go
  // instead of one tier per session.
  const unlocked = new Set(alreadyUnlocked);
  const fresh: string[] = [];
  for (const r of ACHIEVEMENT_RULES) {
    if (unlocked.has(r.id)) continue;
    if (r.requires && !r.requires.every(id => unlocked.has(id))) continue;
    if (!r.condition(ctx)) continue;
    unlocked.add(r.id);
    fresh.push(r.id);
  }
  return fresh;
}

/** Dev-time parity check — call once on app boot. No-op in prod if you strip console.warn. */
export function validateAchievementRegistry(): void {
  const defIds = new Set(ACHIEVEMENT_DEFINITIONS.map(d => d.id));
  const ruleIds = new Set(ACHIEVEMENT_RULES.map(r => r.id));
  const retiredIds = new Set(ACHIEVEMENT_DEFINITIONS.filter(d => d.retired).map(d => d.id));
  for (const id of defIds) {
    if (retiredIds.has(id)) {
      if (ruleIds.has(id)) console.warn(`[achievements] "${id}" is retired but still has a rule`);
      continue;
    }
    if (!ruleIds.has(id)) console.warn(`[achievements] "${id}" has a definition but no rule`);
  }
  for (const id of ruleIds) {
    if (!defIds.has(id)) console.warn(`[achievements] "${id}" has a rule but no definition`);
  }
  for (const rule of ACHIEVEMENT_RULES) {
    for (const reqId of rule.requires ?? []) {
      if (!ruleIds.has(reqId)) console.warn(`[achievements] "${rule.id}" requires unknown "${reqId}"`);
    }
  }
}
