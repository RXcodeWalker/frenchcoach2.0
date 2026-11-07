/**
 * Stable chunk names (code splitting, 2026-11-06): a deploy renames only the
 * files whose own code changed.
 *
 * Why: ES modules name each other by URL, and a URL holds a content hash. A
 * file's hash covers the names of the files it imports, so a change to shared
 * startup code (`app-core`) renamed every chunk importing it — 112 of 170 files,
 * ~600 KB a learner had to download again on a small change.
 *
 * How, after Rollup has rendered every chunk:
 * 1. Each JS chunk gets a stand-in name: its own name plus a hash of *which
 *    modules it contains* (not their content), the same length as the real
 *    name, so it is stable across builds and source-map columns don't move.
 * 2. Every reference to a chunk inside the code — static and dynamic imports,
 *    and Vite's preload lists — is replaced by that stand-in.
 * 3. Each chunk is then named by hashing its own rewritten code.
 * 4. An import map in the HTML maps each stand-in URL to the real file, and
 *    Vite's preload helper resolves through it (`import.meta.resolve`).
 *
 * So a chunk's name changes only when its own code does (or a chunk it imports
 * is split differently). Browsers without import maps load `es-module-shims`
 * (see `importMapHead`). Pure: `vite.config.ts`'s plugin is the only caller.
 */
import { createHash } from 'node:crypto';

export interface ChunkInput {
  /** e.g. `assets/Learn-B3xk9Q1a.js` */
  fileName: string;
  code: string;
  /** Absolute or root-relative module ids the chunk holds (any stable form). */
  moduleIds: readonly string[];
}

export interface ChunkOutput {
  oldFileName: string;
  fileName: string;
  code: string;
}

export interface StableNamesPlan {
  chunks: ChunkOutput[];
  /** Import map `imports`: `/assets/<stand-in>` → `/assets/<real>`. */
  imports: Record<string, string>;
  /** Old real file name → new real file name (for the HTML's script and preload tags). */
  renamed: Record<string, string>;
}

/** Rollup's `[name]-[hash].js`; the hash is 8 characters and may itself contain `-` or `_`. */
const HASHED = /^(.*)-([A-Za-z0-9_-]{8})\.js$/;

function hashText(text: string, length: number): string {
  return createHash('sha256').update(text).digest('base64url').slice(0, length);
}

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

function dirname(path: string): string {
  const i = path.lastIndexOf('/');
  return i < 0 ? '' : path.slice(0, i + 1);
}

/** Normalises module ids so the same source tree gives the same stand-ins on any machine. */
export function stableModuleId(id: string, root: string): string {
  const unix = id.replace(/\\/g, '/');
  const r = root.replace(/\\/g, '/').replace(/\/?$/, '/');
  return unix.startsWith(r) ? unix.slice(r.length) : unix.replace(/^.*\/node_modules\//, 'node_modules/');
}

export function planStableNames(chunks: readonly ChunkInput[], base = '/'): StableNamesPlan {
  const standIns = new Map<string, string>(); // old basename → stand-in basename
  const used = new Set<string>();
  for (const chunk of chunks) {
    const name = basename(chunk.fileName);
    const m = HASHED.exec(name);
    if (!m) continue;
    const [, stem, hash] = m;
    let salt = 0;
    let standIn: string;
    do {
      const key = [...chunk.moduleIds].sort().join('\n') + (salt ? `#${salt}` : '');
      standIn = `${stem}-${hashText(`stand-in:${key}`, hash.length)}.js`;
      salt++;
    } while (used.has(standIn) || standIn === name);
    used.add(standIn);
    standIns.set(name, standIn);
  }

  // Longest first, so `index-ab.js` never matches inside `myindex-ab.js` first.
  const names = [...standIns.keys()].sort((a, b) => b.length - a.length);
  const pattern = names.length
    ? new RegExp(names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g')
    : null;

  const out: ChunkOutput[] = [];
  const imports: Record<string, string> = {};
  const renamed: Record<string, string> = {};
  for (const chunk of chunks) {
    const name = basename(chunk.fileName);
    const code = pattern ? chunk.code.replace(pattern, (n) => standIns.get(n) ?? n) : chunk.code;
    const m = HASHED.exec(name);
    if (!m) {
      out.push({ oldFileName: chunk.fileName, fileName: chunk.fileName, code });
      continue;
    }
    const [, stem, hash] = m;
    const fileName = `${dirname(chunk.fileName)}${stem}-${hashText(code, hash.length)}.js`;
    out.push({ oldFileName: chunk.fileName, fileName, code });
    renamed[chunk.fileName] = fileName;
    imports[`${base}${dirname(chunk.fileName)}${standIns.get(name)}`] = `${base}${fileName}`;
  }
  return { chunks: out, imports, renamed };
}

/**
 * The tags that must come before any module script: the shim loader for
 * browsers without import maps, then the import map itself.
 */
export function importMapHead(imports: Record<string, string>, shimUrl: string): string {
  const loader =
    `<script>if(!(window.HTMLScriptElement&&HTMLScriptElement.supports&&HTMLScriptElement.supports('importmap'))){` +
    `var s=document.createElement('script');s.async=true;s.src=${JSON.stringify(shimUrl)};document.head.appendChild(s)}</script>`;
  const sorted = Object.fromEntries(Object.entries(imports).sort(([a], [b]) => a.localeCompare(b)));
  return `${loader}\n    <script type="importmap">${JSON.stringify({ imports: sorted })}</script>`;
}

/** Vite's preload helper builds `base + dep`; resolving through the import map gives the real file. */
export const PRELOAD_ASSETS_URL_FROM = 'function(dep) { return "/"+dep }';
export const PRELOAD_ASSETS_URL_TO =
  'function(dep) { var u = "/"+dep; try { return import.meta.resolve ? import.meta.resolve(u) : u } catch (e) { return u } }';
