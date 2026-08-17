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

const TIME_FRAME_CUES: Record<'present' | 'past' | 'future' | 'conditional', RegExp[]> = {
  present: [/\bes-tu\b/, /\bas-tu\b/, /\best-ce que tu\b/, /\bque fais-tu\b/],
  past: [/\bas-tu (déjà|jamais)\b/, /\bquand tu étais\b/, /\bl'année dernière\b/, /\bhier\b/, /\bdéjà\b/],
  future: [/\bvas-tu\b/, /\bva\b/, /\bl'année prochaine\b/, /\bplus tard\b/, /\bà l'avenir\b/, /\bbientôt\b/],
  conditional: [/\bsi tu\b/, /\baimerais-tu\b/, /\bvoudrais-tu\b/, /\bpourrais-tu\b/],
};

/** Does the question text contain at least one recognisable cue for this time frame? */
export function hasTimeFrameCue(
  questionText: string,
  frame: 'present' | 'past' | 'future' | 'conditional',
): boolean {
  const normalized = normalizeQuestionText(questionText);
  return TIME_FRAME_CUES[frame].some((cue) => cue.test(normalized));
}

const STRUCTURE_CUES: Partial<Record<string, RegExp[]>> = {
  opinion: [/\bà ton avis\b/, /\bpenses-tu\b/, /\bque penses-tu\b/, /\btrouves-tu\b/],
  justification: [/\bpourquoi\b/],
  comparison: [/\bcompar/, /\bou\b.*\?/, /\bpréfères-tu\b/, /\bplutôt que\b/],
  negation: [/\bne\b.*\bpas\b/, /\bjamais\b/],
  conditional: [/\bsi tu\b/, /\baimerais-tu\b/, /\bvoudrais-tu\b/],
  subjunctive: [/\bil faut que\b/, /\bbien que\b/, /\bavant que\b/],
};

/** Does the question text contain at least one recognisable cue for this structure? Structures without a cue list return true (not checkable, so never warned). */
export function hasStructureCue(questionText: string, structure: string): boolean {
  const cues = STRUCTURE_CUES[structure];
  if (!cues) return true;
  const normalized = normalizeQuestionText(questionText);
  return cues.some((cue) => cue.test(normalized));
}
