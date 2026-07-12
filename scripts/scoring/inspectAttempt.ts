/**
 * CLI: load one ScoringEnvelope (+ optional TeacherMarkSet + ReviewStatus)
 * and render it via renderAttemptHtml/renderAttemptTerminal — the "teacher
 * reads a single scored attempt and reproduces by hand why the mark was
 * awarded" tool. Read-only; never mutates envelope.json.
 *
 * Usage:
 *   npm run score:inspect -- --attempt-id <id> --envelope-store file|fixture
 *                            [--envelopes-root data/envelopes]
 *                            [--teacher-marks <path>]
 *                            --format html|terminal [--out <path>]
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createFileEnvelopeStore } from './fileEnvelopeStore';
import { createFixtureEnvelopeStore } from '../../src/domain/igcse/envelope/providers/fixtureEnvelopeStore';
import { parseTeacherMarkSet } from '../../src/domain/igcse/comparison/teacherMark';
import type { EnvelopeStore } from '../../src/domain/igcse/envelope/ports';
import type { TeacherMarkSet } from '../../src/domain/igcse/comparison/teacherMark';
import { buildEnvelopeView } from './reporting/envelopeView';
import { renderAttemptHtml } from './reporting/renderAttemptHtml';
import { renderAttemptTerminal } from './reporting/renderAttemptTerminal';

interface CliArgs {
  attemptId: string;
  envelopeStore: 'file' | 'fixture';
  envelopesRoot: string;
  teacherMarksPath?: string;
  format: 'html' | 'terminal';
  outPath?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    return idx === -1 ? undefined : argv[idx + 1];
  };

  const attemptId = get('--attempt-id');
  if (!attemptId) {
    throw new Error('Usage: score:inspect -- --attempt-id <id> --envelope-store file|fixture [options]');
  }

  const envelopeStore = (get('--envelope-store') ?? 'file') as 'file' | 'fixture';
  if (envelopeStore !== 'file' && envelopeStore !== 'fixture') {
    throw new Error(`Unknown --envelope-store "${envelopeStore}"; expected file|fixture`);
  }

  const format = (get('--format') ?? 'html') as 'html' | 'terminal';
  if (format !== 'html' && format !== 'terminal') {
    throw new Error(`Unknown --format "${format}"; expected html|terminal`);
  }

  return {
    attemptId,
    envelopeStore,
    envelopesRoot: get('--envelopes-root') ?? path.join(process.cwd(), 'data', 'envelopes'),
    teacherMarksPath: get('--teacher-marks'),
    format,
    outPath: get('--out'),
  };
}

async function loadTeacherMarks(teacherMarksPath: string | undefined): Promise<TeacherMarkSet | undefined> {
  if (!teacherMarksPath) return undefined;
  const raw = await fs.readFile(teacherMarksPath, 'utf8');
  return parseTeacherMarkSet(JSON.parse(raw));
}

export interface RunInspectAttemptOverrides {
  envelopeStore?: EnvelopeStore;
}

export async function runInspectAttempt(
  args: CliArgs,
  overrides: RunInspectAttemptOverrides = {},
): Promise<{ rendered: string; outPath: string }> {
  const envelopeStore: EnvelopeStore =
    overrides.envelopeStore ??
    (args.envelopeStore === 'fixture' ? createFixtureEnvelopeStore({}) : createFileEnvelopeStore(args.envelopesRoot));

  const envelope = await envelopeStore.load(args.attemptId);
  const teacherMarkSet = await loadTeacherMarks(args.teacherMarksPath);
  const view = buildEnvelopeView(envelope, teacherMarkSet);
  const rendered = args.format === 'html' ? renderAttemptHtml(view) : renderAttemptTerminal(view);

  const defaultOut = path.join(
    process.cwd(),
    'data',
    'reports',
    'inspect',
    `${args.attemptId}.${args.format === 'html' ? 'html' : 'txt'}`,
  );
  const outPath = args.outPath ?? defaultOut;

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, rendered, 'utf8');

  return { rendered, outPath };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const { outPath } = await runInspectAttempt(args);
  console.log(`Wrote ${outPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
