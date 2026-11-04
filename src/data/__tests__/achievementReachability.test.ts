import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ACHIEVEMENT_DEFINITIONS, evaluateAchievements, type AchievementContext } from '../achievements';
import type { EvidenceBeliefSnapshot } from '../../types/beliefs';
import type { LearningProblem } from '../../types/intervention';

/**
 * Every visible achievement must be reachable from real app data.
 *
 * In 2026-11 four visible achievements (Polyglotte, Explorateur, Causeur,
 * Curieux) could never unlock: their predicates read a per-answer value or a
 * counter that no screen ever increased. Nothing failed, so it shipped.
 *
 * This test closes that gap in two halves:
 *  1. Every visible achievement has a WITNESS: the smallest change to an empty
 *     context that unlocks it (prerequisites included). A new visible
 *     achievement with no witness fails here.
 *  2. Every context field a witness changes has a PRODUCER: live (non-test)
 *     source that actually writes that signal. A predicate reading a field
 *     nothing produces fails here.
 *
 * A hidden achievement is exempt (it stays off Profile until unlocked), which
 * is why Curieux is hidden while nothing counts Grammar Coach uses. To make a
 * new achievement visible, give it a witness and make sure its producer exists.
 */

const SRC = resolve(__dirname, '../..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const FILES = new Map(sourceFiles(SRC).map(f => [relative(SRC, f).replace(/\\/g, '/'), stripComments(readFileSync(f, 'utf8'))]));

/** `pattern` appears in live code of `file`. */
const inFile = (file: string, pattern: RegExp) => () => {
  const code = FILES.get(file);
  if (code === undefined) return `${file} does not exist`;
  return pattern.test(code) ? null : `${file} no longer matches ${pattern}`;
};

/** Some live file other than the one defining `fn` calls it. */
const calledOutside = (fn: string, definedIn: string) => () => {
  const call = new RegExp(`\\b${fn}\\(`);
  const callers = [...FILES].filter(([file, code]) => file !== definedIn && call.test(code));
  return callers.length > 0 ? null : `nothing outside ${definedIn} calls ${fn}()`;
};

const all = (...checks: (() => string | null)[]) => () => checks.map(c => c()).filter(Boolean).join('; ') || null;

type Field = keyof AchievementContext;

/** Where each context field really comes from. A field missing here has no known producer. */
const PRODUCERS: Partial<Record<Field, () => string | null>> = {
  totalSessions: inFile('services/coach/sessionOrchestrator.ts', /totalSessionsAfter:\s*totalSessionsBefore \+ 1/),
  streak: inFile('services/coach/sessionOrchestrator.ts', /buildAchievementContext\(\{[\s\S]*?streakDays/),
  score: inFile('services/coach/sessionOrchestrator.ts', /buildAchievementContext\(\{[\s\S]*?finalScore:/),
  xp: all(
    inFile('services/coach/achievementContextBuilder.ts', /getProgressionState\(\)/),
    inFile('services/coach/sessionOrchestrator.ts', /awardXP\(/),
  ),
  // Distinct Learn topics, read from stored history: Learn must record practice sessions with a topic.
  topicsUsed: all(
    inFile('services/coach/achievementContextBuilder.ts', /achievementHistoryCounts\(getSessionHistory\(\)\)/),
    inFile('screens/Learn.tsx', /mode: 'practice',\s*topicKey:/),
  ),
  // Distinct role plays, read from stored history: the routed Role-play drill must record 'story' sessions.
  roleplayCount: all(
    inFile('services/coach/achievementContextBuilder.ts', /history\.rolePlayKeys\.length/),
    inFile('screens/rolePlayDrill/RolePlayDrill.tsx', /orchestrateAttempt\(\{[\s\S]*?mode: 'story'/),
    inFile('App.tsx', /path="\/exam\/role-play"/),
  ),
  grammarCoachUses: calledOutside('recordGrammarCoachUse', 'services/progression/progressionService.ts'),
  examCompleted: inFile('screens/ExamMode.tsx', /examCompleted: true/),
  examType: inFile('screens/ExamMode.tsx', /examType: attemptStatus\.countsTowardProgress \? 'igcse'/),
  beliefSnapshot: inFile('services/coach/sessionOrchestrator.ts', /const beliefSnapshot = updateFromFeedback\(\)[\s\S]*?buildAchievementContext\(\{[\s\S]*?beliefSnapshot,/),
  problems: all(
    inFile('services/coach/interventionService.ts', /status: 'resolved'/),
    calledOutside('refreshDemandProblems', 'services/coach/interventionService.ts'),
  ),
  interventions: calledOutside('recordIntervention', 'services/coach/interventionService.ts'),
};

const BASE: AchievementContext = {
  score: null, streak: 0, totalSessions: 0, topicsUsed: [], beliefSnapshot: null, problems: [],
  interventions: [], xp: 0, grammarCoachUses: 0, roleplayCount: 0, examCompleted: false, examType: null,
};

const snapshot = (mastery: number) =>
  ({ skills: { 'grammar:perfect_tense': { mastery } } }) as unknown as EvidenceBeliefSnapshot;
const EIGHT_TOPICS = ['school', 'hobbies', 'family', 'holidays', 'home', 'future', 'food', 'environment'];

/** The smallest context that unlocks each visible achievement. */
const WITNESSES: Record<string, Partial<AchievementContext>> = {
  premier_pas: { totalSessions: 1 },
  cinq_sessions: { totalSessions: 5 },
  dix_sessions: { totalSessions: 10 },
  marathonien: { totalSessions: 50 },
  triple_jour: { streak: 3 },
  semaine_parfaite: { streak: 7 },
  fluent: { score: 8 },
  polyglotte: { topicsUsed: EIGHT_TOPICS },
  examinateur: { examCompleted: true, examType: 'practice' },
  expert: { xp: 1500 },
  grammaire_maitrisee: { beliefSnapshot: snapshot(0.8) },
  probleme_resolu: { problems: [{ status: 'resolved' } as LearningProblem] },
  explorateur: { roleplayCount: 1 },
  causeur: { roleplayCount: 5 },
};

const visible = ACHIEVEMENT_DEFINITIONS.filter(d => !d.hidden);

describe('every visible achievement is reachable from real app data', () => {
  it('there are visible achievements to check', () => {
    expect(visible.length).toBeGreaterThan(5);
  });

  it('every producer check is itself live (no stale pattern)', () => {
    const broken = Object.entries(PRODUCERS)
      .filter(([field]) => field !== 'grammarCoachUses') // known missing: Curieux is hidden for it
      .map(([field, check]) => [field, check!()] as const)
      .filter(([, problem]) => problem !== null);
    expect(broken).toEqual([]);
  });

  for (const def of visible) {
    describe(`${def.name} (${def.id})`, () => {
      const witness = WITNESSES[def.id];

      it('has a witness that unlocks it from a fresh account', () => {
        expect(witness, `add a WITNESSES entry for "${def.id}" — or hide it until it can be reached`).toBeDefined();
        expect(evaluateAchievements({ ...BASE, ...witness }, new Set())).toContain(def.id);
      });

      it('reads only signals the app actually produces', () => {
        const fields = Object.keys(witness ?? {}) as Field[];
        expect(fields.length).toBeGreaterThan(0);
        const missing = fields
          .map(field => {
            const producer = PRODUCERS[field];
            const problem = producer ? producer() : 'no producer listed';
            return problem ? `${field}: ${problem}` : null;
          })
          .filter(Boolean);
        expect(missing, `"${def.id}" can never unlock in the real app`).toEqual([]);
      });
    });
  }
});
