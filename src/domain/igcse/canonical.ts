/**
 * Frozen verbatim strings transcribed from Cambridge 0520/03/TN/M/J/24.
 * Manual diff completed against pages 6, 10–12 before freeze.
 * Canonicalization: U+2019 apostrophes in principles; whitespace collapsed on two justified bullets.
 */

// ── Role play mark scheme (p.10) ─────────────────────────────────────────────

export const RP_MARK_2 = [
  'The information is communicated.',
  'Language is appropriate to the situation and is accurate.',
  'Minor errors (adjective endings, use of prepositions, etc.) are allowed.',
] as const;

export const RP_MARK_1 = [
  'The information is partly communicated and/or the meaning is ambiguous.',
  'Errors impede communication.',
] as const;

export const RP_MARK_0 = ['No creditable response.'] as const;

// ── Communication (p.11) ───────────────────────────────────────────────────

export const COMM_13_15 = [
  'Responds confidently to questions; may occasionally need repetition of words or phrases.',
  'Communicates information which is consistently relevant to the questions.',
  'Frequently develops ideas and opinions.',
  'Justifies and explains some answers.',
] as const;

export const COMM_10_12 = [
  'Responds well to questions; requires occasional use of the alternative question(s) provided.',
  'Communicates information which is almost always relevant to the questions.',
  'Sometimes develops ideas and opinions.',
  'Gives reasons or explanations for some answers.',
] as const;

export const COMM_7_9 = [
  'Responds satisfactorily to questions; frequently requires use of the alternative question(s) provided.',
  'Communicates most of the required information; may occasionally give irrelevant information.',
  'Conveys simple, straightforward opinions.',
] as const;

export const COMM_4_6 = [
  'Has difficulty with many questions but still attempts an answer.',
  'Communicates some simple information relevant to the questions.',
] as const;

export const COMM_1_3 = [
  'Frequently has difficulty understanding the questions and has great difficulty in replying.',
  'Communicates one or two basic pieces of information relevant to the questions.',
] as const;

export const COMM_0 = ['No creditable response.'] as const;

// ── Quality of Language (p.12) ───────────────────────────────────────────────

export const QOL_13_15 = [
  'Accurate use of a wide range of the structures listed in the syllabus with occasional errors in more complex language.',
  'Accurate use of a wide range of vocabulary with occasional errors.',
  'Very good pronunciation, fluency, intonation and expression; occasional mistakes or hesitation.',
] as const;

export const QOL_10_12 = [
  'Good use of a range of the structures listed in the syllabus, with some errors.',
  'Good use of a range of vocabulary with some errors.',
  'Good pronunciation and fluency despite some errors or hesitation; a good attempt at correct intonation and expression.',
] as const;

export const QOL_7_9 = [
  'Satisfactory use of some of the structures listed in the syllabus, with frequent errors.',
  'Satisfactory use of vocabulary with frequent errors.',
  'Satisfactory pronunciation and fluency despite frequent errors and hesitation; some attempt at intonation and expression.',
] as const;

export const QOL_4_6 = [
  'Limited range of structures and vocabulary, rarely accurate and/or complete; frequent ambiguity.',
  'Pronunciation can be understood with some effort; very noticeable hesitations and stilted delivery.',
] as const;

export const QOL_1_3 = [
  'Very limited range of structures and vocabulary, almost always inaccurate.',
  'Poor pronunciation, rarely comprehensible; many serious errors.',
] as const;

export const QOL_0 = ['No creditable response.'] as const;

// ── CEFR examiner reminder (p.11 & p.12, identical) ────────────────────────

export const CEFR_REFERENCE =
  'Examiners are reminded that this is a language qualification aimed at certifying language proficiency at level A2 with elements of B1 of the Common European Framework of Reference for Languages: Learning, Teaching, Assessment. The descriptors below should be understood and applied with reference to those levels.';

// ── Marking principles ───────────────────────────────────────────────────────

export const PRINCIPLE_POSITIVE_MARKING =
  'Marking should be positive, rewarding achievement.';

export const PRINCIPLE_RP_APPLY_SEPARATELY =
  'Apply the mark scheme separately for each response.';

export const PRINCIPLE_RP_TWO_MARKS =
  'Up to two marks are available per response.';

/** U+2019 in candidate's */
export const PRINCIPLE_RP_BEST_FIT =
  'When you are awarding marks, start at the bottom band and work upwards. Find the band which best fits the candidate\u2019s performance.';

export const PRINCIPLE_RP_CONCISE =
  'The purpose of the role play is to communicate an appropriate response to each task. A short response to a task, if it communicates fully and is correct, is worth 2 marks.';

/** U+2019 in candidate's */
export const PRINCIPLE_TC_BEST_FIT =
  'When you are awarding marks, start at the bottom band and work upwards. Find the band which best fits the candidate\u2019s performance. Then use the following guidance to decide on the mark to award, where applicable:';

/** U+2019 in candidate's */
export const PRINCIPLE_TC_CONVINCINGLY =
  'If the candidate\u2019s work convincingly meets the level statement, award the highest mark.';

/** U+2019 in candidate's */
export const PRINCIPLE_TC_ADEQUATELY =
  'If the candidate\u2019s work adequately meets the level statement, award the most appropriate mark in the middle of the range (where middle marks are available).';

/** U+2019 in candidate's */
export const PRINCIPLE_TC_JUST =
  'If the candidate\u2019s work just meets the level statement, award the lowest mark.';

export const AWARD_COMMUNICATION =
  'Award a mark out of 15 for the candidate\u2019s performance in both topic conversations.';
