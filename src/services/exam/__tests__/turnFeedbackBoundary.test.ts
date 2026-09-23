/**
 * W3 boundary test, mirroring domain/igcse/session/__tests__/interpreterBoundary.test.ts
 * for the exam corrections rail (verification-log.md's "W3 pre-implementation
 * decision" entry). Two invariants:
 *
 *  1. The rail's live LLM signal (turnFeedback.ts / ExamCorrectionsRail.tsx /
 *     getExaminerFeedback) must be unreachable from the scored pipeline —
 *     evidence -> judgement -> guardrails -> envelope, plus scripts/scoring.
 *  2. turnFeedback.ts and ExamCorrectionsRail.tsx must never call
 *     observeAttempt or write to the ConductLog/SessionTranscript — the rail
 *     renders ExaminerFeedbackCard and nothing else, no evidence-log write,
 *     no belief update, per turn.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../..');

const RAIL_REFERENCE_PATTERNS = [
  /from ['"].*turnFeedback['"]/,
  /from ['"].*ExamCorrectionsRail['"]/,
  /\buseExamCorrectionsRail\(/,
];

function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === '__tests__' || entry === 'node_modules') continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...collectSourceFiles(full));
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const SCORED_PIPELINE_DIRS = [
  join(REPO_ROOT, 'src/domain/igcse'),
  join(REPO_ROOT, 'scripts/scoring'),
];

describe('W3 boundary: the exam corrections rail is unreachable from the scored pipeline', () => {
  for (const dir of SCORED_PIPELINE_DIRS) {
    const files = collectSourceFiles(dir);

    it(`scans a non-empty file set under ${dir}`, () => {
      expect(files.length).toBeGreaterThan(0);
    });

    it(`no file under ${dir} references the exam corrections rail`, () => {
      const offenders: string[] = [];
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        if (RAIL_REFERENCE_PATTERNS.some((p) => p.test(content))) {
          offenders.push(file);
        }
      }
      expect(offenders).toEqual([]);
    });
  }
});

describe('W3 boundary: the rail never calls observeAttempt or writes to the ConductLog', () => {
  const FORBIDDEN_IN_RAIL = [
    /\bobserveAttempt\(/,
    /from ['"].*sessionOrchestrator['"]/,
    /\bcandidateTurnToLogEntry\(/,
    /\bexaminerActionToLogEntry\(/,
  ];

  const railFiles = [
    join(REPO_ROOT, 'src/services/exam/turnFeedback.ts'),
    join(REPO_ROOT, 'src/screens/exam/ExamCorrectionsRail.tsx'),
  ];

  for (const file of railFiles) {
    it(`${file.split('/').slice(-1)[0]} has no reference to observeAttempt/sessionOrchestrator/ConductLog writers`, () => {
      const content = readFileSync(file, 'utf-8');
      const offending = FORBIDDEN_IN_RAIL.filter((p) => p.test(content));
      expect(offending).toEqual([]);
    });
  }
});
