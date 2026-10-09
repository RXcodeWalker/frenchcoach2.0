import { nodeForGrammarTheme } from '../../../domain/igcse/evidence/framework/nodeMap';
import { sameQuote } from '../../../domain/examFeedback/shared/quoteRules';
import type { FeedbackV2 } from '../../../types';
import { coachPointGroups, hasGoFurther, selectCoachFixes } from '../coachPoints';
import type { FeedbackPointGroup } from '../components/FeedbackPointList';
import { addressName, type TeacherRegister } from './persona';

/**
 * The teacher's script (Learn feedback Batch 6b): the already-filtered feedback
 * as an ordered conversation. Pure — it only arranges and frames what survived
 * the filters at normalisation, and invents no claim:
 *
 *  1. the learner's answer, as their own bubble;
 *  2. the opening — the model's own line when it survived the filters, else a
 *     data-driven template;
 *  3. what they did well;
 *  4. a connective chosen by how many fixes there are (it never praises: it
 *     states a count);
 *  5. the fixes, then "Also worth fixing", "Say it better" and "Go further";
 *  6. a memory line for a repeated mistake, from the existing recurring-problem
 *     detection (interventionService) — no new store.
 *
 * The learner's name is said at most once. Nothing here is a mark, band or
 * grade (ADR 0005) — every framing string is tested against the shared
 * mark/band filter. `points` lines carry quotes and corrections that the UI
 * shows whole; only `talk` text is typed out.
 */

export type TeacherLine =
  | { id: string; kind: 'learner'; text: string }
  | { id: string; kind: 'talk'; role: 'opening' | 'connective' | 'memory'; text: string }
  | { id: string; kind: 'points'; group: FeedbackPointGroup }
  /** A block the existing cards render (the diff, vocabulary and ideas); the script only places it. */
  | { id: string; kind: 'section'; section: 'say-it-better' | 'go-further'; heading: string };

/** A repeated mistake, resolved to a phrase from THIS answer. */
export interface RecurringMistake {
  /** The skill's display name (« Être vs Avoir »). */
  label: string;
  /** How often it has come up this week when known and 3 or more; otherwise null. */
  times: number | null;
  /** A fix the learner made in this very answer, verbatim. */
  quote: string;
}

export interface TeacherScriptInput {
  register: TeacherRegister;
  /** The learner's answer. */
  transcript: string;
  /** `state.username`; said at most once, and only if it reads as a name. */
  name?: string | null;
  /** The model's opening line (`feedback.encouragement`) — pass it only after the filters. */
  opening?: string;
  /** Display groups in order, e.g. `coachPointGroups(feedback)`; fixes are counted from the `fix` points. */
  groups: FeedbackPointGroup[];
  hasSayItBetter?: boolean;
  hasGoFurther?: boolean;
  recurring?: RecurringMistake | null;
}

/** Every static framing string, by register — exported so tests can hold them to the mark/band filter. */
export const TEACHER_FRAMING = {
  coach: {
    opening: (name: string | null) => (name ? `Let's go through your answer, ${name}.` : "Let's go through your answer."),
    noFix: (name: string | null) =>
      name ? `I couldn't find a mistake in your French, ${name}.` : "I couldn't find a mistake in your French.",
    oneFix: (name: string | null) => (name ? `There's one thing to fix, ${name}.` : "There's one thing to fix."),
    manyFix: (name: string | null) =>
      name ? `Let's fix the two that matter most first, ${name}.` : "Let's fix the two that matter most first.",
    memory: (r: RecurringMistake) =>
      `« ${r.quote} » is a slip I've seen before: ${r.label} has come up ${
        r.times !== null ? `${r.times} times` : 'more than once'
      } this week. Let's lock it in.`,
    sayItBetter: 'Say it better',
    goFurther: 'Go further',
  },
  examiner: {
    opening: (name: string | null) => (name ? `Let us go through your answer, ${name}.` : 'Let us go through your answer.'),
    noFix: (name: string | null) =>
      name ? `I did not find an error in your French, ${name}.` : 'I did not find an error in your French.',
    oneFix: (name: string | null) => (name ? `There is one point to correct, ${name}.` : 'There is one point to correct.'),
    manyFix: (name: string | null) =>
      name
        ? `Let us correct the two most important points first, ${name}.`
        : 'Let us correct the two most important points first.',
    memory: (r: RecurringMistake) =>
      `« ${r.quote} » — this ${r.label} point has recurred ${
        r.times !== null ? `${r.times} times` : 'more than once'
      } in your recent answers. Please pay particular attention to it.`,
    sayItBetter: 'Say it better',
    goFurther: 'Go further',
  },
} as const;

function countFixes(groups: FeedbackPointGroup[]): number {
  return groups.reduce((n, g) => n + g.points.filter((p) => p.kind === 'fix').length, 0);
}

export function buildTeacherScript(input: TeacherScriptInput): TeacherLine[] {
  const framing = TEACHER_FRAMING[input.register];
  const name = addressName(input.name);
  const lines: TeacherLine[] = [];

  const answer = input.transcript.trim();
  if (answer) lines.push({ id: 'learner', kind: 'learner', text: answer });

  // The name is said once: in the template opening if that is what we use, else in the connective.
  const modelOpening = input.opening?.trim();
  if (modelOpening) {
    lines.push({ id: 'opening', kind: 'talk', role: 'opening', text: modelOpening });
  } else {
    lines.push({ id: 'opening', kind: 'talk', role: 'opening', text: framing.opening(name) });
  }
  const connectiveName = modelOpening ? name : null;

  const fixes = countFixes(input.groups);
  const connective = {
    id: 'connective',
    kind: 'talk' as const,
    role: 'connective' as const,
    text: fixes === 0 ? framing.noFix(connectiveName) : fixes === 1 ? framing.oneFix(connectiveName) : framing.manyFix(connectiveName),
  };

  // The connective sits before the first fix group; with no fixes, right after the first group (the strengths).
  const shown = input.groups.filter((g) => g.points.length > 0);
  const firstFixGroup = shown.findIndex((g) => g.tone === 'bad');
  const connectiveAt = firstFixGroup !== -1 ? firstFixGroup : Math.min(1, shown.length);
  shown.forEach((group, i) => {
    if (i === connectiveAt) lines.push(connective);
    lines.push({ id: `points:${group.heading}`, kind: 'points', group });
  });
  if (connectiveAt >= shown.length) lines.push(connective);

  if (input.hasSayItBetter) {
    lines.push({ id: 'section:say-it-better', kind: 'section', section: 'say-it-better', heading: framing.sayItBetter });
  }
  if (input.hasGoFurther) {
    lines.push({ id: 'section:go-further', kind: 'section', section: 'go-further', heading: framing.goFurther });
  }

  // A repeated mistake is only mentioned with a phrase from this answer to point at.
  if (input.recurring?.quote.trim() && input.recurring.label.trim()) {
    lines.push({ id: 'memory', kind: 'talk', role: 'memory', text: framing.memory(input.recurring) });
  }

  return lines;
}

/**
 * The first fix shown in this answer that belongs to `nodeId` (the skill of the
 * learner's active recurring problem), as the learner said it, or null.
 *
 * A fix's display tag is a human label, but the problem's node comes from the
 * raw grammar theme (evidenceProjection.ts), so this goes back to the grammar
 * items by quote, falling back to the issue's own label.
 */
export function recurringFixQuote(feedback: FeedbackV2, nodeId: string): string | null {
  const shown = selectCoachFixes(feedback);
  const grammarItems = [...(feedback.grammar?.critical ?? []), ...(feedback.grammar?.polish ?? [])] as Array<{
    theme?: string;
    quote?: string;
  }>;
  for (const fix of shown) {
    if (fix.kind !== 'fix') continue;
    const viaGrammar = grammarItems.find((g) => g.quote && sameQuote(g.quote, fix.quote));
    const viaTag = fix.tag ? nodeForGrammarTheme(fix.tag) : null;
    const node = (viaGrammar?.theme ? nodeForGrammarTheme(viaGrammar.theme) : null) ?? viaTag;
    if (node === nodeId) return fix.quote;
  }
  return null;
}

export interface CoachScriptContext {
  transcript: string;
  name?: string | null;
  /** The active problem, only when `isRecurring`; `label` is the skill's display name. */
  recurring?: { nodeId: string; label: string; times: number | null } | null;
}

/** The coach-voice script for filtered Learn feedback. */
export function buildCoachTeacherScript(feedback: FeedbackV2, ctx: CoachScriptContext): TeacherLine[] {
  const quote = ctx.recurring ? recurringFixQuote(feedback, ctx.recurring.nodeId) : null;
  return buildTeacherScript({
    register: 'coach',
    transcript: ctx.transcript,
    name: ctx.name,
    opening: feedback.encouragement,
    groups: coachPointGroups(feedback),
    hasSayItBetter: !!feedback.improved_answer,
    hasGoFurther: hasGoFurther(feedback),
    recurring: ctx.recurring && quote ? { label: ctx.recurring.label, times: ctx.recurring.times, quote } : null,
  });
}
