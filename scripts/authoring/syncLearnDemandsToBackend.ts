/**
 * §9.1 step 3 — copies src/data/learn/demands/*.json byte-for-byte into
 * backend/data/learn/, so the backend (a separate git repo per CLAUDE.md)
 * can resolve demands from its own copy and compute the same demandsVersion
 * hash independently. Must be run (and backend/ committed+pushed
 * separately) any time the source corpus changes.
 *
 *   npm run learn:sync-backend
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, '..', '..', 'src', 'data', 'learn', 'demands');
const DEST_DIR = join(__dirname, '..', '..', 'backend', 'data', 'learn');

function main(): void {
  if (!existsSync(SRC_DIR)) {
    console.error(`Source dir does not exist: ${SRC_DIR}`);
    process.exit(1);
  }
  mkdirSync(DEST_DIR, { recursive: true });

  const filenames = readdirSync(SRC_DIR).filter((f) => f.endsWith('.json')).sort();
  for (const filename of filenames) {
    const raw = readFileSync(join(SRC_DIR, filename), 'utf-8');
    writeFileSync(join(DEST_DIR, filename), raw, 'utf-8');
  }

  console.log(`Copied ${filenames.length} file(s) from ${SRC_DIR} to ${DEST_DIR}.`);
  console.log('Remember: backend/ is a separate git repo — commit and push it separately (CLAUDE.md).');
}

main();
