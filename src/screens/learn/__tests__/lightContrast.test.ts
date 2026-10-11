/**
 * Learn overhaul Batch 5 — light-mode contrast guard.
 *
 * Every light-mode failure in Learn/feedback was a raw dark-tuned Tailwind
 * colour (violet-400 on white is 2.7:1), an inline hex, or `text-white` on a
 * violet button (html:not(.dark) .text-white → #0f172a, 3.13:1). These tests
 * ban those patterns in the Learn + feedback surfaces; the colour must come
 * from a role token (text-ink*, text-{action,progress,reward,correction}-text,
 * text-action-ink) that carries both themes.
 *
 * Pronunciation files are a named dependency (out of Batch 5's scope) and are
 * allowlisted by name; FeedbackExperience.tsx's pronunciation status block is
 * fenced by `lint:pronunciation-start/end` markers and skipped.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../..');

const SCAN_ROOTS = [
  'src/screens/learn',
  'src/features/feedback',
  'src/features/learn',
  'src/features/notebook',
  'src/screens/Notebook.tsx',
  'src/screens/Learn.tsx',
  'src/components/ui/MicroDrillModal.tsx',
];

/** Out of Batch 5 scope: the pronunciation branch (see the plan's "Out of bounds"). */
const PRONUNCIATION_ALLOWLIST = new Set([
  'src/features/feedback/components/AzurePronunciationCard.tsx',
  'src/features/feedback/components/PronunciationCard.tsx',
  'src/features/feedback/components/PronunciationHeatMap.tsx',
]);

function walk(path: string, out: string[] = []): string[] {
  const abs = join(ROOT, path);
  if (statSync(abs).isDirectory()) {
    for (const name of readdirSync(abs)) {
      if (name === '__tests__' || name.endsWith('.test.ts') || name.endsWith('.test.tsx')) continue;
      walk(join(path, name), out);
    }
  } else if (/\.(tsx?|ts)$/.test(path)) {
    out.push(path);
  }
  return out;
}

/** [file, lineNumber, line] for every non-allowlisted line, minus fenced pronunciation blocks. */
function scannedLines(): Array<[string, number, string]> {
  const rows: Array<[string, number, string]> = [];
  for (const file of SCAN_ROOTS.flatMap(r => walk(r))) {
    if (PRONUNCIATION_ALLOWLIST.has(file)) continue;
    let fenced = false;
    readFileSync(join(ROOT, file), 'utf8').split('\n').forEach((line, i) => {
      if (line.includes('lint:pronunciation-start')) { fenced = true; return; }
      if (line.includes('lint:pronunciation-end')) { fenced = false; return; }
      if (!fenced) rows.push([file, i + 1, line]);
    });
  }
  return rows;
}

const fmt = (hits: Array<[string, number, string]>) =>
  hits.map(([f, n, l]) => `${f}:${n}  ${l.trim().slice(0, 110)}`).join('\n');

describe('Learn + feedback light-mode contrast', () => {
  const rows = scannedLines();

  it('scans a non-trivial set of files', () => {
    expect(new Set(rows.map(r => r[0])).size).toBeGreaterThan(20);
  });

  it('uses no raw 100–400 colour for text or decoration outside dark:', () => {
    const re = /(?<![\w:-])(?:(?:hover|group-hover|focus):)?(?:text|decoration)-(?:violet|emerald|amber|cyan|red|rose|orange|teal|sky|yellow|purple|blue|slate)-(?:100|200|300|400)(?![\w-])/;
    const hits = rows.filter(([, , l]) => re.test(l));
    expect(fmt(hits)).toBe('');
  });

  it('uses no raw 500 colour for text (violet/red/rose/amber fail AA on white)', () => {
    const re = /(?<![\w:-])(?:(?:hover|group-hover|focus):)?text-(?:violet|amber|red|rose|orange|teal|sky|yellow|purple|cyan|emerald|blue)-500(?![\w-])/;
    const hits = rows.filter(([, , l]) => re.test(l));
    expect(fmt(hits)).toBe('');
  });

  it('puts no inline hex colour in a style prop', () => {
    const hits = rows.filter(([, , l]) => /style=/.test(l) && /#[0-9a-fA-F]{6}\b/.test(l));
    expect(fmt(hits)).toBe('');
  });

  it('keeps the severity palette on tokens, not hex', () => {
    const hits = rows.filter(([f, , l]) => f.endsWith('theme/severity.ts') && /#[0-9a-fA-F]{6}\b/.test(l));
    expect(fmt(hits)).toBe('');
  });

  it('draws no dark slate blocks (skeletons, tracks, panels) that go black on white', () => {
    const hits = rows.filter(([, , l]) => /(?<![\w:-])bg-slate-(?:700|800|900)(?![\w-])/.test(l));
    expect(fmt(hits)).toBe('');
  });

  it('never sets text-white on a violet button (use text-action-ink)', () => {
    const hits = rows.filter(([, , l]) =>
      /text-white/.test(l) && /(bg-violet-\d00(?!\/)|bg-action(?![-\w/])|from-violet-electric|bg-violet-electric(?!\/))/.test(l));
    expect(fmt(hits)).toBe('');
  });
});
