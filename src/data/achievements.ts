import type { EvidenceBeliefSnapshot } from '../types/beliefs';
import type { LearningProblem, Intervention } from '../types/intervention';

// ── Display data (no logic) ────────────────────────────────────────────────────
export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  category: 'streak' | 'practice' | 'skill' | 'exam' | 'social';
  hidden?: boolean;
}

// ── Immutable snapshot assembled once after session completion ─────────────────
export interface AchievementContext {
  score: number;
  streak: number;
  totalSessions: number;
  topicsUsed: string[];
  beliefSnapshot: EvidenceBeliefSnapshot | null;
  problems: LearningProblem[];
  interventions: Intervention[];
  xp: number;
  grammarCoachUses: number;
  roleplayCount: number;
  examCompleted: boolean;
  examType: 'igcse' | 'practice' | null;
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
const minScore     = (n: number): Predicate => ctx => ctx.score >= n;
const minXP        = (n: number): Predicate => ctx => ctx.xp >= n;
const topicsCover  = (n: number): Predicate => ctx => ctx.topicsUsed.length >= n;

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

// ── Achievement definitions (display only — no logic) ─────────────────────────
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  { id: 'premier_pas',         name: 'Premier Pas',           description: 'Complete your first session',              icon: '🎯',  xpReward: 50,   category: 'practice' },
  { id: 'cinq_sessions',       name: 'Assidu',                description: 'Complete 5 sessions',                      icon: '📅',  xpReward: 75,   category: 'practice' },
  { id: 'dix_sessions',        name: 'Habitué',               description: 'Complete 10 sessions',                     icon: '🗓️',  xpReward: 100,  category: 'practice' },
  { id: 'marathonien',         name: 'Marathonien',           description: 'Complete 50 sessions',                     icon: '🏃',  xpReward: 250,  category: 'practice' },
  { id: 'triple_jour',         name: 'Triple Jour',           description: 'Maintain a 3-day streak',                  icon: '⚡',  xpReward: 75,   category: 'streak' },
  { id: 'semaine_parfaite',    name: 'Semaine Parfaite',      description: 'Maintain a 7-day streak',                  icon: '🔥',  xpReward: 200,  category: 'streak' },
  { id: 'fluent',              name: 'Fluent',                description: 'Score 8+ in a session',                    icon: '🌟',  xpReward: 100,  category: 'skill' },
  { id: 'perfectionniste',     name: 'Perfectionniste',       description: 'Score a perfect 10/10',                    icon: '💎',  xpReward: 300,  category: 'skill',   hidden: true },
  { id: 'polyglotte',          name: 'Polyglotte',            description: 'Practice all 8 topics',                    icon: '🗺️',  xpReward: 200,  category: 'practice' },
  { id: 'examinateur',         name: 'Examinateur',           description: 'Complete your first exam',                 icon: '📝',  xpReward: 100,  category: 'exam' },
  { id: 'grand_oral',          name: 'Grand Oral',            description: 'Complete your first IGCSE exam',           icon: '🎓',  xpReward: 150,  category: 'exam',    hidden: true },
  { id: 'expert',              name: 'Expert',                description: 'Reach Advanced level (1500 XP)',            icon: '🏆',  xpReward: 500,  category: 'skill' },
  { id: 'bete_de_mode',        name: 'Bête de Mode',          description: 'Reach Beast Mode (7000 XP)',               icon: '👹',  xpReward: 1000, category: 'skill',   hidden: true },
  { id: 'grammaire_maitrisee', name: 'Grammaire Maîtrisée',   description: 'Master a grammar skill (80% mastery)',     icon: '✅',  xpReward: 150,  category: 'skill' },
  { id: 'probleme_resolu',     name: 'Problème Résolu',       description: 'Resolve a recurring grammar problem',      icon: '🔧',  xpReward: 150,  category: 'skill' },
  { id: 'drill_master',        name: 'Drill Master',          description: 'Complete 5 grammar drills',                icon: '🎯',  xpReward: 125,  category: 'skill',   hidden: true },
  { id: 'curieux',             name: 'Curieux',               description: 'Use Grammar Coach 10 times',               icon: '🔬',  xpReward: 75,   category: 'practice' },
  { id: 'explorateur',         name: 'Explorateur',           description: 'Try your first roleplay',                  icon: '🧭',  xpReward: 50,   category: 'social' },
  { id: 'causeur',             name: 'Causeur',               description: 'Complete 5 roleplay conversations',         icon: '💬',  xpReward: 125,  category: 'social' },
  { id: 'niveau_b2',           name: 'Niveau B2',             description: 'Average skill mastery ≥ 60%',              icon: '🏅',  xpReward: 300,  category: 'skill',   hidden: true },
];

// ── Achievement rules (logic only — no display data) ──────────────────────────
export const ACHIEVEMENT_RULES: AchievementRule[] = [
  { id: 'premier_pas',         condition: minSessions(1) },
  { id: 'cinq_sessions',       condition: minSessions(5),    requires: ['premier_pas'] },
  { id: 'dix_sessions',        condition: minSessions(10),   requires: ['cinq_sessions'] },
  { id: 'marathonien',         condition: minSessions(50),   requires: ['dix_sessions'] },
  { id: 'triple_jour',         condition: minStreak(3) },
  { id: 'semaine_parfaite',    condition: minStreak(7),      requires: ['triple_jour'] },
  { id: 'fluent',              condition: minScore(8) },
  { id: 'perfectionniste',     condition: minScore(10),      requires: ['fluent'] },
  { id: 'polyglotte',          condition: topicsCover(8) },
  { id: 'examinateur',         condition: ctx => ctx.examCompleted && ctx.examType !== null },
  { id: 'grand_oral',          condition: ctx => ctx.examCompleted && ctx.examType === 'igcse', requires: ['examinateur'] },
  { id: 'expert',              condition: minXP(1500) },
  { id: 'bete_de_mode',        condition: minXP(7000),       requires: ['expert'] },
  { id: 'grammaire_maitrisee', condition: anySkillMastery(0.8) },
  { id: 'probleme_resolu',     condition: hasProblemStatus('resolved') },
  { id: 'drill_master',        condition: minInterventions(5), requires: ['probleme_resolu'] },
  { id: 'curieux',             condition: ctx => ctx.grammarCoachUses >= 10 },
  { id: 'explorateur',         condition: ctx => ctx.roleplayCount >= 1 },
  { id: 'causeur',             condition: ctx => ctx.roleplayCount >= 5, requires: ['explorateur'] },
  { id: 'niveau_b2',           condition: avgSkillMastery(0.6), requires: ['expert'] },
];

/**
 * Pure: returns IDs of all rules whose prerequisites are met and whose
 * condition passes. No storage side effects.
 */
export function evaluateAchievements(
  ctx: AchievementContext,
  alreadyUnlocked: ReadonlySet<string>,
): string[] {
  return ACHIEVEMENT_RULES
    .filter(r => {
      if (r.requires && !r.requires.every(id => alreadyUnlocked.has(id))) return false;
      return r.condition(ctx);
    })
    .map(r => r.id);
}

/** Dev-time parity check — call once on app boot. No-op in prod if you strip console.warn. */
export function validateAchievementRegistry(): void {
  const defIds = new Set(ACHIEVEMENT_DEFINITIONS.map(d => d.id));
  const ruleIds = new Set(ACHIEVEMENT_RULES.map(r => r.id));
  for (const id of defIds) {
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
