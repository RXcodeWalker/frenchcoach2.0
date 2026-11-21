/**
 * Fixed expressions a recogniser splits into nonsense (owner report
 * 2026-11-21: « je prends la grasse matinée » reached the feedback as « la
 * graisse matinée », and the model, not knowing the expression, "corrected"
 * it to « le petit déjeuner » — a different idea, contradicted by the next
 * sentence, « Donc, je me lève très tard »).
 *
 * The rule: a phrase on this list is never a vocabulary mistake on a spoken
 * Learn answer. Before the answer is marked, the misheard form is replaced
 * by the expression the learner meant, so the feedback, the evidence and the
 * marked-up script all work on the right words.
 *
 *  - A variant WITHOUT a `tip` is spelling only (« emploi du tant »): it
 *    sounds exactly like the expression, so the learner cannot have said it
 *    wrong. It is repaired silently.
 *  - A variant WITH a `tip` sounds different (« graisse » has [ɛ], « grasse »
 *    has [a]). The learner probably said it in a way the recogniser heard
 *    as that — a pronunciation point, never a vocabulary one. It is repaired
 *    and returned as a `HeardAsNote`, shown only in "How it sounded".
 *
 * What may go on the list: only forms that are not real French where they
 * stand, so a learner can never have meant them. Never a grammar variant a
 * learner could really say (« emploi de temps », « faire grasse matinée »):
 * those are the learner's own mistakes, and the feedback must still see them.
 *
 * Learn only. The exam marker does not use this — what an examiner hears is
 * an Assessment-Engine question (ADR 0011, `stt/homophones/`).
 */

export interface MisheardVariant {
  /** The recogniser's spelling, in lower case. Accents and case are ignored when matching. */
  readonly heard: string;
  /** Plain-English pronunciation tip. Absent: the variant sounds the same (spelling only). */
  readonly tip?: string;
}

export interface MisheardExpression {
  readonly id: string;
  /** The expression the learner meant, as it should be written. */
  readonly expression: string;
  readonly variants: readonly MisheardVariant[];
}

export interface HeardAsNote {
  readonly expressionId: string;
  /** What the recogniser wrote, exactly as it appeared in the answer. */
  readonly heard: string;
  /** What the answer now says. */
  readonly meant: string;
  readonly tip: string;
}

export interface ExpressionRepair {
  readonly text: string;
  /** Sound-different repairs only, once per expression, in answer order. */
  readonly notes: readonly HeardAsNote[];
}

const GRASSE_VOWEL =
  'The « a » in « grasse » is an open French [a], as in « patte ». An English “a” (as in “grass”) sounds like « graisse » to French ears — open your mouth wider.';
const GRASSE_FINAL =
  'Say the « -sse » at the end of « grasse » clearly: « gras » (no [s]) is a different word.';

export const MISHEARD_EXPRESSIONS: readonly MisheardExpression[] = [
  {
    id: 'grasse_matinee',
    expression: 'grasse matinée',
    variants: [
      { heard: 'graisse matinée', tip: GRASSE_VOWEL },
      { heard: 'graisse matiné', tip: GRASSE_VOWEL },
      { heard: 'grèce matinée', tip: GRASSE_VOWEL },
      { heard: 'gras matinée', tip: GRASSE_FINAL },
      { heard: 'grâce matinée' },
      { heard: 'grasse matiné' },
      { heard: 'grasse matinées' },
    ],
  },
  {
    id: 'emploi_du_temps',
    expression: 'emploi du temps',
    variants: [{ heard: 'emploi du tant' }, { heard: 'emploi du tan' }, { heard: 'emploi du temp' }],
  },
  {
    id: 'bande_dessinee',
    expression: 'bande dessinée',
    variants: [{ heard: 'bande dessiner' }, { heard: 'bande dessiné' }, { heard: 'bande dessinez' }],
  },
  {
    id: 'bandes_dessinees',
    expression: 'bandes dessinées',
    variants: [{ heard: 'bandes dessiner' }, { heard: 'bandes dessinés' }],
  },
  {
    id: 'petit_dejeuner',
    expression: 'petit déjeuner',
    variants: [{ heard: 'petit déjeuné' }, { heard: 'petit déjeunez' }],
  },
  {
    id: 'pomme_de_terre',
    expression: 'pomme de terre',
    variants: [{ heard: 'pomme de taire' }, { heard: 'pomme de terres' }],
  },
  {
    id: 'pommes_de_terre',
    expression: 'pommes de terre',
    variants: [{ heard: 'pommes de taire' }, { heard: 'pommes de terres' }],
  },
  {
    id: 'salle_a_manger',
    expression: 'salle à manger',
    variants: [{ heard: 'sale à manger' }, { heard: 'sal à manger' }],
  },
  {
    id: 'salle_de_bains',
    expression: 'salle de bains',
    variants: [{ heard: 'sale de bains' }, { heard: 'sale de bain' }],
  },
  {
    id: 'leche_vitrines',
    expression: 'lèche-vitrines',
    variants: [
      { heard: 'laisse vitrines', tip: 'Make the « ch » in « lèche » a [ʃ] (as in “shop”), not an [s]: « laisse » is a different word.' },
      { heard: 'laisse vitrine', tip: 'Make the « ch » in « lèche » a [ʃ] (as in “shop”), not an [s]: « laisse » is a different word.' },
    ],
  },
  {
    id: 'en_plein_air',
    expression: 'en plein air',
    variants: [{ heard: 'en plein aire' }, { heard: 'en plein ère' }, { heard: 'en plein hère' }],
  },
  {
    id: 'au_bord_de_la_mer',
    expression: 'au bord de la mer',
    variants: [{ heard: 'au bord de la mère' }, { heard: 'au bord de la maire' }],
  },
  {
    id: 'j_ai_faim',
    expression: "j'ai faim",
    variants: [{ heard: "j'ai fin" }, { heard: "j'ai feint" }],
  },
];

/** Lower case, no accents, curly apostrophes straightened: the key both sides are compared on. */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[’`]/g, "'");
}

interface WordToken {
  readonly folded: string;
  readonly start: number;
  readonly end: number;
}

/** Words with their offsets. A hyphen joins (« lèche-vitrines »); an apostrophe stays inside (« j'ai »). */
function words(text: string): WordToken[] {
  const out: WordToken[] = [];
  for (const m of text.matchAll(/[\p{L}\p{N}'’]+/gu)) {
    out.push({ folded: fold(m[0]), start: m.index, end: m.index + m[0].length });
  }
  return out;
}

function splitPhrase(phrase: string): string[] {
  return fold(phrase).split(/[\s-]+/).filter(Boolean);
}

interface Rule {
  readonly expression: MisheardExpression;
  readonly variant: MisheardVariant;
  readonly words: readonly string[];
}

/** Longest variants first, so « graisse matinée » is never half-matched by a shorter rule. */
const RULES: readonly Rule[] = MISHEARD_EXPRESSIONS.flatMap((expression) =>
  expression.variants.map((variant) => ({ expression, variant, words: splitPhrase(variant.heard) })),
).sort((a, b) => b.words.length - a.words.length);

/** Only spaces or a hyphen between two words of one expression — never a full stop or a comma. */
function joined(text: string, a: WordToken, b: WordToken): boolean {
  return /^[\s-]+$/.test(text.slice(a.end, b.start));
}

/** Keep the learner's sentence-initial capital. */
function matchCase(original: string, replacement: string): string {
  // « Graisse » starts a sentence; « GRAISSE » is just a shouting recogniser.
  const capitalised = /^\p{Lu}\p{Ll}/u.test(original);
  return capitalised ? replacement.charAt(0).toUpperCase() + replacement.slice(1) : replacement;
}

/**
 * Replaces every misheard fixed expression in a spoken answer with the
 * expression the learner meant. Pure; returns the text unchanged (same
 * string) when nothing matched.
 */
export function repairMisheardExpressions(text: string): ExpressionRepair {
  const tokens = words(text);
  if (tokens.length === 0) return { text, notes: [] };

  const edits: { start: number; end: number; replacement: string }[] = [];
  const notes: HeardAsNote[] = [];
  let i = 0;
  while (i < tokens.length) {
    const rule = RULES.find((r) => r.words.every((w, k) => tokens[i + k]?.folded === w && (k === 0 || joined(text, tokens[i + k - 1], tokens[i + k]))));
    if (!rule) {
      i += 1;
      continue;
    }
    const first = tokens[i];
    const last = tokens[i + rule.words.length - 1];
    const heard = text.slice(first.start, last.end);
    const meant = matchCase(heard, rule.expression.expression);
    edits.push({ start: first.start, end: last.end, replacement: meant });
    if (rule.variant.tip && !notes.some((n) => n.expressionId === rule.expression.id)) {
      notes.push({ expressionId: rule.expression.id, heard, meant, tip: rule.variant.tip });
    }
    i += rule.words.length;
  }
  if (edits.length === 0) return { text, notes: [] };

  let repaired = text;
  for (const edit of [...edits].reverse()) {
    repaired = repaired.slice(0, edit.start) + edit.replacement + repaired.slice(edit.end);
  }
  return { text: repaired, notes };
}
