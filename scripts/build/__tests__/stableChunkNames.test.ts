import { describe, expect, it } from 'vitest';
import { importMapHead, planStableNames, stableModuleId } from '../stableChunkNames';

const core = (code: string) => ({ fileName: 'assets/app-core-AAAAAAAA.js', moduleIds: ['src/a.ts', 'src/b.ts'], code });
const screen = (dep: string) => ({
  fileName: 'assets/Home-BBBBBBBB.js',
  moduleIds: ['src/screens/Home.tsx'],
  code: `import{a}from"./${dep}";const d=["assets/${dep}"];`,
});

describe('stable chunk names (import maps)', () => {
  it('a change to an imported chunk renames only that chunk, not its importers', () => {
    const v1 = planStableNames([core('export const a=1'), screen('app-core-AAAAAAAA.js')]);
    // Rollup's own name for app-core changes with its content, and so would the importer's.
    const v2 = planStableNames([
      { ...core('export const a=2'), fileName: 'assets/app-core-CCCCCCCC.js' },
      { ...screen('app-core-CCCCCCCC.js'), fileName: 'assets/Home-DDDDDDDD.js' },
    ]);
    const home = (p: typeof v1) => p.chunks.find((c) => c.fileName.includes('Home'))!;
    const appCore = (p: typeof v1) => p.chunks.find((c) => c.fileName.includes('app-core'))!;
    expect(home(v2).fileName).toBe(home(v1).fileName);
    expect(home(v2).code).toBe(home(v1).code);
    expect(appCore(v2).fileName).not.toBe(appCore(v1).fileName);
  });

  it('rewrites every reference to a same-length stand-in and maps it to the real file', () => {
    const plan = planStableNames([core('x'), screen('app-core-AAAAAAAA.js')]);
    const home = plan.chunks.find((c) => c.oldFileName.includes('Home'))!;
    expect(home.code).not.toContain('app-core-AAAAAAAA.js');
    expect(home.code.length).toBe(screen('app-core-AAAAAAAA.js').code.length); // source maps keep their columns
    const standIn = /\.\/(app-core-[A-Za-z0-9_-]{8}\.js)/.exec(home.code)![1];
    const realCore = plan.chunks.find((c) => c.oldFileName.includes('app-core'))!.fileName;
    expect(plan.imports[`/assets/${standIn}`]).toBe(`/${realCore}`);
    expect(plan.renamed['assets/Home-BBBBBBBB.js']).toBe(home.fileName);
  });

  it('reads hashes that contain - or _ (a stem is never cut short)', () => {
    const plan = planStableNames([
      { fileName: 'assets/apiClient-D-H6kMTW.js', moduleIds: ['src/api.ts'], code: 'x' },
      { fileName: 'assets/Home-BBBBBBBB.js', moduleIds: ['src/h.ts'], code: 'import"./apiClient-D-H6kMTW.js"' },
    ]);
    expect(Object.keys(plan.imports).every((k) => /\/assets\/(apiClient|Home)-[A-Za-z0-9_-]{8}\.js$/.test(k))).toBe(true);
    expect(plan.chunks[0].fileName).toMatch(/^assets\/apiClient-[A-Za-z0-9_-]{8}\.js$/);
  });

  it('gives chunks with the same name different stand-ins', () => {
    const plan = planStableNames([
      { fileName: 'assets/index-AAAAAAAA.js', moduleIds: ['src/x/index.ts'], code: '1' },
      { fileName: 'assets/index-BBBBBBBB.js', moduleIds: ['src/y/index.ts'], code: '2' },
    ]);
    expect(new Set(Object.keys(plan.imports)).size).toBe(2);
  });

  it('normalises module ids so any checkout gives the same names', () => {
    expect(stableModuleId('/home/a/repo/src/x.ts', '/home/a/repo')).toBe('src/x.ts');
    expect(stableModuleId('C:\\b\\repo\\node_modules\\react\\index.js', 'D:/elsewhere')).toBe('node_modules/react/index.js');
  });

  it('loads the shim only where import maps are missing, before the import map', () => {
    const head = importMapHead({ '/assets/a-X.js': '/assets/a-Y.js' }, '/assets/es-module-shims-Z.js');
    expect(head.indexOf('es-module-shims')).toBeLessThan(head.indexOf('type="importmap"'));
    expect(head).toContain("supports('importmap')");
    expect(head).toContain('{"imports":{"/assets/a-X.js":"/assets/a-Y.js"}}');
  });
});
