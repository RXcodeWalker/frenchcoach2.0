import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    // Runtime invariant #5 (Explore & Roleplay Overhaul plan): a fabricated
    // numeric score must never be constructed anywhere. Bans an object
    // literal that assigns all four of overall/communication/language/
    // fluency as direct properties, except in the audited scorer-boundary
    // modules that legitimately produce a FeedbackV2['scores'] value
    // (the offline heuristic evaluator, its tier-0/tier-1 placeholder
    // builders, and the network response mapper that reshapes a real
    // provider payload). Test fixtures are exempt — a mock FeedbackV2 in a
    // test is data, not a fabricated verdict shown to a learner.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', '**/__tests__/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "ObjectExpression:has(> Property[key.name='overall']):has(> Property[key.name='communication']):has(> Property[key.name='language']):has(> Property[key.name='fluency'])",
          message:
            'A FeedbackV2 scores object with all four fields must not be constructed here — route through responseTier.ts, coachService.ts, or apiClient.ts\'s mapBackendFeedback (runtime invariant #5).',
        },
      ],
    },
  },
  {
    files: [
      'src/services/coaching/responseTier.ts',
      'src/services/coaching/coachService.ts',
      'src/services/api/apiClient.ts',
      // Reshapes an already-produced FeedbackV2's real scores (or nulls
      // them) into a sync summary blob — never invents a number.
      'src/services/sync/sessionSync.ts',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    // Pre-existing fabricated/placeholder scores outside this plan's scope
    // (Daily News, Scenario Architect) — not touched by the Explore &
    // Roleplay Overhaul. Left as tracked debt rather than silently widening
    // the boundary-module allowlist above.
    files: [
      'src/screens/DailyNewsFlash.tsx',
      'src/screens/ScenarioArchitectSession.tsx',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    // Hard constraint: examiner-mode practice feedback must stay data-only
    // against the audited Cambridge scorer. It may read rubric descriptor
    // text and isQuoteGrounded, never the scoring/envelope/guardrails/session
    // machinery — see the module doc comment and roadmap.md S7.
    files: ['src/services/coaching/examinerFeedback.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/domain/igcse/judgement/scoreSpeaking*',
                '**/domain/igcse/envelope/**',
                '**/domain/igcse/guardrails/**',
                '**/domain/igcse/session/**',
              ],
              message:
                'examinerFeedback.ts may only import rubric descriptor data and isQuoteGrounded — not the scoring pipeline (roadmap.md S7).',
            },
          ],
        },
      ],
    },
  }
);
