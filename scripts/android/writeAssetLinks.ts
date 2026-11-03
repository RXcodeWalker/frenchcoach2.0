/**
 * Build step (last in `npm run build`): writes `dist/.well-known/assetlinks.json` for the
 * Android app from `android/app-config.json`'s `sha256CertFingerprints`, plus any in the
 * `ANDROID_SHA256_CERT_FINGERPRINTS` env var (comma-separated) — so a fingerprint can be
 * added in Vercel without a commit. With no fingerprints it writes nothing: the website
 * is unaffected, the Android app just shows an address bar until one is set.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAssetLinks, parseFingerprintList } from './assetLinks';
import { readAppConfig } from './appConfig';

const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));

const config = readAppConfig();
const fingerprints = [
  ...config.sha256CertFingerprints,
  ...parseFingerprintList(process.env.ANDROID_SHA256_CERT_FINGERPRINTS),
];
const statements = buildAssetLinks(config.packageId, fingerprints);

if (statements.length === 0) {
  console.log('[assetlinks] no signing-key fingerprints configured — skipped (website unaffected).');
} else {
  const dir = join(DIST, '.well-known');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'assetlinks.json'), `${JSON.stringify(statements, null, 2)}\n`);
  console.log(`[assetlinks] wrote .well-known/assetlinks.json for ${config.packageId} (${statements[0].target.sha256_cert_fingerprints.length} key(s)).`);
}
