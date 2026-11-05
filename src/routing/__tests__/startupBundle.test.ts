/**
 * Pins what code splitting won: the code a learner downloads before the first
 * screen (everything `main.tsx` imports statically), and what Home needs on
 * top. Lazy `import()`s are not followed — they are separate downloads.
 *
 * If this fails, a static import has pulled something big back into startup.
 * Find the chain (the message prints it) and cut it — usually a screen-only
 * helper imported from a module the app shell uses; move the helper or import
 * it with `import()` where it is used.
 */
import { fileURLToPath } from 'node:url';
import { build, type Metafile } from 'esbuild';
import { beforeAll, describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
let meta: Metafile;

beforeAll(async () => {
  const result = await build({
    absWorkingDir: ROOT,
    entryPoints: ['src/main.tsx'],
    bundle: true,
    write: false,
    splitting: true,
    format: 'esm',
    outdir: 'out',
    metafile: true,
    logLevel: 'silent',
    jsx: 'automatic',
    loader: { '.css': 'empty', '.svg': 'empty', '.png': 'empty' },
    define: { 'import.meta.env.DEV': 'false', __SENTRY_RELEASE__: '""', __SENTRY_ENVIRONMENT__: '""' },
  });
  meta = result.metafile;
}, 60_000);

/** Static import graph from `start`: module → the module that first imported it. */
function staticGraph(start: string): Map<string, string | null> {
  const prev = new Map<string, string | null>([[start, null]]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const imp of meta.inputs[cur]?.imports ?? []) {
      if (imp.kind === 'dynamic-import' || prev.has(imp.path)) continue;
      prev.set(imp.path, cur);
      queue.push(imp.path);
    }
  }
  return prev;
}

function chain(graph: Map<string, string | null>, target: string): string {
  const steps = [target];
  let cur: string | null | undefined = target;
  while ((cur = graph.get(cur!))) steps.push(cur);
  return steps.reverse().join(' → ');
}

function expectAbsent(start: string, targets: string[]) {
  const graph = staticGraph(start);
  const found = targets.filter((t) => graph.has(t) || [...graph.keys()].some((k) => k.startsWith(t)));
  expect(found.map((t) => chain(graph, [...graph.keys()].find((k) => k === t || k.startsWith(t))!))).toEqual([]);
}

describe('startup download (code splitting)', () => {
  it('the app shell never pulls in the question bank, the Learn/exam pipelines or zod', () => {
    expectAbsent('src/main.tsx', [
      'src/data/questions.ts',
      'src/data/learn/demandsManifest.ts',
      'src/services/api/apiClient.ts',
      'src/domain/igcse/judgement/',
      'src/screens/',
      'node_modules/zod/',
    ]);
  });

  it('Home, Explore, Profile and Onboarding open without the ~1 MB question bank', () => {
    for (const screen of ['src/screens/Home.tsx', 'src/screens/Explore.tsx', 'src/screens/Profile.tsx', 'src/screens/Onboarding.tsx']) {
      expectAbsent(screen, ['src/data/questions.ts', 'src/data/learn/demandsManifest.ts']);
    }
  });

  it("keeps the app's own startup code under budget", () => {
    const graph = staticGraph('src/main.tsx');
    const bytes = [...graph.keys()].filter((k) => k.startsWith('src/')).reduce((n, k) => n + (meta.inputs[k]?.bytes ?? 0), 0);
    // Unminified src/ bytes reachable from main.tsx: ~0.67 MB on 2026-11-04 (~6.4 MB — the whole app — before splitting).
    expect(bytes).toBeLessThan(900_000);
  });
});
