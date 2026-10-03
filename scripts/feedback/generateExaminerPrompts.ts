/**
 * Examiner-feedback prompt templates (Phase 3 Batch 0).
 *
 * The backend renders examiner prompts server-side from
 * backend/data/examiner_feedback/prompts.json; it never accepts a
 * client-built prompt. That file is generated from
 * src/services/coaching/examinerFeedback.ts (buildExaminerPromptTemplates),
 * the one place the rubric-sourced prompt text is assembled — never
 * hand-edit it.
 *
 *   npm run examiner:generate             # write backend/data/examiner_feedback/prompts.json
 *   npm run examiner:parity               # exit 1 if that file differs from what would be generated
 *   npm run examiner:<cmd> -- <path>      # override the output path
 *
 * The backend commit carrying a regenerated file must land (and deploy)
 * before the frontend that sends the new version.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildExaminerPromptTemplates,
  EXAMINER_DATA_BEGIN,
  EXAMINER_DATA_END,
  EXAMINER_TEMPLATE_PLACEHOLDERS,
  type ExaminerPromptTemplates,
} from '../../src/services/coaching/examinerFeedback';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT = join(__dirname, '..', '..', 'backend', 'data', 'examiner_feedback', 'prompts.json');

/** Every {{placeholder}} must be a known one and sit inside a BEGIN/END pair, or the generator refuses. */
function assertPlaceholdersInsideBoundary(templates: ExaminerPromptTemplates): void {
  const known = new Set<string>(EXAMINER_TEMPLATE_PLACEHOLDERS);
  for (const [version, profiles] of Object.entries(templates)) {
    for (const [profile, kinds] of Object.entries(profiles)) {
      for (const [kind, t] of Object.entries(kinds)) {
        const where = `${version}/${profile}/${kind}`;
        for (const text of [t.template, t.retryReminder]) {
          for (const m of text.matchAll(/\{\{(\w+)\}\}/g)) {
            if (!known.has(m[1])) throw new Error(`${where}: unknown placeholder {{${m[1]}}}`);
            const before = text.slice(0, m.index);
            const open = before.lastIndexOf(EXAMINER_DATA_BEGIN);
            const close = before.lastIndexOf(EXAMINER_DATA_END);
            if (open === -1 || close > open) {
              throw new Error(`${where}: {{${m[1]}}} is outside the DATA BOUNDARY delimiters`);
            }
          }
        }
        if (!Number.isInteger(t.maxOutputTokens) || t.maxOutputTokens <= 0) {
          throw new Error(`${where}: maxOutputTokens must be a positive integer`);
        }
        if (
          t.responseKeys !== undefined &&
          (!Array.isArray(t.responseKeys) ||
            t.responseKeys.length === 0 ||
            t.responseKeys.some((k) => typeof k !== 'string' || k === ''))
        ) {
          throw new Error(`${where}: responseKeys must be a non-empty list of key names`);
        }
      }
    }
  }
}

export function renderPromptsJson(): string {
  const templates = buildExaminerPromptTemplates();
  assertPlaceholdersInsideBoundary(templates);
  return `${JSON.stringify(templates, null, 2)}\n`;
}

function main(): void {
  const mode = process.argv[2];
  const outArg = process.argv[3];
  const outPath = outArg ? resolve(process.cwd(), outArg) : DEFAULT_OUT;
  const expected = renderPromptsJson();

  if (mode === 'generate') {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, expected);
    console.log(`Wrote ${outPath}`);
    return;
  }
  if (mode === 'parity') {
    let actual: string;
    try {
      actual = readFileSync(outPath, 'utf-8');
    } catch {
      console.error(`✗ ${outPath} not found — run npm run examiner:generate`);
      process.exit(1);
    }
    if (actual !== expected) {
      console.error(`✗ ${outPath} differs from the generated templates — run npm run examiner:generate`);
      process.exit(1);
    }
    console.log(`✓ ${outPath} matches the generated templates`);
    return;
  }
  console.error('usage: generateExaminerPrompts.ts <generate|parity> [path]');
  process.exit(2);
}

main();
