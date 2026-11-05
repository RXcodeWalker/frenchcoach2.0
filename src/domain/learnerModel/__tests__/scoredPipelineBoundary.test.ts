/**
 * learner-model §6: exam evidence never alters a mark. The model READS counted
 * Exam Sim area marks; nothing in the scored pipeline (src/domain/igcse,
 * scripts/scoring, server) may import or name the learner model, so no mark,
 * prompt or envelope can depend on it. The exam ingest's input is
 * Readonly<ExamAreaMarks> and its output is model observations only
 * (update.test.ts holds a frozen input to that).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../..');
const SCORED_PIPELINE_DIRS = ['src/domain/igcse', 'scripts/scoring', 'server'];
const PATTERNS = [/learnerModel/, /learner-model/, /skillObservations/];

function collect(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collect(full));
    else if (/\.(ts|tsx|mjs|js)$/.test(entry)) out.push(full);
  }
  return out;
}

describe('learner model ↔ scored pipeline boundary (learner-model §6)', () => {
  it('no file in the scored pipeline mentions the learner model', () => {
    const offenders: string[] = [];
    for (const dir of SCORED_PIPELINE_DIRS) {
      for (const file of collect(join(REPO_ROOT, dir))) {
        const text = readFileSync(file, 'utf8');
        if (PATTERNS.some((p) => p.test(text))) offenders.push(file.slice(REPO_ROOT.length + 1));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the learner model never imports the scored pipeline (it reads marks only through Session.examMarks)', () => {
    const offenders: string[] = [];
    for (const file of collect(join(REPO_ROOT, 'src/domain/learnerModel'))) {
      if (file.includes('__tests__')) continue;
      const text = readFileSync(file, 'utf8');
      if (/from ['"][^'"]*(igcse|scripts\/scoring|server)\//.test(text)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
