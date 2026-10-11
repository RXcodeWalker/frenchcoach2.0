/**
 * The Learn demands corpus hash, shared by the manifest builder, `learn:check`
 * and the parity tests. Side-effect free on import — `buildDemandsManifest.ts`
 * runs its `main()` unconditionally, so nothing else may import from it.
 *
 * `demandsVersion` is a SHA-256 hex digest over the corpus's own file bytes
 * (sorted by filename): backend/data/learn/ is a byte-for-byte copy of
 * src/data/learn/demands/ (docs §9.1 step 3), so both sides hash literally the
 * same bytes and no canonicalization scheme is needed.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SEP = String.fromCharCode(0x20);

export interface RawCorpusFile {
  filename: string;
  raw: string;
}

/** Every `.json` file in `dir`, sorted by filename, with its raw bytes as text. */
export function loadRawCorpus(dir: string): RawCorpusFile[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((filename) => ({ filename, raw: readFileSync(join(dir, filename), 'utf-8') }));
}

/** SHA-256 hex over sorted-filename-concatenated raw file bytes. */
export function hashCorpus(files: RawCorpusFile[]): string {
  const hash = createHash('sha256');
  for (const { filename, raw } of files) {
    hash.update(filename);
    hash.update(SEP);
    hash.update(raw);
    hash.update(SEP);
  }
  return hash.digest('hex');
}
