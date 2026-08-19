/**
 * Local, Learn-domain-only text helpers for lint/validate cue-word checks.
 * Deliberately does NOT import src/domain/igcse/text/normalize.ts — src/domain/learn/
 * must not depend on the IGCSE scoring engine (CLAUDE.md hard constraint #1;
 * architecture doc §5 guard).
 */

export function normalizeQuestionText(input: string): string {
  return input
    .normalize('NFC')
    .toLowerCase()
    .replace(/[''`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function wordCount(input: string): number {
  const normalized = normalizeQuestionText(input).replace(/[.,;:!?…"()]/g, ' ').trim();
  if (normalized.length === 0) return 0;
  return normalized.split(/\s+/).filter(Boolean).length;
}

/**
 * JS `\b` is ASCII-only: it fails to recognise accented letters (é, è, à, ô…)
 * as word characters, so `/\bdéjà\b/` never matches "as-tu déjà fait" at all
 * — the boundary before "é" silently doesn't fire. `B` is a drop-in
 * Unicode-aware replacement for `\b` inside a cue pattern's source string.
 */
const B = '(?:(?<![\\p{L}\\p{N}])|(?![\\p{L}\\p{N}]))';

/** Build a Unicode-boundary-safe RegExp from a source string written with `\b`. */
export function cue(source: string): RegExp {
  return new RegExp(source.split('\\b').join(B), 'u');
}

const TIME_FRAME_CUES: Record<'present' | 'past' | 'future' | 'conditional', RegExp[]> = {
  present: [
    cue('\\bes-tu\\b'),
    cue('\\bas-tu\\b'),
    cue('\\best-ce que tu\\b'),
    cue('\\bque fais-tu\\b'),
    cue('\\bdécris\\b|\\bdécrivez\\b|\\bparle-moi\\b|\\bparle de\\b'),
    cue('\\bquel(le)?s? (est|sont)\\b'),
    cue('\\btu (préfères?|aimes?|penses?|trouves?|manges?|fais|habites?|vas)\\b'),
    // any regular -es-tu / -s-tu 2nd-person present inversion (aimes-tu,
    // considères-tu, écoutes-tu, fais-tu, t'intéresses-tu, ...)
    cue("\\b(t')?[a-zéèêàâôûîïüö]+[es]-tu\\b"),
    cue('\\bpeut-on\\b|\\by a-t-il\\b'),
    cue('\\b[a-zéèêàâôûîïüö]+-t-(il|elle|on)\\b'),
    cue('\\b(est|sont)-(ce|ils?|elles?)\\b'),
    cue('\\bcomment est\\b|\\bcomment sont\\b'),
  ],
  past: [
    cue('\\bas-tu (déjà|jamais)\\b'),
    cue('\\bquand tu étais\\b'),
    cue("\\bl'année dernière\\b"),
    cue('\\bhier\\b'),
    cue('\\bdéjà\\b'),
    cue('\\bla semaine dernière\\b'),
    cue('\\ble week-end dernier\\b'),
    cue("\\bl'hiver dernier\\b"),
    cue("\\bl'été dernier\\b"),
    cue('\\bderni[eè]re?s? (vacances|années|mois)\\b'),
    cue('\\ble dernier\\b'),
    cue('\\bas-tu\\b.*\\b(fait|mangé|vu|eu|essayé|participé|goûté)\\b'),
    cue('\\bavez?-vous\\b.*\\bfait\\b'),
    cue("\\bqu'est-ce que tu as (fait|mangé|vu)\\b"),
    cue('\\bau cours d(e|es)\\b'),
  ],
  future: [
    cue('\\bvas-tu\\b'),
    cue('\\bva\\b'),
    cue("\\bl'année prochaine\\b"),
    cue('\\bplus tard\\b'),
    cue("\\bà l'avenir\\b"),
    cue('\\bbientôt\\b'),
    cue('\\bdans (\\d+|dix|vingt|cinquante) ans\\b'),
    cue('\\bte vois-tu\\b'),
    cue('\\bvois-tu ta vie\\b'),
  ],
  conditional: [cue('\\bsi tu\\b'), cue('\\baimerais-tu\\b'), cue('\\bvoudrais-tu\\b'), cue('\\bpourrais-tu\\b')],
};

/** Does the question text contain at least one recognisable cue for this time frame? */
export function hasTimeFrameCue(
  questionText: string,
  frame: 'present' | 'past' | 'future' | 'conditional',
): boolean {
  const normalized = normalizeQuestionText(questionText);
  return TIME_FRAME_CUES[frame].some((c) => c.test(normalized));
}

const STRUCTURE_CUES: Partial<Record<string, RegExp[]>> = {
  opinion: [cue('\\bà ton avis\\b'), cue('\\bpenses-tu\\b'), cue('\\bque penses-tu\\b'), cue('\\btrouves-tu\\b')],
  justification: [cue('\\bpourquoi\\b')],
  comparison: [cue('\\bcompar'), cue('\\bou\\b.*\\?'), cue('\\bpréfères-tu\\b'), cue('\\bplutôt que\\b')],
  negation: [cue('\\bne\\b.*\\bpas\\b'), cue('\\bjamais\\b')],
  conditional: [cue('\\bsi tu\\b'), cue('\\baimerais-tu\\b'), cue('\\bvoudrais-tu\\b')],
  subjunctive: [cue('\\bil faut que\\b'), cue('\\bbien que\\b'), cue('\\bavant que\\b')],
};

/** Does the question text contain at least one recognisable cue for this structure? Structures without a cue list return true (not checkable, so never warned). */
export function hasStructureCue(questionText: string, structure: string): boolean {
  const cues = STRUCTURE_CUES[structure];
  if (!cues) return true;
  const normalized = normalizeQuestionText(questionText);
  return cues.some((c) => c.test(normalized));
}
