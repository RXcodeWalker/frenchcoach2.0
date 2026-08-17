/**
 * Shadowing Mode phrase corpus (Phase 4). Original, app-authored sentences —
 * never Cambridge role-play cards, topic questions, or Teacher's Notes
 * wording (docs/architecture/04-frontend-pipeline.md §6.4 — copyright
 * constraint). This file is a practice-feature corpus, not part of the
 * audited IGCSE question bank, and is never read by the scoring engine.
 *
 * 6-14 words per phrase so a normal delivery is ~3-6s, far below the 30s
 * client-side recording cap (ShadowingPanel.tsx). Vocabulary is IGCSE-level
 * (CEFR A2 with light B1 lexis) and `tu`-register throughout, matching the
 * register convention in docs/content/authoring-guide.md §2-3 — but this
 * corpus is NOT part of the exam question bank and is not subject to
 * authoring:check (no anaphora rule, no alternatives, no targetStructures).
 *
 * No IPA field: nothing in ShadowingPanel renders it, and hand-authoring
 * IPA for 24 sentences is error-prone (plan §5).
 *
 * `id` is namespaced `shad_*` so MARK_DRILL_MASTERED ids can never collide
 * with PRONUNCIATION_DRILLS ids, and AccentAnalyzer's masteredCount (which
 * filters state.masteredDrills against PRONUNCIATION_DRILLS only) is never
 * polluted by shadowing mastery.
 */

export interface ShadowingPhrase {
  id: string;
  french: string;
  english: string;
  focus: 'liaison' | 'nasalVowel' | 'frenchR' | 'silentLetter' | 'elision' | 'rhythm';
  difficulty: 'easy' | 'medium' | 'hard';
  tip: string;
}

export const SHADOWING_PHRASES: ShadowingPhrase[] = [
  // ── easy (8) ──────────────────────────────────────────────────────────
  {
    id: 'shad_liaison_01',
    french: 'Les amis arrivent à neuf heures.',
    english: 'The friends arrive at nine o\'clock.',
    focus: 'liaison',
    difficulty: 'easy',
    tip: "Link 'les' to 'amis' with a Z sound — 'le-z-amis'.",
  },
  {
    id: 'shad_nasal_01',
    french: 'Mon oncle habite en Angleterre.',
    english: 'My uncle lives in England.',
    focus: 'nasalVowel',
    difficulty: 'easy',
    tip: "Let air escape through your nose on 'on' and 'en' — don't pronounce the N.",
  },
  {
    id: 'shad_r_01',
    french: 'Tu regardes souvent la télévision.',
    english: 'You often watch television.',
    focus: 'frenchR',
    difficulty: 'easy',
    tip: 'Keep the R soft and low in the throat, not rolled.',
  },
  {
    id: 'shad_silent_01',
    french: 'Nous allons au restaurant ce soir.',
    english: "We're going to the restaurant tonight.",
    focus: 'silentLetter',
    difficulty: 'easy',
    tip: "'Restaurant' ends silently — don't sound the final T.",
  },
  {
    id: 'shad_elision_01',
    french: "J'aime beaucoup l'école de mon quartier.",
    english: 'I really like my neighbourhood school.',
    focus: 'elision',
    difficulty: 'easy',
    tip: "'Je' drops its E before a vowel: 'j'aime', not 'je aime'.",
  },
  {
    id: 'shad_rhythm_01',
    french: 'Il fait beau aujourd\'hui à Paris.',
    english: "It's nice weather today in Paris.",
    focus: 'rhythm',
    difficulty: 'easy',
    tip: 'Give each syllable roughly equal length — French rhythm is even, not stressed.',
  },
  {
    id: 'shad_liaison_02',
    french: 'Mes parents adorent les grandes vacances.',
    english: 'My parents love the summer holidays.',
    focus: 'liaison',
    difficulty: 'easy',
    tip: "Link 'mes' to 'parents' smoothly — 'me-z-parents'.",
  },
  {
    id: 'shad_nasal_02',
    french: "J'ai un chien et un chat.",
    english: 'I have a dog and a cat.',
    focus: 'nasalVowel',
    difficulty: 'easy',
    tip: "'Un' is a pure nasal sound — don't add an N at the end.",
  },

  // ── medium (8) ────────────────────────────────────────────────────────
  {
    id: 'shad_r_02',
    french: 'Le professeur explique la grammaire française.',
    english: 'The teacher explains French grammar.',
    focus: 'frenchR',
    difficulty: 'medium',
    tip: "Two R's in a row — keep both soft, don't tense your tongue.",
  },
  {
    id: 'shad_silent_02',
    french: 'Les étudiants font leurs devoirs ensemble.',
    english: 'The students do their homework together.',
    focus: 'silentLetter',
    difficulty: 'medium',
    tip: "'Devoirs' and 'ensemble' both have silent final letters — stop cleanly.",
  },
  {
    id: 'shad_elision_02',
    french: "L'année dernière, j'habitais à la campagne.",
    english: 'Last year I lived in the countryside.',
    focus: 'elision',
    difficulty: 'medium',
    tip: "Two elisions in a row: 'l'année' and 'j'habitais' — glide through both.",
  },
  {
    id: 'shad_nasal_03',
    french: 'Mon copain préfère les films romantiques.',
    english: 'My friend prefers romantic films.',
    focus: 'nasalVowel',
    difficulty: 'medium',
    tip: "'Mon' and 'romantiques' share the same nasal — keep it consistent.",
  },
  {
    id: 'shad_liaison_03',
    french: 'Nous avons envie de voyager cet été.',
    english: 'We feel like travelling this summer.',
    focus: 'liaison',
    difficulty: 'medium',
    tip: "'Nous avons' and 'cet été' both liaise — don't pause between the words.",
  },
  {
    id: 'shad_rhythm_02',
    french: 'D\'habitude, je me lève tôt le matin.',
    english: 'Usually, I get up early in the morning.',
    focus: 'rhythm',
    difficulty: 'medium',
    tip: 'Keep a steady beat through the whole sentence, even across the comma.',
  },
  {
    id: 'shad_r_03',
    french: 'Ma sœur travaille dans un grand bureau.',
    english: 'My sister works in a big office.',
    focus: 'frenchR',
    difficulty: 'medium',
    tip: "'Travaille' and 'bureau' both need a relaxed, back-of-throat R.",
  },
  {
    id: 'shad_silent_03',
    french: 'Les enfants jouent dans le jardin public.',
    english: 'The children are playing in the public garden.',
    focus: 'silentLetter',
    difficulty: 'medium',
    tip: "Silent S on 'enfants' and 'jouent' — the plural is heard, not the letter.",
  },

  // ── hard (8) ──────────────────────────────────────────────────────────
  {
    id: 'shad_elision_03',
    french: "Qu'est-ce que tu as pensé de l'examen d'hier ?",
    english: 'What did you think of yesterday\'s exam?',
    focus: 'elision',
    difficulty: 'hard',
    tip: "Three elisions back to back: 'qu'est-ce', 'l'examen', 'd'hier' — don't slow down.",
  },
  {
    id: 'shad_nasal_04',
    french: 'Un grand nombre d\'étudiants sont absents en ce moment.',
    english: 'A large number of students are absent right now.',
    focus: 'nasalVowel',
    difficulty: 'hard',
    tip: "Three different nasal sounds appear here — 'un', 'nombre', 'moment' — keep each distinct.",
  },
  {
    id: 'shad_liaison_04',
    french: 'Les autres élèves ont oublié leurs affaires importantes.',
    english: 'The other students forgot their important belongings.',
    focus: 'liaison',
    difficulty: 'hard',
    tip: "Four liaison points in a row — take it slowly the first time, then speed up.",
  },
  {
    id: 'shad_r_04',
    french: 'Le directeur a rarement raison pendant les réunions.',
    english: 'The director is rarely right during meetings.',
    focus: 'frenchR',
    difficulty: 'hard',
    tip: "Five R sounds — 'directeur', 'rarement', 'raison', 'réunions' — pace yourself.",
  },
  {
    id: 'shad_rhythm_03',
    french: 'Si j\'avais plus de temps, je voyagerais partout dans le monde.',
    english: 'If I had more time, I would travel everywhere in the world.',
    focus: 'rhythm',
    difficulty: 'hard',
    tip: 'A long conditional clause — keep the even beat all the way through, no rushing the end.',
  },
  {
    id: 'shad_silent_04',
    french: 'Les invités attendaient patiemment devant le grand restaurant.',
    english: 'The guests waited patiently in front of the big restaurant.',
    focus: 'silentLetter',
    difficulty: 'hard',
    tip: "Silent endings on 'invités', 'attendaient', 'grand' — none of the final consonants are heard.",
  },
  {
    id: 'shad_elision_04',
    french: "L'histoire qu'elle m'a racontée hier m'a beaucoup surpris.",
    english: 'The story she told me yesterday surprised me a lot.',
    focus: 'elision',
    difficulty: 'hard',
    tip: "Four elisions — 'l'histoire', 'qu'elle', 'm'a' (twice) — glide, don't stop between them.",
  },
  {
    id: 'shad_nasal_05',
    french: 'En général, les enfants apprennent vite une langue étrangère.',
    english: 'Generally, children learn a foreign language quickly.',
    focus: 'nasalVowel',
    difficulty: 'hard',
    tip: "'En', 'enfants', 'apprennent', 'langue' — four nasals in one sentence, each clean and distinct.",
  },
];
