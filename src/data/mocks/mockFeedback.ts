export const MOCK_FEEDBACK = {
  scores: { communication: 7.5, language: 8, fluency: 7, overall: 7.5 },
  grammar: {
    critical: [
      { theme: 'ELISION', severity: 'major' as const, msg: 'Elision required before vowel.', diagnostic: "You wrote 'je ai' but should use 'j'ai'", correction: "j'ai" },
    ],
    polish: [
      { theme: 'CONNECTORS', severity: 'minor' as const, msg: 'Use more varied connectors.', diagnostic: "Try 'De plus,' instead of 'Et'", correction: 'De plus,' },
    ],
  },
  vocabulary: [
    { basic: 'bien', upgrade: 'formidable, exceptionnel' },
    { basic: 'beaucoup', upgrade: 'enormement, considerablement' },
  ],
  wordCount: 78,
  cefrLevel: 'B1',
};
