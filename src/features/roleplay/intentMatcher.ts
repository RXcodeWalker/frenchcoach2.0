/**
 * Stage 4 — intent matcher. Pure and deterministic: the same transcript and
 * the same triggers always yield the same IntentResult, with no dependence on
 * array or object key order.
 *
 * Triggers are authored per (state, intent) pair in each scenario's
 * `.meta.ts`, never in a global table: the corpus has 534 distinct intent
 * keys, overwhelmingly singletons, and `yes`/`no` mean something different in
 * every one of the 55/49 places they appear.
 *
 * The rules implemented here are the plan's "Intent matcher: failure and
 * ambiguity semantics" section, numbered to match.
 */
import { MARGIN, MIN_SCORE } from './constants';
import type { BranchTrigger, IntentResult } from './types';

/** Rule 1 — elisions expanded into separate tokens. */
const ELISIONS = ['qu', 'j', 'l', 'd', 'n', 's', 'c', 'm', 't'];

/** Rule 3 — a matched term is discarded if one of these precedes it closely. */
const NEGATORS = new Set(['ne', 'pas', 'plus', 'jamais', 'sans', 'aucun', 'non']);

/** Rule 3 — how many tokens before a match are searched for a negator. */
const NEGATION_WINDOW = 3;

/** Rule 2 — score for an exact single-token match. */
const EXACT_SCORE = 1;
/** Rule 2 — score for a single-token match that only holds after stemming. */
const STEMMED_SCORE = 0.7;
/** Rule 2 — score for an ordered-token-subsequence match of a multi-word term. */
const PHRASE_SCORE = 2;

/**
 * Rule 1 — normalize a transcript or an authored term into tokens.
 *
 * lowercase; NFD-strip diacritics; strip punctuation except intra-word
 * apostrophe and hyphen; expand French elisions into separate tokens;
 * collapse whitespace.
 *
 * The elision expansion only fires when the fragment before the apostrophe is
 * exactly an elision form, so `aujourd'hui` stays one token rather than
 * splitting on its `d'`.
 */
export function tokenize(input: string): string[] {
  const stripped = input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/’/g, "'")
    // Keep letters, digits, whitespace, and the two intra-word marks.
    .replace(/[^a-z0-9\s'-]/g, ' ');

  const out: string[] = [];
  for (const raw of stripped.split(/\s+/)) {
    if (!raw) continue;
    let rest = raw;
    // Expand leading elisions, possibly stacked (`qu'il n'y` -> qu il n y).
    for (;;) {
      const apos = rest.indexOf("'");
      if (apos <= 0) break;
      const head = rest.slice(0, apos);
      if (!ELISIONS.includes(head)) break;
      out.push(head);
      rest = rest.slice(apos + 1);
    }
    // Trim now-orphaned leading/trailing marks (e.g. a bare hyphen).
    const cleaned = rest.replace(/^['-]+/, '').replace(/['-]+$/, '');
    if (cleaned) out.push(cleaned);
  }
  return out;
}

/**
 * Rule 2 — light inflectional stemming: strip a trailing `ent`/`es`/`s`/`e`
 * when the remaining stem is at least 4 characters.
 */
export function stem(word: string): string {
  for (const suffix of ['ent', 'es', 's', 'e']) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 4) {
      return word.slice(0, word.length - suffix.length);
    }
  }
  return word;
}

/** Rule 3 — is `index` preceded within NEGATION_WINDOW tokens by a negator? */
function isNegated(tokens: string[], index: number): boolean {
  const from = Math.max(0, index - NEGATION_WINDOW);
  for (let i = from; i < index; i++) {
    if (NEGATORS.has(tokens[i])) return true;
  }
  return false;
}

/**
 * Rule 2 — score one authored term against the transcript tokens.
 * Returns 0 when the term does not match, or matches only under negation.
 */
function scoreTerm(termTokens: string[], tokens: string[]): number {
  if (termTokens.length === 0) return 0;

  // A term is a phrase when it normalizes to more than one token — the plan's
  // "multi-word entries". This is a superset of "contains a space", so an
  // elided term like `l'addition` is still matched as the ordered pair it
  // tokenizes into rather than being looked up as an impossible single token.
  if (termTokens.length > 1) {
    // Ordered-token-subsequence match. Every possible first-token anchor is
    // scanned so a negated early occurrence cannot mask a clean later one.
    for (let anchor = 0; anchor < tokens.length; anchor++) {
      if (tokens[anchor] !== termTokens[0]) continue;
      let cursor = anchor + 1;
      let matchedThrough = 1;
      while (matchedThrough < termTokens.length && cursor < tokens.length) {
        if (tokens[cursor] === termTokens[matchedThrough]) matchedThrough++;
        cursor++;
      }
      if (matchedThrough === termTokens.length && !isNegated(tokens, anchor)) {
        return PHRASE_SCORE;
      }
    }
    return 0;
  }

  const target = termTokens[0];
  const targetStem = stem(target);
  let best = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (isNegated(tokens, i)) continue;
    if (tokens[i] === target) return EXACT_SCORE;
    if (stem(tokens[i]) === targetStem) best = Math.max(best, STEMMED_SCORE);
  }
  return best;
}

export interface TriggerScore {
  intent: string;
  score: number;
  priority: number;
}

/**
 * Rule 2 — score every candidate intent reachable from the supplied triggers.
 *
 * Triggers are aggregated by intent name, not summed: the plan allows one
 * intent name to carry several trigger sets as alternative routes, so the
 * strongest matching set represents the intent (summing would double-count a
 * single utterance). Results are sorted by score, then priority, then intent
 * name — a total order, so the outcome never depends on input ordering.
 *
 * Exported because the UI needs the losing candidates too: the plan's rule 5
 * acknowledgement of a strong runner-up, and the second-miss English nudge
 * listing what can be done at this state.
 */
export function scoreTriggers(transcript: string, triggers: readonly BranchTrigger[]): TriggerScore[] {
  const tokens = tokenize(transcript);
  const byIntent = new Map<string, TriggerScore>();

  for (const trigger of triggers) {
    const priority = trigger.priority ?? 0;
    // Rule 2 — a trigger's score is the sum over its matched terms, each
    // counted once.
    let score = 0;
    const seen = new Set<string>();
    for (const term of trigger.terms) {
      const termTokens = tokenize(term);
      const key = termTokens.join(' ');
      if (!key || seen.has(key)) continue;
      seen.add(key);
      score += scoreTerm(termTokens, tokens);
    }

    const existing = byIntent.get(trigger.intent);
    if (
      !existing ||
      score > existing.score ||
      (score === existing.score && priority > existing.priority)
    ) {
      byIntent.set(trigger.intent, { intent: trigger.intent, score, priority });
    }
  }

  return [...byIntent.values()].sort(
    (a, b) => b.score - a.score || b.priority - a.priority || a.intent.localeCompare(b.intent),
  );
}

/**
 * Rule 4 — decide. `triggers` must already be filtered to the current state
 * (see `triggersForState`).
 *
 * - top score below MIN_SCORE                          -> no_match
 * - top and second within MARGIN and of equal priority -> ambiguous
 * - otherwise                                          -> matched
 *
 * A higher `priority` therefore breaks a tie outright, and rule 5's
 * multi-intent utterance resolves to the single highest-scoring intent
 * because a graph node can only take one branch.
 */
export function matchIntent(transcript: string, triggers: readonly BranchTrigger[]): IntentResult {
  const scored = scoreTriggers(transcript, triggers);
  const top = scored[0];
  if (!top || top.score < MIN_SCORE) return { kind: 'no_match' };

  const second = scored[1];
  if (second && top.score - second.score < MARGIN && top.priority === second.priority) {
    return { kind: 'ambiguous', candidates: [top.intent, second.intent] };
  }

  return { kind: 'matched', intent: top.intent, score: top.score };
}

/** Rule 6 — the triggers authored for one graph state. */
export function triggersForState(triggers: readonly BranchTrigger[], state: string): BranchTrigger[] {
  return triggers.filter((t) => t.state === state);
}
