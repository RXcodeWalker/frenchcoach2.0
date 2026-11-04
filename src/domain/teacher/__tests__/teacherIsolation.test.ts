/**
 * The teacher area's boundaries (ADR 0015, docs/systems/teacher-dashboard.md §5):
 *  - it never reads the learner's local-only data (notebook, speaking log, Pronunciation Lab
 *    history, coach storage) — a teacher sees only what the class-scoped RPCs return;
 *  - nothing in the scored pipeline imports it;
 *  - a teacher's mark is written only through save_teacher_mark — never into the envelope.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..', '..', '..');

function filesUnder(dir: string): string[] {
  const abs = join(ROOT, dir);
  const out: string[] = [];
  for (const name of readdirSync(abs)) {
    const p = join(abs, name);
    if (statSync(p).isDirectory()) {
      if (name === '__tests__') continue;
      out.push(...filesUnder(relative(ROOT, p)));
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(relative(ROOT, p));
    }
  }
  return out;
}

const TEACHER_AREA = [
  ...filesUnder('src/screens/teach'),
  ...filesUnder('src/domain/teacher'),
  ...filesUnder('src/services/teacher'),
  ...filesUnder('src/features/homework'),
  'src/screens/JoinClass.tsx',
  'scripts/scheduledJobs/sendTeacherDigest.ts',
];

const LOCAL_ONLY = [/notebook/i, /speakingLog/, /labStore/, /labHistory/, /coachStorage/, /persistence\/storage/];

function imports(file: string): string[] {
  const text = readFileSync(join(ROOT, file), 'utf8');
  return [...text.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
}

describe('teacher area isolation', () => {
  it('finds the teacher area files', () => {
    expect(TEACHER_AREA.length).toBeGreaterThan(10);
  });

  it.each(TEACHER_AREA)('%s never imports learner local-only data', (file) => {
    for (const spec of imports(file)) {
      for (const banned of LOCAL_ONLY) expect(spec, `${file} imports ${spec}`).not.toMatch(banned);
    }
  });

  it('nothing in the scored pipeline imports the teacher area', () => {
    const scored = [...filesUnder('src/domain/igcse'), ...filesUnder('scripts/scoring')];
    for (const file of scored) {
      for (const spec of imports(file)) {
        expect(spec, `${file} imports ${spec}`).not.toMatch(/domain\/teacher|services\/teacher|screens\/teach|features\/homework/);
      }
    }
  });

  it('teacher marks are only ever written through save_teacher_mark', () => {
    for (const file of TEACHER_AREA) {
      const text = readFileSync(join(ROOT, file), 'utf8');
      expect(text, file).not.toMatch(/from\('scoring_envelopes'\)\s*\.\s*(insert|update|upsert|delete)/);
      expect(text, file).not.toMatch(/from\('teacher_marks'\)\s*\.\s*(insert|update|upsert|delete)/);
    }
  });
});
