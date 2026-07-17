/**
 * S4 scoringEngineVersion resolution: package.json version + short git SHA if
 * available. Wrapped in try/catch — must not crash in environments without git
 * (e.g. a fresh checkout, a CI sandbox without .git).
 *
 * Render checks the repo out without a .git directory, so readShortGitSha()
 * always returns undefined there and every envelope would silently lose its
 * SHA (A4). RENDER_GIT_COMMIT is injected by Render at build/run time and
 * carries the same commit the deployed code was built from — used as a
 * fallback, never preferred over a real local .git read.
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

function readPackageVersion(): string {
  const pkgPath = path.join(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version: string };
  return pkg.version;
}

function readShortGitSha(): string | undefined {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return process.env.RENDER_GIT_COMMIT?.slice(0, 7);
  }
}

export function resolveScoringEngineVersion(): string {
  const version = readPackageVersion();
  const sha = readShortGitSha();
  return sha ? `engine-v${version}+${sha}` : `engine-v${version}`;
}
