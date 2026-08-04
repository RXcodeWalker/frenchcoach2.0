/**
 * Maps a diagnostic skillId (SKILL_DEFS in diagnosticEngine.ts) to the
 * REBUILD_QUESTIONS themes that drill it. Lives in domain/ (not
 * components/ui/) because services (recurringGrammar.ts) depend on it —
 * a service importing from components/ui/ is the wrong dependency direction.
 */
export const SKILL_TO_THEME: Record<string, string[]> = {
  elision: ['Elision'],
  negation: ['Negation'],
  preposition: ['Prepositions', 'Verb Patterns'],
  subjunctive: ['Subjunctive'],
  relative_pron: ['Relative Pronouns'],
  tense_past: ['Reflexive Verbs', 'Imperfect Tense'],
  hypothetical: ['Conditionals'],
  gender: ['Adjective Placement'],
  demonstrative: ['Demonstratives'],
  comparative: ['Comparatives'],
  confusions: ['Pronoun Placement'],
};
