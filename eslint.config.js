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
