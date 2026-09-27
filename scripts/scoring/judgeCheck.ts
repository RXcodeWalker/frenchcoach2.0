/**
 * npm run judge:check — permanent real-judge harness (0520 Phase 1 Batch 2).
 *
 * Runs the real buildEvidenceProfile -> both L2 calls -> runGuardrails path,
 * using the same functions scoreAttempt.ts uses, against a real judge
 * (Gemini by default; `--provider groq` for Groq). NOT run in CI: it costs
 * money, needs an API key, and is nondeterministic — see fixtures.test.ts /
 * passBar.ts for the offline-safe parts of this harness.
 *
 * Usage:
 *   npm run judge:check -- [--runs N] [--case <id>] [--provider gemini|groq]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildEvidenceProfile } from '../../src/domain/igcse/evidence/buildEvidence';
import { runGuardrails } from '../../src/domain/igcse/guardrails/runGuardrails';
import {
  JudgementValidationError,
  combineAssessment,
  scoreQualityOfLanguage,
  scoreRolePlayAndCommunication,
} from '../../src/domain/igcse/judgement/scoreSpeaking';
import type { Judge, JudgeKind, QolError, SpeakingAssessment } from '../../src/domain/igcse/judgement/types';
import { canonicalizeForMatch } from '../../src/domain/igcse/text/normalize';
import { createGeminiJudge } from './providers/geminiJudge';
import type { GeminiJudgeCallMetadata } from './providers/geminiJudge';
import { createGroqJudge } from './providers/groqJudge';
import type { GroqJudgeCallMetadata } from './providers/groqJudge';
import { FIXTURE_IDS, loadFixture } from './judgeCheck/fixtures';
import type { JudgeCheckAuditError, JudgeCheckFixture } from './judgeCheck/fixtures';
import { allExpectationsPassed, evaluateExpectation } from './judgeCheck/passBar';
import type { ExpectationResult } from './judgeCheck/passBar';

type Provider = 'gemini' | 'groq';

/** OpenRouter-listed price for gemini-3.5-flash-lite — confirm on Google's own pricing page (plan's cost-estimate section). */
const GEMINI_PRICE_PER_MILLION_INPUT_USD = 0.3;
const GEMINI_PRICE_PER_MILLION_OUTPUT_USD = 2.5;

/**
 * Paces successive fixture/run iterations so the free-tier
 * generate_content_free_tier_requests quota (observed: 15 req/min) isn't hit
 * in the first place — each run makes 2 concurrent calls, so this caps the
 * harness at roughly 2 calls per (delay + call time), well under 15/min.
 */
const INTER_RUN_DELAY_MS = 9_000;

/** RESOURCE_EXHAUSTED (HTTP 429) — a quota hit, not a bad reply. Retried with the server's own backoff, uncounted against MAX_JUDGE_ATTEMPTS. */
const RATE_LIMIT_MARKERS = ['RESOURCE_EXHAUSTED', '"code":429', '"code": 429'];
const MAX_RATE_LIMIT_RETRIES = 5;
const DEFAULT_RATE_LIMIT_DELAY_MS = 60_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return RATE_LIMIT_MARKERS.some((marker) => message.includes(marker));
}

/** Reads Gemini's own `"retryDelay":"49s"` (or the prose "retry in 49.4s") out of the error message. */
function parseRateLimitDelayMs(err: unknown): number {
  const message = err instanceof Error ? err.message : String(err);
  const structured = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(message);
  const prose = /retry in ([\d.]+)s/.exec(message);
  const seconds = Number(structured?.[1] ?? prose?.[1]);
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds * 1000) + 1000 : DEFAULT_RATE_LIMIT_DELAY_MS;
}

interface CliArgs {
  runs: number;
  caseId?: string;
  provider: Provider;
}

function parseArgs(argv: string[]): CliArgs {
  let runs = 3;
  let caseId: string | undefined;
  let provider: Provider = 'gemini';
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--runs') {
      runs = Number(argv[++i]);
    } else if (argv[i] === '--case') {
      caseId = argv[++i];
    } else if (argv[i] === '--provider') {
      const v = argv[++i];
      if (v !== 'gemini' && v !== 'groq') throw new Error(`--provider must be "gemini" or "groq", got "${v}"`);
      provider = v;
    }
  }
  if (!Number.isInteger(runs) || runs < 1) throw new Error(`--runs must be a positive integer, got "${runs}"`);
  return { runs, caseId, provider };
}

interface CallMetadata {
  model: string;
  responseId?: string;
  usage?: { inputTokens: number; outputTokens: number; totalTokens?: number };
}

function createProviderJudge(provider: Provider): { judge: Judge; getLastCallMetadata: () => CallMetadata | undefined } {
  if (provider === 'gemini') {
    const { judge, getLastCallMetadata } = createGeminiJudge();
    return { judge, getLastCallMetadata: () => getLastCallMetadata() as GeminiJudgeCallMetadata | undefined };
  }
  const { judge, getLastCallMetadata } = createGroqJudge();
  return { judge, getLastCallMetadata: () => getLastCallMetadata() as GroqJudgeCallMetadata | undefined };
}

const MAX_JUDGE_ATTEMPTS = 2;

/** A call kind exhausted its retries — carries every attempt's message so the caller can report them. */
class JudgeCallExhaustedError extends Error {
  constructor(
    public readonly kind: JudgeKind,
    public readonly validationErrors: string[],
    cause: Error,
  ) {
    super(`${kind}: exhausted ${validationErrors.length} attempt(s); last error: ${cause.message}`);
    this.name = 'JudgeCallExhaustedError';
  }
}

/**
 * One L2 call kind with its own retry, mirroring scoreAttempt.ts's
 * runJudgeCall: a fresh provider judge per attempt, never reused.
 */
async function runJudgeCallWithRetry<T>(
  provider: Provider,
  kind: JudgeKind,
  call: (judge: Judge) => Promise<T>,
): Promise<{ result: T; metadata: CallMetadata; attempts: number; validationErrors: string[] }> {
  const validationErrors: string[] = [];
  let rateLimitRetries = 0;
  for (let attempt = 1; ; attempt += 1) {
    const { judge, getLastCallMetadata } = createProviderJudge(provider);
    let result: T;
    try {
      result = await call(judge);
    } catch (err) {
      if (isRateLimitError(err)) {
        rateLimitRetries += 1;
        if (rateLimitRetries > MAX_RATE_LIMIT_RETRIES) throw err;
        const delayMs = parseRateLimitDelayMs(err);
        process.stdout.write(`  ! rate limit on ${kind}, waiting ${Math.round(delayMs / 1000)}s before retrying (uncounted)\n`);
        await sleep(delayMs);
        attempt -= 1; // Does not consume a judgement attempt — this was never a judged reply.
        continue;
      }
      if (!(err instanceof JudgementValidationError)) throw err;
      validationErrors.push(`[${kind} attempt ${attempt}] ${err.message}`);
      if (attempt >= MAX_JUDGE_ATTEMPTS) throw new JudgeCallExhaustedError(kind, validationErrors, err);
      continue;
    }
    const metadata = getLastCallMetadata();
    if (!metadata) throw new Error(`judge:check: no call metadata after the ${kind} call`);
    return { result, metadata, attempts: attempt, validationErrors };
  }
}

interface SingleRunResult {
  rolePlay: number;
  communication: number;
  qualityOfLanguage: number;
  total: number;
  errorCount: number;
  errorFrequency: string;
  errors: QolError[];
  qolJustification: string;
  mainAttempts: number;
  qolAttempts: number;
  validationErrors: string[];
  mainUsage?: { inputTokens: number; outputTokens: number };
  qolUsage?: { inputTokens: number; outputTokens: number };
  auditErrorsRecall?: { quote: string; caught: boolean }[];
}

/**
 * Matches a fixture's known audible errors (`auditErrors`) against the
 * judge's returned QoL error list, for recall reporting only — never
 * affects marks or the pass bar. A match is same source+turnId with one
 * quote containing the other after canonicalizeForMatch, since the judge
 * may quote a shorter or longer span of the same error.
 */
function matchAuditErrors(auditErrors: JudgeCheckAuditError[], judgeErrors: QolError[]): { quote: string; caught: boolean }[] {
  return auditErrors.map((audit) => {
    const auditQuote = canonicalizeForMatch(audit.quote);
    const caught = judgeErrors.some((judgeError) => {
      if (judgeError.source !== audit.source || judgeError.turnId !== audit.turnId) return false;
      const judgeQuote = canonicalizeForMatch(judgeError.quote);
      return judgeQuote.includes(auditQuote) || auditQuote.includes(judgeQuote);
    });
    return { quote: audit.quote, caught };
  });
}

async function runOnce(fixture: JudgeCheckFixture, provider: Provider): Promise<SingleRunResult> {
  const evidence = buildEvidenceProfile(fixture.transcript);

  const [main, qol] = await Promise.all([
    runJudgeCallWithRetry(provider, 'rolePlayCommunication', (judge) =>
      scoreRolePlayAndCommunication(fixture.transcript, evidence, judge),
    ),
    runJudgeCallWithRetry(provider, 'qualityOfLanguage', (judge) => scoreQualityOfLanguage(fixture.transcript, judge)),
  ]);

  const assessment: SpeakingAssessment = combineAssessment(main.result, qol.result);
  // Real guardrails run, unused here beyond surfacing a broken fixture loudly.
  runGuardrails(assessment, evidence, fixture.transcript);

  return {
    rolePlay: assessment.rolePlay.total,
    communication: assessment.communication.mark,
    qualityOfLanguage: assessment.qualityOfLanguage.mark,
    total: assessment.total,
    errorCount: assessment.qualityOfLanguage.errors.length,
    errorFrequency: assessment.qualityOfLanguage.errorFrequency,
    errors: assessment.qualityOfLanguage.errors,
    qolJustification: assessment.qualityOfLanguage.justification,
    mainAttempts: main.attempts,
    qolAttempts: qol.attempts,
    validationErrors: [...main.validationErrors, ...qol.validationErrors],
    ...(main.metadata.usage ? { mainUsage: main.metadata.usage } : {}),
    ...(qol.metadata.usage ? { qolUsage: qol.metadata.usage } : {}),
  };
}

function spread(values: number[]): string {
  return values.length ? `${Math.min(...values)}-${Math.max(...values)}` : 'n/a';
}

function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * GEMINI_PRICE_PER_MILLION_INPUT_USD +
    (outputTokens / 1_000_000) * GEMINI_PRICE_PER_MILLION_OUTPUT_USD
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.provider === 'gemini' && !process.env.GEMINI_API_KEY) {
    process.stderr.write('judge:check: GEMINI_API_KEY is not set.\n');
    process.exit(2);
  }
  if (args.provider === 'groq' && !process.env.GROQ_API_KEY) {
    process.stderr.write('judge:check: GROQ_API_KEY is not set.\n');
    process.exit(2);
  }

  const ids = args.caseId ? [args.caseId] : [...FIXTURE_IDS];
  const fixtures = ids.map(loadFixture);

  const allExpectations: ExpectationResult[] = [];
  const report: Record<string, unknown> = { provider: args.provider, runs: args.runs, cases: {} };
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let anyValidationErrors = false;
  let isFirstRunOverall = true;

  for (const fixture of fixtures) {
    process.stdout.write(`\n=== ${fixture.id} ===\n${fixture.description}\n`);
    if (fixture.baseline) process.stdout.write(`baseline: ${JSON.stringify(fixture.baseline)}\n`);

    const runs: SingleRunResult[] = [];
    let failedRuns = 0;
    for (let i = 0; i < args.runs; i += 1) {
      if (isFirstRunOverall) {
        isFirstRunOverall = false;
      } else {
        await sleep(INTER_RUN_DELAY_MS);
      }
      let result: SingleRunResult;
      try {
        result = await runOnce(fixture, args.provider);
      } catch (err) {
        anyValidationErrors = true;
        failedRuns += 1;
        if (err instanceof JudgeCallExhaustedError) {
          for (const msg of err.validationErrors) process.stdout.write(`  ! retry: ${msg}\n`);
          process.stdout.write(`  run ${i + 1}: FAILED (terminal) — ${err.message}\n`);
        } else {
          process.stdout.write(`  run ${i + 1}: FAILED (terminal) — ${err instanceof Error ? err.message : String(err)}\n`);
        }
        continue;
      }
      runs.push(result);
      if (result.mainUsage) {
        totalInputTokens += result.mainUsage.inputTokens;
        totalOutputTokens += result.mainUsage.outputTokens;
      }
      if (result.qolUsage) {
        totalInputTokens += result.qolUsage.inputTokens;
        totalOutputTokens += result.qolUsage.outputTokens;
      }
      if (result.validationErrors.length > 0) {
        anyValidationErrors = true;
        for (const msg of result.validationErrors) process.stdout.write(`  ! retry: ${msg}\n`);
      }
      process.stdout.write(
        `  run ${i + 1}: RP ${result.rolePlay}/10  Comm ${result.communication}/15  QoL ${result.qualityOfLanguage}/15` +
          `  total ${result.total}/40  errors=${result.errorCount} (${result.errorFrequency})` +
          `  attempts main=${result.mainAttempts} qol=${result.qolAttempts}\n`,
      );
      process.stdout.write(`    QoL justification: ${result.qolJustification}\n`);
      if (fixture.auditErrors && fixture.auditErrors.length > 0) {
        const recall = matchAuditErrors(fixture.auditErrors, result.errors);
        result.auditErrorsRecall = recall;
        const caughtCount = recall.filter((r) => r.caught).length;
        process.stdout.write(`    auditErrors recall: ${caughtCount}/${recall.length}\n`);
        for (const r of recall) process.stdout.write(`      - [${r.caught ? 'caught' : 'MISSED'}] "${r.quote}"\n`);
        process.stdout.write(`    judge's full QoL error list (${result.errors.length}):\n`);
        for (const e of result.errors) {
          process.stdout.write(`      - [${e.source} ${e.turnId}] "${e.quote}" (${e.kind}) -> ${e.correction}\n`);
        }
      }
    }

    process.stdout.write(
      `  spread: RP ${spread(runs.map((r) => r.rolePlay))}  Comm ${spread(runs.map((r) => r.communication))}` +
        `  QoL ${spread(runs.map((r) => r.qualityOfLanguage))}  total ${spread(runs.map((r) => r.total))}\n`,
    );

    const expectation = evaluateExpectation(fixture.id, fixture.expect, runs);
    if (failedRuns > 0 && fixture.expect && Object.keys(fixture.expect).length > 0) {
      expectation.passed = false;
      expectation.failures.push(`${fixture.id}: ${failedRuns} of ${args.runs} run(s) failed terminally — gate requires ${args.runs} of ${args.runs} to pass`);
    }
    allExpectations.push(expectation);
    process.stdout.write(
      `  pass-bar (${expectation.description}): ${expectation.passed ? 'PASS' : 'FAIL'}\n`,
    );
    for (const failure of expectation.failures) process.stdout.write(`    - ${failure}\n`);

    (report.cases as Record<string, unknown>)[fixture.id] = { baseline: fixture.baseline, runs, expectation, failedRuns };
  }

  const costUsd = estimateCostUsd(totalInputTokens, totalOutputTokens);
  process.stdout.write(
    `\n--- Token usage (${args.provider}) ---\n` +
      `input=${totalInputTokens} output=${totalOutputTokens}` +
      (args.provider === 'gemini'
        ? ` estimated cost=$${costUsd.toFixed(4)} total across ${args.runs * fixtures.length} run(s)` +
          ` (only the last, successful attempt's tokens counted per call — a retried attempt's tokens are not` +
          ` separately summed)${anyValidationErrors ? '; at least one retry occurred, see "! retry" above' : '; no retries'}\n`
        : '\n'),
  );
  report.tokenUsage = { totalInputTokens, totalOutputTokens, estimatedCostUsd: args.provider === 'gemini' ? costUsd : undefined };

  if (anyValidationErrors) {
    process.stdout.write('\nAt least one judge call needed a retry — see "! retry" lines above.\n');
  }

  const reportDir = path.join(process.cwd(), 'data', 'reports', 'judge-check');
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  process.stdout.write(`\nReport written to ${reportPath}\n`);

  const passed = allExpectationsPassed(allExpectations);
  process.stdout.write(`\n${passed ? 'PASS' : 'FAIL'}: judge:check pass bar\n`);
  process.exit(passed ? 0 : 1);
}

main().catch((err) => {
  process.stderr.write(`judge:check failed: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
