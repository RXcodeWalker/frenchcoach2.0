import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The Role-play drill coaches offline (domain/rolePlayDrill/checkAnswer.ts):
 * a short answer that covers every part of the task is complete (TN p.6), so
 * Learn's AI coach — which rewards long, developed answers — must never be
 * reachable from the drill, and it spends no AI quota. Nothing it shows is a
 * mark. If the drill should ever call a model, change this test with the code.
 */
const ROOT = resolve(__dirname, '../../..');
const FILES = [
  ...readdirSync(join(ROOT, 'screens/rolePlayDrill'))
    .filter((f) => /\.tsx?$/.test(f))
    .map((f) => join(ROOT, 'screens/rolePlayDrill', f)),
  join(ROOT, 'domain/rolePlayDrill/checkAnswer.ts'),
  join(ROOT, 'services/coach/drillAnswerRecorder.ts'),
];

const FORBIDDEN = [
  'getAIFeedback',
  'apiClient',
  'responseTier',
  'buildTier0Result',
  'orchestrateAttempt',
  'LiveFeedbackPanel',
  'transcribeAudio',
  'consume_ai_quota',
];

describe('the Role-play drill makes no AI call and shows no mark', () => {
  it('covers the screen files, the checker and the recorder', () => {
    expect(FILES.length).toBeGreaterThan(6);
  });

  for (const file of FILES) {
    it(`${file.replace(ROOT, 'src')} reaches no AI coach, quota or LiveFeedbackPanel`, () => {
      const source = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      for (const word of FORBIDDEN) expect(source, `${word} in ${file}`).not.toContain(word);
    });
  }

  it('the screen files never render a score, band, grade or mark', () => {
    for (const file of FILES.filter((f) => f.endsWith('.tsx'))) {
      const source = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      expect(source, file).not.toMatch(/\bscore\b|\bband\b|\bgrade\b|\/ ?40\b|\/ ?2\b/i);
    }
  });
});
