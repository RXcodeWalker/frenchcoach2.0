/**
 * Golden regression runner over syntheticManifest.ts. For every manifest
 * entry: recompute evidence + guardrail triggers (always) and, when the
 * entry pairs a static SpeakingAssessment, a full ScoringEnvelope built
 * directly from buildEvidenceSubset -> runGuardrails -> buildScoringEnvelope
 * — no LLM, no judge stub, no network call, so this is deterministic and
 * CI-safe.
 *
 * Version-string constants (rubric/prompt/guardrails/etc.) below are literal
 * and owned by this runner, not real scoreAttempt provenance — a real
 * version bump will go stale across all goldens at once; --update-goldens
 * is the designed escape hatch, never silent.
 *
 * Usage:
 *   npm run score:golden -- [--update-goldens] [--case <id>]
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildEvidenceSubset } from '../../src/domain/igcse/evidence/buildEvidence';
import { EVIDENCE_DETECTOR_VERSION } from '../../src/domain/igcse/evidence/version';
import { buildScoringEnvelope } from '../../src/domain/igcse/envelope/buildEnvelope';
import type { ScoringEnvelope } from '../../src/domain/igcse/envelope/types';
import { runGuardrails } from '../../src/domain/igcse/guardrails/runGuardrails';
import { GUARDRAILS_VERSION } from '../../src/domain/igcse/guardrails/version';
import { SCORING_PROMPT_VERSION } from '../../src/domain/igcse/judgement/version';
import { RUBRIC_VERSION } from '../../src/domain/igcse/rubric';
import { SYNTHETIC_MANIFEST } from '../../src/domain/igcse/guardrails/__tests__/syntheticManifest';
import type { EvidenceProfileSubset } from '../../src/domain/igcse/evidence/types';
import type { GuardrailId } from '../../src/domain/igcse/guardrails/types';
import type { SttMetadata } from '../../src/domain/igcse/stt/types';

const GOLDEN_DIR = path.join(process.cwd(), 'scripts', 'scoring', '__tests__', 'goldenFixtures');

/** Fixed literal provenance — never real scoreAttempt output. Bump alongside a deliberate golden update. */
const FIXED_SCORED_AT = '2025-01-01T00:00:00.000Z';
const FIXED_ATTEMPT_ID_PREFIX = 'golden-';
const FIXED_STT: SttMetadata = {
  model: 'golden-fixture',
  modelVersion: 'golden-fixture-v1',
  provider: 'golden-fixture',
  languageCode: 'fr',
  alignmentModel: null,
  diarizationModel: null,
  decodeParamsHash: 'golden-fixture-hash',
  confidenceSource: 'faster-whisper-probability',
  promptBiasedRetries: 0,
  transcribedAt: FIXED_SCORED_AT,
};

export interface GoldenCaseResult {
  id: string;
  evidence: EvidenceProfileSubset;
  guardrailTriggers: GuardrailId[];
  envelope: ScoringEnvelope | null;
}

/** Pure — recomputes L1 evidence + L3 guardrails (+ full envelope if an assessment is paired). */
export function computeGoldenCase(entry: (typeof SYNTHETIC_MANIFEST)[number]): GoldenCaseResult {
  const evidence = buildEvidenceSubset(entry.transcript);
  const guardrailReport = entry.assessment
    ? runGuardrails(entry.assessment, evidence, entry.transcript)
    : { triggers: [] as { id: GuardrailId; message: string }[] };
  const guardrailTriggers = guardrailReport.triggers.map((t) => t.id);

  let envelope: ScoringEnvelope | null = null;
  if (entry.assessment) {
    envelope = buildScoringEnvelope({
      attemptId: `${FIXED_ATTEMPT_ID_PREFIX}${entry.id}`,
      sessionId: `golden-session-${entry.id}`,
      scoredAt: FIXED_SCORED_AT,
      transcript: entry.transcript,
      assessment: entry.assessment,
      evidenceProfile: evidence,
      stt: FIXED_STT,
      transcriptVersion: { schemaVersion: 'session-transcript-v1', assemblerVersion: 'stt-assembler-v1' },
      transcriptQuality: { meanWordConfidence: 1, lowConfidenceSpanRatio: 0, lowConfidenceSpanCount: 0 },
      userCorrected: false,
      llm: { provider: 'gemini', model: 'golden-fixture-no-llm', selfConsistencyRuns: 1 },
      versions: {
        rubricVersion: RUBRIC_VERSION,
        scoringEngineVersion: 'golden-fixture',
        evidenceDetectorVersion: EVIDENCE_DETECTOR_VERSION,
        scoringPromptVersion: SCORING_PROMPT_VERSION,
        guardrailsVersion: GUARDRAILS_VERSION,
      },
      guardrailTriggers,
    });
  }

  return { id: entry.id, evidence, guardrailTriggers, envelope };
}

function goldenPath(id: string): string {
  return path.join(GOLDEN_DIR, `${id}.golden.json`);
}

async function loadGolden(id: string): Promise<unknown | undefined> {
  try {
    const raw = await fs.readFile(goldenPath(id), 'utf8');
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

async function writeGolden(id: string, result: GoldenCaseResult): Promise<void> {
  await fs.mkdir(GOLDEN_DIR, { recursive: true });
  await fs.writeFile(goldenPath(id), JSON.stringify(result, null, 2) + '\n', 'utf8');
}

interface CliArgs {
  updateGoldens: boolean;
  caseId?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const idx = argv.indexOf('--case');
  return {
    updateGoldens: argv.includes('--update-goldens'),
    caseId: idx === -1 ? undefined : argv[idx + 1],
  };
}

export interface GoldenDiffFailure {
  id: string;
  message: string;
}

/** Pure comparison — deep-equal via JSON serialization (matches how goldens are persisted). */
export async function runGoldenRegression(
  args: CliArgs,
): Promise<{ failures: GoldenDiffFailure[]; updated: string[]; checked: string[] }> {
  const entries = args.caseId
    ? SYNTHETIC_MANIFEST.filter((e) => e.id === args.caseId)
    : SYNTHETIC_MANIFEST;

  if (args.caseId && entries.length === 0) {
    throw new Error(`No syntheticManifest entry with id "${args.caseId}"`);
  }

  const failures: GoldenDiffFailure[] = [];
  const updated: string[] = [];
  const checked: string[] = [];

  for (const entry of entries) {
    const result = computeGoldenCase(entry);

    if (args.updateGoldens) {
      await writeGolden(entry.id, result);
      updated.push(entry.id);
      continue;
    }

    const golden = await loadGolden(entry.id);
    checked.push(entry.id);
    if (golden === undefined) {
      failures.push({
        id: entry.id,
        message: 'No golden file found — run with --update-goldens to create it.',
      });
      continue;
    }

    const actual = JSON.stringify(result, null, 2);
    const expected = JSON.stringify(golden, null, 2);
    if (actual !== expected) {
      failures.push({ id: entry.id, message: `Golden mismatch for "${entry.id}" — output drifted from checked-in golden.` });
    }
  }

  return { failures, updated, checked };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const { failures, updated, checked } = await runGoldenRegression(args);

  if (args.updateGoldens) {
    console.log(`Updated ${updated.length} golden(s): ${updated.join(', ')}`);
    return;
  }

  console.log(`Checked ${checked.length} case(s).`);
  if (failures.length > 0) {
    console.error(`${failures.length} golden mismatch(es):`);
    for (const failure of failures) {
      console.error(`  - ${failure.id}: ${failure.message}`);
    }
    process.exitCode = 1;
  } else {
    console.log('All goldens match.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
