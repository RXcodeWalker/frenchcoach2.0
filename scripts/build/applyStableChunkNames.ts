/**
 * Post-build step, right after `vite build` (before the prerender, which copies
 * `dist/index.html` into every page shell): gives each JS chunk a name that
 * changes only when its own code does, and writes the import map that ties the
 * stand-in names in the code to the real files. See `stableChunkNames.ts`.
 *
 * It runs after Vite (and the Sentry source-map upload) have finished, so it
 * works on the files on disk. `vite.config.ts`'s `stableChunkNamesPlugin` left
 * `dist/.chunk-modules.json` (each chunk's module ids) behind for it.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importMapHead, planStableNames, type ChunkInput } from './stableChunkNames';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DIST = join(ROOT, 'dist');
export const CHUNK_MODULES_FILE = '.chunk-modules.json';
const SHIM_SOURCE = join(ROOT, 'node_modules/es-module-shims/dist/es-module-shims.js');

function main() {
  const listPath = join(DIST, CHUNK_MODULES_FILE);
  if (!existsSync(listPath)) throw new Error(`${CHUNK_MODULES_FILE} missing — run vite build first`);
  const modulesByFile = JSON.parse(readFileSync(listPath, 'utf-8')) as Record<string, string[]>;

  const inputs: ChunkInput[] = Object.entries(modulesByFile).map(([fileName, moduleIds]) => ({
    fileName,
    moduleIds,
    code: readFileSync(join(DIST, fileName), 'utf-8'),
  }));
  const plan = planStableNames(inputs);

  for (const chunk of plan.chunks) {
    writeFileSync(join(DIST, chunk.oldFileName), chunk.code);
    if (chunk.fileName === chunk.oldFileName) continue;
    renameSync(join(DIST, chunk.oldFileName), join(DIST, chunk.fileName));
    const map = join(DIST, `${chunk.oldFileName}.map`);
    if (existsSync(map)) renameSync(map, join(DIST, `${chunk.fileName}.map`));
  }

  // The shim for browsers without import maps (iOS before 16.4), content-hashed like any asset.
  const shim = readFileSync(SHIM_SOURCE);
  const shimFile = `assets/es-module-shims-${createHash('sha256').update(shim).digest('base64url').slice(0, 8)}.js`;
  copyFileSync(SHIM_SOURCE, join(DIST, shimFile));

  const htmlPath = join(DIST, 'index.html');
  let html = readFileSync(htmlPath, 'utf-8');
  for (const [from, to] of Object.entries(plan.renamed)) html = html.split(`/${from}`).join(`/${to}`);
  const head = importMapHead(plan.imports, `/${shimFile}`);
  // Before the first module script or module preload: an import map must precede them.
  const first = html.search(/<script type="module"|<link rel="modulepreload"/);
  if (first < 0) throw new Error('no module script in dist/index.html');
  html = `${html.slice(0, first)}${head}\n    ${html.slice(first)}`;
  writeFileSync(htmlPath, html);
  rmSync(listPath);

  const changed = plan.chunks.filter((c) => c.fileName !== c.oldFileName).length;
  console.log(`[stable-names] ${plan.chunks.length} chunks named by their own code (${changed} renamed), import map ${Object.keys(plan.imports).length} entries`);
}

main();
