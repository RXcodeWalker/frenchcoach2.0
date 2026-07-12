/**
 * S4 CLI: batch-score N transcripts, diff against teacher marks, write a CSV +
 * markdown report. Follows scripts/stt/ingestSession.ts conventions: hand-rolled
 * arg parsing, main().catch() pattern, run via tsx.
 *
 * Usage:
 *   npm run score:batch -- --transcript-store file|fixture --sessions-root data/sessions
 *                          --judge gemini|fixture --out-dir data/reports/<runId>
 *                          [--session <id>]  (repeatable; default: all)
 *
 * --judge gemini uses Gemini 2.5 Flash Lite as the primary provider with
 * automatic Groq fallback on a genuine request failure (see providers/judgeFactory.ts).
 *
 * Hard scope redline: this computes per-criterion diff rows only (mark,
 * teacher mark, delta, justification, quoted evidence, transcript quality).
 * It must NOT grow aggregate statistics (within-N agreement %, bias,
 * band-consistency) or heuristic guardrails (e.g. flagging |delta| > 3) —
 * those are S6/S5/S8/S9 territory. A human reads the CSV/report during Phase A.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ProvenanceError } from '../../src/domain/igcse/judgement/scoreSpeaking';
import { JudgementValidationError } from '../../src/domain/igcse/judgement/schema';
import { buildDiffRows } from '../../src/domain/igcse/comparison/diff';
import { parseTeacherMarkSet } from '../../src/domain/igcse/comparison/teacherMark';
import type { DiffRow } from '../../src/domain/igcse/comparison/diff';
import type { ReviewStatus } from '../../src/domain/igcse/comparison/reviewStatus';
import type { SessionQuestionSet } from '../../src/domain/igcse/stt/types';
import type { EnvelopeStore } from '../../src/domain/igcse/envelope/ports';
import type { ScoringEnvelope } from '../../src/domain/igcse/envelope/types';
import type { TranscriptStore } from '../../src/domain/igcse/stt/ports';
import { createFileTranscriptStore } from '../stt/fileTranscriptStore';
import { createFixtureTranscriptStore } from '../../src/domain/igcse/stt/providers/fixtureTranscriptStore';
import { createFileEnvelopeStore } from './fileEnvelopeStore';
import { createFixtureEnvelopeStore } from '../../src/domain/igcse/envelope/providers/fixtureEnvelopeStore';
import { createJudgeWithFallback } from './providers/judgeFactory';
import { scoreAttempt } from './scoreAttempt';
import type { ScoreAttemptDeps } from './scoreAttempt';
import { toCsv } from './csv';
import { enableScoringDebug } from './observability/logger';
import { buildEnvelopeView } from './reporting/envelopeView';
import type { EnvelopeView } from './reporting/envelopeView';
import { buildReviewArtifactRows } from './reporting/reviewArtifact';
import type { ReviewArtifactRow } from './reporting/reviewArtifact';
import { rankSessions } from './reporting/priority';
import type { SortBy } from './reporting/priority';
import { createReviewStore } from './reviewStore';

interface CliArgs {
  transcriptStore: 'file' | 'fixture';
  sessionsRoot: string;
  judge: 'gemini' | 'fixture';
  outDir: string;
  sessions?: string[];
  debug: boolean;
  sortBy: SortBy;
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
  const judge = (get('--judge') ?? 'fixture') as 'gemini' | 'fixture';
  const sessionsRoot = get('--sessions-root') ?? path.join(process.cwd(), 'data', 'sessions');
  const outDir = get('--out-dir');
  if (!outDir) {
    throw new Error('Usage: score:batch -- --out-dir data/reports/<runId> [options]');
  }
  if (transcriptStore !== 'file' && transcriptStore !== 'fixture') {
    throw new Error(`Unknown --transcript-store "${transcriptStore}"; expected file|fixture`);
  }
  if (judge !== 'gemini' && judge !== 'fixture') {
    throw new Error(`Unknown --judge "${judge}"; expected gemini|fixture`);
  }

  const sortBy = (get('--sort-by') ?? 'none') as SortBy;
  if (sortBy !== 'delta' && sortBy !== 'guardrails' && sortBy !== 'none') {
    throw new Error(`Unknown --sort-by "${sortBy}"; expected delta|guardrails|none`);
  }

  const sessions = getAll('--session');
  return {
    transcriptStore,
    sessionsRoot,
    judge,
    outDir,
    debug: argv.includes('--debug'),
    sortBy,
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

async function loadReviewStatus(envelopesRoot: string, attemptId: string): Promise<ReviewStatus | undefined> {
  try {
    return await createReviewStore(envelopesRoot).load(attemptId);
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
  if (args.debug) enableScoringDebug();

  const transcriptStore: TranscriptStore =
    overrides.transcriptStore ??
    (args.transcriptStore === 'fixture' ? createFixtureTranscriptStore({}) : createFileTranscriptStore(args.sessionsRoot));

  const envelopesRoot = path.join(process.cwd(), 'data', 'envelopes');
  const envelopeStore: EnvelopeStore =
    overrides.envelopeStore ??
    (args.transcriptStore === 'fixture' ? createFixtureEnvelopeStore({}) : createFileEnvelopeStore(envelopesRoot));

  const createJudge: ScoreAttemptDeps['createJudge'] =
    overrides.createJudge ??
    (args.judge === 'gemini'
      ? () => createJudgeWithFallback()
      : () => {
          throw new Error('--judge fixture requires overrides.createJudge to be supplied (e.g. from a test)');
        });

  const sessionIds = await resolveSessionIds(transcriptStore, args.sessions);
  const diffRows: DiffRow[] = [];
  const failures: ScoringFailedRow[] = [];
  const envelopeViewsBySession = new Map<string, EnvelopeView>();
  const guardrailTriggersBySession = new Map<string, string[]>();
  const reviewArtifactRows: ReviewArtifactRow[] = [];

  for (const sessionId of sessionIds) {
    try {
      const questionSet = await loadQuestionSet(args.sessionsRoot, sessionId);
      const envelope: ScoringEnvelope = await scoreAttempt(
        { transcriptStore, createJudge },
        { sessionId, questionSet },
      );
      await envelopeStore.save(envelope);

      const teacherMarks = await loadTeacherMarks(args.sessionsRoot, sessionId);
      const sessionDiffRows = buildDiffRows(envelope, teacherMarks);
      diffRows.push(...sessionDiffRows);

      guardrailTriggersBySession.set(sessionId, envelope.guardrailTriggers);
      const envelopeView = buildEnvelopeView(envelope, teacherMarks);
      envelopeViewsBySession.set(sessionId, envelopeView);

      const reviewStatus = await loadReviewStatus(envelopesRoot, envelope.attemptId);
      reviewArtifactRows.push(...buildReviewArtifactRows(sessionDiffRows, envelopeView, reviewStatus));
    } catch (err) {
      if (err instanceof ProvenanceError || err instanceof JudgementValidationError) {
        failures.push({ sessionId, reason: err.message });
      } else {
        throw err;
      }
    }
  }

  await fs.mkdir(args.outDir, { recursive: true });
  await writeReports(
    args.outDir,
    diffRows,
    failures,
    guardrailTriggersBySession,
    envelopeViewsBySession,
    reviewArtifactRows,
    args.sortBy,
  );

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

async function writeReports(
  outDir: string,
  diffRows: DiffRow[],
  failures: ScoringFailedRow[],
  guardrailTriggersBySession: Map<string, string[]>,
  envelopeViewsBySession: Map<string, EnvelopeView>,
  reviewArtifactRows: ReviewArtifactRow[],
  sortBy: SortBy,
): Promise<void> {
  // diff.csv row order/content is never affected by --sort-by — only report.md's session grouping is reordered.
  const csv = toCsv(CSV_HEADERS, diffRows as unknown as Array<Record<string, unknown>>);
  await fs.writeFile(path.join(outDir, 'diff.csv'), csv, 'utf8');

  const bySessionId = new Map<string, DiffRow[]>();
  for (const row of diffRows) {
    const existing = bySessionId.get(row.sessionId) ?? [];
    existing.push(row);
    bySessionId.set(row.sessionId, existing);
  }

  const orderedSessionIds = rankSessions(diffRows, guardrailTriggersBySession, sortBy);
  // rankSessions only sees sessions with diff rows or guardrail entries; preserve original grouping order as a tiebreak/fallback for any session missing from that ranking (should not happen in practice, but never silently drop a session).
  const sessionIds = [...orderedSessionIds, ...[...bySessionId.keys()].filter((id) => !orderedSessionIds.includes(id))];

  const lines: string[] = ['# Batch scoring report', ''];
  for (const sessionId of sessionIds) {
    const rows = bySessionId.get(sessionId);
    if (!rows) continue;
    lines.push(`## Session ${sessionId}`, '');
    for (const row of rows) {
      const label = row.taskId ? `${row.criterion} (${row.taskId})` : row.criterion;
      lines.push(
        `- **${label}**: scorer ${row.scorerMark}` +
          (row.teacherMark !== null ? `, teacher ${row.teacherMark}, delta ${row.delta}` : ', teacher: n/a') +
          ` — ${row.justification}`,
      );
    }
    const guardrailTriggers = guardrailTriggersBySession.get(sessionId) ?? [];
    if (guardrailTriggers.length > 0) {
      lines.push(`- **Guardrail triggers**: ${guardrailTriggers.join(', ')}`);
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

  const evidenceJson = Object.fromEntries(envelopeViewsBySession);
  await fs.writeFile(path.join(outDir, 'evidence.json'), JSON.stringify(evidenceJson, null, 2) + '\n', 'utf8');

  await fs.writeFile(
    path.join(outDir, 'review-artifacts.json'),
    JSON.stringify(reviewArtifactRows, null, 2) + '\n',
    'utf8',
  );

  const reviewLines: string[] = [
    '# Review artifacts',
    '',
    '| session | criterion | task | mark | teacher | delta | reviewed | reviewer |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const row of reviewArtifactRows) {
    reviewLines.push(
      `| ${row.sessionId} | ${row.criterion} | ${row.taskId ?? ''} | ${row.mark} | ${row.teacherMark ?? ''} | ${row.delta ?? ''} | ${row.reviewed} | ${row.reviewer ?? ''} |`,
    );
  }
  await fs.writeFile(path.join(outDir, 'review-artifacts.md'), reviewLines.join('\n') + '\n', 'utf8');
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
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
