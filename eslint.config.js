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
    // text and the pure helpers in domain/examFeedback/shared/, never the
    // scoring/envelope/guardrails/session machinery and never the rest of
    // domain/examFeedback/ (Batch A's post-marking report generator) — see the
    // module doc comment and docs/decisions/0005-examiner-feedback-emits-no-marks.md
    // and 0009-examiner-feedback-shared-helpers.md.
    files: ['src/services/coaching/examinerFeedback.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/domain/igcse/judgement/**',
                '**/domain/igcse/envelope/**',
                '**/domain/igcse/guardrails/**',
                '**/domain/igcse/session/**',
              ],
              message:
                'examinerFeedback.ts may only import rubric descriptor data and domain/examFeedback/shared/ helpers — not the scoring pipeline (docs/decisions/0005-examiner-feedback-emits-no-marks.md, 0009).',
            },
            {
              // `*` (direct children) then re-include `shared`: gitignore-style patterns can't
              // re-include a file whose parent directory was excluded.
              group: ['**/domain/examFeedback/*', '!**/domain/examFeedback/shared'],
              message:
                'examinerFeedback.ts may import only domain/examFeedback/shared/** from the examFeedback domain (docs/decisions/0009-examiner-feedback-shared-helpers.md).',
            },
          ],
        },
      ],
    },
  },
  {
    // The shared helpers are pure: they import only the text normalizer and
    // isQuoteGrounded from the audited engine (and each other), and nothing
    // from the app layers or the rest of the scoring pipeline. The import-graph
    // test in shared/__tests__/sharedBoundary.test.ts checks the exact set.
    files: ['src/domain/examFeedback/shared/**/*.ts'],
    ignores: ['**/__tests__/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/services/**',
                '**/screens/**',
                '**/features/**',
                '**/components/**',
                '**/lib/**',
                '**/igcse/envelope/**',
                '**/igcse/guardrails/**',
                '**/igcse/session/**',
                '**/igcse/evidence/**',
                '**/igcse/judgement/scoreSpeaking*',
              ],
              message:
                'domain/examFeedback/shared/ is pure: only igcse/text/normalize and igcse/judgement/schema (isQuoteGrounded) may be imported (docs/decisions/0009-examiner-feedback-shared-helpers.md).',
            },
          ],
        },
      ],
    },
  }
);
