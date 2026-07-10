/**
 * S4 scoringEngineVersion resolution: package.json version + short git SHA if
 * available. Wrapped in try/catch — must not crash in environments without git
 * (e.g. a fresh checkout, a CI sandbox without .git).
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
    return undefined;
  }
}

export function resolveScoringEngineVersion(): string {
  const version = readPackageVersion();
  const sha = readShortGitSha();
  return sha ? `engine-v${version}+${sha}` : `engine-v${version}`;
}
