/**
 * Stage 2 validator — the structural gate for authored roleplay content
 * (graph + meta + deck), run via `npm run roleplay:check` and wired into
 * `npm test`. Every rule below exists because the real corpus has produced
 * that exact failure at least once — see "Stage 2 — Validator" in the
 * overhaul plan for the rule table and the concrete failures each rule
 * catches.
 *
 * Pure and side-effect free: takes registry entries in, returns a report.
 * Mirrors the Issue/ValidationReport shape already used by
 * src/data/exam/bank/validate.ts.
 */
import { MAX_TURNS } from './constants';
import type { BranchTrigger, ScenarioDeck, ScenarioGraph, ScenarioMeta } from './types';

export interface Issue {
  code: string;
  message: string;
  path: string;
}

export interface ValidationReport {
  errors: Issue[];
  warnings: Issue[];
}

export interface ScenarioEntryForValidation {
  id: string;
  meta: ScenarioMeta;
  graph: ScenarioGraph;
  deck: ScenarioDeck;
  authored: boolean;
}

function normalizeForMatch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Light inflectional suffix strip: trailing s/e/es/ent when the stem stays >= 4 chars — matches the intent-matcher stemming rule. */
function stripInflection(word: string): string {
  for (const suffix of ['ent', 'es', 's', 'e']) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 4) {
      return word.slice(0, word.length - suffix.length);
    }
  }
  return word;
}

/**
 * A deck entry's `fr` is a dictionary-form citation (e.g. "le pain") but
 * dialogue uses whatever article the sentence's grammar calls for ("du
 * pain", "un peu de pain"). Requiring the citation article to appear
 * verbatim in the prompt would make the provenance check fail on every
 * correctly-authored noun. Strip leading articles/determiners before
 * comparing so the check verifies the content word actually appears, which
 * is what "deck drifts from the dialogue" (the rule's stated purpose) means.
 */
const LEADING_ARTICLES = new Set(['le', 'la', 'les', 'l', 'un', 'une', 'des', 'du', 'de']);
function contentTokens(tokens: string[]): string[] {
  let i = 0;
  while (i < tokens.length - 1 && LEADING_ARTICLES.has(tokens[i])) i += 1;
  return tokens.slice(i);
}

function allStateIds(graph: ScenarioGraph): Set<string> {
  return new Set(Object.keys(graph));
}

/** BFS distance from `start` to every reachable state, in edges (next + every intents target). */
function bfsDistances(graph: ScenarioGraph): Map<string, number> {
  const distances = new Map<string, number>();
  if (!graph.start) return distances;
  distances.set('start', 0);
  const queue: string[] = ['start'];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    const dist = distances.get(id) as number;
    const state = graph[id];
    if (!state) continue;
    const targets: string[] = [];
    if (state.next) targets.push(state.next);
    if (state.intents) targets.push(...Object.values(state.intents));
    for (const target of targets) {
      if (!distances.has(target)) {
        distances.set(target, dist + 1);
        queue.push(target);
      }
    }
  }
  return distances;
}

function isTerminal(state: ScenarioGraph[string]): boolean {
  return !state.next && !state.intents;
}

function validateGraphStructure(id: string, graph: ScenarioGraph, errors: Issue[]): void {
  const stateIds = allStateIds(graph);

  // Every `intents` target and every `next` target is a real state.
  for (const [stateId, state] of Object.entries(graph)) {
    if (state.next && !stateIds.has(state.next)) {
      errors.push({
        code: 'dangling-next',
        message: `state "${stateId}" has next: "${state.next}" which does not exist`,
        path: `${id}.graph.${stateId}.next`,
      });
    }
    if (state.intents) {
      for (const [intent, target] of Object.entries(state.intents)) {
        if (!stateIds.has(target)) {
          errors.push({
            code: 'dangling-intent-target',
            message: `state "${stateId}" intent "${intent}" targets "${target}" which does not exist`,
            path: `${id}.graph.${stateId}.intents.${intent}`,
          });
        }
      }
    }
    // Every node has a non-empty prompt[].
    if (!Array.isArray(state.prompt) || state.prompt.length === 0) {
      errors.push({
        code: 'empty-prompt',
        message: `state "${stateId}" has no prompt lines`,
        path: `${id}.graph.${stateId}.prompt`,
      });
    }
  }

  // Every state is reachable from start.
  const distances = bfsDistances(graph);
  for (const stateId of stateIds) {
    if (!distances.has(stateId)) {
      errors.push({
        code: 'unreachable-state',
        message: `state "${stateId}" is not reachable from "start"`,
        path: `${id}.graph.${stateId}`,
      });
    }
  }

  // Every state reaches a terminal within MAX_TURNS (deadlock guarantee).
  // The runtime guarantees termination three independent ways (see
  // "Recovery semantics" in the plan): a terminal state, the MAX_TURNS cap
  // itself, and the misfire-skip advancing along *some* outgoing edge. So a
  // cycle (e.g. bakery's start <-> ask_anything_else, "order something
  // else") is not a deadlock — the runtime bound handles it. What the
  // validator must catch is a state with NO path to any terminal at all: a
  // true dead end even the skip mechanism can't escape. Computed as reverse
  // reachability from the terminal set (BFS over reversed edges) — distance
  // is irrelevant since every authored graph is far smaller than MAX_TURNS
  // once cycles are allowed.
  const terminals = Object.entries(graph).filter(([, s]) => isTerminal(s)).map(([sid]) => sid);
  const reverseEdges = new Map<string, string[]>();
  for (const [stateId, state] of Object.entries(graph)) {
    const targets: string[] = [];
    if (state.next) targets.push(state.next);
    if (state.intents) targets.push(...Object.values(state.intents));
    for (const target of targets) {
      if (!reverseEdges.has(target)) reverseEdges.set(target, []);
      reverseEdges.get(target)!.push(stateId);
    }
  }
  const distanceToTerminal = new Map<string, number>(terminals.map((t) => [t, 0]));
  const reverseQueue = [...terminals];
  while (reverseQueue.length > 0) {
    const id2 = reverseQueue.shift() as string;
    const dist = distanceToTerminal.get(id2) as number;
    for (const pred of reverseEdges.get(id2) ?? []) {
      if (!distanceToTerminal.has(pred)) {
        distanceToTerminal.set(pred, dist + 1);
        reverseQueue.push(pred);
      }
    }
  }
  for (const stateId of stateIds) {
    if (!distances.has(stateId)) continue; // already flagged unreachable
    const dist = distanceToTerminal.get(stateId);
    if (dist === undefined) {
      errors.push({
        code: 'no-path-to-terminal',
        message: `state "${stateId}" has no path to any terminal state (a true dead end, unrecoverable even by the misfire-skip)`,
        path: `${id}.graph.${stateId}`,
      });
    } else if (dist > MAX_TURNS) {
      errors.push({
        code: 'no-terminal-within-max-turns',
        message: `state "${stateId}" needs ${dist} turns to reach the nearest terminal, exceeding MAX_TURNS (${MAX_TURNS})`,
        path: `${id}.graph.${stateId}`,
      });
    }
  }
}

/**
 * Intents that Stage 1 (or a later authoring pass) actually committed to
 * supporting by speech: every branch's opening `start` intent (the branch
 * key itself), plus every `(state, intent)` named by an `intent`-kind
 * MissionCondition anywhere in the scenario. Everything else is a graph
 * side-intent nobody has authored a mission for yet — real, but Stage 9
 * scope, not a Stage 1/2 defect. See the Stage 2 session's user decision:
 * enforcing full-graph trigger coverage here would force Stage 9 content
 * authoring into Stage 2, the same boundary violation the plan's own
 * gare-exemplar exclusion (Stage 1) was written to avoid.
 */
function authoredStateIntentKeys(meta: ScenarioMeta): Set<string> {
  const keys = new Set<string>();
  for (const branchId of Object.keys(meta.branches)) {
    keys.add(`start::${branchId}`);
  }
  for (const branch of Object.values(meta.branches)) {
    for (const mission of branch.missions) {
      for (const cond of mission.requires) {
        if (cond.kind === 'intent') {
          keys.add(`${cond.state}::${cond.intent}`);
        }
      }
    }
  }
  return keys;
}

function validateTriggers(
  id: string,
  graph: ScenarioGraph,
  meta: ScenarioMeta,
  triggers: BranchTrigger[],
  errors: Issue[],
  warnings: Issue[],
): void {
  // Every trigger's (state, intent) exists in the graph.
  for (const [idx, trigger] of triggers.entries()) {
    const state = graph[trigger.state];
    if (!state) {
      errors.push({
        code: 'trigger-unknown-state',
        message: `trigger[${idx}] references state "${trigger.state}" which does not exist`,
        path: `${id}.meta.triggers[${idx}]`,
      });
      continue;
    }
    if (!state.intents || !(trigger.intent in state.intents)) {
      errors.push({
        code: 'trigger-unknown-intent',
        message: `trigger[${idx}] references intent "${trigger.intent}" at state "${trigger.state}" which the graph does not declare`,
        path: `${id}.meta.triggers[${idx}]`,
      });
    }
  }

  // Every graph intent with >1 sibling has >= 1 trigger — enforced as an
  // error only for intents Stage 1 actually authored (see
  // authoredStateIntentKeys above). Unauthored side-intents are reported as
  // a warning so the Stage 9 backlog stays visible without blocking.
  const authoredKeys = authoredStateIntentKeys(meta);
  const triggersByStateIntent = new Set(triggers.map((t) => `${t.state}::${t.intent}`));
  for (const [stateId, state] of Object.entries(graph)) {
    if (!state.intents) continue;
    const siblingCount = Object.keys(state.intents).length;
    if (siblingCount <= 1) continue;
    for (const intent of Object.keys(state.intents)) {
      const key = `${stateId}::${intent}`;
      if (triggersByStateIntent.has(key)) continue;
      const issue: Issue = {
        code: 'unreachable-by-speech',
        message: `state "${stateId}" intent "${intent}" has ${siblingCount} siblings but no trigger — unreachable by speech`,
        path: `${id}.graph.${stateId}.intents.${intent}`,
      };
      if (authoredKeys.has(key)) {
        errors.push(issue);
      } else {
        warnings.push(issue);
      }
    }
  }
}

/** States reachable from `start` while committing to a given branch's opening `start` intent. */
function branchReachableStates(graph: ScenarioGraph, startIntent: string): Set<string> {
  const startState = graph.start;
  const reachable = new Set<string>(['start']);
  if (!startState || !startState.intents) return reachable;
  const entry = startState.intents[startIntent];
  if (!entry) return reachable;
  const queue: string[] = [entry];
  reachable.add(entry);
  while (queue.length > 0) {
    const id = queue.shift() as string;
    const state = graph[id];
    if (!state) continue;
    const targets: string[] = [];
    if (state.next) targets.push(state.next);
    if (state.intents) targets.push(...Object.values(state.intents));
    for (const target of targets) {
      if (!reachable.has(target)) {
        reachable.add(target);
        queue.push(target);
      }
    }
  }
  return reachable;
}

function validateMissions(id: string, graph: ScenarioGraph, meta: ScenarioMeta, errors: Issue[]): void {
  const missionIds = new Set<string>();

  for (const [branchId, branch] of Object.entries(meta.branches)) {
    const reachable = branchReachableStates(graph, branchId);

    for (const mission of branch.missions) {
      // No duplicate mission ids.
      if (missionIds.has(mission.id)) {
        errors.push({
          code: 'duplicate-mission-id',
          message: `mission id "${mission.id}" is used more than once in this scenario`,
          path: `${id}.meta.branches.${branchId}.missions`,
        });
      }
      missionIds.add(mission.id);

      if (mission.requires.length === 0) {
        errors.push({
          code: 'mission-no-conditions',
          message: `mission "${mission.id}" has no requires conditions`,
          path: `${id}.meta.branches.${branchId}.missions.${mission.id}`,
        });
      }

      for (const [condIdx, cond] of mission.requires.entries()) {
        const condPath = `${id}.meta.branches.${branchId}.missions.${mission.id}.requires[${condIdx}]`;

        // Every mission condition's state/intent/slot exists in the graph.
        const state = graph[cond.state];
        if (!state) {
          errors.push({
            code: 'mission-condition-unknown-state',
            message: `mission "${mission.id}" condition references state "${cond.state}" which does not exist`,
            path: condPath,
          });
          continue;
        }
        if (cond.kind === 'intent') {
          if (!state.intents || !(cond.intent in state.intents)) {
            errors.push({
              code: 'mission-condition-unknown-intent',
              message: `mission "${mission.id}" condition references intent "${cond.intent}" at state "${cond.state}" which the graph does not declare`,
              path: condPath,
            });
          }
        } else {
          // Every `slot` condition names a state that actually has `capture`.
          if (!state.capture || state.capture !== cond.slot) {
            errors.push({
              code: 'slot-condition-no-capture',
              message: `mission "${mission.id}" condition references slot "${cond.slot}" at state "${cond.state}" but that state's capture is "${state.capture ?? '(none)'}"`,
              path: condPath,
            });
          }
        }

        // Every mission is completable on its declared branch — the condition's
        // state must be reachable when the branch's opening intent is taken.
        if (!reachable.has(cond.state)) {
          errors.push({
            code: 'mission-uncompletable-on-branch',
            message: `mission "${mission.id}" (branch "${branchId}") requires state "${cond.state}" which is not reachable on this branch`,
            path: condPath,
          });
        }
      }
    }
  }
}

function validateDeck(id: string, graph: ScenarioGraph, meta: ScenarioMeta, deck: ScenarioDeck, errors: Issue[]): void {
  const stateIds = allStateIds(graph);
  const seenCoreExtend = new Map<string, 'core' | 'extend'>();

  for (const [idx, entry] of deck.entries.entries()) {
    const path = `${id}.deck.entries[${idx}] (${entry.fr})`;

    // Every deck entry's usedInStates are real states.
    for (const stateId of entry.usedInStates) {
      if (!stateIds.has(stateId)) {
        errors.push({
          code: 'deck-unknown-state',
          message: `deck entry "${entry.fr}" references usedInStates "${stateId}" which does not exist`,
          path,
        });
      }
    }

    // core entries: fr must appear in one of usedInStates' prompt[] (accent/case-insensitive, light inflection allowed, leading article ignored).
    if (entry.rank === 'core') {
      const normalizedFrTokens = contentTokens(
        normalizeForMatch(entry.fr)
          .split(/[^a-z0-9]+/)
          .filter(Boolean)
          .map(stripInflection),
      );
      let found = false;
      for (const stateId of entry.usedInStates) {
        const state = graph[stateId];
        if (!state) continue;
        for (const line of state.prompt) {
          const normalizedLineTokens = normalizeForMatch(line)
            .split(/[^a-z0-9]+/)
            .filter(Boolean)
            .map(stripInflection);
          const lineSet = new Set(normalizedLineTokens);
          if (normalizedFrTokens.length > 0 && normalizedFrTokens.every((t) => lineSet.has(t))) {
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (!found) {
        errors.push({
          code: 'deck-provenance-mismatch',
          message: `core deck entry "${entry.fr}" does not appear in the prompt[] of any of its usedInStates`,
          path,
        });
      }
    }

    // Nouns always carry gender + article.
    if (entry.pos === 'noun' && (!entry.gender || !entry.article)) {
      errors.push({
        code: 'noun-missing-gender-article',
        message: `noun "${entry.fr}" is missing gender and/or article`,
        path,
      });
    }

    // register of every core entry matches npc.register.
    if (entry.rank === 'core' && entry.register !== 'neutral' && entry.register !== meta.npc.register) {
      errors.push({
        code: 'register-mismatch',
        message: `core entry "${entry.fr}" has register "${entry.register}" which does not match npc.register "${meta.npc.register}"`,
        path,
      });
    }

    // No core/extend duplication within a scenario.
    const prior = seenCoreExtend.get(entry.fr);
    if (prior) {
      errors.push({
        code: 'deck-duplicate-entry',
        message: `deck entry "${entry.fr}" appears more than once (ranks: ${prior}, ${entry.rank})`,
        path,
      });
    } else {
      seenCoreExtend.set(entry.fr, entry.rank);
    }
  }
}

function validateAuthoredCompleteness(id: string, meta: ScenarioMeta, deck: ScenarioDeck, errors: Issue[]): void {
  const branchCount = Object.keys(meta.branches).length;
  const missionCount = Object.values(meta.branches).reduce((sum, b) => sum + b.missions.length, 0);
  if (branchCount === 0) {
    errors.push({ code: 'authored-missing-branch', message: `scenario "${id}" is authored but has no branches`, path: `${id}.meta.branches` });
  }
  if (missionCount === 0) {
    errors.push({ code: 'authored-missing-mission', message: `scenario "${id}" is authored but has no missions`, path: `${id}.meta.branches` });
  }
  if (meta.triggers.length === 0) {
    errors.push({ code: 'authored-missing-trigger', message: `scenario "${id}" is authored but has no triggers`, path: `${id}.meta.triggers` });
  }
  if (deck.entries.length === 0) {
    errors.push({ code: 'authored-missing-deck-entry', message: `scenario "${id}" is authored but has no deck entries`, path: `${id}.deck.entries` });
  }
}

function validateDependencies(entries: ScenarioEntryForValidation[], errors: Issue[]): void {
  const idSet = new Set(entries.map((e) => e.id));
  const depsById = new Map(entries.map((e) => [e.id, e.meta.dependencies]));

  for (const entry of entries) {
    for (const dep of entry.meta.dependencies) {
      if (!idSet.has(dep)) {
        errors.push({
          code: 'unknown-dependency',
          message: `scenario "${entry.id}" depends on unknown scenario "${dep}"`,
          path: `${entry.id}.meta.dependencies`,
        });
      }
    }
  }

  // Cycle detection (DFS over the dependency graph, restricted to known ids).
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>(entries.map((e) => [e.id, WHITE]));
  const reportedCycleNodes = new Set<string>();

  function visit(id: string, stack: string[]): void {
    color.set(id, GRAY);
    stack.push(id);
    for (const dep of depsById.get(id) ?? []) {
      if (!idSet.has(dep)) continue;
      if (color.get(dep) === GRAY) {
        const cycleStart = stack.indexOf(dep);
        const cycle = stack.slice(cycleStart).concat(dep);
        const key = [...cycle].sort().join(',');
        if (!reportedCycleNodes.has(key)) {
          reportedCycleNodes.add(key);
          errors.push({
            code: 'dependency-cycle',
            message: `dependency cycle detected: ${cycle.join(' -> ')}`,
            path: `dependencies`,
          });
        }
      } else if (color.get(dep) === WHITE) {
        visit(dep, stack);
      }
    }
    stack.pop();
    color.set(id, BLACK);
  }

  for (const entry of entries) {
    if (color.get(entry.id) === WHITE) {
      visit(entry.id, []);
    }
  }
}

/**
 * Validates one scenario entry (graph + meta + deck) in isolation. Does not
 * check cross-scenario rules (dependency existence/cycles) — call
 * validateRegistry for the full corpus.
 */
export function validateScenario(entry: ScenarioEntryForValidation): ValidationReport {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const { id, meta, graph, deck, authored } = entry;

  if (!authored) {
    return { errors, warnings };
  }

  validateGraphStructure(id, graph, errors);
  validateTriggers(id, graph, meta, meta.triggers, errors, warnings);
  validateMissions(id, graph, meta, errors);
  validateDeck(id, graph, meta, deck, errors);
  validateAuthoredCompleteness(id, meta, deck, errors);

  return { errors, warnings };
}

/** Full-corpus validation: per-scenario rules plus cross-scenario dependency rules and duplicate-scenario-id detection. */
export function validateRegistry(entries: ScenarioEntryForValidation[]): ValidationReport {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];

  const seenIds = new Set<string>();
  for (const entry of entries) {
    if (seenIds.has(entry.id)) {
      errors.push({ code: 'duplicate-scenario-id', message: `scenario id "${entry.id}" is used more than once`, path: entry.id });
    }
    seenIds.add(entry.id);

    const report = validateScenario(entry);
    errors.push(...report.errors);
    warnings.push(...report.warnings);
  }

  validateDependencies(entries, errors);

  return { errors, warnings };
}
