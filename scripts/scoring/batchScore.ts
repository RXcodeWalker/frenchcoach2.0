/**
 * S4 CLI: batch-score N transcripts, diff against teacher marks, write a CSV +
 * markdown report. Follows scripts/stt/ingestSession.ts conventions: hand-rolled
 * arg parsing, main().catch() pattern, run via tsx.
 *
 * Usage:
 *   npm run score:batch -- --transcript-store file|fixture --sessions-root data/sessions
 *                          --judge anthropic|fixture --out-dir data/reports/<runId>
 *                          [--session <id>]  (repeatable; default: all)
 *
 * Hard scope redline: this computes per-criterion diff rows only (mark,
 * teacher mark, delta, justification, quoted evidence, transcript quality).
 * It must NOT grow aggregate statistics (within-N agreement %, bias,
 * band-consistency) or heuristic guardrails (e.g. flagging |delta| > 3) —
 * those are S6/S5/S8/S9 territory. A human reads the CSV/report during Phase A.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ProvenanceError } from '../../src/domain/igcse/judgement/scoreSpeaking';
import { JudgementValidationError } from '../../src/domain/igcse/judgement/schema';
import { buildDiffRows } from '../../src/domain/igcse/comparison/diff';
import { parseTeacherMarkSet } from '../../src/domain/igcse/comparison/teacherMark';
import type { DiffRow } from '../../src/domain/igcse/comparison/diff';
import type { SessionQuestionSet } from '../../src/domain/igcse/stt/types';
import type { EnvelopeStore } from '../../src/domain/igcse/envelope/ports';
import type { TranscriptStore } from '../../src/domain/igcse/stt/ports';
import { createFileTranscriptStore } from '../stt/fileTranscriptStore';
import { createFixtureTranscriptStore } from '../../src/domain/igcse/stt/providers/fixtureTranscriptStore';
import { createFileEnvelopeStore } from './fileEnvelopeStore';
import { createFixtureEnvelopeStore } from '../../src/domain/igcse/envelope/providers/fixtureEnvelopeStore';
import { createAnthropicJudge } from './anthropicJudge';
import { scoreAttempt } from './scoreAttempt';
import type { ScoreAttemptDeps } from './scoreAttempt';
import { toCsv } from './csv';

interface CliArgs {
  transcriptStore: 'file' | 'fixture';
  sessionsRoot: string;
  judge: 'anthropic' | 'fixture';
  outDir: string;
  sessions?: string[];
}

function parseArgs(argv: string[]): CliArgs {
  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    return idx === -1 ? undefined : argv[idx + 1];
  };
  const getAll = (flag: string): string[] => {
    const values: string[] = [];
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === flag && argv[i + 1] !== undefined) values.push(argv[i + 1]);
    }
    return values;
  };

  const transcriptStore = (get('--transcript-store') ?? 'file') as 'file' | 'fixture';
  const judge = (get('--judge') ?? 'fixture') as 'anthropic' | 'fixture';
  const sessionsRoot = get('--sessions-root') ?? path.join(process.cwd(), 'data', 'sessions');
  const outDir = get('--out-dir');
  if (!outDir) {
    throw new Error('Usage: score:batch -- --out-dir data/reports/<runId> [options]');
  }
  if (transcriptStore !== 'file' && transcriptStore !== 'fixture') {
    throw new Error(`Unknown --transcript-store "${transcriptStore}"; expected file|fixture`);
  }
  if (judge !== 'anthropic' && judge !== 'fixture') {
    throw new Error(`Unknown --judge "${judge}"; expected anthropic|fixture`);
  }

  const sessions = getAll('--session');
  return {
    transcriptStore,
    sessionsRoot,
    judge,
    outDir,
    ...(sessions.length > 0 ? { sessions } : {}),
  };
}

async function loadQuestionSet(sessionsRoot: string, sessionId: string): Promise<SessionQuestionSet> {
  const raw = await fs.readFile(path.join(sessionsRoot, sessionId, 'questions.json'), 'utf8');
  return JSON.parse(raw) as SessionQuestionSet;
}

async function loadTeacherMarks(sessionsRoot: string, sessionId: string) {
  try {
    const raw = await fs.readFile(path.join(sessionsRoot, sessionId, 'teacher-marks.json'), 'utf8');
    return parseTeacherMarkSet(JSON.parse(raw));
  } catch {
    return undefined; // never assumed to exist
  }
}

interface ScoringFailedRow {
  sessionId: string;
  reason: string;
}

async function resolveSessionIds(
  transcriptStore: TranscriptStore,
  requested: string[] | undefined,
): Promise<string[]> {
  if (requested && requested.length > 0) return requested;
  return transcriptStore.list();
}

export interface RunBatchScoreOverrides {
  transcriptStore?: TranscriptStore;
  envelopeStore?: EnvelopeStore;
  createJudge?: ScoreAttemptDeps['createJudge'];
}

export async function runBatchScore(
  args: CliArgs,
  overrides: RunBatchScoreOverrides = {},
): Promise<{ diffRows: DiffRow[]; failures: ScoringFailedRow[] }> {
  const transcriptStore: TranscriptStore =
    overrides.transcriptStore ??
    (args.transcriptStore === 'fixture' ? createFixtureTranscriptStore({}) : createFileTranscriptStore(args.sessionsRoot));

  const envelopeStore: EnvelopeStore =
    overrides.envelopeStore ??
    (args.transcriptStore === 'fixture'
      ? createFixtureEnvelopeStore({})
      : createFileEnvelopeStore(path.join(process.cwd(), 'data', 'envelopes')));

  const createJudge: ScoreAttemptDeps['createJudge'] =
    overrides.createJudge ??
    (args.judge === 'anthropic'
      ? () => createAnthropicJudge()
      : () => {
          throw new Error('--judge fixture requires overrides.createJudge to be supplied (e.g. from a test)');
        });

  const sessionIds = await resolveSessionIds(transcriptStore, args.sessions);
  const diffRows: DiffRow[] = [];
  const failures: ScoringFailedRow[] = [];

  for (const sessionId of sessionIds) {
    try {
      const questionSet = await loadQuestionSet(args.sessionsRoot, sessionId);
      const envelope = await scoreAttempt(
        { transcriptStore, createJudge },
        { sessionId, questionSet },
      );
      await envelopeStore.save(envelope);

      const teacherMarks = await loadTeacherMarks(args.sessionsRoot, sessionId);
      diffRows.push(...buildDiffRows(envelope, teacherMarks));
    } catch (err) {
      if (err instanceof ProvenanceError || err instanceof JudgementValidationError) {
        failures.push({ sessionId, reason: err.message });
      } else {
        throw err;
      }
    }
  }

  await fs.mkdir(args.outDir, { recursive: true });
  await writeReports(args.outDir, diffRows, failures);

  return { diffRows, failures };
}

const CSV_HEADERS = [
  'sessionId',
  'attemptId',
  'criterion',
  'taskId',
  'scorerMark',
  'teacherMark',
  'delta',
  'justification',
  'quotedEvidence',
  'meanWordConfidence',
  'lowConfidenceSpanRatio',
];

async function writeReports(outDir: string, diffRows: DiffRow[], failures: ScoringFailedRow[]): Promise<void> {
  const csv = toCsv(CSV_HEADERS, diffRows as unknown as Array<Record<string, unknown>>);
  await fs.writeFile(path.join(outDir, 'diff.csv'), csv, 'utf8');

  const bySessionId = new Map<string, DiffRow[]>();
  for (const row of diffRows) {
    const existing = bySessionId.get(row.sessionId) ?? [];
    existing.push(row);
    bySessionId.set(row.sessionId, existing);
  }

  const lines: string[] = ['# Batch scoring report', ''];
  for (const [sessionId, rows] of bySessionId) {
    lines.push(`## Session ${sessionId}`, '');
    for (const row of rows) {
      const label = row.taskId ? `${row.criterion} (${row.taskId})` : row.criterion;
      lines.push(
        `- **${label}**: scorer ${row.scorerMark}` +
          (row.teacherMark !== null ? `, teacher ${row.teacherMark}, delta ${row.delta}` : ', teacher: n/a') +
          ` — ${row.justification}`,
      );
    }
    lines.push('');
  }

  if (failures.length > 0) {
    lines.push('## Scoring failed', '');
    for (const failure of failures) {
      lines.push(`- **${failure.sessionId}**: ${failure.reason}`);
    }
    lines.push('');
  }

  await fs.writeFile(path.join(outDir, 'report.md'), lines.join('\n'), 'utf8');
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const { diffRows, failures } = await runBatchScore(args);

  console.log(`Scored ${new Set(diffRows.map((r) => r.sessionId)).size} session(s), ${diffRows.length} diff rows.`);
  if (failures.length > 0) {
    console.warn(`scoringFailed: ${failures.length} session(s) — see report.md`);
  }
  console.log(`Wrote ${path.join(args.outDir, 'diff.csv')} and ${path.join(args.outDir, 'report.md')}`);
}

// Guarded so runBatchScore can be imported by tests without invoking the CLI.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
