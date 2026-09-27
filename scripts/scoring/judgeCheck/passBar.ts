/**
 * Pure pass-bar evaluator for judge:check — no network, no judge, so this is
 * covered by an offline vitest with a fake judge (per the plan: "an offline
 * vitest covers fixture validity ... and the pass-bar evaluator, with a fake
 * judge").
 *
 * A fixture's `expect` block only gates the criteria it names; unnamed
 * criteria/fixtures are reported but never fail the run. Every named
 * expectation must hold in ALL of the case's runs (3 of 3), not just one.
 */

import type { JudgeCheckExpect } from './fixtures';

export interface JudgeCheckRunResult {
  communication: number;
  qualityOfLanguage: number;
}

export interface ExpectationResult {
  fixtureId: string;
  description: string;
  passed: boolean;
  /** Empty when passed; one entry per run/criterion combination that failed. */
  failures: string[];
}

function checkOne(
  fixtureId: string,
  runs: JudgeCheckRunResult[],
  criterionLabel: string,
  value: (r: JudgeCheckRunResult) => number,
  min: number | undefined,
  max: number | undefined,
): string[] {
  const failures: string[] = [];
  runs.forEach((run, i) => {
    const v = value(run);
    if (min !== undefined && v < min) {
      failures.push(`${fixtureId} run ${i + 1}: ${criterionLabel} ${v} < required minimum ${min}`);
    }
    if (max !== undefined && v > max) {
      failures.push(`${fixtureId} run ${i + 1}: ${criterionLabel} ${v} > required maximum ${max}`);
    }
  });
  return failures;
}

/** Evaluates one fixture's `expect` block against all of its runs (3 of 3 must hold). */
export function evaluateExpectation(
  fixtureId: string,
  expect: JudgeCheckExpect | undefined,
  runs: JudgeCheckRunResult[],
): ExpectationResult {
  if (!expect || Object.keys(expect).length === 0) {
    return { fixtureId, description: 'not gated — reported only', passed: true, failures: [] };
  }

  const failures = [
    ...checkOne(fixtureId, runs, 'Communication', (r) => r.communication, expect.communicationMin, expect.communicationMax),
    ...checkOne(
      fixtureId,
      runs,
      'Quality of Language',
      (r) => r.qualityOfLanguage,
      expect.qualityOfLanguageMin,
      expect.qualityOfLanguageMax,
    ),
  ];

  return {
    fixtureId,
    description: describeExpectation(expect),
    passed: failures.length === 0,
    failures,
  };
}

function describeExpectation(expect: JudgeCheckExpect): string {
  const parts: string[] = [];
  if (expect?.communicationMin !== undefined) parts.push(`Communication >= ${expect.communicationMin}`);
  if (expect?.communicationMax !== undefined) parts.push(`Communication <= ${expect.communicationMax}`);
  if (expect?.qualityOfLanguageMin !== undefined) parts.push(`QoL >= ${expect.qualityOfLanguageMin}`);
  if (expect?.qualityOfLanguageMax !== undefined) parts.push(`QoL <= ${expect.qualityOfLanguageMax}`);
  return parts.join(' and ');
}

export function allExpectationsPassed(results: ExpectationResult[]): boolean {
  return results.every((r) => r.passed);
}
