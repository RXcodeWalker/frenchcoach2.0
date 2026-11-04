/**
 * The shape of one offline grammar rule, and the one helper that builds a rule
 * from a single regex. Shared by coachService.ts's original GRAMMAR_RULES and
 * the rules in extraRules.ts, so both behave the same way: `test` says whether
 * the rule fires at all, `capture` returns the first match, and `captureAll`
 * returns every match — a learner who says « je aime » twice gets both fixed,
 * and the improved answer never silently leaves a second copy of an error it
 * claims to have corrected.
 */

/** The diagnostic themes the offline coach groups its rules under (labels live in coachService.ts's THEMES). */
export type ThemeKey =
  | 'ELISION'
  | 'AUXILIARY'
  | 'ANGLICISM'
  | 'GENDER'
  | 'NEGATION'
  | 'PREPOSITION'
  | 'SUBJUNCTIVE'
  | 'SI_CLAUSE'
  | 'RELATIVE'
  | 'COMPARATIVE'
  | 'DEMONSTRATIVE'
  | 'CONFUSION'
  | 'ADJECTIVE'
  | 'PRONOUN'
  | 'REFLEXIVE';

/**
 * A regex match's text plus its offset in the source transcript. A regex match
 * already knows its index; carrying it through makes offline spans unambiguous
 * by construction instead of re-found with indexOf (docs Stage 4 item 4).
 */
export interface CapturedSpan {
  text: string;
  start: number;
  end: number;
}

export interface GrammarRule {
  id: string;
  theme: ThemeKey;
  severity: 'major' | 'minor';
  test: (t: string) => boolean;
  capture?: (t: string) => CapturedSpan | null;
  /** Every non-overlapping match, in transcript order. */
  captureAll?: (t: string) => CapturedSpan[];
  buildDiagnostic?: (quote: string) => string;
  /** The display label for the rule as a whole (« au / aux »). */
  correction: string;
  /**
   * The exact correction for one match, when the rule can name it — e.g.
   * « il a parti » → « il est parti ». Used as the issue's correction so the
   * learner (and the Second take / Try-it-first checks) see real French, not a
   * label. Falls back to `rewrite`, then to `correction`.
   */
  correctionFor?: (match: string) => string | null;
  /**
   * Opt-in mechanical rewrite for unambiguous fixes only (docs Stage 4 item
   * 2) — e.g. « je aime » → « j'aime », « de le » → « du ». Rules with a
   * genuine choice (« je suis allé(e) ») get no rewrite and are never applied
   * mechanically. Returning null means "this particular match can't be
   * rewritten safely" even though the rule fired.
   */
  rewrite?: (match: string) => string | null;
  /**
   * Rules whose overlapping match this rule's rewrite fully repairs too
   * (« si il serait » → « s'il était » also fixes el_si_il's « si il »). Any
   * other overlap makes the offline improved answer unsafe, so it is withheld.
   */
  subsumes?: readonly string[];
}

/** The first match of `regex` (which must not be global) as a span. */
export function matchSpan(t: string, regex: RegExp): CapturedSpan | null {
  const m = regex.exec(t);
  if (!m || m.index === undefined) return null;
  return { text: m[0], start: m.index, end: m.index + m[0].length };
}

export interface PatternRuleSpec extends Omit<GrammarRule, 'test' | 'capture' | 'captureAll'> {
  /** One regex (flags other than `g` are kept); the rule fires wherever it matches. */
  pattern: RegExp;
  /** Optional extra check on a match; a rejected match does not count. */
  accept?: (match: RegExpExecArray) => boolean;
}

/** Build a GrammarRule whose test / capture / captureAll all come from one regex. */
export function patternRule(spec: PatternRuleSpec): GrammarRule {
  const { pattern, accept, ...rest } = spec;
  const flags = pattern.flags.replace('g', '');
  const global = new RegExp(pattern.source, `${flags}g`);

  const captureAll = (t: string): CapturedSpan[] => {
    const spans: CapturedSpan[] = [];
    for (const m of t.matchAll(global)) {
      if (m.index === undefined || m[0].length === 0) continue;
      if (accept && !accept(m as RegExpExecArray)) continue;
      spans.push({ text: m[0], start: m.index, end: m.index + m[0].length });
    }
    return spans;
  };

  return {
    ...rest,
    test: (t) => captureAll(t).length > 0,
    capture: (t) => captureAll(t)[0] ?? null,
    captureAll,
  };
}

/** Keep the case of the first letter of `original` on `replacement` (« Je aime » → « J'aime »). */
export function keepLeadingCase(original: string, replacement: string): string {
  const first = original.charAt(0);
  if (first && first !== first.toLowerCase() && replacement) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/** True when a word starts with a vowel or a (mute) h, so a preceding je / ne / que / se elides. */
export function startsWithVowelSound(word: string): boolean {
  return /^[aàâäeéèêëiîïoôöuùûüyœæh]/i.test(word);
}
